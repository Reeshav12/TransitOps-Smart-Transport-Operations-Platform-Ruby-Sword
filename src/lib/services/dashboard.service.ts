// Dashboard & Analytics service layer

import { db } from '@/lib/db';

export interface DashboardKPIs {
  activeVehicles: number;
  availableVehicles: number;
  vehiclesInMaintenance: number;
  retiredVehicles: number;
  totalVehicles: number;
  activeTrips: number;
  pendingTrips: number;
  completedTrips: number;
  cancelledTrips: number;
  driversOnDuty: number;
  availableDrivers: number;
  totalDrivers: number;
  fleetUtilization: number;
  expiringLicenses: number;
  totalOperationalCost: number;
}

export async function getKPIs(filters?: { vehicleType?: string; region?: string }): Promise<DashboardKPIs> {
  const where: Record<string, unknown> = {};
  if (filters?.vehicleType) where.type = filters.vehicleType;
  if (filters?.region) where.region = filters.region;

  const [
    activeVehicles,
    availableVehicles,
    vehiclesInMaintenance,
    retiredVehicles,
    totalVehicles,
    activeTrips,
    pendingTrips,
    completedTrips,
    cancelledTrips,
    driversOnDuty,
    availableDrivers,
    suspendedDrivers,
    totalDrivers,
    expiringLicenses,
    fuelTotal,
    maintenanceTotal,
    expenseTotal,
  ] = await Promise.all([
    db.vehicle.count({ where: { ...where, status: 'OnTrip' } }),
    db.vehicle.count({ where: { ...where, status: 'Available' } }),
    db.vehicle.count({ where: { ...where, status: 'InShop' } }),
    db.vehicle.count({ where: { ...where, status: 'Retired' } }),
    db.vehicle.count({ where }),
    db.trip.count({ where: { status: 'Dispatched' } }),
    db.trip.count({ where: { status: 'Draft' } }),
    db.trip.count({ where: { status: 'Completed' } }),
    db.trip.count({ where: { status: 'Cancelled' } }),
    db.driver.count({ where: { status: 'OnTrip' } }),
    db.driver.count({ where: { status: 'Available' } }),
    db.driver.count({ where: { status: 'Suspended' } }),
    db.driver.count(),
    db.driver.count({
      where: {
        licenseExpiry: {
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        status: { not: 'Suspended' },
      },
    }),
    db.fuelLog.aggregate({ _sum: { cost: true } }),
    db.maintenanceLog.aggregate({ _sum: { cost: true } }),
    db.expense.aggregate({ _sum: { amount: true } }),
  ]);

  const nonRetiredVehicles = totalVehicles - retiredVehicles;
  const fleetUtilization = nonRetiredVehicles > 0
    ? Math.round((activeVehicles / nonRetiredVehicles) * 100)
    : 0;

  return {
    activeVehicles,
    availableVehicles,
    vehiclesInMaintenance,
    retiredVehicles,
    totalVehicles,
    activeTrips,
    pendingTrips,
    completedTrips,
    cancelledTrips,
    driversOnDuty,
    availableDrivers,
    totalDrivers,
    fleetUtilization,
    expiringLicenses,
    totalOperationalCost: (fuelTotal._sum.cost ?? 0) + (maintenanceTotal._sum.cost ?? 0) + (expenseTotal._sum.amount ?? 0),
  };
}

export interface VehicleAnalytics {
  vehicleId: string;
  registrationNumber: string;
  model: string;
  totalDistance: number;
  totalFuel: number;
  fuelEfficiency: number | null; // distance/fuel
  fuelCost: number;
  maintenanceCost: number;
  otherExpenses: number;
  operationalCost: number;
  acquisitionCost: number;
  roi: number | null;
}

export async function getVehicleAnalytics(): Promise<VehicleAnalytics[]> {
  const vehicles = await db.vehicle.findMany({
    include: {
      trips: {
        where: { status: 'Completed' },
        select: { actualDistance: true, fuelConsumed: true },
      },
      fuelLogs: { select: { liters: true, cost: true } },
      maintenanceLogs: { select: { cost: true } },
      expenses: { select: { amount: true } },
    },
  });

  return vehicles.map((v) => {
    const totalDistance = v.trips.reduce((sum, t) => sum + (t.actualDistance ?? 0), 0);
    const totalFuel = v.trips.reduce((sum, t) => sum + (t.fuelConsumed ?? 0), 0);
    const fuelEfficiency = totalFuel > 0 ? totalDistance / totalFuel : null;
    const fuelCost = v.fuelLogs.reduce((sum, f) => sum + f.cost, 0);
    const maintenanceCost = v.maintenanceLogs.reduce((sum, m) => sum + m.cost, 0);
    const otherExpenses = v.expenses.reduce((sum, e) => sum + e.amount, 0);
    const operationalCost = fuelCost + maintenanceCost + otherExpenses;
    // ROI: (revenue - operational cost) / acquisition cost
    // Since we don't have revenue tracking, use negative operational cost ratio
    const roi = v.acquisitionCost > 0
      ? (((0 - operationalCost) / v.acquisitionCost) * 100)
      : null;

    return {
      vehicleId: v.id,
      registrationNumber: v.registrationNumber,
      model: v.model,
      totalDistance,
      totalFuel,
      fuelEfficiency,
      fuelCost,
      maintenanceCost,
      otherExpenses,
      operationalCost,
      acquisitionCost: v.acquisitionCost,
      roi,
    };
  });
}

export interface TripTrend {
  date: string;
  trips: number;
  completed: number;
}

export async function getTripTrend(days = 7): Promise<TripTrend[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const trips = await db.trip.findMany({
    where: { createdAt: { gte: startDate } },
    select: { createdAt: true, status: true },
  });

  const trend: TripTrend[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayTrips = trips.filter(
      (t) => t.createdAt.toISOString().split('T')[0] === dateStr
    );
    trend.push({
      date: dateStr,
      trips: dayTrips.length,
      completed: dayTrips.filter((t) => t.status === 'Completed').length,
    });
  }

  return trend;
}

export interface CostBreakdown {
  fuel: number;
  maintenance: number;
  other: number;
}

export async function getCostBreakdown(): Promise<CostBreakdown> {
  const [fuel, maintenance, expenses] = await Promise.all([
    db.fuelLog.aggregate({ _sum: { cost: true } }),
    db.maintenanceLog.aggregate({ _sum: { cost: true } }),
    db.expense.aggregate({ _sum: { amount: true } }),
  ]);

  return {
    fuel: fuel._sum.cost ?? 0,
    maintenance: maintenance._sum.cost ?? 0,
    other: expenses._sum.amount ?? 0,
  };
}
