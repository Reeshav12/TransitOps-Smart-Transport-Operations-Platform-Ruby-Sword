import { NextRequest } from 'next/server';
import { requireRoleAction } from '@/lib/session';
import { withErrorHandler } from '@/lib/errors';
import * as driverService from '@/lib/services/driver.service';

export const GET = withErrorHandler(async (_request: NextRequest) => {
  await requireRoleAction('driver:read');
  const drivers = await driverService.getAvailableDrivers();
  return Response.json(drivers);
});
