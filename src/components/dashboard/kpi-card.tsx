'use client';

import { useEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: 'teal' | 'emerald' | 'amber' | 'sky' | 'rose' | 'violet' | 'slate';
  hint?: string;
}

const TONES: Record<NonNullable<KpiCardProps['tone']>, string> = {
  teal: 'bg-teal-500/15 text-teal-700 dark:text-teal-300',
  emerald: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  amber: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  sky: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  rose: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
  violet: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  slate: 'bg-slate-500/15 text-slate-700 dark:text-slate-300',
};

const HOVER_GRADIENTS: Record<NonNullable<KpiCardProps['tone']>, string> = {
  teal: 'group-hover:from-teal-500/5 group-hover:to-teal-500/0',
  emerald: 'group-hover:from-emerald-500/5 group-hover:to-emerald-500/0',
  amber: 'group-hover:from-amber-500/5 group-hover:to-amber-500/0',
  sky: 'group-hover:from-sky-500/5 group-hover:to-sky-500/0',
  rose: 'group-hover:from-rose-500/5 group-hover:to-rose-500/0',
  violet: 'group-hover:from-violet-500/5 group-hover:to-violet-500/0',
  slate: 'group-hover:from-slate-500/5 group-hover:to-slate-500/0',
};

// Count-up animation hook for numeric values
function useCountUp(end: number, duration = 800): number {
  const validEnd = typeof end === 'number' && !Number.isNaN(end) ? end : 0;
  const [count, setCount] = useState(0);
  const frameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const start = 0;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(start + (validEnd - start) * eased));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [validEnd, duration]);

  return count;
}

export function KpiCard({ label, value, icon: Icon, tone = 'teal', hint }: KpiCardProps) {
  // Only animate if value is a plain number
  const isNumeric = typeof value === 'number';
  const animatedValue = useCountUp(isNumeric ? value : 0);
  const displayValue = isNumeric
    ? new Intl.NumberFormat('en-US').format(animatedValue)
    : value;

  return (
    <Card className={cn('group relative overflow-hidden transition-all hover:shadow-lg hover:shadow-primary/5')}>
      {/* Gradient hover overlay */}
      <div className={cn(
        'pointer-events-none absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-300 group-hover:opacity-100',
        HOVER_GRADIENTS[tone]
      )} />
      <CardContent className="relative flex items-center gap-4 pt-0">
        <div className={cn(
          'flex size-12 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110',
          TONES[tone]
        )}>
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-0.5 text-2xl font-bold tracking-tight tabular-nums">{displayValue}</p>
          {hint && <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
