// Fuel log service layer

import { db } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { NotFoundError } from '@/lib/errors';
import type { FuelLogCreateInput, FuelLogQuery } from '@/lib/validation';

export async function getAllFuelLogs(query: FuelLogQuery) {
  const { page, limit, vehicleId, startDate, endDate, sortBy, sortOrder } = query;
  const where: Record<string, unknown> = {};
  if (vehicleId) where.vehicleId = vehicleId;

  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (startDate) dateFilter.gte = new Date(startDate);
  if (endDate) dateFilter.lte = new Date(endDate);
  if (startDate || endDate) where.date = dateFilter;

  const [data, total] = await Promise.all([
    db.fuelLog.findMany({
      where,
      include: { vehicle: true, trip: true },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.fuelLog.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function createFuelLog(data: FuelLogCreateInput, userId: string) {
  const vehicle = await db.vehicle.findUnique({ where: { id: data.vehicleId } });
  if (!vehicle) throw new NotFoundError('Vehicle', data.vehicleId);

  const fuelLog = await db.fuelLog.create({
    data: {
      ...data,
      date: data.date ? new Date(data.date) : new Date(),
      tripId: data.tripId ?? null,
    },
    include: { vehicle: true },
  });

  await logAudit({
    userId,
    action: 'CREATE',
    entity: 'FuelLog',
    entityId: fuelLog.id,
    metadata: { vehicleId: data.vehicleId, liters: data.liters, cost: data.cost },
  });

  return fuelLog;
}

export async function getTotalFuelCost(vehicleId?: string) {
  const where = vehicleId ? { vehicleId } : {};
  const result = await db.fuelLog.aggregate({
    where,
    _sum: { cost: true, liters: true },
  });
  return {
    totalCost: result._sum.cost ?? 0,
    totalLiters: result._sum.liters ?? 0,
  };
}
