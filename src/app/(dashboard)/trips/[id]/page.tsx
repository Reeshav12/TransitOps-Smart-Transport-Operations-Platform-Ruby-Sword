'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Route,
  Truck,
  Users,
  Package,
  Gauge,
  Fuel,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  Circle,
  Calendar,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { TripStatusBadge } from '@/components/trips/trip-status-badge';
import { VehicleStatusBadge } from '@/components/vehicles/vehicle-status-badge';
import { DriverStatusBadge } from '@/components/drivers/driver-status-badge';
import { PageTransition } from '@/components/shared/page-transition';

interface TripDetail {
  id: string;
  source: string;
  destination: string;
  vehicleId: string;
  driverId: string;
  cargoWeight: number;
  plannedDistance: number;
  actualDistance: number | null;
  fuelConsumed: number | null;
  finalOdometer: number | null;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  dispatchedAt: string | null;
  completedAt: string | null;
  vehicle: {
    id: string;
    registrationNumber: string;
    model: string;
    type: string;
    maxLoadCapacity: number;
    odometer: number;
    status: string;
  };
  driver: {
    id: string;
    name: string;
    licenseNumber: string;
    licenseCategory: string;
    safetyScore: number;
    status: string;
  };
  fuelLogs: Array<{
    id: string;
    liters: number;
    cost: number;
    odometer: number;
    date: string;
  }>;
}

