import { NextRequest } from 'next/server';
import { requireRoleAction } from '@/lib/session';
import { withErrorHandler } from '@/lib/errors';
import * as vehicleService from '@/lib/services/vehicle.service';

export const GET = withErrorHandler(async (_request: NextRequest) => {
  await requireRoleAction('vehicle:read');
  const vehicles = await vehicleService.getAvailableVehicles();
  return Response.json(vehicles);
});
