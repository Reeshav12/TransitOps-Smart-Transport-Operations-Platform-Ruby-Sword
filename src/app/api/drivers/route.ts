import { NextRequest } from 'next/server';
import { requireRoleAction } from '@/lib/session';
import { withErrorHandler } from '@/lib/errors';
import { driverCreateSchema, driverQuerySchema } from '@/lib/validation';
import * as driverService from '@/lib/services/driver.service';

export const GET = withErrorHandler(async (request: NextRequest) => {
  await requireRoleAction('driver:read');
  const query = driverQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
  const result = await driverService.getAllDrivers(query);
  return Response.json(result);
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const user = await requireRoleAction('driver:create');
  const body = await request.json();
  const data = driverCreateSchema.parse(body);
  const driver = await driverService.createDriver(data, user.id);
  return Response.json(driver, { status: 201 });
});
