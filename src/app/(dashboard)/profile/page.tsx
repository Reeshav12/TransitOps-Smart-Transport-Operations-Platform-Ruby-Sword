'use client';

import { useSession } from 'next-auth/react';
import { signOut } from 'next-auth/react';
import {
  LogOut,
  Mail,
  Shield,
  User,
  Calendar,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PageTransition } from '@/components/shared/page-transition';
import { ROLE_DESCRIPTIONS, type RoleName } from '@/lib/rbac';

const ROLE_PERMISSIONS: Record<string, string[]> = {
  FLEET_MANAGER: [
    'Full vehicle CRUD',
    'Create & edit drivers',
    'Create, dispatch, complete, cancel trips',
    'Manage maintenance records',
    'Log fuel & expenses',
    'View audit logs',
    'Export all reports',
  ],
  DRIVER: [
    'View vehicles & drivers',
    'Create, dispatch, complete trips',
    'View dashboard',
  ],
  SAFETY_OFFICER: [
    'View vehicles, drivers, trips',
    'Create & edit drivers',
    'Delete drivers',
    'Manage maintenance',
    'View reports',
  ],
  FINANCIAL_ANALYST: [
    'View all fleet data',
    'Log fuel & expenses',
    'View & export reports',
    'View analytics',
  ],
};

export default function ProfilePage() {
  const { data: session } = useSession();

  if (!session?.user) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  const user = session.user;
  const roleLabel = user.roleName.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  const permissions = ROLE_PERMISSIONS[user.roleName] ?? [];
  const roleDescription = ROLE_DESCRIPTIONS[user.roleName as RoleName] ?? '';

  return (
    <PageTransition>
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Profile header card */}
      <Card className="overflow-hidden">
        <div className="relative bg-gradient-to-br from-teal-600 via-emerald-600 to-teal-700 p-6 text-white dark:from-teal-900 dark:via-emerald-900 dark:to-teal-950">
          <div className="absolute right-4 top-4 opacity-10">
            <User className="size-32" />
          </div>
          <div className="relative flex items-center gap-4">
            <Avatar className="size-20 border-4 border-white/20">
              <AvatarFallback className="bg-white/20 text-3xl font-bold text-white backdrop-blur">
                {user.name?.charAt(0).toUpperCase() ?? 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight">{user.name}</h1>
              <p className="flex items-center gap-1.5 text-sm text-white/90">
                <Mail className="size-3.5" /> {user.email}
              </p>
              <Badge className="mt-1 bg-white/20 text-white hover:bg-white/30">
                {roleLabel}
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Account info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-5 text-primary" /> Account Information
          </CardTitle>
          <CardDescription>Your TransitOps account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                <User className="size-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Full Name</p>
                <p className="font-medium">{user.name}</p>
              </div>
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                <Mail className="size-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email Address</p>
                <p className="font-medium">{user.email}</p>
              </div>
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                <Shield className="size-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Role</p>
                <p className="font-medium">{roleLabel}</p>
              </div>
            </div>
            <Badge variant="secondary">{user.roleName}</Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                <Calendar className="size-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Session</p>
                <p className="font-medium">Active (8-hour expiry)</p>
              </div>
            </div>
            <CheckCircle2 className="size-5 text-emerald-600" />
          </div>
        </CardContent>
      </Card>

      {/* Role & permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="size-5 text-primary" /> Role & Permissions
          </CardTitle>
          <CardDescription>{roleDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <motion.ul
            className="space-y-3"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
            }}
          >
            {permissions.map((perm) => (
              <motion.li
                key={perm}
                className="flex items-center gap-3 rounded-lg border p-3"
                variants={{
                  hidden: { opacity: 0, x: -10 },
                  visible: { opacity: 1, x: 0 },
                }}
              >
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                </div>
                <span className="text-sm font-medium">{perm}</span>
              </motion.li>
            ))}
          </motion.ul>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <LogOut className="size-5" /> Session
          </CardTitle>
          <CardDescription>Sign out of your TransitOps account</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            <LogOut className="mr-2 size-4" /> Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
    </PageTransition>
  );
}
