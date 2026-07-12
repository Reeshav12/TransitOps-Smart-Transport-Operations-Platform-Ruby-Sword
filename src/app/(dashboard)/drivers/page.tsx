'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, ChevronLeft, ChevronRight, CheckCircle2, Clock, Download, Pencil, Plus, Search, Shield, Trash2, Truck, Users, Eye } from 'lucide-react';
import { format, differenceInCalendarDays } from 'date-fns';
import Link from 'next/link';
import { toast } from 'sonner';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
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
import { DriverStatusBadge } from '@/components/drivers/driver-status-badge';
import { driverCategoryEnum, driverStatusEnum } from '@/lib/validation';

type Driver = {
  id: string;
  name: string;
  licenseNumber: string;
  licenseCategory: string;
  licenseExpiry: string;
  contactNumber: string;
  safetyScore: number;
  status: string;
  createdAt: string;
};

type PaginatedDrivers = {
  data: Driver[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

const CATEGORIES = driverCategoryEnum.options;
const STATUSES = driverStatusEnum.options;

function expiryMeta(dateStr: string): { label: string; tone: 'red' | 'amber' | 'green' } {
  const date = new Date(dateStr);
  const days = differenceInCalendarDays(date, new Date());
  if (days < 0) return { label: `Expired ${Math.abs(days)}d ago`, tone: 'red' };
  if (days <= 30) return { label: `In ${days}d`, tone: 'amber' };
  return { label: `${days}d left`, tone: 'green' };
}

const EXPIRY_TONE: Record<'red' | 'amber' | 'green', string> = {
  red: 'text-red-600 dark:text-red-400',
  amber: 'text-amber-600 dark:text-amber-400',
  green: 'text-emerald-600 dark:text-emerald-400',
};

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).trim(),
  licenseNumber: z.string().min(3, 'License number must be at least 3 characters').max(30).trim().toUpperCase(),
  licenseCategory: driverCategoryEnum,
  licenseExpiry: z.string().refine((v) => {
    const d = new Date(v);
    return !Number.isNaN(d.getTime()) && d > new Date();
  }, 'License expiry must be a future date'),
  contactNumber: z.string().min(7, 'Contact number must be at least 7 characters').max(20).trim(),
  safetyScore: z.number().min(0).max(100),
  status: driverStatusEnum,
});

type FormValues = z.infer<typeof formSchema>;

