'use client';

import { Badge } from '@/components/ui/badge';

const statusColors: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-600 dark:bg-gray-800/40 dark:text-gray-400 border-gray-200 dark:border-gray-700',
  Dispatched: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300 border-sky-200 dark:border-sky-800 animate-soft-pulse',
  Completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  Cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800',
};

export function TripStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={`font-medium ${statusColors[status] ?? statusColors.Draft}`}>
      {status}
    </Badge>
  );
}
