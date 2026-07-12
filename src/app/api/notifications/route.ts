import { NextRequest } from 'next/server';
import { requireValidUser } from '@/lib/session';
import { withErrorHandler } from '@/lib/errors';
import { db } from '@/lib/db';

const isNotificationAllowedForRole = (role: string, notifType: string): boolean => {
  if (role === 'FLEET_MANAGER') return true;
  if (role === 'DRIVER') {
    return notifType === 'pending-trips' || notifType === 'active-trips';
  }
  if (role === 'SAFETY_OFFICER') {
    return notifType === 'expiring-licenses';
  }
  if (role === 'FINANCIAL_ANALYST') {
    return notifType === 'vehicles-maintenance' || notifType === 'active-trips';
  }
  return false;
};

export const GET = withErrorHandler(async (request: NextRequest) => {
  const user = await requireValidUser();

  // 1. Check Driver License Expirations
  if (isNotificationAllowedForRole(user.roleName, 'expiring-licenses')) {
    const expiringDriversCount = await db.driver.count({
      where: {
        status: { not: 'Suspended' },
        licenseExpiry: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      },
    });
    const key = `${user.id}:expiring-licenses`;
    if (expiringDriversCount > 0) {
      await db.notification.upsert({
        where: { key },
        update: {
          title: `${expiringDriversCount} driver license${expiringDriversCount > 1 ? 's' : ''} expiring`,
          description: `${expiringDriversCount} driver's license expires soon. Review and take action.`,
        },
        create: {
          userId: user.id,
          type: 'warning',
          title: `${expiringDriversCount} driver license${expiringDriversCount > 1 ? 's' : ''} expiring`,
          description: `${expiringDriversCount} driver's license expires soon. Review and take action.`,
          action: 'View Drivers',
          href: '/drivers',
          key,
        },
      });
    } else {
      await db.notification.deleteMany({ where: { key } });
    }
  }

  // 2. Check Pending Trips
  if (isNotificationAllowedForRole(user.roleName, 'pending-trips')) {
    const pendingTripsCount = await db.trip.count({
      where: { status: 'Draft' },
    });
    const key = `${user.id}:pending-trips`;
    if (pendingTripsCount > 0) {
      await db.notification.upsert({
        where: { key },
        update: {
          title: `${pendingTripsCount} trip${pendingTripsCount > 1 ? 's' : ''} pending dispatch`,
        },
        create: {
          userId: user.id,
          type: 'info',
          title: `${pendingTripsCount} trip${pendingTripsCount > 1 ? 's' : ''} pending dispatch`,
          description: 'Draft trips awaiting dispatch.',
          action: 'View Trips',
          href: '/trips',
          key,
        },
      });
    } else {
      await db.notification.deleteMany({ where: { key } });
    }
  }

  // 3. Check Vehicles in Maintenance
  if (isNotificationAllowedForRole(user.roleName, 'vehicles-maintenance')) {
    const maintenanceCount = await db.vehicle.count({
      where: { status: 'InShop' },
    });
    const key = `${user.id}:vehicles-maintenance`;
    if (maintenanceCount > 0) {
      await db.notification.upsert({
        where: { key },
        update: {
          title: `${maintenanceCount} vehicle${maintenanceCount > 1 ? 's' : ''} in maintenance`,
        },
        create: {
          userId: user.id,
          type: 'info',
          title: `${maintenanceCount} vehicle${maintenanceCount > 1 ? 's' : ''} in maintenance`,
          description: 'Currently in the shop.',
          action: 'View Maintenance',
          href: '/maintenance',
          key,
        },
      });
    } else {
      await db.notification.deleteMany({ where: { key } });
    }
  }

  // 4. Check Active Trips
  if (isNotificationAllowedForRole(user.roleName, 'active-trips')) {
    const activeTripsCount = await db.trip.count({
      where: { status: 'Dispatched' },
    });
    const key = `${user.id}:active-trips`;
    if (activeTripsCount > 0) {
      await db.notification.upsert({
        where: { key },
        update: {
          title: `${activeTripsCount} active trip${activeTripsCount > 1 ? 's' : ''} in progress`,
        },
        create: {
          userId: user.id,
          type: 'info',
          title: `${activeTripsCount} active trip${activeTripsCount > 1 ? 's' : ''} in progress`,
          description: 'Vehicles currently on the road.',
          action: 'View Trips',
          href: '/trips',
          key,
        },
      });
    } else {
      await db.notification.deleteMany({ where: { key } });
    }
  }

  // 5. Query and return user's notifications
  const notifications = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: [
      { isRead: 'asc' },
      { createdAt: 'desc' },
    ],
  });

  return Response.json(notifications);
});

// Bulk mark all user notifications as read
export const POST = withErrorHandler(async (request: NextRequest) => {
  const user = await requireValidUser();

  await db.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true },
  });

  return Response.json({ success: true });
});
