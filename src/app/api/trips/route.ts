import { NextRequest } from 'next/server';
import { requireRoleAction } from '@/lib/session';
import { withErrorHandler } from '@/lib/errors';
import { tripCreateSchema, tripQuerySchema } from '@/lib/validation';
import * as tripService from '@/lib/services/trip.service';

export const GET = withErrorHandler(async (request: NextRequest) => {
  await requireRoleAction('trip:read');
  const query = tripQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
  const result = await tripService.getAllTrips(query);
  return Response.json(result);
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const user = await requireRoleAction('trip:create');
  const body = await request.json();
  const data = tripCreateSchema.parse(body);
  const trip = await tripService.createTrip(data, user.id);
  return Response.json(trip, { status: 201 });
});
