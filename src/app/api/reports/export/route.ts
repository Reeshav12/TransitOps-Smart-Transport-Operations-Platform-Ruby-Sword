import { NextRequest } from 'next/server';
import { requireRoleAction } from '@/lib/session';
import { withErrorHandler } from '@/lib/errors';
import { db } from '@/lib/db';

function escapeCSV(value: unknown): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCSV(rows: Record<string, unknown>[], columns: { key: string; label: string }[]): string {
  const header = columns.map((c) => escapeCSV(c.label)).join(',');
  const body = rows
    .map((row) => columns.map((c) => escapeCSV(row[c.key])).join(','))
    .join('\n');
  return `${header}\n${body}`;
}

const EXPORT_CONFIG: Record<string, { columns: { key: string; label: string }[]; query: () => Promise<Record<string, unknown>[]> }> = {
  vehicles: {
    columns: [
      { key: 'registrationNumber', label: 'Registration Number' },
      { key: 'model', label: 'Model' },
      { key: 'type', label: 'Type' },
      { key: 'maxLoadCapacity', label: 'Max Load (kg)' },
      { key: 'odometer', label: 'Odometer' },
      { key: 'acquisitionCost', label: 'Acquisition Cost' },
      { key: 'status', label: 'Status' },
      { key: 'region', label: 'Region' },
    ],
    query: async () => db.vehicle.findMany({ orderBy: { registrationNumber: 'asc' }, take: 10000 }),
  },
  drivers: {
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'licenseNumber', label: 'License Number' },
      { key: 'licenseCategory', label: 'License Category' },
      { key: 'licenseExpiry', label: 'License Expiry' },
      { key: 'contactNumber', label: 'Contact Number' },
      { key: 'safetyScore', label: 'Safety Score' },
      { key: 'status', label: 'Status' },
    ],
    query: async () => db.driver.findMany({ orderBy: { name: 'asc' }, take: 10000 }),
  },
  trips: {
    columns: [
      { key: 'id', label: 'Trip ID' },
      { key: 'source', label: 'Source' },
      { key: 'destination', label: 'Destination' },
      { key: 'cargoWeight', label: 'Cargo Weight (kg)' },
      { key: 'plannedDistance', label: 'Planned Distance' },
      { key: 'actualDistance', label: 'Actual Distance' },
      { key: 'fuelConsumed', label: 'Fuel Consumed' },
      { key: 'status', label: 'Status' },
      { key: 'createdAt', label: 'Created At' },
      { key: 'dispatchedAt', label: 'Dispatched At' },
      { key: 'completedAt', label: 'Completed At' },
    ],
    query: async () =>
      db.trip.findMany({
        include: { vehicle: true, driver: true },
        orderBy: { createdAt: 'desc' },
        take: 10000,
      }),
  },
  'fuel-logs': {
    columns: [
      { key: 'date', label: 'Date' },
      { key: 'vehicle', label: 'Vehicle' },
      { key: 'liters', label: 'Liters' },
      { key: 'cost', label: 'Cost' },
      { key: 'odometer', label: 'Odometer' },
    ],
    query: async () => {
      const logs = await db.fuelLog.findMany({
        include: { vehicle: true },
        orderBy: { date: 'desc' },
        take: 10000,
      });
      return logs.map((l) => ({ ...l, vehicle: l.vehicle.registrationNumber }));
    },
  },
  expenses: {
    columns: [
      { key: 'date', label: 'Date' },
      { key: 'vehicle', label: 'Vehicle' },
      { key: 'type', label: 'Type' },
      { key: 'amount', label: 'Amount' },
      { key: 'description', label: 'Description' },
    ],
    query: async () => {
      const expenses = await db.expense.findMany({
        include: { vehicle: true },
        orderBy: { date: 'desc' },
        take: 10000,
      });
      return expenses.map((e) => ({ ...e, vehicle: e.vehicle.registrationNumber }));
    },
  },
  maintenance: {
    columns: [
      { key: 'type', label: 'Type' },
      { key: 'vehicle', label: 'Vehicle' },
      { key: 'description', label: 'Description' },
      { key: 'cost', label: 'Cost' },
      { key: 'status', label: 'Status' },
      { key: 'startDate', label: 'Start Date' },
      { key: 'endDate', label: 'End Date' },
    ],
    query: async () => {
      const logs = await db.maintenanceLog.findMany({
        include: { vehicle: true },
        orderBy: { createdAt: 'desc' },
        take: 10000,
      });
      return logs.map((l) => ({ ...l, vehicle: l.vehicle.registrationNumber }));
    },
  },
};

export const GET = withErrorHandler(async (request: NextRequest) => {
  await requireRoleAction('reports:export');
  const type = request.nextUrl.searchParams.get('type') ?? 'vehicles';
  const config = EXPORT_CONFIG[type];
  if (!config) {
    return Response.json({ error: `Invalid export type: ${type}` }, { status: 400 });
  }

  const rows = await config.query();
  const csv = toCSV(rows, config.columns);

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="transitops-${type}-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
});
