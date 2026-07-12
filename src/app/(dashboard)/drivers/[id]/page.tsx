'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Users,
  Route,
  Shield,
  Phone,
  Calendar,
  Award,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { format, differenceInCalendarDays } from 'date-fns';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StaggerGroup, StaggerItem } from '@/components/shared/page-transition';
import { DriverStatusBadge } from '@/components/drivers/driver-status-badge';
import { TripStatusBadge } from '@/components/trips/trip-status-badge';

interface DriverDetail {
  id: string;
  name: string;
  licenseNumber: string;
  licenseCategory: string;
  licenseExpiry: string;
  contactNumber: string;
  safetyScore: number;
  status: string;
  createdAt: string;
  trips: Array<{
    id: string;
    source: string;
    destination: string;
    cargoWeight: number;
    plannedDistance: number;
    actualDistance: number | null;
    status: string;
    createdAt: string;
    vehicle: { id: string; registrationNumber: string; model: string };
  }>;
}

const categoryColors: Record<string, string> = {
  HEAVY: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  LIGHT: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  A: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
  B: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  C: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
};

function formatNumber(n: number) {
  return new Intl.NumberFormat('en-US').format(n);
}

export default function DriverDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const { data: driver, isLoading } = useQuery<DriverDetail>({
    queryKey: ['driver', params.id],
    queryFn: async () => {
      const res = await fetch(`/api/drivers/${params.id}`);
      if (!res.ok) throw new Error('Failed to fetch driver');
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

  if (!driver) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <Users className="size-12 text-muted-foreground" />
        <p className="text-muted-foreground">Driver not found.</p>
        <Button variant="outline" onClick={() => router.push('/drivers')}>
          <ArrowLeft className="mr-2 size-4" /> Back to Drivers
        </Button>
      </div>
    );
  }

  const licenseExpiryDate = new Date(driver.licenseExpiry);
  const daysUntilExpiry = differenceInCalendarDays(licenseExpiryDate, new Date());
  const completedTrips = driver.trips.filter((t) => t.status === 'Completed').length;
  const activeTrips = driver.trips.filter((t) => t.status === 'Dispatched').length;
  const totalDistance = driver.trips
    .filter((t) => t.actualDistance)
    .reduce((s, t) => s + (t.actualDistance ?? 0), 0);

  const safetyTone =
    driver.safetyScore >= 80 ? 'text-emerald-600' :
    driver.safetyScore >= 60 ? 'text-amber-600' :
    'text-red-600';
  const safetyBarColor =
    driver.safetyScore >= 80 ? 'bg-emerald-500' :
    driver.safetyScore >= 60 ? 'bg-amber-500' :
    'bg-red-500';

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/drivers">
          <ArrowLeft className="mr-2 size-4" /> Back to Drivers
        </Link>
      </Button>

      {/* Header card */}
      <Card className="overflow-hidden">
        <div className="relative bg-gradient-to-br from-teal-600 via-emerald-600 to-teal-700 p-6 text-white dark:from-teal-900 dark:via-emerald-900 dark:to-teal-950">
          <div className="absolute right-4 top-4 opacity-10">
            <Users className="size-32" />
          </div>
          <div className="relative space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex size-16 items-center justify-center rounded-full bg-white/20 text-2xl font-bold backdrop-blur">
                {driver.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{driver.name}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <DriverStatusBadge status={driver.status} />
                  <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${categoryColors[driver.licenseCategory] ?? ''}`}>
                    License Category: {driver.licenseCategory}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-white/80">
              <span className="flex items-center gap-1.5">
                <Shield className="size-4" /> {driver.licenseNumber}
              </span>
              <span className="flex items-center gap-1.5">
                <Phone className="size-4" /> {driver.contactNumber}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="size-4" /> License expires {format(licenseExpiryDate, 'MMM d, yyyy')}
                <Badge variant={daysUntilExpiry < 0 ? 'destructive' : daysUntilExpiry < 30 ? 'secondary' : 'outline'}
                  className="ml-1">
                  {daysUntilExpiry < 0 ? 'Expired' : `${daysUntilExpiry}d left`}
                </Badge>
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats grid */}
      <StaggerGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StaggerItem>
        <Card className="group transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase text-muted-foreground">Safety Score</CardTitle>
            <Shield className={`size-4 ${safetyTone}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${safetyTone}`}>{driver.safetyScore}</div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all ${safetyBarColor}`}
                style={{ width: `${driver.safetyScore}%` }}
              />
            </div>
          </CardContent>
        </Card>
        </StaggerItem>

        <StaggerItem>
        <Card className="group transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase text-muted-foreground">Completed Trips</CardTitle>
            <Award className="size-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedTrips}</div>
            <p className="text-xs text-muted-foreground">successful deliveries</p>
          </CardContent>
        </Card>
        </StaggerItem>

        <StaggerItem>
        <Card className="group transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase text-muted-foreground">Active Trips</CardTitle>
            <Clock className="size-4 text-sky-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeTrips}</div>
            <p className="text-xs text-muted-foreground">currently on trip</p>
          </CardContent>
        </Card>
        </StaggerItem>

        <StaggerItem>
        <Card className="group transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase text-muted-foreground">Total Distance</CardTitle>
            <TrendingUp className="size-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalDistance)}</div>
            <p className="text-xs text-muted-foreground">kilometers driven</p>
          </CardContent>
        </Card>
        </StaggerItem>
      </StaggerGroup>

      {/* Trip history */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Route className="size-5 text-teal-600" /> Trip History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {driver.trips.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <Route className="size-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No trips assigned to this driver yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {driver.trips.map((trip) => (
                <div
                  key={trip.id}
                  className="flex flex-col gap-2 rounded-lg border p-4 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <span className="font-medium">{trip.source} → {trip.destination}</span>
                      <span className="text-xs text-muted-foreground">
                        Vehicle: {trip.vehicle.registrationNumber} ({trip.vehicle.model}) · {formatNumber(trip.cargoWeight)} kg cargo
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(trip.createdAt), 'MMM d, yyyy · h:mm a')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {trip.actualDistance ? (
                      <span className="text-sm text-muted-foreground">{formatNumber(trip.actualDistance)} km</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Planned: {formatNumber(trip.plannedDistance)} km</span>
                    )}
                    <TripStatusBadge status={trip.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
