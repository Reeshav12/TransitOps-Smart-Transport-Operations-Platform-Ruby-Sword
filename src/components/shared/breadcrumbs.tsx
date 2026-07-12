'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  vehicles: 'Vehicles',
  drivers: 'Drivers',
  trips: 'Trips',
  maintenance: 'Maintenance',
  'fuel-expenses': 'Fuel & Expenses',
  reports: 'Reports',
  profile: 'Profile',
};

export function Breadcrumbs() {
  const pathname = usePathname();

  if (!pathname || pathname === '/dashboard') return null;

  const segments = pathname.split('/').filter(Boolean);
  const items: BreadcrumbItem[] = [
    { label: 'Home', href: '/dashboard' },
  ];

  let currentPath = '';
  for (const segment of segments) {
    if (segment === 'dashboard') continue;
    currentPath += `/${segment}`;
    const label = ROUTE_LABELS[segment] ?? segment;
    // Check if this is a detail page (ID segment)
    const isLikelyId = segment.length > 10 && /^[a-z0-9]+$/i.test(segment);
    if (isLikelyId) {
      // Replace previous label with "Details"
      items[items.length - 1].label = items[items.length - 1].label ?? 'Item';
      items.push({ label: 'Details' });
    } else {
      items.push({ label, href: currentPath });
    }
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground">
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <span key={idx} className="flex items-center gap-1">
            {idx > 0 && <ChevronRight className="size-3.5 text-muted-foreground/50" />}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="transition-colors hover:text-foreground"
              >
                {idx === 0 && <Home className="inline size-3.5 mr-0.5" />}
                {item.label}
              </Link>
            ) : (
              <span className={cn('font-medium', isLast ? 'text-foreground' : '')}>
                {idx === 0 && <Home className="inline size-3.5 mr-0.5" />}
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
