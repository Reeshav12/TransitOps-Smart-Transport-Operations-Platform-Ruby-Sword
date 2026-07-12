import { NextRequest } from 'next/server';
import { requireRoleAction } from '@/lib/session';
import { withErrorHandler } from '@/lib/errors';
import { vehicleCreateSchema, vehicleQuerySchema } from '@/lib/validation';
import * as vehicleService from '@/lib/services/vehicle.service';

export const GET = withErrorHandler(async (request: NextRequest) => {
  await requireRoleAction('vehicle:read');
  const query = vehicleQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
  const result = await vehicleService.getAllVehicles(query);
  return Response.json(result);
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const user = await requireRoleAction('vehicle:create');
  const body = await request.json();
  const data = vehicleCreateSchema.parse(body);
  const vehicle = await vehicleService.createVehicle(data, user.id);
  return Response.json(vehicle, { status: 201 });
});
