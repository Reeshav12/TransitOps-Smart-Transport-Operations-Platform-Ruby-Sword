import { NextRequest } from 'next/server';
import { requireRoleAction } from '@/lib/session';
import { withErrorHandler } from '@/lib/errors';
import { tripCompleteSchema } from '@/lib/validation';
import * as tripService from '@/lib/services/trip.service';

export const POST = withErrorHandler(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireRoleAction('trip:complete');
  const { id } = await params;
  const body = await request.json();
  const data = tripCompleteSchema.parse(body);
  const trip = await tripService.completeTrip(id, data, user.id);
  return Response.json(trip);
});
