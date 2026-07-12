// Maintenance service layer

import { db } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { NotFoundError, ValidationError } from '@/lib/errors';
import type {
  MaintenanceCreateInput,
  MaintenanceUpdateInput,
  MaintenanceQuery,
} from '@/lib/validation';

export async function getAllMaintenance(query: MaintenanceQuery) {
  const { page, limit, vehicleId, status, type, sortBy, sortOrder } = query;
  const where: Record<string, unknown> = {};
  if (vehicleId) where.vehicleId = vehicleId;
  if (status) where.status = status;
  if (type) where.type = type;

  const [data, total] = await Promise.all([
    db.maintenanceLog.findMany({
      where,
      include: { vehicle: true },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.maintenanceLog.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getMaintenanceById(id: string) {
  const log = await db.maintenanceLog.findUnique({
    where: { id },
    include: { vehicle: true },
  });
  if (!log) throw new NotFoundError('MaintenanceLog', id);
  return log;
}

// Business rule: Creating maintenance auto-sets vehicle to InShop
export async function createMaintenance(data: MaintenanceCreateInput, userId: string) {
  const vehicle = await db.vehicle.findUnique({ where: { id: data.vehicleId } });
  if (!vehicle) throw new NotFoundError('Vehicle', data.vehicleId);

  if (vehicle.status === 'Retired') {
    throw new ValidationError('Cannot create maintenance for a Retired vehicle');
  }

  const log = await db.$transaction(async (tx) => {
    const created = await tx.maintenanceLog.create({
      data,
      include: { vehicle: true },
    });

    // Auto-set vehicle to InShop
    await tx.vehicle.update({
      where: { id: data.vehicleId },
      data: { status: 'InShop' },
    });

    return created;
  }, { timeout: 15000 });

  // Audit log OUTSIDE the transaction
  await logAudit({
    userId,
    action: 'CREATE',
    entity: 'MaintenanceLog',
    entityId: log.id,
    metadata: {
      vehicleId: data.vehicleId,
      type: data.type,
      cost: data.cost,
      vehicleStatus: `${vehicle.status} → InShop`,
    },
  });

  return log;
}

export async function updateMaintenance(id: string, data: MaintenanceUpdateInput, userId: string) {
  const existing = await db.maintenanceLog.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('MaintenanceLog', id);

  if (existing.status === 'Closed') {
    throw new ValidationError('Cannot update a closed maintenance record');
  }

  const log = await db.maintenanceLog.update({
    where: { id },
    data,
    include: { vehicle: true },
  });

  await logAudit({
    userId,
    action: 'UPDATE',
    entity: 'MaintenanceLog',
    entityId: id,
    metadata: { before: existing, after: log },
  });

  return log;
}

// Business rule: Closing maintenance restores vehicle to Available (unless Retired)
export async function closeMaintenance(id: string, userId: string) {
  let vehicleStatus = '';

  const updatedLog = await db.$transaction(async (tx) => {
    const log = await tx.maintenanceLog.findUnique({
      where: { id },
      include: { vehicle: true },
    });
    if (!log) throw new NotFoundError('MaintenanceLog', id);

    if (log.status !== 'Open') {
      throw new ValidationError(`Maintenance record is already ${log.status}`);
    }

    vehicleStatus = log.vehicle.status;

    const updated = await tx.maintenanceLog.update({
      where: { id },
      data: {
        status: 'Closed',
        endDate: new Date(),
      },
      include: { vehicle: true },
    });

    // Restore vehicle to Available (UNLESS it was Retired)
    if (log.vehicle.status !== 'Retired') {
      await tx.vehicle.update({
        where: { id: log.vehicleId },
        data: { status: 'Available' },
      });
    }

    return updated;
  }, { timeout: 15000 });

  // Audit log OUTSIDE the transaction
  await logAudit({
    userId,
    action: 'UPDATE',
    entity: 'MaintenanceLog',
    entityId: id,
    metadata: {
      action: 'close',
      vehicleStatus: vehicleStatus === 'Retired' ? 'Retired (preserved)' : 'InShop → Available',
    },
  });

  return updatedLog;
}
