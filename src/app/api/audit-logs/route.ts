import { NextRequest } from 'next/server';
import { requireRoleAction } from '@/lib/session';
import { withErrorHandler } from '@/lib/errors';
import { db } from '@/lib/db';

export const GET = withErrorHandler(async (request: NextRequest) => {
  await requireRoleAction('audit:read');
  const page = parseInt(request.nextUrl.searchParams.get('page') ?? '1', 10);
  const limit = parseInt(request.nextUrl.searchParams.get('limit') ?? '20', 10);

  const [data, total] = await Promise.all([
    db.auditLog.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { timestamp: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.auditLog.count(),
  ]);

  return Response.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
});
