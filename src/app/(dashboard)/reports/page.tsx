'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  Gauge,
  History,
  Loader2,
  Printer,
  Search,
  TrendingUp,
  Truck,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { PageHeader } from '@/components/layout/page-header';

interface VehicleAnalytics {
  vehicleId: string;
  registrationNumber: string;
  model: string;
  totalDistance: number;
  totalFuel: number;
  fuelEfficiency: number | null;
  fuelCost: number;
  maintenanceCost: number;
  operationalCost: number;
  acquisitionCost: number;
  roi: number | null;
}

interface TripTrendItem { date: string; trips: number; completed: number }
interface AnalyticsResponse {
  vehicleAnalytics: VehicleAnalytics[];
  tripTrend: TripTrendItem[];
  costBreakdown: { fuel: number; maintenance: number; other: number };
}

interface Kpis {
  fleetUtilization: number;
}

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: string | null;
  timestamp: string;
  user: { name: string; email: string };
}

const COST_COLORS = ['#0d9488', '#10b981', '#f59e0b'];

const EXPORT_TYPES: { key: string; label: string }[] = [
  { key: 'vehicles', label: 'Vehicles' },
  { key: 'drivers', label: 'Drivers' },
  { key: 'trips', label: 'Trips' },
  { key: 'fuel-logs', label: 'Fuel Logs' },
  { key: 'expenses', label: 'Expenses' },
  { key: 'maintenance', label: 'Maintenance' },
];

function formatCurrency(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
}
function formatNumber(v: number, digits = 0) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(v);
}

function formatMetadata(raw: string | null): string {
  if (!raw) return '—';
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'string') return parsed;
    return JSON.stringify(parsed, null, 2);
  } catch {
    return raw;
  }
}

