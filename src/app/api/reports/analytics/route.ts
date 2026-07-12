import { NextRequest } from 'next/server';
import { requireRoleAction } from '@/lib/session';
import { withErrorHandler } from '@/lib/errors';
import { getVehicleAnalytics, getTripTrend, getCostBreakdown } from '@/lib/services/dashboard.service';

export const GET = withErrorHandler(async (request: NextRequest) => {
  await requireRoleAction('reports:read');
  const days = parseInt(request.nextUrl.searchParams.get('days') ?? '7', 10);

  const [vehicleAnalytics, tripTrend, costBreakdown] = await Promise.all([
    getVehicleAnalytics(),
    getTripTrend(days),
    getCostBreakdown(),
  ]);

  return Response.json({
    vehicleAnalytics,
    tripTrend,
    costBreakdown,
  });
});
