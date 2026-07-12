import { NextRequest } from 'next/server';
import { requireRoleAction } from '@/lib/session';
import { withErrorHandler } from '@/lib/errors';
import * as tripService from '@/lib/services/trip.service';

export const GET = withErrorHandler(async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  await requireRoleAction('trip:read');
  const { id } = await params;
  const trip = await tripService.getTripById(id);
  return Response.json(trip);
});
