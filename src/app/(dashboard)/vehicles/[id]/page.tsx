'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Truck,
  Route,
  Wrench,
  Fuel,
  DollarSign,
  Calendar,
  Gauge,
  MapPin,
  Package,
  TrendingUp,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { VehicleStatusBadge } from '@/components/vehicles/vehicle-status-badge';
import { TripStatusBadge } from '@/components/trips/trip-status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StaggerGroup, StaggerItem } from '@/components/shared/page-transition';

interface VehicleDetail {
  id: string;
  registrationNumber: string;
  model: string;
  type: string;
  maxLoadCapacity: number;
  odometer: number;
  acquisitionCost: number;
  status: string;
  region: string | null;
  createdAt: string;
  updatedAt: string;
  trips: Array<{
    id: string;
    source: string;
    destination: string;
    cargoWeight: number;
    plannedDistance: number;
    actualDistance: number | null;
    status: string;
    createdAt: string;
    driver: { id: string; name: string };
  }>;
  maintenanceLogs: Array<{
    id: string;
    type: string;
    description: string | null;
    cost: number;
    status: string;
    startDate: string;
    endDate: string | null;
  }>;
  fuelLogs: Array<{
    id: string;
    liters: number;
    cost: number;
    odometer: number;
    date: string;
  }>;
}

