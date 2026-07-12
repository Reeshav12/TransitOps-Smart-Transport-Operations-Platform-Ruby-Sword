import { NextRequest } from 'next/server';
import { requireRoleAction } from '@/lib/session';
import { withErrorHandler } from '@/lib/errors';
import { maintenanceUpdateSchema } from '@/lib/validation';
import * as maintenanceService from '@/lib/services/maintenance.service';

export const GET = withErrorHandler(async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  await requireRoleAction('maintenance:read');
  const { id } = await params;
  const log = await maintenanceService.getMaintenanceById(id);
  return Response.json(log);
});

export const PUT = withErrorHandler(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireRoleAction('maintenance:update');
  const { id } = await params;
  const body = await request.json();
  const data = maintenanceUpdateSchema.parse(body);
  const log = await maintenanceService.updateMaintenance(id, data, user.id);
  return Response.json(log);
});
