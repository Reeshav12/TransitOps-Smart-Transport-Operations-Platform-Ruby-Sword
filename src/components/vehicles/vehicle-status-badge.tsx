'use client';

import { Badge } from '@/components/ui/badge';

const statusColors: Record<string, string> = {
  Available: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  OnTrip: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300 border-sky-200 dark:border-sky-800',
  InShop: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  Retired: 'bg-gray-100 text-gray-600 dark:bg-gray-800/40 dark:text-gray-400 border-gray-200 dark:border-gray-700',
};

export function VehicleStatusBadge({ status }: { status: string }) {
  const displayStatus =
    status === 'OnTrip' ? 'On Trip' :
    status === 'InShop' ? 'In Shop' :
    status;
  return (
    <Badge variant="outline" className={`font-medium ${statusColors[status] ?? statusColors.Available}`}>
      {displayStatus}
    </Badge>
  );
}
