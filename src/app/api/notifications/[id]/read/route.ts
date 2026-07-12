import { NextRequest } from 'next/server';
import { requireValidUser } from '@/lib/session';
import { withErrorHandler } from '@/lib/errors';
import { db } from '@/lib/db';

export const POST = withErrorHandler(async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireValidUser();
  const { id } = await params;

  const notification = await db.notification.update({
    where: { id, userId: user.id },
    data: { isRead: true },
  });

  return Response.json(notification);
});
