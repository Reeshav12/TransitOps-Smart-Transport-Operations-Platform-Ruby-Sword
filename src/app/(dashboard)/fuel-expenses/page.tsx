'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DollarSign, Fuel, Plus, Receipt } from 'lucide-react';
import { format, isSameMonth } from 'date-fns';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RoleGuard } from '@/components/shared/role-guard';
import { AccessDenied } from '@/components/shared/access-denied';
import { EmptyState } from '@/components/shared/empty-state';
import { PageTransition } from '@/components/shared/page-transition';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { PageHeader } from '@/components/layout/page-header';
import { expenseTypeEnum } from '@/lib/validation';

type Vehicle = { id: string; registrationNumber: string; model: string };

type FuelLog = {
  id: string;
  vehicleId: string;
  liters: number;
  cost: number;
  odometer: number;
  date: string;
  tripId: string | null;
  vehicle: Vehicle;
};

type Expense = {
  id: string;
  vehicleId: string;
  type: string;
  amount: number;
  description: string | null;
  date: string;
  vehicle: Vehicle;
};

type Paginated<T> = { data: T[]; total: number; page: number; limit: number; totalPages: number };

const EXPENSE_TYPES = expenseTypeEnum.options;

const EXPENSE_LABELS: Record<string, string> = {
  TOLL: 'Toll',
  MAINTENANCE: 'Maintenance',
  REPAIR: 'Repair',
  INSURANCE: 'Insurance',
  OTHER: 'Other',
};

const EXPENSE_BADGE: Record<string, string> = {
  TOLL: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300 border-sky-200 dark:border-sky-800',
  MAINTENANCE: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  REPAIR: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  INSURANCE: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300 border-violet-200 dark:border-violet-800',
  OTHER: 'bg-slate-100 text-slate-800 dark:bg-slate-800/40 dark:text-slate-300 border-slate-200 dark:border-slate-700',
};

function formatCurrency(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(v);
}
function formatNumber(v: number) {
  return new Intl.NumberFormat('en-US').format(v);
}

const fuelSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle is required'),
  liters: z.number().positive('Liters must be positive'),
  cost: z.number().positive('Cost must be positive'),
  odometer: z.number().min(0, 'Odometer must be non-negative'),
  date: z.string().min(1, 'Date is required'),
});
type FuelValues = z.infer<typeof fuelSchema>;

const expenseSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle is required'),
  type: expenseTypeEnum,
  amount: z.number().positive('Amount must be positive'),
  description: z.string().max(500),
  date: z.string().min(1, 'Date is required'),
});
type ExpenseValues = z.infer<typeof expenseSchema>;

