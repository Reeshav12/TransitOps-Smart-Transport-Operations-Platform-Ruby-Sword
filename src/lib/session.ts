// Session helpers for TransitOps

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { UnauthorizedError, ForbiddenError } from '@/lib/errors';
import { can } from '@/lib/rbac';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  roleName: string;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    roleName: session.user.roleName,
  };
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new UnauthorizedError();
  }
  return user;
}

export async function requireRoleAction(action: string): Promise<SessionUser> {
  const user = await requireValidUser();
  if (!can(user.roleName, action)) {
    throw new ForbiddenError(`Your role (${user.roleName}) cannot perform: ${action}`);
  }
  return user;
}

// Verify user still exists in DB (handles deleted users)
export async function requireValidUser(): Promise<SessionUser> {
  const user = await requireAuth();
  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { id: true },
  });
  if (!dbUser) {
    throw new UnauthorizedError('User no longer exists');
  }
  return user;
}
