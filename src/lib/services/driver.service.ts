// Driver service layer

import { db } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { NotFoundError, ConflictError, ValidationError } from '@/lib/errors';
import type {
  DriverCreateInput,
  DriverUpdateInput,
  DriverQuery,
} from '@/lib/validation';

export async function getAllDrivers(query: DriverQuery) {
  const { page, limit, search, status, licenseCategory, sortBy, sortOrder } = query;
  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { licenseNumber: { contains: search } },
    ];
  }
  if (status) where.status = status;
  if (licenseCategory) where.licenseCategory = licenseCategory;

  const [data, total] = await Promise.all([
    db.driver.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.driver.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getDriverById(id: string) {
  const driver = await db.driver.findUnique({
    where: { id },
    include: {
      trips: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { vehicle: true },
      },
    },
  });
  if (!driver) throw new NotFoundError('Driver', id);
  return driver;
}

// Business rule: Available drivers with valid licenses (not expired, not Suspended)
export async function getAvailableDrivers() {
  return db.driver.findMany({
    where: {
      status: 'Available',
      licenseExpiry: { gt: new Date() },
    },
    orderBy: { name: 'asc' },
  });
}

export async function createDriver(data: DriverCreateInput, userId: string) {
  const existing = await db.driver.findUnique({
    where: { licenseNumber: data.licenseNumber },
  });
  if (existing) {
    throw new ConflictError(`Driver with license number ${data.licenseNumber} already exists`);
  }

  const driver = await db.driver.create({
    data: {
      ...data,
      licenseExpiry: new Date(data.licenseExpiry),
    },
  });
  await logAudit({
    userId,
    action: 'CREATE',
    entity: 'Driver',
    entityId: driver.id,
    metadata: { name: driver.name, licenseNumber: driver.licenseNumber },
  });
  return driver;
}

export async function updateDriver(id: string, data: DriverUpdateInput, userId: string) {
  const existing = await db.driver.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Driver', id);

  if (data.licenseNumber && data.licenseNumber !== existing.licenseNumber) {
    const conflict = await db.driver.findUnique({
      where: { licenseNumber: data.licenseNumber },
    });
    if (conflict) {
      throw new ConflictError(`Driver with license number ${data.licenseNumber} already exists`);
    }
  }

  const { licenseExpiry, ...restData } = data;
  const updateData: Record<string, unknown> = { ...restData };
  if (licenseExpiry) {
    updateData.licenseExpiry = new Date(licenseExpiry);
  }

  const driver = await db.driver.update({
    where: { id },
    data: updateData,
  });
  await logAudit({
    userId,
    action: 'UPDATE',
    entity: 'Driver',
    entityId: driver.id,
    metadata: { before: existing, after: driver },
  });
  return driver;
}

export async function deleteDriver(id: string, userId: string) {
  const driver = await db.driver.findUnique({
    where: { id },
    include: { trips: { where: { status: { in: ['Draft', 'Dispatched'] } } } },
  });
  if (!driver) throw new NotFoundError('Driver', id);

  if (driver.trips.length > 0) {
    throw new ValidationError('Cannot delete a driver with active trips.');
  }

  await db.driver.delete({ where: { id } });
  await logAudit({
    userId,
    action: 'DELETE',
    entity: 'Driver',
    entityId: id,
    metadata: { name: driver.name },
  });
}

export async function getExpiringLicenses(days = 30) {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() + days);

  return db.driver.findMany({
    where: {
      licenseExpiry: { lte: threshold, gt: new Date() },
      status: { not: 'Suspended' },
    },
    orderBy: { licenseExpiry: 'asc' },
  });
}
