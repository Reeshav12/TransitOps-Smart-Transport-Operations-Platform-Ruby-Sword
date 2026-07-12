import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { db as prisma } from '../src/lib/db';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('🌱 Seeding TransitOps database...');
  console.log('DATABASE_URL is:', process.env.DATABASE_URL);

  // Create roles
  const roles = await Promise.all([
    prisma.role.upsert({
      where: { name: 'FLEET_MANAGER' },
      update: {},
      create: { name: 'FLEET_MANAGER', description: 'Oversees fleet assets, maintenance, vehicle lifecycle, and operational efficiency' },
    }),
    prisma.role.upsert({
      where: { name: 'DRIVER' },
      update: {},
      create: { name: 'DRIVER', description: 'Creates trips, assigns vehicles and drivers, and monitors active deliveries' },
    }),
    prisma.role.upsert({
      where: { name: 'SAFETY_OFFICER' },
      update: {},
      create: { name: 'SAFETY_OFFICER', description: 'Ensures driver compliance, tracks license validity, and monitors safety scores' },
    }),
    prisma.role.upsert({
      where: { name: 'FINANCIAL_ANALYST' },
      update: {},
      create: { name: 'FINANCIAL_ANALYST', description: 'Reviews operational expenses, fuel consumption, maintenance costs, and profitability' },
    }),
  ]);

  console.log('✅ Created roles');

  // Create users
  const hashedPassword = await bcrypt.hash('TransitOps@123', 12);

  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'fleet@transitops.com' },
      update: { name: 'Anurag Singh' },
      create: {
        email: 'fleet@transitops.com',
        name: 'Anurag Singh',
        password: hashedPassword,
        roleId: roles[0].id,
      },
    }),
    prisma.user.upsert({
      where: { email: 'driver@transitops.com' },
      update: { name: 'Reeshav Raj' },
      create: {
        email: 'driver@transitops.com',
        name: 'Reeshav Raj',
        password: hashedPassword,
        roleId: roles[1].id,
      },
    }),
    prisma.user.upsert({
      where: { email: 'safety@transitops.com' },
      update: { name: 'Rituraj Sharma' },
      create: {
        email: 'safety@transitops.com',
        name: 'Rituraj Sharma',
        password: hashedPassword,
        roleId: roles[2].id,
      },
    }),
    prisma.user.upsert({
      where: { email: 'finance@transitops.com' },
      update: { name: 'Yashraj Kumar' },
      create: {
        email: 'finance@transitops.com',
        name: 'Yashraj Kumar',
        password: hashedPassword,
        roleId: roles[3].id,
      },
    }),
  ]);

  console.log('✅ Created 4 users (password: TransitOps@123)');

  // Create vehicles
  const vehicles = await Promise.all([
    prisma.vehicle.create({
      data: {
        registrationNumber: 'VAN-05',
        model: 'Ford Transit 350',
        type: 'VAN',
        maxLoadCapacity: 500,
        odometer: 45000,
        acquisitionCost: 45000,
        status: 'Available',
        region: 'North',
      },
    }).catch(() => prisma.vehicle.findFirst({ where: { registrationNumber: 'VAN-05' } })!),
    prisma.vehicle.create({
      data: {
        registrationNumber: 'TRK-12',
        model: 'Volvo FH16',
        type: 'TRUCK',
        maxLoadCapacity: 24000,
        odometer: 120000,
        acquisitionCost: 180000,
        status: 'Available',
        region: 'South',
      },
    }).catch(() => prisma.vehicle.findFirst({ where: { registrationNumber: 'TRK-12' } })!),
    prisma.vehicle.create({
      data: {
        registrationNumber: 'BUS-03',
        model: 'Mercedes-Benz O500',
        type: 'BUS',
        maxLoadCapacity: 5000,
        odometer: 80000,
        acquisitionCost: 220000,
        status: 'Available',
        region: 'East',
      },
    }).catch(() => prisma.vehicle.findFirst({ where: { registrationNumber: 'BUS-03' } })!),
    prisma.vehicle.create({
      data: {
        registrationNumber: 'CAR-21',
        model: 'Toyota Hilux',
        type: 'CAR',
        maxLoadCapacity: 800,
        odometer: 30000,
        acquisitionCost: 35000,
        status: 'Available',
        region: 'West',
      },
    }).catch(() => prisma.vehicle.findFirst({ where: { registrationNumber: 'CAR-21' } })!),
    prisma.vehicle.create({
      data: {
        registrationNumber: 'TRL-08',
        model: 'Great Dane Trailer',
        type: 'TRAILER',
        maxLoadCapacity: 20000,
        odometer: 200000,
        acquisitionCost: 50000,
        status: 'Available',
        region: 'Central',
      },
    }).catch(() => prisma.vehicle.findFirst({ where: { registrationNumber: 'TRL-08' } })!),
    prisma.vehicle.create({
      data: {
        registrationNumber: 'VAN-11',
        model: 'Mercedes Sprinter',
        type: 'VAN',
        maxLoadCapacity: 1000,
        odometer: 60000,
        acquisitionCost: 55000,
        status: 'Available',
        region: 'North',
      },
    }).catch(() => prisma.vehicle.findFirst({ where: { registrationNumber: 'VAN-11' } })!),
  ]);

  console.log('✅ Created 6 vehicles');

  // Create drivers
  const futureDate = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const drivers = await Promise.all([
    prisma.driver.create({
      data: {
        name: 'Aarav Sharma',
        licenseNumber: 'DL-A001234',
        licenseCategory: 'HEAVY',
        licenseExpiry: futureDate(365),
        contactNumber: '+91-98765-01234',
        safetyScore: 95,
        status: 'Available',
      },
    }).catch(() => prisma.driver.findFirst({ where: { licenseNumber: 'DL-A001234' } })!),
    prisma.driver.create({
      data: {
        name: 'Vihaan Patel',
        licenseNumber: 'DL-B005678',
        licenseCategory: 'C',
        licenseExpiry: futureDate(20), // Expiring soon for testing
        contactNumber: '+91-98765-05678',
        safetyScore: 88,
        status: 'Available',
      },
    }).catch(() => prisma.driver.findFirst({ where: { licenseNumber: 'DL-B005678' } })!),
    prisma.driver.create({
      data: {
        name: 'Kabir Singh',
        licenseNumber: 'DL-C009012',
        licenseCategory: 'B',
        licenseExpiry: futureDate(730),
        contactNumber: '+91-98765-09012',
        safetyScore: 72,
        status: 'Available',
      },
    }).catch(() => prisma.driver.findFirst({ where: { licenseNumber: 'DL-C009012' } })!),
    prisma.driver.create({
      data: {
        name: 'Arjun Verma',
        licenseNumber: 'DL-D003456',
        licenseCategory: 'A',
        licenseExpiry: futureDate(180),
        contactNumber: '+91-98765-03456',
        safetyScore: 91,
        status: 'OffDuty',
      },
    }).catch(() => prisma.driver.findFirst({ where: { licenseNumber: 'DL-D003456' } })!),
    prisma.driver.create({
      data: {
        name: 'Sai Reddy',
        licenseNumber: 'DL-E007890',
        licenseCategory: 'LIGHT',
        licenseExpiry: futureDate(45),
        contactNumber: '+91-98765-07890',
        safetyScore: 55,
        status: 'Available',
      },
    }).catch(() => prisma.driver.findFirst({ where: { licenseNumber: 'DL-E007890' } })!),
  ]);

  console.log('✅ Created 5 drivers');

  // Create multiple trips, fuel logs, maintenance logs, and expenses
  console.log('Generating operational history data...');

  const sources = ['Warehouse A', 'Production Plant C', 'Logistics Hub E', 'Port Container Terminal', 'Supply Depot G'];
  const destinations = ['Distribution Center B', 'Retail Depot D', 'Fulfillment Center F', 'Export Facility H', 'Metro Hub J'];

  // 1. Create Trips & Fuel Logs
  const tripCount = 18;
  const nowMs = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;

  for (let i = 0; i < tripCount; i++) {
    const dayOffset = Math.floor(i / 2.5); // Spread across the last 7 days
    const createdDate = new Date(nowMs - dayOffset * oneDayMs);
    const vehicle = vehicles[i % vehicles.length];
    const driver = drivers[i % drivers.length];
    const source = sources[i % sources.length];
    const destination = destinations[i % destinations.length];

    if (!vehicle || !driver) continue;

    // Decide status distribution: 12 Completed, 3 Dispatched, 3 Draft
    let status = 'Completed';
    if (i >= 12 && i < 15) status = 'Dispatched';
    else if (i >= 15) status = 'Draft';

    const cargoWeight = Math.round(200 + Math.random() * 2000);
    const plannedDistance = Math.round(50 + Math.random() * 450);

    const isCompleted = status === 'Completed';
    const isDispatched = status === 'Dispatched';

    const trip = await prisma.trip.create({
      data: {
        source,
        destination,
        vehicleId: vehicle.id,
        driverId: driver.id,
        cargoWeight,
        plannedDistance,
        actualDistance: isCompleted ? Math.round(plannedDistance * 0.98) : null,
        fuelConsumed: isCompleted ? Math.round(plannedDistance * 0.12) : null,
        finalOdometer: isCompleted ? Math.round(vehicle.odometer + plannedDistance) : null,
        status,
        createdAt: createdDate,
        dispatchedAt: isCompleted || isDispatched ? new Date(createdDate.getTime() + 2 * 60 * 60 * 1000) : null,
        completedAt: isCompleted ? new Date(createdDate.getTime() + 8 * 60 * 60 * 1000) : null,
      },
    });

    // Add fuel logs for completed trips
    if (isCompleted) {
      const liters = Math.round(plannedDistance * 0.12);
      await prisma.fuelLog.create({
        data: {
          vehicleId: vehicle.id,
          liters,
          cost: Math.round(liters * (1.30 + Math.random() * 0.40)),
          odometer: Math.round(vehicle.odometer + plannedDistance),
          date: new Date(createdDate.getTime() + 8 * 60 * 60 * 1000),
          tripId: trip.id,
        },
      });
    }
  }
  console.log(`✅ Created ${tripCount} trips with realistic historical states and fuel logs`);

  // 2. Create Maintenance Logs
  const maintenanceSpecs = [
    { type: 'OIL_CHANGE', description: 'Routine oil change and oil filter swap', cost: 120, status: 'Closed', ageDays: 12 },
    { type: 'TIRE_ROTATION', description: 'All-wheel tire rotation and balancing', cost: 180, status: 'Closed', ageDays: 8 },
    { type: 'BRAKE_SERVICE', description: 'Front brake pad replacement', cost: 350, status: 'Closed', ageDays: 3 },
    { type: 'ENGINE_REPAIR', description: 'Check engine light diagnostic and manifold gasket replacement', cost: 850, status: 'Open', ageDays: 1 },
  ];

  for (let i = 0; i < maintenanceSpecs.length; i++) {
    const spec = maintenanceSpecs[i];
    const vehicle = vehicles[i % vehicles.length];
    if (!vehicle) continue;

    const startDate = new Date(nowMs - spec.ageDays * oneDayMs);
    await prisma.maintenanceLog.create({
      data: {
        vehicleId: vehicle.id,
        type: spec.type,
        description: spec.description,
        cost: spec.cost,
        status: spec.status,
        startDate,
        endDate: spec.status === 'Closed' ? new Date(startDate.getTime() + oneDayMs) : null,
      },
    });
  }
  console.log(`✅ Seeded ${maintenanceSpecs.length} maintenance events`);

  // 3. Create Expenses
  const expenseSpecs = [
    { type: 'TOLL', amount: 35, description: 'National Highway Toll charges', ageDays: 1 },
    { type: 'TOLL', amount: 20, description: 'Expressway transit fee', ageDays: 3 },
    { type: 'TOLL', amount: 45, description: 'State bypass toll charge', ageDays: 5 },
    { type: 'INSURANCE', amount: 1200, description: 'Quarterly fleet vehicle insurance premium', ageDays: 6 },
    { type: 'OTHER', amount: 95, description: 'Parking facility charges and depot passes', ageDays: 4 },
  ];

  for (let i = 0; i < expenseSpecs.length; i++) {
    const spec = expenseSpecs[i];
    const vehicle = vehicles[i % vehicles.length];
    if (!vehicle) continue;

    await prisma.expense.create({
      data: {
        vehicleId: vehicle.id,
        type: spec.type,
        amount: spec.amount,
        description: spec.description,
        date: new Date(nowMs - spec.ageDays * oneDayMs),
      },
    });
  }
  console.log(`✅ Seeded ${expenseSpecs.length} operational expense logs`);

  console.log('\n🎉 Seeding complete!');
  console.log('\n📋 Demo Accounts:');
  console.log('   Fleet Manager:    fleet@transitops.com   / TransitOps@123');
  console.log('   Driver:           driver@transitops.com / TransitOps@123');
  console.log('   Safety Officer:   safety@transitops.com / TransitOps@123');
  console.log('   Financial Analyst: finance@transitops.com / TransitOps@123');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
