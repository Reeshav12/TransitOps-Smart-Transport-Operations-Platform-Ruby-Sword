import { NextRequest } from 'next/server';
import { requireRoleAction } from '@/lib/session';
import { withErrorHandler } from '@/lib/errors';
import { fuelLogCreateSchema, fuelLogQuerySchema } from '@/lib/validation';
import * as fuelLogService from '@/lib/services/fuel-log.service';

export const GET = withErrorHandler(async (request: NextRequest) => {
  await requireRoleAction('fuel:read');
  const query = fuelLogQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
  const result = await fuelLogService.getAllFuelLogs(query);
  return Response.json(result);
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const user = await requireRoleAction('fuel:create');
  const body = await request.json();
  const data = fuelLogCreateSchema.parse(body);
  const log = await fuelLogService.createFuelLog(data, user.id);
  return Response.json(log, { status: 201 });
});
