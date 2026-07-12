'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  CarFront,
  ClipboardList,
  Clock,
  DollarSign,
  Fuel,
  Gauge,
  History,
  TrendingUp,
  Truck,
  UserCheck,
  Wrench,
  Plus,
  Route,
  FileDown,
  ArrowRight,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { PageHeader } from '@/components/layout/page-header';
import { PageTransition, StaggerGroup, StaggerItem } from '@/components/shared/page-transition';

interface DashboardKPIs {
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

interface TripTrendItem {
  date: string;
  trips: number;
  completed: number;
}

interface AnalyticsResponse {
  vehicleAnalytics: unknown[];
  tripTrend: TripTrendItem[];
  costBreakdown: { fuel: number; maintenance: number; other: number };
}

interface AuditLogItem {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: string | null;
  timestamp: string;
  user: { name: string; email: string };
}

const COST_COLORS = ['#0d9488', '#10b981', '#f59e0b'];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function KpiSkeleton() {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-0">
        <Skeleton className="size-12 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-16" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data: kpis, isLoading: kpisLoading } = useQuery<DashboardKPIs>({
    queryKey: ['dashboard-kpis'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/kpis');
      if (!res.ok) throw new Error('Failed to load KPIs');
      return res.json() as Promise<DashboardKPIs>;
    },
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery<AnalyticsResponse>({
    queryKey: ['reports-analytics', 7],
    queryFn: async () => {
      const res = await fetch('/api/reports/analytics?days=7');
      if (!res.ok) throw new Error('Failed to load analytics');
      return res.json() as Promise<AnalyticsResponse>;
    },
  });

  const { data: auditData } = useQuery<{ data: AuditLogItem[] }>({
    queryKey: ['audit-logs', { page: 1, limit: 8 }],
    queryFn: async () => {
      const res = await fetch('/api/audit-logs?page=1&limit=8');
      if (!res.ok) throw new Error('Failed to load audit logs');
      return res.json() as Promise<{ data: AuditLogItem[] }>;
    },
  });

  const trend = analytics?.tripTrend ?? [];
  const cost = analytics?.costBreakdown ?? { fuel: 0, maintenance: 0, other: 0 };
  const costData = [
    { name: 'Fuel', value: cost.fuel },
    { name: 'Maintenance', value: cost.maintenance },
    { name: 'Other', value: cost.other },
  ].filter((c) => c.value > 0);

  return (
    <PageTransition>
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Real-time overview of your fleet, trips, drivers, and operational costs."
      />

      {kpis?.expiringLicenses ? (
        <Alert className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangle className="size-4" />
          <AlertTitle>License expiration alert</AlertTitle>
          <AlertDescription>
            <strong>{kpis.expiringLicenses}</strong> driver license
            {kpis.expiringLicenses === 1 ? '' : 's'} will expire within the next 30 days. Review the
            Drivers page to take action.
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Link href="/trips">
          <Card className="group cursor-pointer border-teal-200 transition-all hover:border-teal-400 hover:shadow-md dark:border-teal-800 dark:hover:border-teal-600">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex size-10 items-center justify-center rounded-lg bg-teal-100 text-teal-700 transition-transform group-hover:scale-110 dark:bg-teal-900/40 dark:text-teal-300">
                <Route className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">Create Trip</p>
                <p className="text-xs text-muted-foreground">Dispatch a vehicle</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/vehicles">
          <Card className="group cursor-pointer border-emerald-200 transition-all hover:border-emerald-400 hover:shadow-md dark:border-emerald-800 dark:hover:border-emerald-600">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 transition-transform group-hover:scale-110 dark:bg-emerald-900/40 dark:text-emerald-300">
                <Plus className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">Add Vehicle</p>
                <p className="text-xs text-muted-foreground">Register new asset</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/fuel-expenses">
          <Card className="group cursor-pointer border-orange-200 transition-all hover:border-orange-400 hover:shadow-md dark:border-orange-800 dark:hover:border-orange-600">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex size-10 items-center justify-center rounded-lg bg-orange-100 text-orange-700 transition-transform group-hover:scale-110 dark:bg-orange-900/40 dark:text-orange-300">
                <Fuel className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">Log Fuel</p>
                <p className="text-xs text-muted-foreground">Record consumption</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/reports">
          <Card className="group cursor-pointer border-purple-200 transition-all hover:border-purple-400 hover:shadow-md dark:border-purple-800 dark:hover:border-purple-600">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex size-10 items-center justify-center rounded-lg bg-purple-100 text-purple-700 transition-transform group-hover:scale-110 dark:bg-purple-900/40 dark:text-purple-300">
                <FileDown className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">Export Data</p>
                <p className="text-xs text-muted-foreground">Download CSV reports</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* KPI grid */}
      <StaggerGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpisLoading || !kpis
          ? Array.from({ length: 8 }).map((_, i) => <KpiSkeleton key={i} />)
          : (
            <>
              <StaggerItem><KpiCard
                label="Active Vehicles"
                value={kpis.activeVehicles}
                icon={Truck}
                tone="teal"
                hint={`${kpis.totalVehicles} total in fleet`}
              /></StaggerItem>
              <StaggerItem><KpiCard
                label="Available Vehicles"
                value={kpis.availableVehicles}
                icon={CarFront}
                tone="emerald"
                hint="Ready for dispatch"
              /></StaggerItem>
              <StaggerItem><KpiCard
                label="In Maintenance"
                value={kpis.vehiclesInMaintenance}
                icon={Wrench}
                tone="amber"
                hint={`${kpis.retiredVehicles} retired`}
              /></StaggerItem>
              <StaggerItem><KpiCard
                label="Active Trips"
                value={kpis.activeTrips}
                icon={TrendingUp}
                tone="sky"
                hint={`${kpis.pendingTrips} pending`}
              /></StaggerItem>
              <StaggerItem><KpiCard
                label="Pending Trips"
                value={kpis.pendingTrips}
                icon={ClipboardList}
                tone="violet"
                hint={`${kpis.completedTrips} completed`}
              /></StaggerItem>
              <StaggerItem><KpiCard
                label="Drivers On Duty"
                value={kpis.driversOnDuty}
                icon={UserCheck}
                tone="teal"
                hint={`${kpis.availableDrivers} available`}
              /></StaggerItem>
              <StaggerItem><KpiCard
                label="Fleet Utilization"
                value={`${kpis.fleetUtilization}%`}
                icon={Gauge}
                tone={kpis.fleetUtilization >= 70 ? 'emerald' : kpis.fleetUtilization >= 40 ? 'amber' : 'rose'}
                hint={`${kpis.totalDrivers} drivers total`}
              /></StaggerItem>
              <StaggerItem><KpiCard
                label="Operational Cost"
                value={formatCurrency(kpis.totalOperationalCost)}
                icon={DollarSign}
                tone="rose"
                hint="Fuel + maintenance + expenses"
              /></StaggerItem>
            </>
          )}
      </StaggerGroup>

      {/* Fleet Status Overview */}
      {kpis && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Vehicle status donut */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Truck className="size-4 text-primary" />
                Fleet Status Distribution
              </CardTitle>
              <CardDescription>Current vehicle status breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const statusData = [
                  { name: 'Available', value: kpis.availableVehicles, color: '#10b981' },
                  { name: 'On Trip', value: kpis.activeVehicles, color: '#0ea5e9' },
                  { name: 'In Shop', value: kpis.vehiclesInMaintenance, color: '#f59e0b' },
                  { name: 'Retired', value: kpis.retiredVehicles, color: '#94a3b8' },
                ].filter((d) => d.value > 0);
                const total = kpis.totalVehicles;

                if (total === 0) {
                  return (
                    <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                      No vehicles in fleet.
                    </div>
                  );
                }

                return (
                  <div className="flex items-center gap-6">
                    <div className="relative shrink-0" style={{ width: 160, height: 160 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={3}
                          >
                            {statusData.map((entry) => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              borderRadius: 8,
                              border: '1px solid var(--border)',
                              background: 'var(--popover)',
                              color: 'var(--popover-foreground)',
                              fontSize: 12,
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold">{total}</span>
                        <span className="text-xs text-muted-foreground">Vehicles</span>
                      </div>
                    </div>
                    <div className="flex-1 space-y-2">
                      {statusData.map((d) => (
                        <div key={d.name} className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <span className="size-2.5 rounded-full" style={{ background: d.color }} />
                            {d.name}
                          </span>
                          <span className="font-medium">
                            {d.value}
                            <span className="ml-1 text-xs text-muted-foreground">
                              ({total > 0 ? Math.round((d.value / total) * 100) : 0}%)
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Driver status breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserCheck className="size-4 text-primary" />
                Driver Status
              </CardTitle>
              <CardDescription>Current driver availability</CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const driverData = [
                  { name: 'Available', value: kpis.availableDrivers, color: '#10b981', icon: UserCheck },
                  { name: 'On Duty', value: kpis.driversOnDuty, color: '#0ea5e9', icon: Truck },
                  { name: 'Off Duty', value: kpis.totalDrivers - kpis.availableDrivers - kpis.driversOnDuty, color: '#94a3b8', icon: Clock },
                ];
                const total = kpis.totalDrivers;

                if (total === 0) {
                  return (
                    <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                      No drivers registered.
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {driverData.map((d) => {
                      const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
                      return (
                        <div key={d.name}>
                          <div className="mb-1.5 flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2">
                              <span className="size-2.5 rounded-full" style={{ background: d.color }} />
                              {d.name}
                            </span>
                            <span className="font-medium">
                              {d.value}
                              <span className="ml-1 text-xs text-muted-foreground">({pct}%)</span>
                            </span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${pct}%`, background: d.color }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    <div className="mt-4 flex items-center justify-between border-t pt-3 text-sm">
                      <span className="text-muted-foreground">Total Drivers</span>
                      <span className="text-lg font-bold">{total}</span>
                    </div>
                    {kpis.expiringLicenses > 0 && (
                      <Link href="/drivers" className="block">
                        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                          <AlertTriangle className="size-4 shrink-0" />
                          <span>{kpis.expiringLicenses} license(s) expiring within 30 days</span>
                          <ArrowRight className="ml-auto size-4" />
                        </div>
                      </Link>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts + activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Trip trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="size-4 text-primary" />
              Trip Trend
            </CardTitle>
            <CardDescription>Trips created vs completed over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : trend.length === 0 ? (
              <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                No trip data for the last 7 days.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={trend} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v: string) => format(new Date(v), 'EEE')}
                    tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      background: 'var(--popover)',
                      color: 'var(--popover-foreground)',
                      fontSize: 12,
                    }}
                    labelFormatter={(v: string) => format(new Date(v), 'MMM d, yyyy')}
                  />
                  <Line
                    type="monotone"
                    dataKey="trips"
                    name="Created"
                    stroke="#0d9488"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="completed"
                    name="Completed"
                    stroke="#10b981"
                    strokeWidth={2}
                    strokeDasharray="4 3"
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Cost breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Fuel className="size-4 text-primary" />
              Cost Breakdown
            </CardTitle>
            <CardDescription>Operational cost distribution</CardDescription>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : costData.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                No cost data yet.
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={costData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={2}
                    >
                      {costData.map((entry, idx) => (
                        <Cell key={entry.name} fill={COST_COLORS[idx % COST_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => formatCurrency(v)}
                      contentStyle={{
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        background: 'var(--popover)',
                        color: 'var(--popover-foreground)',
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid w-full gap-2">
                  {costData.map((c, idx) => (
                    <div key={c.name} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span
                          className="size-2.5 rounded-full"
                          style={{ background: COST_COLORS[idx % COST_COLORS.length] }}
                        />
                        {c.name}
                      </span>
                      <span className="font-medium">{formatCurrency(c.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="size-4 text-primary" />
            Recent Activity
          </CardTitle>
          <CardDescription>Latest audit log entries across the platform</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {!auditData ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="size-8 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-2 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : auditData.data.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              <Activity className="mr-2 size-4" /> No recent activity.
            </div>
          ) : (
            <ScrollArea className="h-80">
              <ul className="divide-y">
                {auditData.data.map((log) => (
                  <li key={log.id} className="flex items-start gap-3 px-6 py-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Activity className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <span className="font-medium">{log.user?.name ?? 'Unknown'}</span>{' '}
                        <span className="text-muted-foreground">performed</span>{' '}
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {log.action}
                        </Badge>{' '}
                        <span className="text-muted-foreground">on</span>{' '}
                        <span className="font-medium">{log.entity}</span>
                      </p>
                      <p className="text-xs text-muted-foreground" title={log.timestamp}>
                        {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })} ·{' '}
                        {format(new Date(log.timestamp), 'MMM d, HH:mm')}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
    </PageTransition>
  );
}
