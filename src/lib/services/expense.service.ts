// Expense service layer

import { db } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { NotFoundError } from '@/lib/errors';
import type { ExpenseCreateInput, ExpenseQuery } from '@/lib/validation';

export async function getAllExpenses(query: ExpenseQuery) {
  const { page, limit, vehicleId, type, startDate, endDate, sortBy, sortOrder } = query;
  const where: Record<string, unknown> = {};
  if (vehicleId) where.vehicleId = vehicleId;
  if (type) where.type = type;

  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (startDate) dateFilter.gte = new Date(startDate);
  if (endDate) dateFilter.lte = new Date(endDate);
  if (startDate || endDate) where.date = dateFilter;

  const [data, total] = await Promise.all([
    db.expense.findMany({
      where,
      include: { vehicle: true },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.expense.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function createExpense(data: ExpenseCreateInput, userId: string) {
  const vehicle = await db.vehicle.findUnique({ where: { id: data.vehicleId } });
  if (!vehicle) throw new NotFoundError('Vehicle', data.vehicleId);

  const expense = await db.expense.create({
    data: {
      ...data,
      date: data.date ? new Date(data.date) : new Date(),
    },
    include: { vehicle: true },
  });

  await logAudit({
    userId,
    action: 'CREATE',
    entity: 'Expense',
    entityId: expense.id,
    metadata: { vehicleId: data.vehicleId, type: data.type, amount: data.amount },
  });

  return expense;
}

export async function getTotalExpenses(vehicleId?: string) {
  const where = vehicleId ? { vehicleId } : {};
  const result = await db.expense.aggregate({
    where,
    _sum: { amount: true },
  });
  return result._sum.amount ?? 0;
}