export default function ReportsPage() {
  const [exporting, setExporting] = useState<string | null>(null);
  const [auditSearch, setAuditSearch] = useState('');
  const [days, setDays] = useState(7);

  const { data: analytics, isLoading: analyticsLoading } = useQuery<AnalyticsResponse>({
    queryKey: ['reports-analytics', days],
    queryFn: async () => {
      const res = await fetch(`/api/reports/analytics?days=${days}`);
      if (!res.ok) throw new Error('Failed to load analytics');
      return res.json() as Promise<AnalyticsResponse>;
    },
  });

  const { data: kpis } = useQuery<Kpis>({
    queryKey: ['dashboard-kpis'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/kpis');
      if (!res.ok) throw new Error('Failed to load KPIs');
      return res.json() as Promise<Kpis>;
    },
  });

  const { data: auditData, isLoading: auditLoading } = useQuery<{ data: AuditLog[]; total: number }>({
    queryKey: ['audit-logs', { page: 1, limit: 25 }],
    queryFn: async () => {
      const res = await fetch('/api/audit-logs?page=1&limit=25');
      if (!res.ok) throw new Error('Failed to load audit logs');
      return res.json() as Promise<{ data: AuditLog[]; total: number }>;
    },
  });

  const handleExport = async (type: string) => {
    setExporting(type);
    try {
      const res = await fetch(`/api/reports/export?type=${type}`);
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? 'Export failed');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transitops-${type}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`${type} exported successfully`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(null);
    }
  };

  const trend = analytics?.tripTrend ?? [];
  const cost = analytics?.costBreakdown ?? { fuel: 0, maintenance: 0, other: 0 };
  const costData = [
    { name: 'Fuel', value: cost.fuel },
    { name: 'Maintenance', value: cost.maintenance },
    { name: 'Other', value: cost.other },
  ].filter((c) => c.value > 0);

  const utilization = kpis?.fleetUtilization ?? 0;
  const utilizationData = [{ name: 'Utilization', value: utilization, fill: '#0d9488' }];

  const vehicleAnalytics = analytics?.vehicleAnalytics ?? [];
  const auditLogs = auditData?.data ?? [];
  const filteredAuditLogs = auditSearch.trim()
    ? auditLogs.filter((log) => {
        const q = auditSearch.toLowerCase();
        return (
          log.action.toLowerCase().includes(q) ||
          log.entity.toLowerCase().includes(q) ||
          log.user?.name?.toLowerCase().includes(q) ||
          log.user?.email?.toLowerCase().includes(q) ||
          log.metadata?.toLowerCase().includes(q)
        );
      })
    : auditLogs;

  return (
    <RoleGuard action="reports:read" fallback={<AccessDenied />}>
      <PageTransition>
    <div className="space-y-6">
      {/* Print-only header */}
      <div className="print-only print-header">
        <h1 className="text-2xl font-bold">TransitOps — Reports & Analytics</h1>
        <p className="text-sm">Generated on {format(new Date(), 'MMM d, yyyy · HH:mm')}</p>
      </div>

      <PageHeader
        title="Reports & Analytics"
        description="Operational analytics, vehicle performance, CSV exports, and audit logs."
      />

      {/* Export buttons */}
      <RoleGuard
        action="reports:export"
        fallback={
          <Alert>
            <FileSpreadsheet className="size-4" />
            <AlertDescription>
              You don&apos;t have permission to export CSV reports. Contact your administrator.
            </AlertDescription>
          </Alert>
        }
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Download className="size-4 text-primary" />
              CSV Exports
            </CardTitle>
            <CardDescription>Download flat CSV files of your operational data.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {EXPORT_TYPES.map((t) => (
                <Button
                  key={t.key}
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport(t.key)}
                  disabled={exporting === t.key}
                >
                  {exporting === t.key ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Download className="size-3.5" />
                  )}
                  {t.label}
                </Button>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between rounded-lg border bg-muted/30 p-3">
              <div>
                <p className="text-sm font-medium">Print Report</p>
                <p className="text-xs text-muted-foreground">Print or save as PDF via browser</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="size-3.5" /> Print
              </Button>
            </div>
          </CardContent>
        </Card>
      </RoleGuard>

      <Tabs defaultValue="analytics">
        <TabsList>
          <TabsTrigger value="analytics"><BarChart3 className="size-3.5" /> Analytics</TabsTrigger>
          <TabsTrigger value="vehicles"><Truck className="size-3.5" /> Vehicle Performance</TabsTrigger>
          <TabsTrigger value="audit"><History className="size-3.5" /> Audit Log</TabsTrigger>
        </TabsList>

        {/* Analytics tab */}
        <TabsContent value="analytics" className="space-y-6">
          {/* Date range selector */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-medium">Analytics Period</h3>
              <p className="text-xs text-muted-foreground">Select the time range for trend data</p>
            </div>
            <div className="flex gap-1 rounded-lg border bg-muted/40 p-1">
              {[
                { label: '7D', value: 7 },
                { label: '14D', value: 14 },
                { label: '30D', value: 30 },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDays(opt.value)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    days === opt.value
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Cost breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="size-4 text-primary" />
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
                        <Pie data={costData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2}>
                          {costData.map((entry, idx) => (
                            <Cell key={entry.name} fill={COST_COLORS[idx % COST_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v: number) => formatCurrency(v)}
                          contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', background: 'var(--popover)', color: 'var(--popover-foreground)', fontSize: 12 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="grid w-full gap-2">
                      {costData.map((c, idx) => (
                        <div key={c.name} className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <span className="size-2.5 rounded-full" style={{ background: COST_COLORS[idx % COST_COLORS.length] }} />
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

            {/* Trip trend */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="size-4 text-primary" />
                  Trip Trend
                </CardTitle>
                <CardDescription>Trips created vs completed over the last {days} days</CardDescription>
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
                      <XAxis dataKey="date" tickFormatter={(v: string) => format(new Date(v), 'EEE')} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', background: 'var(--popover)', color: 'var(--popover-foreground)', fontSize: 12 }}
                        labelFormatter={(v: string) => format(new Date(v), 'MMM d, yyyy')}
                      />
                      <Line type="monotone" dataKey="trips" name="Created" stroke="#0d9488" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                      <Line type="monotone" dataKey="completed" name="Completed" stroke="#10b981" strokeWidth={2} strokeDasharray="4 3" dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Fleet utilization gauge */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Gauge className="size-4 text-primary" />
                Fleet Utilization
              </CardTitle>
              <CardDescription>Percentage of non-retired vehicles currently on trip</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-around">
                <ResponsiveContainer width="100%" height={200} className="max-w-[260px]">
                  <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" data={utilizationData} startAngle={90} endAngle={-270}>
                    <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                    <RadialBar background dataKey="value" cornerRadius={10} />
                    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-3xl font-bold">
                      {utilization}%
                    </text>
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="grid gap-2 text-sm">
                  <div className="flex items-center justify-between gap-6">
                    <span className="flex items-center gap-2">
                      <span className="size-2.5 rounded-full bg-emerald-500" />
                      Healthy (≥70%)
                    </span>
                    <Badge variant="outline" className={utilization >= 70 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' : 'text-muted-foreground'}>
                      {utilization >= 70 ? 'Healthy' : '—'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-6">
                    <span className="flex items-center gap-2">
                      <span className="size-2.5 rounded-full bg-amber-500" />
                      Moderate (40–69%)
                    </span>
                    <Badge variant="outline" className={utilization >= 40 && utilization < 70 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800' : 'text-muted-foreground'}>
                      {utilization >= 40 && utilization < 70 ? 'Moderate' : '—'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-6">
                    <span className="flex items-center gap-2">
                      <span className="size-2.5 rounded-full bg-rose-500" />
                      Low (&lt;40%)
                    </span>
                    <Badge variant="outline" className={utilization < 40 ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800' : 'text-muted-foreground'}>
                      {utilization < 40 ? 'Low' : '—'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vehicle performance tab */}
        <TabsContent value="vehicles">
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Registration</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead className="text-right">Total Distance</TableHead>
                  <TableHead className="text-right">Total Fuel</TableHead>
                  <TableHead className="text-right">Efficiency</TableHead>
                  <TableHead className="text-right">Fuel Cost</TableHead>
                  <TableHead className="text-right">Maint. Cost</TableHead>
                  <TableHead className="text-right">Operational Cost</TableHead>
                  <TableHead className="text-right">ROI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analyticsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((__, j) => (
                        <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : vehicleAnalytics.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="p-0">
                      <EmptyState icon={Truck} title="No vehicle analytics" description="Complete some trips to generate analytics." />
                    </TableCell>
                  </TableRow>
                ) : (
                  vehicleAnalytics.map((v) => (
                    <TableRow key={v.vehicleId}>
                      <TableCell className="font-mono font-semibold">{v.registrationNumber}</TableCell>
                      <TableCell>{v.model}</TableCell>
                      <TableCell className="text-right">{formatNumber(v.totalDistance, 1)} km</TableCell>
                      <TableCell className="text-right">{formatNumber(v.totalFuel, 1)} L</TableCell>
                      <TableCell className="text-right">
                        {v.fuelEfficiency !== null ? `${formatNumber(v.fuelEfficiency, 2)} km/L` : '—'}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(v.fuelCost)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(v.maintenanceCost)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(v.operationalCost)}</TableCell>
                      <TableCell className={`text-right font-medium ${v.roi !== null && v.roi < 0 ? 'text-rose-600 dark:text-rose-400' : ''}`}>
                        {v.roi !== null ? `${formatNumber(v.roi, 1)}%` : '—'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Audit log tab */}
        <TabsContent value="audit">
          <RoleGuard
            action="audit:read"
            fallback={
              <EmptyState
                icon={History}
                title="Audit log access required"
                description="You don't have permission to view audit logs. Only Fleet Managers can access this data."
              />
            }
          >
            <Card className="overflow-hidden">
              {/* Audit search bar */}
              <div className="border-b p-4">
                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by user, action, entity, or metadata…"
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Showing {filteredAuditLogs.length} of {auditLogs.length} entries
                </p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Entity ID</TableHead>
                    <TableHead>Metadata</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 6 }).map((__, j) => (
                          <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : filteredAuditLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="p-0">
                        <EmptyState icon={History} title={auditSearch ? "No matching entries" : "No audit entries"} description={auditSearch ? "Try a different search term." : "Audit logs will appear here as users perform actions."} />
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAuditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(log.timestamp), 'MMM d, yyyy HH:mm:ss')}
                        </TableCell>
                        <TableCell className="font-medium">{log.user?.name ?? 'Unknown'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-[10px]">{log.action}</Badge>
                        </TableCell>
                        <TableCell>{log.entity}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {log.entityId ? log.entityId.slice(-8) : '—'}
                        </TableCell>
                        <TableCell className="max-w-md">
                          <pre className="max-h-20 overflow-auto whitespace-pre-wrap rounded bg-muted/60 p-2 text-xs text-muted-foreground">
                            {formatMetadata(log.metadata)}
                          </pre>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </RoleGuard>
        </TabsContent>
      </Tabs>
    </div>
    </PageTransition>
    </RoleGuard>
  );
}
