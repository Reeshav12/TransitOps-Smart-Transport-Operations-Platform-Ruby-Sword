import { NextRequest } from 'next/server';
import { requireRoleAction } from '@/lib/session';
import { withErrorHandler } from '@/lib/errors';
import { driverUpdateSchema } from '@/lib/validation';
import * as driverService from '@/lib/services/driver.service';

export const GET = withErrorHandler(async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  await requireRoleAction('driver:read');
  const { id } = await params;
  const driver = await driverService.getDriverById(id);
  return Response.json(driver);
});

export const PUT = withErrorHandler(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireRoleAction('driver:update');
  const { id } = await params;
  const body = await request.json();
  const data = driverUpdateSchema.parse(body);
  const driver = await driverService.updateDriver(id, data, user.id);
  return Response.json(driver);
});

export const DELETE = withErrorHandler(async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireRoleAction('driver:delete');
  const { id } = await params;
  await driverService.deleteDriver(id, user.id);
  return Response.json({ success: true });
});
