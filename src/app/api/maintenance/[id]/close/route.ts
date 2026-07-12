import { NextRequest } from 'next/server';
import { requireRoleAction } from '@/lib/session';
import { withErrorHandler } from '@/lib/errors';
import * as maintenanceService from '@/lib/services/maintenance.service';

export const POST = withErrorHandler(async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireRoleAction('maintenance:close');
  const { id } = await params;
  const log = await maintenanceService.closeMaintenance(id, user.id);
  return Response.json(log);
});
