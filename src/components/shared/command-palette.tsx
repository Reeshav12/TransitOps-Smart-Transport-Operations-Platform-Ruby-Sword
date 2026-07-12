'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  BarChart3,
  Fuel,
  LayoutDashboard,
  Route,
  Truck,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { can, getNavItemsForRole } from '@/lib/rbac';

interface CommandItemDef {
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
  keywords: string;
}

const ALL_COMMANDS: CommandItemDef[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, description: 'Overview & KPIs', keywords: 'home overview stats kpi' },
  { label: 'Vehicles', href: '/vehicles', icon: Truck, description: 'Vehicle registry', keywords: 'truck van bus fleet cars' },
  { label: 'Drivers', href: '/drivers', icon: Users, description: 'Driver management', keywords: 'license safety operator' },
  { label: 'Trips', href: '/trips', icon: Route, description: 'Trip dispatch & tracking', keywords: 'delivery route dispatch cargo' },
  { label: 'Maintenance', href: '/maintenance', icon: Wrench, description: 'Maintenance logs', keywords: 'repair shop service oil' },
  { label: 'Fuel & Expenses', href: '/fuel-expenses', icon: Fuel, description: 'Fuel logs & expenses', keywords: 'cost toll payment diesel petrol' },
  { label: 'Reports', href: '/reports', icon: BarChart3, description: 'Analytics & exports', keywords: 'analytics csv export audit' },
];

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  Truck,
  Users,
  Route,
  Wrench,
  Fuel,
  BarChart3,
};

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  const roleName = session?.user?.roleName;
  const navItems = roleName ? getNavItemsForRole(roleName) : [];
  const allowedHrefs = new Set(navItems.map((n) => n.href));
  const commands = ALL_COMMANDS.filter((c) => allowedHrefs.has(c.href));

  const runCommand = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search pages or actions…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigate">
          {commands.map((cmd) => {
            const Icon = cmd.icon;
            return (
              <CommandItem
                key={cmd.href}
                value={`${cmd.label} ${cmd.description} ${cmd.keywords}`}
                onSelect={() => runCommand(cmd.href)}
                className="cursor-pointer"
              >
                <Icon className="mr-2 size-4 text-muted-foreground" />
                <div className="flex flex-1 items-center justify-between">
                  <span className="font-medium">{cmd.label}</span>
                  <span className="text-xs text-muted-foreground">{cmd.description}</span>
                </div>
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Quick Actions">
          {can(roleName ?? '', 'vehicle:create') && (
            <CommandItem
              value="add new vehicle create register"
              onSelect={() => runCommand('/vehicles')}
              className="cursor-pointer"
            >
              <Truck className="mr-2 size-4 text-muted-foreground" />
              <span className="font-medium">Add Vehicle</span>
              <span className="ml-auto text-xs text-muted-foreground">Go to Vehicles</span>
            </CommandItem>
          )}
          {can(roleName ?? '', 'trip:create') && (
            <CommandItem
              value="create trip dispatch new delivery"
              onSelect={() => runCommand('/trips')}
              className="cursor-pointer"
            >
              <Route className="mr-2 size-4 text-muted-foreground" />
              <span className="font-medium">Create Trip</span>
              <span className="ml-auto text-xs text-muted-foreground">Go to Trips</span>
            </CommandItem>
          )}
          {can(roleName ?? '', 'fuel:create') && (
            <CommandItem
              value="log fuel consumption record"
              onSelect={() => runCommand('/fuel-expenses')}
              className="cursor-pointer"
            >
              <Fuel className="mr-2 size-4 text-muted-foreground" />
              <span className="font-medium">Log Fuel</span>
              <span className="ml-auto text-xs text-muted-foreground">Go to Fuel & Expenses</span>
            </CommandItem>
          )}
          {can(roleName ?? '', 'reports:export') && (
            <CommandItem
              value="export csv download report data"
              onSelect={() => runCommand('/reports')}
              className="cursor-pointer"
            >
              <BarChart3 className="mr-2 size-4 text-muted-foreground" />
              <span className="font-medium">Export Data</span>
              <span className="ml-auto text-xs text-muted-foreground">Go to Reports</span>
            </CommandItem>
          )}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