export default function DriversPage() {
  const queryClient = useQueryClient();
  const { exportCsv, exporting: exportLoading } = useCsvExport();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [category, setCategory] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Driver | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Driver | null>(null);

  const queryKey = ['drivers', { page, search, status, category }];

  const { data, isLoading } = useQuery<PaginatedDrivers>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '10', sortBy: 'createdAt', sortOrder: 'desc' });
      if (search) params.set('search', search);
      if (status !== 'all') params.set('status', status);
      if (category !== 'all') params.set('licenseCategory', category);
      const res = await fetch(`/api/drivers?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load drivers');
      return res.json() as Promise<PaginatedDrivers>;
    },
    placeholderData: (prev) => prev,
  });

  const { data: expiring } = useQuery<Driver[]>({
    queryKey: ['drivers-expiring', 30],
    queryFn: async () => {
      const res = await fetch('/api/drivers/expiring?days=30');
      if (!res.ok) throw new Error('Failed to load expiring drivers');
      return res.json() as Promise<Driver[]>;
    },
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      licenseNumber: '',
      licenseCategory: 'B',
      licenseExpiry: '',
      contactNumber: '',
      safetyScore: 100,
      status: 'Available',
    },
  });

  const safetyScore = watch('safetyScore');

  const upsertMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const url = editing ? `/api/drivers/${editing.id}` : '/api/drivers';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? 'Failed to save driver');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success(editing ? 'Driver updated successfully' : 'Driver created successfully');
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      setDialogOpen(false);
      setEditing(null);
      reset();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/drivers/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? 'Failed to delete driver');
      }
    },
    onSuccess: () => {
      toast.success('Driver deleted');
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      setDeleteTarget(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const openCreate = () => {
    setEditing(null);
    reset({
      name: '', licenseNumber: '', licenseCategory: 'B', licenseExpiry: '',
      contactNumber: '', safetyScore: 100, status: 'Available',
    });
    setDialogOpen(true);
  };

  const openEdit = (d: Driver) => {
    setEditing(d);
    reset({
      name: d.name,
      licenseNumber: d.licenseNumber,
      licenseCategory: d.licenseCategory as FormValues['licenseCategory'],
      licenseExpiry: format(new Date(d.licenseExpiry), 'yyyy-MM-dd'),
      contactNumber: d.contactNumber,
      safetyScore: d.safetyScore,
      status: d.status as FormValues['status'],
    });
    setDialogOpen(true);
  };

  const drivers = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalDrivers = data?.total ?? 0;
  const availableDrivers = drivers.filter((d) => d.status === 'Available').length;
  const onTripDrivers = drivers.filter((d) => d.status === 'OnTrip').length;
  const offDutyDrivers = drivers.filter((d) => d.status === 'OffDuty').length;
  const avgSafetyScore = drivers.length > 0
    ? Math.round(drivers.reduce((sum, d) => sum + d.safetyScore, 0) / drivers.length)
    : 0;

  return (
    <PageTransition>
    <div className="space-y-6">
      <PageHeader
        title="Driver Management"
        description="Track driver licenses, safety scores, and availability."
        actions={
          <div className="flex gap-2">
            <RoleGuard action="reports:export">
              <Button variant="outline" onClick={() => exportCsv('drivers', 'Drivers')} disabled={exportLoading}>
                <Download className="size-4" /> Export
              </Button>
            </RoleGuard>
            <RoleGuard action="driver:create">
              <Button onClick={openCreate}>
                <Plus className="size-4" /> Add Driver
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
              <Users className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Total</p>
              <p className="text-xl font-bold">{totalDrivers}</p>
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
              <p className="text-xl font-bold">{availableDrivers}</p>
            </div>
          </div>
        </Card>
        <Card className="group transition-all hover:shadow-md">
          <div className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
              <Truck className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">On Trip</p>
              <p className="text-xl font-bold">{onTripDrivers}</p>
            </div>
          </div>
        </Card>
        <Card className="group transition-all hover:shadow-md">
          <div className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-300">
              <Clock className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Off Duty</p>
              <p className="text-xl font-bold">{offDutyDrivers}</p>
            </div>
          </div>
        </Card>
        <Card className="group transition-all hover:shadow-md">
          <div className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
              <Shield className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Avg Safety</p>
              <p className="text-xl font-bold">{avgSafetyScore}<span className="text-sm text-muted-foreground">/100</span></p>
            </div>
          </div>
        </Card>
      </div>

      {expiring && expiring.length > 0 && (
        <Alert className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangle className="size-4" />
          <AlertTitle>License expiration alert</AlertTitle>
          <AlertDescription>
            <strong>{expiring.length}</strong> driver license{expiring.length === 1 ? '' : 's'} expire within the next 30 days.{' '}
            {expiring.slice(0, 3).map((d) => d.name).join(', ')}
            {expiring.length > 3 ? ` … +${expiring.length - 3} more` : ''}.
          </AlertDescription>
        </Alert>
      )}

      {/* Filter bar */}
      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or license number…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s === 'OnTrip' ? 'On Trip' : s === 'OffDuty' ? 'Off Duty' : s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1); }}>
            <SelectTrigger className="w-full"><SelectValue placeholder="License category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>License #</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>License Expiry</TableHead>
              <TableHead className="w-32">Safety Score</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : drivers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="p-0">
                  <EmptyState
                    icon={Users}
                    title="No drivers found"
                    description="Try adjusting your filters, or add a new driver to your team."
                    action={
                      <RoleGuard action="driver:create">
                        <Button onClick={openCreate} size="sm" variant="outline">
                          <Plus className="size-4" /> Add Driver
                        </Button>
                      </RoleGuard>
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              drivers.map((d) => {
                const meta = expiryMeta(d.licenseExpiry);
                return (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell className="font-mono text-xs">{d.licenseNumber}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300 border-violet-200 dark:border-violet-800">
                        {d.licenseCategory}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm">{format(new Date(d.licenseExpiry), 'MMM d, yyyy')}</span>
                        <span className={`text-xs ${EXPIRY_TONE[meta.tone]}`}>{meta.label}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={d.safetyScore} className="h-2" />
                        <span className="w-8 text-right text-xs font-medium tabular-nums">{d.safetyScore}</span>
                      </div>
                    </TableCell>
                    <TableCell><DriverStatusBadge status={d.status} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" asChild aria-label="View">
                          <Link href={`/drivers/${d.id}`}><Eye className="size-4" /></Link>
                        </Button>
                        <RoleGuard action="driver:update">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(d)} aria-label="Edit">
                            <Pencil className="size-4" />
                          </Button>
                        </RoleGuard>
                        <RoleGuard action="driver:delete">
                          <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(d)} aria-label="Delete">
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </RoleGuard>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {drivers.length > 0 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            Page <span className="font-medium text-foreground">{page}</span> of{' '}
            <span className="font-medium text-foreground">{totalPages}</span> · {data?.total ?? 0} drivers
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
            <DialogTitle>{editing ? 'Edit Driver' : 'Add New Driver'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Update the driver details below. License numbers must be unique.'
                : 'Register a new driver. The license expiry must be a future date.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit((v) => upsertMutation.mutate(v))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" placeholder="Jane Driver" {...register('name')} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="licenseNumber">License Number</Label>
                <Input id="licenseNumber" placeholder="DL-2024-XYZ" {...register('licenseNumber')} />
                {errors.licenseNumber && <p className="text-xs text-destructive">{errors.licenseNumber.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>License Category</Label>
                <Controller
                  control={control}
                  name="licenseCategory"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="licenseExpiry">License Expiry</Label>
                <Input id="licenseExpiry" type="date" {...register('licenseExpiry')} />
                {errors.licenseExpiry && <p className="text-xs text-destructive">{errors.licenseExpiry.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contactNumber">Contact Number</Label>
                <Input id="contactNumber" placeholder="+91 98765 43210" {...register('contactNumber')} />
                {errors.contactNumber && <p className="text-xs text-destructive">{errors.contactNumber.message}</p>}
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Status</Label>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>{s === 'OnTrip' ? 'On Trip' : s === 'OffDuty' ? 'Off Duty' : s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="safetyScore">Safety Score</Label>
                  <span className="text-sm font-semibold tabular-nums">{safetyScore}</span>
                </div>
                <Controller
                  control={control}
                  name="safetyScore"
                  render={({ field }) => (
                    <Slider
                      value={[field.value]}
                      onValueChange={(v) => field.onChange(v[0])}
                      min={0}
                      max={100}
                      step={1}
                    />
                  )}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setEditing(null); }}>Cancel</Button>
              <Button type="submit" disabled={upsertMutation.isPending}>
                {upsertMutation.isPending ? 'Saving…' : editing ? 'Update Driver' : 'Create Driver'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete driver?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong> (license: {deleteTarget?.licenseNumber}).
              This action cannot be undone.
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
