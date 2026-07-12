'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Truck, Search, ChevronLeft, ChevronRight, Eye, CheckCircle2, Route, Wrench, Archive, Download } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
import { Skeleton } from '@/components/ui/skeleton';
import { RoleGuard } from '@/components/shared/role-guard';
import { EmptyState } from '@/components/shared/empty-state';
import { PageTransition } from '@/components/shared/page-transition';
import { useCsvExport } from '@/hooks/use-csv-export';
import { PageHeader } from '@/components/layout/page-header';
import { VehicleStatusBadge } from '@/components/vehicles/vehicle-status-badge';
import { vehicleTypeEnum, vehicleStatusEnum } from '@/lib/validation';

type Vehicle = {
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
};

type PaginatedVehicles = {
  data: Vehicle[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

const VEHICLE_TYPES = vehicleTypeEnum.options;
const VEHICLE_STATUSES = vehicleStatusEnum.options;

const TYPE_BADGE: Record<string, string> = {
  TRUCK: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 border-teal-200 dark:border-teal-800',
  VAN: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300 border-sky-200 dark:border-sky-800',
  BUS: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300 border-violet-200 dark:border-violet-800',
  TRAILER: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  CAR: 'bg-slate-100 text-slate-800 dark:bg-slate-800/40 dark:text-slate-300 border-slate-200 dark:border-slate-700',
};

function formatNumber(v: number) {
  return new Intl.NumberFormat('en-US').format(v);
}

const formSchema = z.object({
  registrationNumber: z.string().min(2, 'Registration number must be at least 2 characters').max(20).trim().toUpperCase(),
  model: z.string().min(2, 'Model must be at least 2 characters').max(100).trim(),
  type: vehicleTypeEnum,
  maxLoadCapacity: z.number().positive('Max load capacity must be positive').max(100000, 'Max load capacity too large'),
  odometer: z.number().min(0, 'Odometer must be non-negative'),
  acquisitionCost: z.number().positive('Acquisition cost must be positive'),
  status: vehicleStatusEnum,
  region: z.string().max(50),
});

type FormValues = z.infer<typeof formSchema>;

export default function VehiclesPage() {
  const queryClient = useQueryClient();
  const { exportCsv, exporting: exportLoading } = useCsvExport();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [type, setType] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null);

  const queryKey = ['vehicles', { page, search, type, status }];

  const { data, isLoading } = useQuery<PaginatedVehicles>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: '10',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      if (search) params.set('search', search);
      if (type !== 'all') params.set('type', type);
      if (status !== 'all') params.set('status', status);
      const res = await fetch(`/api/vehicles?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load vehicles');
      return res.json() as Promise<PaginatedVehicles>;
    },
    placeholderData: (prev) => prev,
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      registrationNumber: '',
      model: '',
      type: 'TRUCK',
      maxLoadCapacity: 1000,
      odometer: 0,
      acquisitionCost: 50000,
      status: 'Available',
      region: '',
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        registrationNumber: values.registrationNumber,
        model: values.model,
        type: values.type,
        maxLoadCapacity: values.maxLoadCapacity,
        odometer: values.odometer,
        acquisitionCost: values.acquisitionCost,
        status: values.status,
        region: values.region.trim() || undefined,
      };
      const url = editing ? `/api/vehicles/${editing.id}` : '/api/vehicles';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? 'Failed to save vehicle');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success(editing ? 'Vehicle updated successfully' : 'Vehicle created successfully');
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setDialogOpen(false);
      setEditing(null);
      reset();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/vehicles/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? 'Failed to delete vehicle');
      }
    },
    onSuccess: () => {
      toast.success('Vehicle deleted');
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setDeleteTarget(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const openCreate = () => {
    setEditing(null);
    reset({
      registrationNumber: '',
      model: '',
      type: 'TRUCK',
      maxLoadCapacity: 1000,
      odometer: 0,
      acquisitionCost: 50000,
      status: 'Available',
      region: '',
    });
    setDialogOpen(true);
  };

  const openEdit = (v: Vehicle) => {
    setEditing(v);
    reset({
      registrationNumber: v.registrationNumber,
      model: v.model,
      type: v.type as FormValues['type'],
      maxLoadCapacity: v.maxLoadCapacity,
      odometer: v.odometer,
      acquisitionCost: v.acquisitionCost,
      status: v.status as FormValues['status'],
      region: v.region ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = (values: FormValues) => upsertMutation.mutate(values);

  const vehicles = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalVehicles = data?.total ?? 0;
  const availableCount = vehicles.filter((v) => v.status === 'Available').length;
  const onTripCount = vehicles.filter((v) => v.status === 'OnTrip').length;
  const inShopCount = vehicles.filter((v) => v.status === 'InShop').length;
  const retiredCount = vehicles.filter((v) => v.status === 'Retired').length;

  return (
    <PageTransition>
    <div className="space-y-6">
      <PageHeader
        title="Vehicle Registry"
        description="Manage your fleet assets, capacities, and lifecycle status."
        actions={
          <div className="flex gap-2">
            <RoleGuard action="reports:export">
              <Button variant="outline" onClick={() => exportCsv('vehicles', 'Vehicles')} disabled={exportLoading}>
                <Download className="size-4" /> Export
              </Button>
            </RoleGuard>
            <RoleGuard action="vehicle:create">
              <Button onClick={openCreate}>
                <Plus className="size-4" /> Add Vehicle
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
              <Truck className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Total</p>
              <p className="text-xl font-bold">{totalVehicles}</p>
            </div>
          </div>
        </Card>
        <Card className="group transition-all hover:shadow-md">
          <div className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              <CheckCircle2 className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Available</p>
              <p className="text-xl font-bold">{availableCount}</p>
            </div>
          </div>
        </Card>
        <Card className="group transition-all hover:shadow-md">
          <div className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
              <Route className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">On Trip</p>
              <p className="text-xl font-bold">{onTripCount}</p>
            </div>
          </div>
        </Card>
        <Card className="group transition-all hover:shadow-md">
          <div className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              <Wrench className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">In Shop</p>
              <p className="text-xl font-bold">{inShopCount}</p>
            </div>
          </div>
        </Card>
        <Card className="group transition-all hover:shadow-md">
          <div className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-300">
              <Archive className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Retired</p>
              <p className="text-xl font-bold">{retiredCount}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter bar */}
      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by registration or model…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <Select value={type} onValueChange={(v) => { setType(v); setPage(1); }}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {VEHICLE_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {VEHICLE_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s === 'OnTrip' ? 'On Trip' : s === 'InShop' ? 'In Shop' : s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Registration #</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Max Capacity</TableHead>
              <TableHead className="text-right">Odometer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Region</TableHead>
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
            ) : vehicles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="p-0">
                  <EmptyState
                    icon={Truck}
                    title="No vehicles found"
                    description="Try adjusting your filters, or add a new vehicle to your fleet."
                    action={
                      <RoleGuard action="vehicle:create">
                        <Button onClick={openCreate} size="sm" variant="outline">
                          <Plus className="size-4" /> Add Vehicle
                        </Button>
                      </RoleGuard>
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              vehicles.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-mono font-semibold">{v.registrationNumber}</TableCell>
                  <TableCell>{v.model}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={TYPE_BADGE[v.type]}>{v.type}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatNumber(v.maxLoadCapacity)} kg</TableCell>
                  <TableCell className="text-right">{formatNumber(v.odometer)} km</TableCell>
                  <TableCell><VehicleStatusBadge status={v.status} /></TableCell>
                  <TableCell>{v.region ?? <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" asChild aria-label="View">
                        <Link href={`/vehicles/${v.id}`}><Eye className="size-4" /></Link>
                      </Button>
                      <RoleGuard action="vehicle:update">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(v)} aria-label="Edit">
                          <Pencil className="size-4" />
                        </Button>
                      </RoleGuard>
                      <RoleGuard action="vehicle:delete">
                        <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(v)} aria-label="Delete">
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </RoleGuard>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      {vehicles.length > 0 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            Page <span className="font-medium text-foreground">{page}</span> of{' '}
            <span className="font-medium text-foreground">{totalPages}</span> ·{' '}
            {data?.total ?? 0} vehicles
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

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Vehicle' : 'Add New Vehicle'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Update the vehicle details below. Registration numbers must be unique.'
                : 'Register a new vehicle in your fleet. All fields marked are required.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="registrationNumber">Registration Number</Label>
                <Input id="registrationNumber" placeholder="DL-01-AB-1234" {...register('registrationNumber')} />
                {errors.registrationNumber && <p className="text-xs text-destructive">{errors.registrationNumber.message}</p>}
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="model">Model</Label>
                <Input id="model" placeholder="Tata LPT 1613" {...register('model')} />
                {errors.model && <p className="text-xs text-destructive">{errors.model.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Controller
                  control={control}
                  name="type"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {VEHICLE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {VEHICLE_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>{s === 'OnTrip' ? 'On Trip' : s === 'InShop' ? 'In Shop' : s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="maxLoadCapacity">Max Capacity (kg)</Label>
                <Input id="maxLoadCapacity" type="number" step="1" {...register('maxLoadCapacity', { valueAsNumber: true })} />
                {errors.maxLoadCapacity && <p className="text-xs text-destructive">{errors.maxLoadCapacity.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="odometer">Odometer (km)</Label>
                <Input id="odometer" type="number" step="1" {...register('odometer', { valueAsNumber: true })} />
                {errors.odometer && <p className="text-xs text-destructive">{errors.odometer.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="acquisitionCost">Acquisition Cost ($)</Label>
                <Input id="acquisitionCost" type="number" step="0.01" {...register('acquisitionCost', { valueAsNumber: true })} />
                {errors.acquisitionCost && <p className="text-xs text-destructive">{errors.acquisitionCost.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="region">Region (optional)</Label>
                <Input id="region" placeholder="e.g. North" {...register('region')} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setEditing(null); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={upsertMutation.isPending}>
                {upsertMutation.isPending ? 'Saving…' : editing ? 'Update Vehicle' : 'Create Vehicle'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete vehicle?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.registrationNumber}</strong> ({deleteTarget?.model}).
              This action cannot be undone. Vehicles with active trips cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </PageTransition>
  );
}
