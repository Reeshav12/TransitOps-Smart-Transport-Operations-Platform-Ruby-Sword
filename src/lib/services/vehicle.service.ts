// Vehicle service layer

import { db } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { NotFoundError, ConflictError, ValidationError } from '@/lib/errors';
import type {
  VehicleCreateInput,
  VehicleUpdateInput,
  VehicleQuery,
} from '@/lib/validation';

export async function getAllVehicles(query: VehicleQuery) {
  const { page, limit, search, type, status, region, sortBy, sortOrder } = query;
  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { registrationNumber: { contains: search } },
      { model: { contains: search } },
    ];
  }
  if (type) where.type = type;
  if (status) where.status = status;
  if (region) where.region = region;

  const [data, total] = await Promise.all([
    db.vehicle.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.vehicle.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getVehicleById(id: string) {
  const vehicle = await db.vehicle.findUnique({
    where: { id },
    include: {
      trips: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { driver: true },
      },
      maintenanceLogs: {
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
      fuelLogs: {
        orderBy: { date: 'desc' },
        take: 5,
      },
    },
  });

  if (!vehicle) throw new NotFoundError('Vehicle', id);
  return vehicle;
}

export async function getAvailableVehicles() {
  return db.vehicle.findMany({
    where: { status: 'Available' },
    orderBy: { registrationNumber: 'asc' },
  });
}

export async function createVehicle(data: VehicleCreateInput, userId: string) {
  const existing = await db.vehicle.findUnique({
    where: { registrationNumber: data.registrationNumber },
  });
  if (existing) {
    throw new ConflictError(`Vehicle with registration number ${data.registrationNumber} already exists`);
  }

  const vehicle = await db.vehicle.create({ data });
  await logAudit({
    userId,
    action: 'CREATE',
    entity: 'Vehicle',
    entityId: vehicle.id,
    metadata: { registrationNumber: vehicle.registrationNumber, model: vehicle.model },
  });
  return vehicle;
}

export async function updateVehicle(id: string, data: VehicleUpdateInput, userId: string) {
  const existing = await db.vehicle.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Vehicle', id);

  if (data.registrationNumber && data.registrationNumber !== existing.registrationNumber) {
    const conflict = await db.vehicle.findUnique({
      where: { registrationNumber: data.registrationNumber },
    });
    if (conflict) {
      throw new ConflictError(`Vehicle with registration number ${data.registrationNumber} already exists`);
    }
  }

  if (existing.status === 'Retired' && data.status && data.status !== 'Retired') {
    throw new ValidationError('Cannot change status of a Retired vehicle');
  }

  const vehicle = await db.vehicle.update({
    where: { id },
    data,
  });
  await logAudit({
    userId,
    action: 'UPDATE',
    entity: 'Vehicle',
    entityId: vehicle.id,
    metadata: { before: existing, after: vehicle },
  });
  return vehicle;
}

export async function deleteVehicle(id: string, userId: string) {
  const vehicle = await db.vehicle.findUnique({
    where: { id },
    include: { trips: { where: { status: { in: ['Draft', 'Dispatched'] } } } },
  });
  if (!vehicle) throw new NotFoundError('Vehicle', id);

  if (vehicle.trips.length > 0) {
    throw new ValidationError('Cannot delete a vehicle with active trips. Cancel or complete the trips first.');
  }

  await db.vehicle.delete({ where: { id } });
  await logAudit({
    userId,
    action: 'DELETE',
    entity: 'Vehicle',
    entityId: id,
    metadata: { registrationNumber: vehicle.registrationNumber },
  });
}
