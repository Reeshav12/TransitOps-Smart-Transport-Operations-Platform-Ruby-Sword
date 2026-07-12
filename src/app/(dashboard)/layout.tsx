'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Loader2, LogOut, Menu, Search, Truck, UserCircle, UserCog } from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { CommandPalette } from '@/components/shared/command-palette';
import { NotificationsDropdown } from '@/components/shared/notifications-dropdown';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { KeyboardShortcutsHelp } from '@/components/shared/keyboard-shortcuts-help';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { getNavItemsForRole } from '@/lib/rbac';
import { useAuth } from '@/hooks/use-auth';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/vehicles': 'Vehicle Registry',
  '/drivers': 'Driver Management',
  '/trips': 'Trip Management',
  '/maintenance': 'Maintenance Log',
  '/fuel-expenses': 'Fuel & Expenses',
  '/reports': 'Reports & Analytics',
};

function getPageTitle(pathname: string): string {
  for (const key of Object.keys(PAGE_TITLES)) {
    if (pathname === key || pathname.startsWith(key + '/')) {
      return PAGE_TITLES[key];
    }
  }
  return 'TransitOps';
}

function RoleBadge({ role }: { role: string }) {
  const label = role
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <Badge variant="secondary" className="text-[10px] font-medium uppercase tracking-wide">
      {label}
    </Badge>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm">Loading TransitOps…</p>
        </div>
      </div>
    );
  }

  const navItems = getNavItemsForRole(user.roleName);
  const pageTitle = getPageTitle(pathname || '/dashboard');

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  const Brand = (
    <div className="flex items-center gap-2.5 px-5 py-5">
      <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Truck className="size-5" />
      </div>
      <div className="flex flex-col">
        <span className="text-base font-semibold leading-tight">TransitOps</span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Transport Ops
        </span>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r bg-sidebar lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:flex-col">
        {Brand}
        <SidebarNav items={navItems} />
      </aside>

      {/* Mobile sidebar (Sheet) */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            {Brand}
          </SheetHeader>
          <SidebarNav items={navItems} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main content area */}
      <div className="flex flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:px-6">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="size-5" />
            </Button>
            <div className="flex flex-col gap-0.5">
              <h1 className="truncate text-lg font-semibold">{pageTitle}</h1>
              <Breadcrumbs />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="hidden h-8 gap-2 text-xs text-muted-foreground md:flex"
              onClick={() => setCmdOpen(true)}
            >
              <Search className="size-3.5" />
              <span>Search…</span>
              <kbd className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">⌘K</kbd>
            </Button>
            <NotificationsDropdown />
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2">
                  <Avatar className="size-7">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {user.name?.charAt(0).toUpperCase() ?? 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm font-medium sm:inline">{user.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex flex-col gap-1">
                  <span className="text-sm font-medium">{user.name}</span>
                  <span className="text-xs font-normal text-muted-foreground">{user.email}</span>
                  <RoleBadge role={user.roleName} />
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => router.push('/profile')}>
                  <UserCog className="size-4" />
                  Profile & Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleSignOut} variant="destructive">
                  <LogOut className="size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>

        <footer className="mt-auto border-t bg-background px-4 py-4 text-center text-xs text-muted-foreground sm:px-6">
          <div className="flex flex-col items-center justify-between gap-1 sm:flex-row">
            <span className="flex items-center gap-1.5">
              <UserCircle className="size-3.5" />
              © 2026 TransitOps
            </span>
            <span>Smart Transport Operations Platform · Built for Odoo Hackathon · Frontend by Reeshav Raj · Backend & Core by Anurag Singh</span>
          </div>
        </footer>
      </div>

      {/* Command Palette (Cmd+K) */}
      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />

      {/* Keyboard Shortcuts Help (?) */}
      <KeyboardShortcutsHelp />

    </div>
  );
}