const typeColors: Record<string, string> = {
  TRUCK: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
  VAN: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  BUS: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  TRAILER: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  CAR: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

function formatNumber(n: number) {
  return new Intl.NumberFormat('en-US').format(n);
}

export default function VehicleDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const { data: vehicle, isLoading } = useQuery<VehicleDetail>({
    queryKey: ['vehicle', params.id],
    queryFn: async () => {
      const res = await fetch(`/api/vehicles/${params.id}`);
      if (!res.ok) throw new Error('Failed to fetch vehicle');
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-48 w-full" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <Truck className="size-12 text-muted-foreground" />
        <p className="text-muted-foreground">Vehicle not found.</p>
        <Button variant="outline" onClick={() => router.push('/vehicles')}>
          <ArrowLeft className="mr-2 size-4" /> Back to Vehicles
        </Button>
      </div>
    );
  }

  const totalFuelCost = vehicle.fuelLogs.reduce((s, f) => s + f.cost, 0);
  const totalMaintenanceCost = vehicle.maintenanceLogs.reduce((s, m) => s + m.cost, 0);
  const totalOperationalCost = totalFuelCost + totalMaintenanceCost;
  const totalDistance = vehicle.trips
    .filter((t) => t.actualDistance)
    .reduce((s, t) => s + (t.actualDistance ?? 0), 0);
  const totalFuel = vehicle.fuelLogs.reduce((s, f) => s + f.liters, 0);
  const fuelEfficiency = totalFuel > 0 ? totalDistance / totalFuel : null;
  const completedTrips = vehicle.trips.filter((t) => t.status === 'Completed').length;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/vehicles">
          <ArrowLeft className="mr-2 size-4" /> Back to Vehicles
        </Link>
      </Button>

      {/* Header card */}
      <Card className="overflow-hidden">
        <div className="relative bg-gradient-to-br from-teal-600 via-emerald-600 to-teal-700 p-6 text-white dark:from-teal-900 dark:via-emerald-900 dark:to-teal-950">
          <div className="absolute right-4 top-4 opacity-10">
            <Truck className="size-32" />
          </div>
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight">{vehicle.registrationNumber}</h1>
                <VehicleStatusBadge status={vehicle.status} />
              </div>
              <p className="text-lg text-white/90">{vehicle.model}</p>
              <div className="flex flex-wrap items-center gap-3 text-sm text-white/80">
                <span className={`rounded-md px-2 py-0.5 font-medium ${typeColors[vehicle.type] ?? ''}`}>
                  {vehicle.type}
                </span>
                {vehicle.region && (
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3.5" /> {vehicle.region}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="size-3.5" /> Added {format(new Date(vehicle.createdAt), 'MMM d, yyyy')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats grid */}
      <StaggerGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StaggerItem>
        <Card className="group transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase text-muted-foreground">Odometer</CardTitle>
            <Gauge className="size-4 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(vehicle.odometer)}</div>
            <p className="text-xs text-muted-foreground">kilometers</p>
          </CardContent>
        </Card>
        </StaggerItem>

        <StaggerItem>
        <Card className="group transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase text-muted-foreground">Max Capacity</CardTitle>
            <Package className="size-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(vehicle.maxLoadCapacity)}</div>
            <p className="text-xs text-muted-foreground">kg payload</p>
          </CardContent>
        </Card>
        </StaggerItem>

        <StaggerItem>
        <Card className="group transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase text-muted-foreground">Acquisition Cost</CardTitle>
            <DollarSign className="size-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(vehicle.acquisitionCost)}</div>
            <p className="text-xs text-muted-foreground">initial investment</p>
          </CardContent>
        </Card>
        </StaggerItem>

        <StaggerItem>
        <Card className="group transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase text-muted-foreground">Fuel Efficiency</CardTitle>
            <TrendingUp className="size-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {fuelEfficiency ? fuelEfficiency.toFixed(2) : '—'}
            </div>
            <p className="text-xs text-muted-foreground">km per liter</p>
          </CardContent>
        </Card>
        </StaggerItem>
      </StaggerGroup>

      {/* Cost breakdown */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Fuel Costs</CardTitle>
            <Fuel className="size-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(totalFuelCost)}</div>
            <p className="text-xs text-muted-foreground">{vehicle.fuelLogs.length} fuel logs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Maintenance Costs</CardTitle>
            <Wrench className="size-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{formatCurrency(totalMaintenanceCost)}</div>
            <p className="text-xs text-muted-foreground">{vehicle.maintenanceLogs.length} records</p>
          </CardContent>
        </Card>

        <Card className="border-teal-200 bg-teal-50/50 dark:border-teal-800 dark:bg-teal-950/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Operational Cost</CardTitle>
            <DollarSign className="size-4 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-teal-700 dark:text-teal-400">{formatCurrency(totalOperationalCost)}</div>
            <p className="text-xs text-muted-foreground">
              ROI: {vehicle.acquisitionCost > 0
                ? `${(((0 - totalOperationalCost) / vehicle.acquisitionCost) * 100).toFixed(1)}%`
                : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Trips history */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Route className="size-5 text-teal-600" /> Trip History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {vehicle.trips.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No trips recorded for this vehicle yet.</p>
          ) : (
            <div className="space-y-3">
              {vehicle.trips.map((trip) => (
                <div
                  key={trip.id}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <span className="font-medium">{trip.source} → {trip.destination}</span>
                      <span className="text-xs text-muted-foreground">
                        Driver: {trip.driver.name} · {formatNumber(trip.cargoWeight)} kg cargo · {format(new Date(trip.createdAt), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {trip.actualDistance && (
                      <span className="text-sm text-muted-foreground">{formatNumber(trip.actualDistance)} km</span>
                    )}
                    <TripStatusBadge status={trip.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
          <Separator className="my-3" />
          <p className="text-xs text-muted-foreground">
            {completedTrips} completed · {vehicle.trips.length} total trips
          </p>
        </CardContent>
      </Card>

      {/* Maintenance and Fuel in a grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Maintenance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="size-5 text-amber-600" /> Maintenance Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            {vehicle.maintenanceLogs.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No maintenance records.</p>
            ) : (
              <div className="space-y-2">
                {vehicle.maintenanceLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium">{log.type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(log.startDate), 'MMM d, yyyy')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{formatCurrency(log.cost)}</span>
                      <Badge variant={log.status === 'Open' ? 'default' : 'secondary'}>
                        {log.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fuel logs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Fuel className="size-5 text-orange-600" /> Fuel Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {vehicle.fuelLogs.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No fuel logs recorded.</p>
            ) : (
              <div className="space-y-2">
                {vehicle.fuelLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium">{formatNumber(log.liters)} L</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(log.date), 'MMM d, yyyy')} · {formatNumber(log.odometer)} km
                      </p>
                    </div>
                    <span className="text-sm font-medium text-orange-600">{formatCurrency(log.cost)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
