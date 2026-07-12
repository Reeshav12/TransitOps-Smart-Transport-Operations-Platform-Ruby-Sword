'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Download,
  Eye,
  Play,
  Plus,
  Route,
  Search,
  Truck,
  Users,
  XCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RoleGuard } from '@/components/shared/role-guard';
import { EmptyState } from '@/components/shared/empty-state';
import { PageTransition } from '@/components/shared/page-transition';
import { useCsvExport } from '@/hooks/use-csv-export';
import { PageHeader } from '@/components/layout/page-header';
import { TripStatusBadge } from '@/components/trips/trip-status-badge';
import { tripStatusEnum } from '@/lib/validation';

type Vehicle = { id: string; registrationNumber: string; model: string; type: string; maxLoadCapacity: number; odometer: number; status: string };
type Driver = { id: string; name: string; licenseNumber: string; licenseCategory: string; status: string; licenseExpiry: string };

type Trip = {
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
  dispatchedAt: string | null;
  completedAt: string | null;
  vehicle: Vehicle;
  driver: Driver;
};

type PaginatedTrips = {
  data: Trip[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

const STATUSES = tripStatusEnum.options;

const createSchema = z.object({
  source: z.string().min(2, 'Source must be at least 2 characters').max(100).trim(),
  destination: z.string().min(2, 'Destination must be at least 2 characters').max(100).trim(),
  vehicleId: z.string().min(1, 'Vehicle is required'),
  driverId: z.string().min(1, 'Driver is required'),
  cargoWeight: z.number().positive('Cargo weight must be positive'),
  plannedDistance: z.number().positive('Planned distance must be positive'),
  notes: z.string().max(500),
});
type CreateValues = z.infer<typeof createSchema>;

const completeSchema = z.object({
  finalOdometer: z.number().positive('Final odometer must be positive'),
  fuelConsumed: z.number().positive('Fuel consumed must be positive'),
  actualDistance: z.number().positive('Actual distance must be positive'),
});
type CompleteValues = z.infer<typeof completeSchema>;

function formatNumber(v: number) {
  return new Intl.NumberFormat('en-US').format(v);
}

export default function TripsPage() {
  const queryClient = useQueryClient();
  const { exportCsv, exporting: exportLoading } = useCsvExport();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');

  const [createOpen, setCreateOpen] = useState(false);
  const [completeTrip, setCompleteTrip] = useState<Trip | null>(null);
  const [viewTrip, setViewTrip] = useState<Trip | null>(null);
  const [dispatchTrip, setDispatchTrip] = useState<Trip | null>(null);
  const [cancelTrip, setCancelTrip] = useState<Trip | null>(null);

  const queryKey = ['trips', { page, search, status }];

  const { data, isLoading } = useQuery<PaginatedTrips>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '10', sortBy: 'createdAt', sortOrder: 'desc' });
      if (search) params.set('search', search);
      if (status !== 'all') params.set('status', status);
      const res = await fetch(`/api/trips?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load trips');
      return res.json() as Promise<PaginatedTrips>;
    },
    placeholderData: (prev) => prev,
  });

  const { data: availableVehicles } = useQuery<Vehicle[]>({
    queryKey: ['vehicles-available'],
    queryFn: async () => {
      const res = await fetch('/api/vehicles/available');
      if (!res.ok) throw new Error('Failed to load vehicles');
      return res.json() as Promise<Vehicle[]>;
    },
    enabled: createOpen,
  });

  const { data: availableDrivers } = useQuery<Driver[]>({
    queryKey: ['drivers-available'],
    queryFn: async () => {
      const res = await fetch('/api/drivers/available');
      if (!res.ok) throw new Error('Failed to load drivers');
      return res.json() as Promise<Driver[]>;
    },
    enabled: createOpen,
  });

  const createForm = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { source: '', destination: '', vehicleId: '', driverId: '', cargoWeight: 1000, plannedDistance: 100, notes: '' },
  });

  const completeForm = useForm<CompleteValues>({
    resolver: zodResolver(completeSchema),
    defaultValues: { finalOdometer: 0, fuelConsumed: 0, actualDistance: 0 },
  });

  const selectedVehicleId = createForm.watch('vehicleId');
  const cargoWeight = createForm.watch('cargoWeight');
  const selectedVehicle = availableVehicles?.find((v) => v.id === selectedVehicleId);
  const cargoExceeds = selectedVehicle && cargoWeight > selectedVehicle.maxLoadCapacity;

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['trips'] });
    queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    queryClient.invalidateQueries({ queryKey: ['drivers'] });
    queryClient.invalidateQueries({ queryKey: ['vehicles-available'] });
    queryClient.invalidateQueries({ queryKey: ['drivers-available'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
  };

  const createMutation = useMutation({
    mutationFn: async (values: CreateValues) => {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, notes: values.notes?.trim() || undefined }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? 'Failed to create trip');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Trip created successfully');
      invalidateAll();
      setCreateOpen(false);
      createForm.reset();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const dispatchMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/trips/${id}/dispatch`, { method: 'POST' });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? 'Failed to dispatch trip');
      }
    },
    onSuccess: () => {
      toast.success('Trip dispatched — vehicle & driver are now on trip');
      invalidateAll();
      setDispatchTrip(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/trips/${id}/cancel`, { method: 'POST' });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? 'Failed to cancel trip');
      }
    },
    onSuccess: () => {
      toast.success('Trip cancelled');
      invalidateAll();
      setCancelTrip(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const completeMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: CompleteValues }) => {
      const res = await fetch(`/api/trips/${id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? 'Failed to complete trip');
      }
    },
    onSuccess: () => {
      toast.success('Trip completed — vehicle & driver restored to available');
      invalidateAll();
      setCompleteTrip(null);
      completeForm.reset();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const openCreate = () => {
    createForm.reset({ source: '', destination: '', vehicleId: '', driverId: '', cargoWeight: 1000, plannedDistance: 100, notes: '' });
    setCreateOpen(true);
  };

  const openComplete = (t: Trip) => {
    setCompleteTrip(t);
    completeForm.reset({ finalOdometer: t.vehicle.odometer, fuelConsumed: 0, actualDistance: t.plannedDistance });
  };

  const trips = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalTrips = data?.total ?? 0;
  const draftTrips = trips.filter((t) => t.status === 'Draft').length;
  const dispatchedTrips = trips.filter((t) => t.status === 'Dispatched').length;
  const completedTrips = trips.filter((t) => t.status === 'Completed').length;
  const cancelledTrips = trips.filter((t) => t.status === 'Cancelled').length;

  return (
    <PageTransition>
    <div className="space-y-6">
      <PageHeader
        title="Trip Management"
        description="Create trips, dispatch vehicles, and track deliveries end-to-end."
        actions={
          <div className="flex gap-2">
            <RoleGuard action="reports:export">
              <Button variant="outline" onClick={() => exportCsv('trips', 'Trips')} disabled={exportLoading}>
                <Download className="size-4" /> Export
              </Button>
            </RoleGuard>
            <RoleGuard action="trip:create">
              <Button onClick={openCreate}>
                <Plus className="size-4" /> Create Trip
              </Button>
            </RoleGuard>
          </div>
        }
      />

      {/* Stats summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Card className="group transition-all hover:shadow-md">
          <div className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
              <Route className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Total Trips</p>
              <p className="text-xl font-bold">{totalTrips}</p>
            </div>
          </div>
        </Card>
        <Card className="group transition-all hover:shadow-md">
          <div className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-300">
              <Circle className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Draft</p>
              <p className="text-xl font-bold">{draftTrips}</p>
            </div>
          </div>
        </Card>
        <Card className="group transition-all hover:shadow-md">
          <div className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
              <Truck className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Dispatched</p>
              <p className="text-xl font-bold">{dispatchedTrips}</p>
            </div>
          </div>
        </Card>
        <Card className="group transition-all hover:shadow-md">
          <div className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              <CheckCircle2 className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Completed</p>
              <p className="text-xl font-bold">{completedTrips}</p>
            </div>
          </div>
        </Card>
        <Card className="group transition-all hover:shadow-md">
          <div className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
              <XCircle className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Cancelled</p>
              <p className="text-xl font-bold">{cancelledTrips}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by source or destination…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
          </div>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Route</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead className="text-right">Cargo</TableHead>
              <TableHead className="text-right">Distance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : trips.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="p-0">
                  <EmptyState
                    icon={Route}
                    title="No trips found"
                    description="Create your first trip by selecting an available vehicle and driver."
                    action={
                      <RoleGuard action="trip:create">
                        <Button onClick={openCreate} size="sm" variant="outline">
                          <Plus className="size-4" /> Create Trip
                        </Button>
                      </RoleGuard>
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              trips.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{t.source}</span>
                      <ArrowRight className="size-3 text-muted-foreground" />
                      <span className="font-medium">{t.destination}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs">{t.vehicle.registrationNumber}</span>
                  </TableCell>
                  <TableCell>{t.driver.name}</TableCell>
                  <TableCell className="text-right">{formatNumber(t.cargoWeight)} kg</TableCell>
                  <TableCell className="text-right">{formatNumber(t.plannedDistance)} km</TableCell>
                  <TableCell><TripStatusBadge status={t.status} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{format(new Date(t.createdAt), 'MMM d, HH:mm')}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {t.status === 'Draft' && (
                        <>
                          <RoleGuard action="trip:dispatch">
                            <Button size="sm" variant="default" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setDispatchTrip(t)}>
                              <Play className="size-3.5" /> Dispatch
                            </Button>
                          </RoleGuard>
                          <RoleGuard action="trip:cancel">
                            <Button size="sm" variant="outline" onClick={() => setCancelTrip(t)} className="text-destructive border-destructive/40 hover:bg-destructive/10">
                              <XCircle className="size-3.5" /> Cancel
                            </Button>
                          </RoleGuard>
                        </>
                      )}
                      {t.status === 'Dispatched' && (
                        <>
                          <RoleGuard action="trip:complete">
                            <Button size="sm" variant="default" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => openComplete(t)}>
                              <CheckCircle2 className="size-3.5" /> Complete
                            </Button>
                          </RoleGuard>
                          <RoleGuard action="trip:cancel">
                            <Button size="sm" variant="outline" onClick={() => setCancelTrip(t)} className="text-destructive border-destructive/40 hover:bg-destructive/10">
                              <XCircle className="size-3.5" /> Cancel
                            </Button>
                          </RoleGuard>
                        </>
                      )}
                      <Button size="sm" variant="ghost" asChild>
                        <Link href={`/trips/${t.id}`}>
                          <Eye className="size-3.5" /> View
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {trips.length > 0 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            Page <span className="font-medium text-foreground">{page}</span> of{' '}
            <span className="font-medium text-foreground">{totalPages}</span> · {data?.total ?? 0} trips
          </p>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              <ChevronLeft className="size-4" /> Prev
            </Button>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Create trip dialog */}
      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) createForm.reset(); }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Create New Trip</DialogTitle>
            <DialogDescription>
              Select an available vehicle and driver. Cargo weight must not exceed the vehicle's capacity.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit((v) => createMutation.mutate(v))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="source">Source</Label>
                <Input id="source" placeholder="Warehouse A" {...createForm.register('source')} />
                {createForm.formState.errors.source && <p className="text-xs text-destructive">{createForm.formState.errors.source.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="destination">Destination</Label>
                <Input id="destination" placeholder="Distribution Center B" {...createForm.register('destination')} />
                {createForm.formState.errors.destination && <p className="text-xs text-destructive">{createForm.formState.errors.destination.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Vehicle</Label>
                <Controller
                  control={createForm.control}
                  name="vehicleId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={availableVehicles?.length ? 'Select vehicle' : 'No vehicles available'} />
                      </SelectTrigger>
                      <SelectContent>
                        {(availableVehicles ?? []).map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            <span className="flex items-center gap-2">
                              <Truck className="size-3.5" /> {v.registrationNumber} · {v.model}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {selectedVehicle && (
                  <p className="text-xs text-muted-foreground">
                    Max capacity: {formatNumber(selectedVehicle.maxLoadCapacity)} kg · Odometer: {formatNumber(selectedVehicle.odometer)} km
                  </p>
                )}
                {createForm.formState.errors.vehicleId && <p className="text-xs text-destructive">{createForm.formState.errors.vehicleId.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Driver</Label>
                <Controller
                  control={createForm.control}
                  name="driverId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={availableDrivers?.length ? 'Select driver' : 'No drivers available'} />
                      </SelectTrigger>
                      <SelectContent>
                        {(availableDrivers ?? []).map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            <span className="flex items-center gap-2">
                              <Users className="size-3.5" /> {d.name} · {d.licenseCategory}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {createForm.formState.errors.driverId && <p className="text-xs text-destructive">{createForm.formState.errors.driverId.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cargoWeight">Cargo Weight (kg)</Label>
                <Input id="cargoWeight" type="number" step="1" {...createForm.register('cargoWeight', { valueAsNumber: true })} />
                {cargoExceeds && (
                  <p className="text-xs text-destructive">
                    Cargo exceeds vehicle max capacity ({formatNumber(selectedVehicle?.maxLoadCapacity ?? 0)} kg)
                  </p>
                )}
                {!cargoExceeds && createForm.formState.errors.cargoWeight && (
                  <p className="text-xs text-destructive">{createForm.formState.errors.cargoWeight.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="plannedDistance">Planned Distance (km)</Label>
                <Input id="plannedDistance" type="number" step="0.1" {...createForm.register('plannedDistance', { valueAsNumber: true })} />
                {createForm.formState.errors.plannedDistance && <p className="text-xs text-destructive">{createForm.formState.errors.plannedDistance.message}</p>}
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea id="notes" placeholder="Special instructions, delivery notes…" {...createForm.register('notes')} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || !!cargoExceeds}>
                {createMutation.isPending ? 'Creating…' : 'Create Trip'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Complete trip dialog */}
      <Dialog open={!!completeTrip} onOpenChange={(o) => { if (!o) { setCompleteTrip(null); completeForm.reset(); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Trip</DialogTitle>
            <DialogDescription>
              Enter the final readings. The vehicle will be marked available and a fuel log will be created automatically.
            </DialogDescription>
          </DialogHeader>
          {completeTrip && (
            <form onSubmit={completeForm.handleSubmit((values) => completeMutation.mutate({ id: completeTrip.id, values }))} className="space-y-4">
              <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{completeTrip.source}</span>
                  <ArrowRight className="size-3" />
                  <span className="font-medium">{completeTrip.destination}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Vehicle: {completeTrip.vehicle.registrationNumber} · Driver: {completeTrip.driver.name}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Current odometer: <strong>{formatNumber(completeTrip.vehicle.odometer)} km</strong>
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="finalOdometer">Final Odometer (km)</Label>
                <Input id="finalOdometer" type="number" step="0.1" {...completeForm.register('finalOdometer', { valueAsNumber: true })} />
                {completeForm.formState.errors.finalOdometer && <p className="text-xs text-destructive">{completeForm.formState.errors.finalOdometer.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fuelConsumed">Fuel Consumed (L)</Label>
                <Input id="fuelConsumed" type="number" step="0.01" {...completeForm.register('fuelConsumed', { valueAsNumber: true })} />
                {completeForm.formState.errors.fuelConsumed && <p className="text-xs text-destructive">{completeForm.formState.errors.fuelConsumed.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="actualDistance">Actual Distance (km)</Label>
                <Input id="actualDistance" type="number" step="0.1" {...completeForm.register('actualDistance', { valueAsNumber: true })} />
                {completeForm.formState.errors.actualDistance && <p className="text-xs text-destructive">{completeForm.formState.errors.actualDistance.message}</p>}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCompleteTrip(null)}>Cancel</Button>
                <Button type="submit" disabled={completeMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700">
                  {completeMutation.isPending ? 'Completing…' : 'Complete Trip'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Dispatch confirmation */}
      <AlertDialog open={!!dispatchTrip} onOpenChange={(o) => { if (!o) setDispatchTrip(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dispatch this trip?</AlertDialogTitle>
            <AlertDialogDescription>
              The vehicle <strong>{dispatchTrip?.vehicle.registrationNumber}</strong> and driver{' '}
              <strong>{dispatchTrip?.driver.name}</strong> will be marked as On Trip. This action will start the delivery.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => dispatchTrip && dispatchMutation.mutate(dispatchTrip.id)}
              disabled={dispatchMutation.isPending}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {dispatchMutation.isPending ? 'Dispatching…' : 'Dispatch Trip'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel confirmation */}
      <AlertDialog open={!!cancelTrip} onOpenChange={(o) => { if (!o) setCancelTrip(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this trip?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelTrip?.status === 'Dispatched'
                ? 'The vehicle and driver will be restored to Available status. This action cannot be undone.'
                : 'This trip is in Draft status. Cancelling will permanently mark it as cancelled.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Trip</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelTrip && cancelMutation.mutate(cancelTrip.id)}
              disabled={cancelMutation.isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {cancelMutation.isPending ? 'Cancelling…' : 'Cancel Trip'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View trip dialog */}
      <Dialog open={!!viewTrip} onOpenChange={(o) => { if (!o) setViewTrip(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Trip Details</DialogTitle>
            <DialogDescription>Trip from {viewTrip?.source} to {viewTrip?.destination}</DialogDescription>
          </DialogHeader>
          {viewTrip && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <TripStatusBadge status={viewTrip.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Vehicle</span>
                <span className="font-medium">{viewTrip.vehicle.registrationNumber} ({viewTrip.vehicle.model})</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Driver</span>
                <span className="font-medium">{viewTrip.driver.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Cargo</span>
                <span className="font-medium">{formatNumber(viewTrip.cargoWeight)} kg</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Planned distance</span>
                <span className="font-medium">{formatNumber(viewTrip.plannedDistance)} km</span>
              </div>
              {viewTrip.actualDistance !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Actual distance</span>
                  <span className="font-medium">{formatNumber(viewTrip.actualDistance)} km</span>
                </div>
              )}
              {viewTrip.fuelConsumed !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Fuel consumed</span>
                  <span className="font-medium">{formatNumber(viewTrip.fuelConsumed)} L</span>
                </div>
              )}
              {viewTrip.finalOdometer !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Final odometer</span>
                  <span className="font-medium">{formatNumber(viewTrip.finalOdometer)} km</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Created</span>
                <span className="font-medium">{format(new Date(viewTrip.createdAt), 'MMM d, yyyy HH:mm')}</span>
              </div>
              {viewTrip.dispatchedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Dispatched</span>
                  <span className="font-medium">{format(new Date(viewTrip.dispatchedAt), 'MMM d, yyyy HH:mm')}</span>
                </div>
              )}
              {viewTrip.completedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Completed</span>
                  <span className="font-medium">{format(new Date(viewTrip.completedAt), 'MMM d, yyyy HH:mm')}</span>
                </div>
              )}
              {viewTrip.notes && (
                <div className="rounded-md border bg-muted/40 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</p>
                  <p className="mt-1 text-sm">{viewTrip.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </PageTransition>
  );
}
