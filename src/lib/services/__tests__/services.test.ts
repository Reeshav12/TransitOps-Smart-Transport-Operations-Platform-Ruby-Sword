import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import { db } from '@/lib/db';
import * as vehicleService from '../vehicle.service';
import * as driverService from '../driver.service';
import * as tripService from '../trip.service';
import * as expenseService from '../expense.service';

describe('TransitOps Service Layer Tests', () => {
  // Test data tracking for cleanup
  const testVehicleIds: string[] = [];
  const testDriverIds: string[] = [];
  const testTripIds: string[] = [];
  const testExpenseIds: string[] = [];

  let testRoleId: string;
  let testUserId: string;

  beforeAll(async () => {
    // Ensure we have a Role and User for auditing
    let role = await db.role.findFirst({ where: { name: 'FLEET_MANAGER' } });
    if (!role) {
      role = await db.role.create({
        data: { name: 'FLEET_MANAGER', description: 'Fleet Manager Role' },
      });
    }
    testRoleId = role.id;

    let user = await db.user.findFirst({ where: { email: 'test.manager@transitops.com' } });
    if (!user) {
      user = await db.user.create({
        data: {
          email: 'test.manager@transitops.com',
          name: 'Test Manager',
          password: 'hashedpassword123',
          roleId: testRoleId,
        },
      });
    }
    testUserId = user.id;
  });

  afterAll(async () => {
    // Cleanup test trips, expenses, vehicles, and drivers
    if (testTripIds.length > 0) {
      await db.fuelLog.deleteMany({ where: { tripId: { in: testTripIds } } });
      await db.trip.deleteMany({ where: { id: { in: testTripIds } } });
    }
    if (testExpenseIds.length > 0) {
      await db.expense.deleteMany({ where: { id: { in: testExpenseIds } } });
    }
    if (testVehicleIds.length > 0) {
      await db.maintenanceLog.deleteMany({ where: { vehicleId: { in: testVehicleIds } } });
      await db.fuelLog.deleteMany({ where: { vehicleId: { in: testVehicleIds } } });
      await db.vehicle.deleteMany({ where: { id: { in: testVehicleIds } } });
    }
    if (testDriverIds.length > 0) {
      await db.driver.deleteMany({ where: { id: { in: testDriverIds } } });
    }
    // Delete test user
    await db.auditLog.deleteMany({ where: { userId: testUserId } });
    await db.user.delete({ where: { id: testUserId } });
  });

  // ==========================================
  // VEHICLE SERVICE TESTS
  // ==========================================
  describe('Vehicle Service', () => {
    it('should create and retrieve a vehicle', async () => {
      const regNo = `TST-${Math.floor(1000 + Math.random() * 9000)}`;
      const vehicle = await vehicleService.createVehicle({
        registrationNumber: regNo,
        model: 'Ford F-150',
        type: 'TRUCK',
        maxLoadCapacity: 1500,
        odometer: 10000,
        acquisitionCost: 45000,
        region: 'North',
      }, testUserId);

      expect(vehicle.id).toBeDefined();
      expect(vehicle.registrationNumber).toBe(regNo);
      testVehicleIds.push(vehicle.id);

      const fetched = await vehicleService.getVehicleById(vehicle.id);
      expect(fetched.model).toBe('Ford F-150');
    });

    it('should reject duplicate registration numbers', async () => {
      const duplicateReg = `DUP-${Math.floor(1000 + Math.random() * 9000)}`;
      const vehicle1 = await vehicleService.createVehicle({
        registrationNumber: duplicateReg,
        model: 'Transit Van',
        type: 'VAN',
        maxLoadCapacity: 2000,
        odometer: 5000,
        acquisitionCost: 35000,
      }, testUserId);
      testVehicleIds.push(vehicle1.id);

      await expect(
        vehicleService.createVehicle({
          registrationNumber: duplicateReg,
          model: 'Another Van',
          type: 'VAN',
          maxLoadCapacity: 2000,
          odometer: 5000,
          acquisitionCost: 35000,
        }, testUserId)
      ).rejects.toThrow();
    });
  });

  // ==========================================
  // DRIVER SERVICE TESTS
  // ==========================================
  describe('Driver Service', () => {
    it('should create and validate a driver', async () => {
      const licNo = `LIC-${Math.floor(100000 + Math.random() * 900000)}`;
      const driver = await driverService.createDriver({
        name: 'John Doe',
        licenseNumber: licNo,
        licenseCategory: 'HEAVY',
        licenseExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        contactNumber: '+1234567890',
        safetyScore: 95,
      }, testUserId);

      expect(driver.id).toBeDefined();
      expect(driver.licenseNumber).toBe(licNo);
      testDriverIds.push(driver.id);
    });

    it('should check for expired licenses in available drivers query', async () => {
      // Driver with expired license
      const licNo = `EXP-${Math.floor(100000 + Math.random() * 900000)}`;
      const expiredDriver = await driverService.createDriver({
        name: 'Expired Driver',
        licenseNumber: licNo,
        licenseCategory: 'LIGHT',
        licenseExpiry: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        contactNumber: '+1234567890',
        safetyScore: 80,
      }, testUserId);
      testDriverIds.push(expiredDriver.id);

      const availableDrivers = await driverService.getAvailableDrivers();
      expect(availableDrivers.some((d) => d.id === expiredDriver.id)).toBe(false);
    });
  });

  // ==========================================
  // TRIP WORKFLOW & TRANSACTION TESTS
  // ==========================================
  describe('Trip Workflow & State Machine', () => {
    it('should complete atomic transitions (Draft -> Dispatched -> Completed)', async () => {
      // 1. Setup available Vehicle and Driver
      const regNo = `TRP-V-${Math.floor(1000 + Math.random() * 9000)}`;
      const vehicle = await vehicleService.createVehicle({
        registrationNumber: regNo,
        model: 'Cargo Sprinter',
        type: 'VAN',
        maxLoadCapacity: 3000,
        odometer: 50000,
        acquisitionCost: 60000,
      }, testUserId);
      testVehicleIds.push(vehicle.id);

      const licNo = `TRP-D-${Math.floor(100000 + Math.random() * 900000)}`;
      const driver = await driverService.createDriver({
        name: 'Trip Driver',
        licenseNumber: licNo,
        licenseCategory: 'LIGHT',
        licenseExpiry: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000).toISOString(),
        contactNumber: '+1234567890',
        safetyScore: 90,
      }, testUserId);
      testDriverIds.push(driver.id);

      // 2. Create Trip (Draft)
      const trip = await tripService.createTrip({
        source: 'Warehouse A',
        destination: 'Client B',
        vehicleId: vehicle.id,
        driverId: driver.id,
        cargoWeight: 1500,
        plannedDistance: 120,
      }, testUserId);

      expect(trip.id).toBeDefined();
      expect(trip.status).toBe('Draft');
      testTripIds.push(trip.id);

      // 3. Dispatch Trip (Vehicle & Driver transition to OnTrip)
      const dispatchedTrip = await tripService.dispatchTrip(trip.id, testUserId);
      expect(dispatchedTrip.status).toBe('Dispatched');

      // Verify asset statuses locked in DB
      const updatedVehicle = await db.vehicle.findUnique({ where: { id: vehicle.id } });
      const updatedDriver = await db.driver.findUnique({ where: { id: driver.id } });
      expect(updatedVehicle?.status).toBe('OnTrip');
      expect(updatedDriver?.status).toBe('OnTrip');

      // 4. Double booking safety: attempting to create a trip with locked assets should fail
      await expect(
        tripService.createTrip({
          source: 'Warehouse X',
          destination: 'Client Y',
          vehicleId: vehicle.id,
          driverId: driver.id,
          cargoWeight: 100,
          plannedDistance: 50,
        }, testUserId)
      ).rejects.toThrow();

      // 5. Complete Trip (Odometer updates, Fuel log auto-generated, Assets restore to Available)
      const completedTrip = await tripService.completeTrip(trip.id, {
        finalOdometer: 50130, // 50000 + 130 actual distance
        fuelConsumed: 12,
        actualDistance: 130,
      }, testUserId);

      expect(completedTrip.status).toBe('Completed');
      expect(completedTrip.finalOdometer).toBe(50130);

      // Verify asset status restored to Available
      const finalVehicle = await db.vehicle.findUnique({ where: { id: vehicle.id } });
      const finalDriver = await db.driver.findUnique({ where: { id: driver.id } });
      expect(finalVehicle?.status).toBe('Available');
      expect(finalVehicle?.odometer).toBe(50130);
      expect(finalDriver?.status).toBe('Available');

      // Verify fuel log created automatically
      const fuelLogs = await db.fuelLog.findMany({ where: { tripId: trip.id } });
      expect(fuelLogs.length).toBe(1);
      expect(fuelLogs[0].liters).toBe(12);
    });

    it('should reject trip completion with final odometer less than starting odometer', async () => {
      const regNo = `ERR-V-${Math.floor(1000 + Math.random() * 9000)}`;
      const vehicle = await vehicleService.createVehicle({
        registrationNumber: regNo,
        model: 'Cargo Sprinter',
        type: 'VAN',
        maxLoadCapacity: 3000,
        odometer: 10000,
        acquisitionCost: 60000,
      }, testUserId);
      testVehicleIds.push(vehicle.id);

      const licNo = `ERR-D-${Math.floor(100000 + Math.random() * 900000)}`;
      const driver = await driverService.createDriver({
        name: 'Error Driver',
        licenseNumber: licNo,
        licenseCategory: 'LIGHT',
        licenseExpiry: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000).toISOString(),
        contactNumber: '+1234567890',
        safetyScore: 90,
      }, testUserId);
      testDriverIds.push(driver.id);

      const trip = await tripService.createTrip({
        source: 'Location A',
        destination: 'Location B',
        vehicleId: vehicle.id,
        driverId: driver.id,
        cargoWeight: 500,
        plannedDistance: 50,
      }, testUserId);
      testTripIds.push(trip.id);

      await tripService.dispatchTrip(trip.id, testUserId);

      // Attempt complete with odometer 9900 (starting was 10000)
      await expect(
        tripService.completeTrip(trip.id, {
          finalOdometer: 9900,
          fuelConsumed: 5,
          actualDistance: 50,
        }, testUserId)
      ).rejects.toThrow();
    });
  });

  // ==========================================
  // EXPENSE SERVICE TESTS
  // ==========================================
  describe('Expense Service', () => {
    it('should log and aggregate operational costs', async () => {
      const regNo = `EXP-C-${Math.floor(1000 + Math.random() * 9000)}`;
      const vehicle = await vehicleService.createVehicle({
        registrationNumber: regNo,
        model: 'Heavy Hauler',
        type: 'TRUCK',
        maxLoadCapacity: 10000,
        odometer: 150000,
        acquisitionCost: 120000,
      }, testUserId);
      testVehicleIds.push(vehicle.id);

      const expense = await expenseService.createExpense({
        vehicleId: vehicle.id,
        type: 'TOLL',
        amount: 45.5,
        description: 'Bridge toll on highway',
        date: new Date().toISOString(),
      }, testUserId);

      expect(expense.id).toBeDefined();
      expect(expense.amount).toBe(45.5);
      testExpenseIds.push(expense.id);
    });
  });
});
