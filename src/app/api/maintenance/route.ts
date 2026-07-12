import { NextRequest } from 'next/server';
import { requireRoleAction } from '@/lib/session';
import { withErrorHandler } from '@/lib/errors';
import { maintenanceCreateSchema, maintenanceQuerySchema } from '@/lib/validation';
import * as maintenanceService from '@/lib/services/maintenance.service';

export const GET = withErrorHandler(async (request: NextRequest) => {
  await requireRoleAction('maintenance:read');
  const query = maintenanceQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
  const result = await maintenanceService.getAllMaintenance(query);
  return Response.json(result);
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const user = await requireRoleAction('maintenance:create');
  const body = await request.json();
  const data = maintenanceCreateSchema.parse(body);
  const log = await maintenanceService.createMaintenance(data, user.id);
  return Response.json(log, { status: 201 });
});
