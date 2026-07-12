'use client';

import { can } from '@/lib/rbac';
import { useAuth } from '@/hooks/use-auth';

interface RoleGuardProps {
  allowedRoles?: string[];
  action?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleGuard({ allowedRoles, action, children, fallback = null }: RoleGuardProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user) return <>{fallback}</>;

  if (action) {
    if (!can(user.roleName, action)) return <>{fallback}</>;
  } else if (allowedRoles) {
    if (!allowedRoles.includes(user.roleName)) return <>{fallback}</>;
  }

  return <>{children}</>;
}
