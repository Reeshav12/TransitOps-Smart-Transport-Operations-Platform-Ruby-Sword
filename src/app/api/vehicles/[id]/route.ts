import { NextRequest } from 'next/server';
import { requireRoleAction } from '@/lib/session';
import { withErrorHandler } from '@/lib/errors';
import { vehicleUpdateSchema } from '@/lib/validation';
import * as vehicleService from '@/lib/services/vehicle.service';

export const GET = withErrorHandler(async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  await requireRoleAction('vehicle:read');
  const { id } = await params;
  const vehicle = await vehicleService.getVehicleById(id);
  return Response.json(vehicle);
});

export const PUT = withErrorHandler(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireRoleAction('vehicle:update');
  const { id } = await params;
  const body = await request.json();
  const data = vehicleUpdateSchema.parse(body);
  const vehicle = await vehicleService.updateVehicle(id, data, user.id);
  return Response.json(vehicle);
});

export const DELETE = withErrorHandler(async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireRoleAction('vehicle:delete');
  const { id } = await params;
  await vehicleService.deleteVehicle(id, user.id);
  return Response.json({ success: true });
});
