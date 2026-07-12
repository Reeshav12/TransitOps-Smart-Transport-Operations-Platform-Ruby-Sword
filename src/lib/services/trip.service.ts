// Trip service layer — CRITICAL: All status transitions use Prisma transactions

import { db } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
} from '@/lib/errors';
import type {
  TripCreateInput,
  TripCompleteInput,
  TripQuery,
} from '@/lib/validation';

/** Default estimated fuel cost per liter (USD). Override via configuration if needed. */
const FUEL_COST_PER_LITER = 1.50;

export async function getAllTrips(query: TripQuery) {
  const { page, limit, search, status, vehicleId, driverId, sortBy, sortOrder } = query;
  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { source: { contains: search } },
      { destination: { contains: search } },
    ];
  }
  if (status) where.status = status;
  if (vehicleId) where.vehicleId = vehicleId;
  if (driverId) where.driverId = driverId;

  const [data, total] = await Promise.all([
    db.trip.findMany({
      where,
      include: {
        vehicle: true,
        driver: true,
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.trip.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getTripById(id: string) {
  const trip = await db.trip.findUnique({
    where: { id },
    include: {
      vehicle: true,
      driver: true,
      fuelLogs: true,
    },
  });
  if (!trip) throw new NotFoundError('Trip', id);
  return trip;
}

export async function createTrip(data: TripCreateInput, userId: string) {
  // Validate vehicle exists and is available
  const vehicle = await db.vehicle.findUnique({
    where: { id: data.vehicleId },
  });
  if (!vehicle) throw new NotFoundError('Vehicle', data.vehicleId);

  if (vehicle.status !== 'Available') {
    throw new ConflictError(`Vehicle ${vehicle.registrationNumber} is not available (current status: ${vehicle.status})`);
  }

  // Validate driver exists, is available, and has valid license
  const driver = await db.driver.findUnique({
    where: { id: data.driverId },
  });
  if (!driver) throw new NotFoundError('Driver', data.driverId);

  if (driver.status !== 'Available') {
    throw new ConflictError(`Driver ${driver.name} is not available (current status: ${driver.status})`);
  }

  if (driver.licenseExpiry <= new Date()) {
    throw new ConflictError(`Driver ${driver.name}'s license has expired`);
  }

  // Business rule: Cargo weight must not exceed vehicle max capacity
  if (data.cargoWeight > vehicle.maxLoadCapacity) {
    throw new ValidationError(
      `Cargo weight (${data.cargoWeight} kg) exceeds vehicle ${vehicle.registrationNumber}'s maximum capacity (${vehicle.maxLoadCapacity} kg)`
    );
  }

  const trip = await db.trip.create({
    data: {
      ...data,
      notes: data.notes ?? null,
    },
    include: { vehicle: true, driver: true },
  });

  await logAudit({
    userId,
    action: 'CREATE',
    entity: 'Trip',
    entityId: trip.id,
    metadata: {
      source: trip.source,
      destination: trip.destination,
      vehicleId: trip.vehicleId,
      driverId: trip.driverId,
      cargoWeight: trip.cargoWeight,
    },
  });

  return trip;
}

// CRITICAL: Dispatch uses transaction — vehicle + driver become OnTrip atomically
export async function dispatchTrip(tripId: string, userId: string) {
  const updatedTrip = await db.$transaction(async (tx) => {
    const trip = await tx.trip.findUnique({
      where: { id: tripId },
      include: { vehicle: true, driver: true },
    });
    if (!trip) throw new NotFoundError('Trip', tripId);

    if (trip.status !== 'Draft') {
      throw new ValidationError(`Trip can only be dispatched from Draft status (current: ${trip.status})`);
    }

    // Re-validate availability (may have changed since creation)
    if (trip.vehicle.status !== 'Available') {
      throw new ConflictError(`Vehicle ${trip.vehicle.registrationNumber} is no longer available`);
    }
    if (trip.driver.status !== 'Available') {
      throw new ConflictError(`Driver ${trip.driver.name} is no longer available`);
    }
    if (trip.driver.licenseExpiry <= new Date()) {
      throw new ConflictError(`Driver ${trip.driver.name}'s license has expired`);
    }

    // Update trip status
    const updated = await tx.trip.update({
      where: { id: tripId },
      data: {
        status: 'Dispatched',
        dispatchedAt: new Date(),
      },
      include: { vehicle: true, driver: true },
    });

    // Update vehicle and driver status to OnTrip
    await tx.vehicle.update({
      where: { id: trip.vehicleId },
      data: { status: 'OnTrip' },
    });

    await tx.driver.update({
      where: { id: trip.driverId },
      data: { status: 'OnTrip' },
    });

    return updated;
  }, { timeout: 15000 });

  // Audit log OUTSIDE the transaction (uses global db, not tx)
  await logAudit({
    userId,
    action: 'DISPATCH',
    entity: 'Trip',
    entityId: tripId,
    metadata: {
      vehicleId: updatedTrip.vehicleId,
      driverId: updatedTrip.driverId,
      vehicleStatus: 'Available → OnTrip',
      driverStatus: 'Available → OnTrip',
    },
  });

  return updatedTrip;
}

// CRITICAL: Complete uses transaction — restores vehicle + driver to Available, updates odometer, creates fuel log
export async function completeTrip(tripId: string, data: TripCompleteInput, userId: string) {
  const updatedTrip = await db.$transaction(async (tx) => {
    const trip = await tx.trip.findUnique({
      where: { id: tripId },
      include: { vehicle: true, driver: true },
    });
    if (!trip) throw new NotFoundError('Trip', tripId);

    if (trip.status !== 'Dispatched') {
      throw new ValidationError(`Trip can only be completed from Dispatched status (current: ${trip.status})`);
    }

    // Validate final odometer is greater than current
    if (data.finalOdometer <= trip.vehicle.odometer) {
      throw new ValidationError(
        `Final odometer (${data.finalOdometer}) must be greater than current odometer (${trip.vehicle.odometer})`
      );
    }

    // Update trip
    const updated = await tx.trip.update({
      where: { id: tripId },
      data: {
        status: 'Completed',
        completedAt: new Date(),
        finalOdometer: data.finalOdometer,
        fuelConsumed: data.fuelConsumed,
        actualDistance: data.actualDistance,
      },
      include: { vehicle: true, driver: true },
    });

    // Restore vehicle to Available and update odometer
    await tx.vehicle.update({
      where: { id: trip.vehicleId },
      data: {
        status: 'Available',
        odometer: data.finalOdometer,
      },
    });

    // Restore driver to Available
    await tx.driver.update({
      where: { id: trip.driverId },
      data: { status: 'Available' },
    });

    // Auto-create fuel log from fuel consumed
    await tx.fuelLog.create({
      data: {
        vehicleId: trip.vehicleId,
        liters: data.fuelConsumed,
        cost: data.fuelConsumed * FUEL_COST_PER_LITER,
        odometer: data.finalOdometer,
        date: new Date(),
        tripId: tripId,
      },
    });

    return updated;
  }, { timeout: 15000 });

  // Audit log OUTSIDE the transaction
  await logAudit({
    userId,
    action: 'COMPLETE',
    entity: 'Trip',
    entityId: tripId,
    metadata: {
      finalOdometer: data.finalOdometer,
      fuelConsumed: data.fuelConsumed,
      actualDistance: data.actualDistance,
      vehicleStatus: 'OnTrip → Available',
      driverStatus: 'OnTrip → Available',
    },
  });

  return updatedTrip;
}

// CRITICAL: Cancel uses transaction — restores vehicle + driver to Available (if was Dispatched)
export async function cancelTrip(tripId: string, userId: string) {
  let previousStatus = '';
  let wasDispatched = false;

  const updatedTrip = await db.$transaction(async (tx) => {
    const trip = await tx.trip.findUnique({
      where: { id: tripId },
      include: { vehicle: true, driver: true },
    });
    if (!trip) throw new NotFoundError('Trip', tripId);

    if (!['Draft', 'Dispatched'].includes(trip.status)) {
      throw new ValidationError(`Trip can only be cancelled from Draft or Dispatched status (current: ${trip.status})`);
    }

    previousStatus = trip.status;
    wasDispatched = trip.status === 'Dispatched';

    // Update trip status
    const updated = await tx.trip.update({
      where: { id: tripId },
      data: { status: 'Cancelled' },
      include: { vehicle: true, driver: true },
    });

    // If was Dispatched, restore vehicle and driver to Available
    if (wasDispatched) {
      await tx.vehicle.update({
        where: { id: trip.vehicleId },
        data: { status: 'Available' },
      });
      await tx.driver.update({
        where: { id: trip.driverId },
        data: { status: 'Available' },
      });
    }

    return updated;
  }, { timeout: 15000 });

  // Audit log OUTSIDE the transaction
  await logAudit({
    userId,
    action: 'CANCEL',
    entity: 'Trip',
    entityId: tripId,
    metadata: {
      previousStatus,
      vehicleRestored: wasDispatched,
      driverRestored: wasDispatched,
    },
  });

  return updatedTrip;
}