export default function FuelExpensesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'fuel' | 'expenses'>('fuel');
  const [fuelDialogOpen, setFuelDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);

  const { data: fuelData, isLoading: fuelLoading } = useQuery<Paginated<FuelLog>>({
    queryKey: ['fuel-logs', { page: 1, limit: 50 }],
    queryFn: async () => {
      const res = await fetch('/api/fuel-logs?page=1&limit=50&sortBy=date&sortOrder=desc');
      if (!res.ok) throw new Error('Failed to load fuel logs');
      return res.json() as Promise<Paginated<FuelLog>>;
    },
  });

  const { data: expenseData, isLoading: expenseLoading } = useQuery<Paginated<Expense>>({
    queryKey: ['expenses', { page: 1, limit: 50 }],
    queryFn: async () => {
      const res = await fetch('/api/expenses?page=1&limit=50&sortBy=date&sortOrder=desc');
      if (!res.ok) throw new Error('Failed to load expenses');
      return res.json() as Promise<Paginated<Expense>>;
    },
  });

  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: ['vehicles-list-min'],
    queryFn: async () => {
      const res = await fetch('/api/vehicles?page=1&limit=100&sortBy=registrationNumber&sortOrder=asc');
      if (!res.ok) throw new Error('Failed to load vehicles');
      const json = (await res.json()) as Paginated<Vehicle>;
      return json.data;
    },
  });

  const fuelForm = useForm<FuelValues>({
    resolver: zodResolver(fuelSchema),
    defaultValues: { vehicleId: '', liters: 0, cost: 0, odometer: 0, date: format(new Date(), 'yyyy-MM-dd') },
  });

  const expenseForm = useForm<ExpenseValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { vehicleId: '', type: 'TOLL', amount: 0, description: '', date: format(new Date(), 'yyyy-MM-dd') },
  });

  const fuelMutation = useMutation({
    mutationFn: async (values: FuelValues) => {
      const res = await fetch('/api/fuel-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, date: new Date(values.date).toISOString() }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? 'Failed to create fuel log');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Fuel log created');
      queryClient.invalidateQueries({ queryKey: ['fuel-logs'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      setFuelDialogOpen(false);
      fuelForm.reset({ vehicleId: '', liters: 0, cost: 0, odometer: 0, date: format(new Date(), 'yyyy-MM-dd') });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const expenseMutation = useMutation({
    mutationFn: async (values: ExpenseValues) => {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId: values.vehicleId,
          type: values.type,
          amount: values.amount,
          description: values.description?.trim() || undefined,
          date: new Date(values.date).toISOString(),
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? 'Failed to create expense');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Expense created');
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      setExpenseDialogOpen(false);
      expenseForm.reset({ vehicleId: '', type: 'TOLL', amount: 0, description: '', date: format(new Date(), 'yyyy-MM-dd') });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const fuelLogs = fuelData?.data ?? [];
  const expenses = expenseData?.data ?? [];

  const now = new Date();
  const totalFuelThisMonth = fuelLogs
    .filter((l) => isSameMonth(new Date(l.date), now))
    .reduce((sum, l) => sum + l.cost, 0);
  const totalExpensesThisMonth = expenses
    .filter((e) => isSameMonth(new Date(e.date), now))
    .reduce((sum, e) => sum + e.amount, 0);
  const combined = totalFuelThisMonth + totalExpensesThisMonth;
  const totalFuelAllTime = fuelLogs.reduce((sum, l) => sum + l.cost, 0);
  const totalExpensesAllTime = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalLiters = fuelLogs.reduce((sum, l) => sum + l.liters, 0);
  const combinedAllTime = totalFuelAllTime + totalExpensesAllTime;

  return (
    <RoleGuard action="fuel:read" fallback={<AccessDenied />}>
      <PageTransition>
    <div className="space-y-6">
      <PageHeader
        title="Fuel & Expenses"
        description="Log fuel consumption and operational expenses across your fleet."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard label="Fuel Cost (This Month)" value={formatCurrency(totalFuelThisMonth)} icon={Fuel} tone="teal" hint={`${fuelLogs.filter((l) => isSameMonth(new Date(l.date), now)).length} fuel logs`} />
        <KpiCard label="Expenses (This Month)" value={formatCurrency(totalExpensesThisMonth)} icon={Receipt} tone="amber" hint={`${expenses.filter((e) => isSameMonth(new Date(e.date), now)).length} expense entries`} />
        <KpiCard label="Combined (This Month)" value={formatCurrency(combined)} icon={DollarSign} tone="rose" hint="Fuel + expenses" />
        <KpiCard label="Total Fuel (All Time)" value={formatCurrency(totalFuelAllTime)} icon={Fuel} tone="teal" hint={`${formatNumber(totalLiters)} L total`} />
        <KpiCard label="Total Expenses (All Time)" value={formatCurrency(totalExpensesAllTime)} icon={Receipt} tone="amber" hint={`${expenses.length} entries`} />
        <KpiCard label="Grand Total (All Time)" value={formatCurrency(combinedAllTime)} icon={DollarSign} tone="rose" hint={`${fuelLogs.length + expenses.length} total records`} />
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'fuel' | 'expenses')}>
        <TabsList>
          <TabsTrigger value="fuel"><Fuel className="size-3.5" /> Fuel Logs</TabsTrigger>
          <TabsTrigger value="expenses"><Receipt className="size-3.5" /> Expenses</TabsTrigger>
        </TabsList>

        {/* Fuel tab */}
        <TabsContent value="fuel" className="space-y-4">
          <div className="flex justify-end">
            <RoleGuard action="fuel:create">
              <Button onClick={() => setFuelDialogOpen(true)}>
                <Plus className="size-4" /> Add Fuel Log
              </Button>
            </RoleGuard>
          </div>
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead className="text-right">Liters</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Odometer</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fuelLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((__, j) => (
                        <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : fuelLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="p-0">
                      <EmptyState
                        icon={Fuel}
                        title="No fuel logs"
                        description="Log fuel purchases to track consumption and costs over time."
                        action={
                          <RoleGuard action="fuel:create">
                            <Button onClick={() => setFuelDialogOpen(true)} size="sm" variant="outline">
                              <Plus className="size-4" /> Add Fuel Log
                            </Button>
                          </RoleGuard>
                        }
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  fuelLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <span className="font-mono font-semibold">{log.vehicle.registrationNumber}</span>
                      </TableCell>
                      <TableCell className="text-right">{formatNumber(log.liters)} L</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(log.cost)}</TableCell>
                      <TableCell className="text-right">{formatNumber(log.odometer)} km</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(log.date), 'MMM d, yyyy')}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Expenses tab */}
        <TabsContent value="expenses" className="space-y-4">
          <div className="flex justify-end">
            <RoleGuard action="expense:create">
              <Button onClick={() => setExpenseDialogOpen(true)}>
                <Plus className="size-4" /> Add Expense
              </Button>
            </RoleGuard>
          </div>
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenseLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((__, j) => (
                        <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : expenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="p-0">
                      <EmptyState
                        icon={Receipt}
                        title="No expenses logged"
                        description="Track tolls, repairs, insurance, and other operational expenses."
                        action={
                          <RoleGuard action="expense:create">
                            <Button onClick={() => setExpenseDialogOpen(true)} size="sm" variant="outline">
                              <Plus className="size-4" /> Add Expense
                            </Button>
                          </RoleGuard>
                        }
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  expenses.map((exp) => (
                    <TableRow key={exp.id}>
                      <TableCell>
                        <span className="font-mono font-semibold">{exp.vehicle.registrationNumber}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={EXPENSE_BADGE[exp.type]}>
                          {EXPENSE_LABELS[exp.type] ?? exp.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(exp.amount)}</TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                        {exp.description ?? <span>—</span>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(exp.date), 'MMM d, yyyy')}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add fuel log dialog */}
      <Dialog open={fuelDialogOpen} onOpenChange={setFuelDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Fuel Log</DialogTitle>
            <DialogDescription>Record a fuel purchase for a vehicle.</DialogDescription>
          </DialogHeader>
          <form onSubmit={fuelForm.handleSubmit((v) => fuelMutation.mutate(v))} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Vehicle</Label>
              <Controller
                control={fuelForm.control}
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
              {fuelForm.formState.errors.vehicleId && <p className="text-xs text-destructive">{fuelForm.formState.errors.vehicleId.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="liters">Liters</Label>
                <Input id="liters" type="number" step="0.01" {...fuelForm.register('liters', { valueAsNumber: true })} />
                {fuelForm.formState.errors.liters && <p className="text-xs text-destructive">{fuelForm.formState.errors.liters.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cost">Cost ($)</Label>
                <Input id="cost" type="number" step="0.01" {...fuelForm.register('cost', { valueAsNumber: true })} />
                {fuelForm.formState.errors.cost && <p className="text-xs text-destructive">{fuelForm.formState.errors.cost.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="odometer">Odometer (km)</Label>
                <Input id="odometer" type="number" step="1" {...fuelForm.register('odometer', { valueAsNumber: true })} />
                {fuelForm.formState.errors.odometer && <p className="text-xs text-destructive">{fuelForm.formState.errors.odometer.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" {...fuelForm.register('date')} />
                {fuelForm.formState.errors.date && <p className="text-xs text-destructive">{fuelForm.formState.errors.date.message}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFuelDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={fuelMutation.isPending}>
                {fuelMutation.isPending ? 'Saving…' : 'Save Fuel Log'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add expense dialog */}
      <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
            <DialogDescription>Record an operational expense for a vehicle.</DialogDescription>
          </DialogHeader>
          <form onSubmit={expenseForm.handleSubmit((v) => expenseMutation.mutate(v))} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Vehicle</Label>
              <Controller
                control={expenseForm.control}
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
              {expenseForm.formState.errors.vehicleId && <p className="text-xs text-destructive">{expenseForm.formState.errors.vehicleId.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Controller
                  control={expenseForm.control}
                  name="type"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {EXPENSE_TYPES.map((t) => <SelectItem key={t} value={t}>{EXPENSE_LABELS[t] ?? t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="amount">Amount ($)</Label>
                <Input id="amount" type="number" step="0.01" {...expenseForm.register('amount', { valueAsNumber: true })} />
                {expenseForm.formState.errors.amount && <p className="text-xs text-destructive">{expenseForm.formState.errors.amount.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="exp-date">Date</Label>
                <Input id="exp-date" type="date" {...expenseForm.register('date')} />
                {expenseForm.formState.errors.date && <p className="text-xs text-destructive">{expenseForm.formState.errors.date.message}</p>}
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="exp-desc">Description (optional)</Label>
                <Textarea id="exp-desc" placeholder="Notes about this expense…" {...expenseForm.register('description')} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setExpenseDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={expenseMutation.isPending}>
                {expenseMutation.isPending ? 'Saving…' : 'Save Expense'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
    </PageTransition>
    </RoleGuard>
  );
}
