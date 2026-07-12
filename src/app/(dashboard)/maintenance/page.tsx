'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronLeft, ChevronRight, DollarSign, Info, Plus, Wrench, CheckCircle2, AlertCircle, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';
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
import { AccessDenied } from '@/components/shared/access-denied';
import { EmptyState } from '@/components/shared/empty-state';
import { PageTransition } from '@/components/shared/page-transition';
import { PageHeader } from '@/components/layout/page-header';
import { maintenanceTypeEnum, maintenanceStatusEnum } from '@/lib/validation';

type Vehicle = { id: string; registrationNumber: string; model: string; status: string };

type MaintenanceLog = {
  id: string;
  vehicleId: string;
  type: string;
  description: string | null;
  cost: number;
  status: string;
  startDate: string;
  endDate: string | null;
  createdAt: string;
  vehicle: Vehicle;
};

type PaginatedLogs = {
  data: MaintenanceLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

const TYPES = maintenanceTypeEnum.options;
const STATUSES = maintenanceStatusEnum.options;

const TYPE_LABELS: Record<string, string> = {
  OIL_CHANGE: 'Oil Change',
  TIRE_ROTATION: 'Tire Rotation',
  BRAKE_SERVICE: 'Brake Service',
  ENGINE_REPAIR: 'Engine Repair',
  INSPECTION: 'Inspection',
  OTHER: 'Other',
};

function formatCurrency(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(v);
}

const formSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle is required'),
  type: maintenanceTypeEnum,
  description: z.string().max(500),
  cost: z.number().min(0, 'Cost must be non-negative'),
});
type FormValues = z.infer<typeof formSchema>;

