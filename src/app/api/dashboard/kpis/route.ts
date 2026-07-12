import { NextRequest } from 'next/server';
import { requireRoleAction } from '@/lib/session';
import { withErrorHandler } from '@/lib/errors';
import { getKPIs } from '@/lib/services/dashboard.service';

export const GET = withErrorHandler(async (request: NextRequest) => {
  await requireRoleAction('dashboard:read');
  const vehicleType = request.nextUrl.searchParams.get('vehicleType') ?? undefined;
  const region = request.nextUrl.searchParams.get('region') ?? undefined;
  const kpis = await getKPIs({ vehicleType, region });
  return Response.json(kpis);
});
