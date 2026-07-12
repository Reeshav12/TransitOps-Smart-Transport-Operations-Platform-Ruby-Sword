import { NextRequest } from 'next/server';
import { requireRoleAction } from '@/lib/session';
import { withErrorHandler } from '@/lib/errors';
import * as tripService from '@/lib/services/trip.service';

export const POST = withErrorHandler(async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireRoleAction('trip:dispatch');
  const { id } = await params;
  const trip = await tripService.dispatchTrip(id, user.id);
  return Response.json(trip);
});