export default function MaintenancePage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [vehicleId, setVehicleId] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [closeTarget, setCloseTarget] = useState<MaintenanceLog | null>(null);

  const queryKey = ['maintenance', { page, vehicleId, status }];

  const { data, isLoading } = useQuery<PaginatedLogs>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '10', sortBy: 'createdAt', sortOrder: 'desc' });
      if (vehicleId !== 'all') params.set('vehicleId', vehicleId);
      if (status !== 'all') params.set('status', status);
      const res = await fetch(`/api/maintenance?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load maintenance logs');
      return res.json() as Promise<PaginatedLogs>;
    },
    placeholderData: (prev) => prev,
  });

  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: ['vehicles-list-min'],
    queryFn: async () => {
      const res = await fetch('/api/vehicles?page=1&limit=100&sortBy=registrationNumber&sortOrder=asc');
      if (!res.ok) throw new Error('Failed to load vehicles');
      const json = (await res.json()) as PaginatedLogs & { data: Vehicle[] };
      return json.data;
    },
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { vehicleId: '', type: 'OIL_CHANGE', description: '', cost: 0 },
  });

  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId: values.vehicleId,
          type: values.type,
          description: values.description?.trim() || undefined,
          cost: values.cost,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? 'Failed to create maintenance record');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Maintenance record created — vehicle marked In Shop');
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      setDialogOpen(false);
      reset({ vehicleId: '', type: 'OIL_CHANGE', description: '', cost: 0 });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const closeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/maintenance/${id}/close`, { method: 'POST' });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? 'Failed to close maintenance record');
      }
    },
    onSuccess: () => {
      toast.success('Maintenance closed — vehicle restored to Available');
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      setCloseTarget(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const openCreate = () => {
    reset({ vehicleId: '', type: 'OIL_CHANGE', description: '', cost: 0 });
    setDialogOpen(true);
  };

  const logs = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalRecords = data?.total ?? 0;
  const openRecords = logs.filter((l) => l.status === 'Open').length;
  const closedRecords = logs.filter((l) => l.status === 'Closed').length;
  const totalCost = logs.reduce((sum, l) => sum + l.cost, 0);

  return (
    <RoleGuard action="maintenance:read" fallback={<AccessDenied />}>
      <PageTransition>
    <div className="space-y-6">
      <PageHeader
        title="Maintenance Log"
        description="Track vehicle maintenance records and auto-manage In Shop status."
        actions={
          <RoleGuard action="maintenance:create">
            <Button onClick={openCreate}>
              <Plus className="size-4" /> Add Record
            </Button>
          </RoleGuard>
        }
      />

      <Alert className="border-teal-300 bg-teal-50 text-teal-900 dark:border-teal-700 dark:bg-teal-950/40 dark:text-teal-200">
        <Info className="size-4" />
        <AlertTitle>Auto status management</AlertTitle>
        <AlertDescription>
          Creating a maintenance record automatically sets the vehicle to <strong>In Shop</strong>.
          Closing it restores the vehicle to <strong>Available</strong> (unless retired).
        </AlertDescription>
      </Alert>

      {/* Stats summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="group transition-all hover:shadow-md">
          <div className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
              <ClipboardList className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Total Records</p>
              <p className="text-xl font-bold">{totalRecords}</p>
            </div>
          </div>
        </Card>
        <Card className="group transition-all hover:shadow-md">
          <div className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              <AlertCircle className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Open</p>
              <p className="text-xl font-bold">{openRecords}</p>
            </div>
          </div>
        </Card>
        <Card className="group transition-all hover:shadow-md">
          <div className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              <CheckCircle2 className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Closed</p>
              <p className="text-xl font-bold">{closedRecords}</p>
            </div>
          </div>
        </Card>
        <Card className="group transition-all hover:shadow-md">
          <div className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
              <DollarSign className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Total Cost</p>
              <p className="text-xl font-bold">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalCost)}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Select value={vehicleId} onValueChange={(v) => { setVehicleId(v); setPage(1); }}>
            <SelectTrigger className="w-full"><SelectValue placeholder="All vehicles" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All vehicles</SelectItem>
              {(vehicles ?? []).map((v) => (
                <SelectItem key={v.id} value={v.id}>{v.registrationNumber} · {v.model}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
              <TableHead>Vehicle</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>End Date</TableHead>
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
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="p-0">
                  <EmptyState
                    icon={Wrench}
                    title="No maintenance records"
                    description="Add a maintenance record to track servicing. The vehicle will be marked In Shop automatically."
                    action={
                      <RoleGuard action="maintenance:create">
                        <Button onClick={openCreate} size="sm" variant="outline">
                          <Plus className="size-4" /> Add Record
                        </Button>
                      </RoleGuard>
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-mono font-semibold">{log.vehicle.registrationNumber}</span>
                      <span className="text-xs text-muted-foreground">{log.vehicle.model}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                      {TYPE_LABELS[log.type] ?? log.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                    {log.description ?? <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(log.cost)}</TableCell>
                  <TableCell>
                    {log.status === 'Open' ? (
                      <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                        Open
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                        Closed
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{format(new Date(log.startDate), 'MMM d, yyyy')}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {log.endDate ? format(new Date(log.endDate), 'MMM d, yyyy') : <span>—</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    {log.status === 'Open' ? (
                      <RoleGuard action="maintenance:close">
                        <Button size="sm" variant="outline" onClick={() => setCloseTarget(log)}>
                          Close
                        </Button>
                      </RoleGuard>
                    ) : (
                      <span className="text-xs text-muted-foreground">No actions</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {logs.length > 0 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            Page <span className="font-medium text-foreground">{page}</span> of{' '}
            <span className="font-medium text-foreground">{totalPages}</span> · {data?.total ?? 0} records
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Maintenance Record</DialogTitle>
            <DialogDescription>
              The selected vehicle will be marked In Shop. Closing the record will restore it to Available.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit((v) => createMutation.mutate(v))} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Vehicle</Label>
              <Controller
                control={control}
                name="vehicleId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                    <SelectContent>
                      {(vehicles ?? []).map((v) => (
                        <SelectItem key={v.id} value={v.id}>{v.registrationNumber} · {v.model}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.vehicleId && <p className="text-xs text-destructive">{errors.vehicleId.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Maintenance Type</Label>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TYPES.map((t) => <SelectItem key={t} value={t}>{TYPE_LABELS[t] ?? t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cost">Cost ($)</Label>
              <Input id="cost" type="number" step="0.01" {...register('cost', { valueAsNumber: true })} />
              {errors.cost && <p className="text-xs text-destructive">{errors.cost.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea id="description" placeholder="Notes about the maintenance work…" {...register('description')} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating…' : 'Create Record'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!closeTarget} onOpenChange={(o) => { if (!o) setCloseTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close this maintenance record?</AlertDialogTitle>
            <AlertDialogDescription>
              Closing the record for <strong>{closeTarget?.vehicle.registrationNumber}</strong> will mark it as Closed
              and restore the vehicle to Available status (unless retired).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => closeTarget && closeMutation.mutate(closeTarget.id)}
              disabled={closeMutation.isPending}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {closeMutation.isPending ? 'Closing…' : 'Close Record'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </PageTransition>
    </RoleGuard>
  );
}
