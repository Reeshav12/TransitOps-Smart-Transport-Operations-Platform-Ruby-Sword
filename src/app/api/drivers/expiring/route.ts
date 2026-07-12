import { NextRequest } from 'next/server';
import { requireRoleAction } from '@/lib/session';
import { withErrorHandler } from '@/lib/errors';
import * as driverService from '@/lib/services/driver.service';

export const GET = withErrorHandler(async (request: NextRequest) => {
  await requireRoleAction('driver:read');
  const days = parseInt(request.nextUrl.searchParams.get('days') ?? '30', 10);
  const drivers = await driverService.getExpiringLicenses(days);
  return Response.json(drivers);
});