function formatNumber(n: number) {
  return new Intl.NumberFormat('en-US').format(n);
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

interface TimelineStep {
  label: string;
  timestamp: string | null;
  icon: typeof Circle;
  color: string;
  bgColor: string;
  done: boolean;
}

export default function TripDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const { data: trip, isLoading } = useQuery<TripDetail>({
    queryKey: ['trip', params.id],
    queryFn: async () => {
      const res = await fetch(`/api/trips/${params.id}`);
      if (!res.ok) throw new Error('Failed to fetch trip');
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <Route className="size-12 text-muted-foreground" />
        <p className="text-muted-foreground">Trip not found.</p>
        <Button variant="outline" onClick={() => router.push('/trips')}>
          <ArrowLeft className="mr-2 size-4" /> Back to Trips
        </Button>
      </div>
    );
  }

  // Build lifecycle timeline
  const timeline: TimelineStep[] = [
    {
      label: 'Trip Created',
      timestamp: trip.createdAt,
      icon: Circle,
      color: 'text-teal-600',
      bgColor: 'bg-teal-100 dark:bg-teal-900/40',
      done: true,
    },
    {
      label: 'Dispatched',
      timestamp: trip.dispatchedAt,
      icon: Truck,
      color: 'text-sky-600',
      bgColor: 'bg-sky-100 dark:bg-sky-900/40',
      done: ['Dispatched', 'Completed'].includes(trip.status),
    },
    {
      label: 'Completed',
      timestamp: trip.completedAt,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/40',
      done: trip.status === 'Completed',
    },
  ];

  if (trip.status === 'Cancelled') {
    timeline.push({
      label: 'Cancelled',
      timestamp: trip.updatedAt,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100 dark:bg-red-900/40',
      done: true,
    });
  }

  const fuelLog = trip.fuelLogs[0];

  return (
    <PageTransition>
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/trips">
          <ArrowLeft className="mr-2 size-4" /> Back to Trips
        </Link>
      </Button>

      {/* Header card with gradient */}
      <Card className="overflow-hidden">
        <div className="relative bg-gradient-to-br from-teal-600 via-emerald-600 to-teal-700 p-6 text-white dark:from-teal-900 dark:via-emerald-900 dark:to-teal-950">
          <div className="absolute right-4 top-4 opacity-10">
            <Route className="size-32" />
          </div>
          <div className="relative space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                <Route className="size-7" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold tracking-tight">
                    {trip.source} → {trip.destination}
                  </h1>
                  <TripStatusBadge status={trip.status} />
                </div>
                <p className="mt-1 text-sm text-white/80">
                  Trip ID: <span className="font-mono">{trip.id.slice(-8)}</span> · Created {format(new Date(trip.createdAt), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="group transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase text-muted-foreground">Cargo Weight</CardTitle>
            <Package className="size-4 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(trip.cargoWeight)}</div>
            <p className="text-xs text-muted-foreground">kg</p>
          </CardContent>
        </Card>

        <Card className="group transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase text-muted-foreground">Planned Distance</CardTitle>
            <MapPin className="size-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(trip.plannedDistance)}</div>
            <p className="text-xs text-muted-foreground">km</p>
          </CardContent>
        </Card>

        <Card className="group transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase text-muted-foreground">Actual Distance</CardTitle>
            <Gauge className="size-4 text-sky-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {trip.actualDistance ? formatNumber(trip.actualDistance) : '—'}
            </div>
            <p className="text-xs text-muted-foreground">km</p>
          </CardContent>
        </Card>

        <Card className="group transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase text-muted-foreground">Fuel Consumed</CardTitle>
            <Fuel className="size-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {trip.fuelConsumed ? formatNumber(trip.fuelConsumed) : '—'}
            </div>
            <p className="text-xs text-muted-foreground">liters</p>
          </CardContent>
        </Card>
      </div>

      {/* Lifecycle Timeline + Trip Info */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Timeline */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="size-5 text-primary" /> Trip Lifecycle
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {timeline.map((step, idx) => {
                const Icon = step.icon;
                const isLast = idx === timeline.length - 1;
                return (
                  <div key={step.label} className="relative flex gap-4 pb-8 last:pb-0">
                    {/* Vertical line */}
                    {!isLast && (
                      <div className="absolute left-5 top-12 h-full w-0.5 bg-border" />
                    )}
                    {/* Icon */}
                    <div className={`relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full ${step.bgColor} ${step.done ? step.color : 'text-muted-foreground opacity-40'}`}>
                      <Icon className="size-5" />
                    </div>
                    {/* Content */}
                    <div className="flex-1 pt-1.5">
                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${step.done ? '' : 'text-muted-foreground'}`}>
                          {step.label}
                        </span>
                        {step.done && step.timestamp && (
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(step.timestamp), 'MMM d, yyyy · HH:mm')}
                          </span>
                        )}
                      </div>
                      {!step.done && (
                        <p className="text-xs text-muted-foreground italic">Pending</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {trip.notes && (
              <>
                <Separator className="my-4" />
                <div className="flex items-start gap-2">
                  <FileText className="size-4 mt-0.5 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Notes</p>
                    <p className="text-sm">{trip.notes}</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Trip Info Sidebar */}
        <div className="space-y-4">
          {/* Vehicle card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Truck className="size-4 text-primary" /> Vehicle
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href={`/vehicles/${trip.vehicle.id}`} className="block">
                <div className="rounded-lg border p-3 transition-colors hover:bg-muted/50">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-primary">{trip.vehicle.registrationNumber}</span>
                    <VehicleStatusBadge status={trip.vehicle.status} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{trip.vehicle.model}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{trip.vehicle.type}</span>
                    <span>•</span>
                    <span>Cap: {formatNumber(trip.vehicle.maxLoadCapacity)} kg</span>
                  </div>
                </div>
              </Link>
              {trip.cargoWeight > trip.vehicle.maxLoadCapacity && (
                <p className="text-xs text-destructive">⚠ Cargo exceeds vehicle capacity</p>
              )}
            </CardContent>
          </Card>

          {/* Driver card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Users className="size-4 text-primary" /> Driver
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link href={`/drivers/${trip.driver.id}`} className="block">
                <div className="rounded-lg border p-3 transition-colors hover:bg-muted/50">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-primary">{trip.driver.name}</span>
                    <DriverStatusBadge status={trip.driver.status} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">License: {trip.driver.licenseNumber}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>Cat: {trip.driver.licenseCategory}</span>
                    <span>•</span>
                    <span>Safety: {trip.driver.safetyScore}/100</span>
                  </div>
                </div>
              </Link>
            </CardContent>
          </Card>

          {/* Fuel log card (if completed) */}
          {fuelLog && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Fuel className="size-4 text-orange-600" /> Fuel Log
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Liters</span>
                    <span className="font-medium">{formatNumber(fuelLog.liters)} L</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cost</span>
                    <span className="font-medium">{formatCurrency(fuelLog.cost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Odometer</span>
                    <span className="font-medium">{formatNumber(fuelLog.odometer)} km</span>
                  </div>
                  {trip.actualDistance && fuelLog.liters > 0 && (
                    <Separator className="my-2" />
                  )}
                  {trip.actualDistance && fuelLog.liters > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Efficiency</span>
                      <span className="font-bold text-orange-600">
                        {(trip.actualDistance / fuelLog.liters).toFixed(2)} km/L
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
    </PageTransition>
  );
}
