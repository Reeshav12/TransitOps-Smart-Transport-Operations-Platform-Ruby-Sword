// Zod validation schemas for TransitOps

import { z } from 'zod';

// ============================================================
// AUTH
// ============================================================

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  roleName: z.enum(['FLEET_MANAGER', 'DRIVER', 'SAFETY_OFFICER', 'FINANCIAL_ANALYST']),
});

// ============================================================
// VEHICLE
// ============================================================

export const vehicleTypeEnum = z.enum(['TRUCK', 'VAN', 'BUS', 'TRAILER', 'CAR']);
export const vehicleStatusEnum = z.enum(['Available', 'OnTrip', 'InShop', 'Retired']);

export const vehicleCreateSchema = z.object({
  registrationNumber: z.string().min(2, 'Registration number must be at least 2 characters').max(20).trim().toUpperCase(),
  model: z.string().min(2, 'Model must be at least 2 characters').max(100).trim(),
  type: vehicleTypeEnum,
  maxLoadCapacity: z.number().positive('Max load capacity must be positive').max(100000, 'Max load capacity too large'),
  odometer: z.number().min(0, 'Odometer must be non-negative').default(0),
  acquisitionCost: z.number().positive('Acquisition cost must be positive'),
  status: vehicleStatusEnum.default('Available'),
  region: z.string().max(50).optional().nullable(),
});

export const vehicleUpdateSchema = vehicleCreateSchema.partial();

export const vehicleQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
  type: vehicleTypeEnum.optional(),
  status: vehicleStatusEnum.optional(),
  region: z.string().optional(),
  sortBy: z.enum(['registrationNumber', 'model', 'type', 'status', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ============================================================
// DRIVER
// ============================================================

export const driverCategoryEnum = z.enum(['A', 'B', 'C', 'HEAVY', 'LIGHT']);
export const driverStatusEnum = z.enum(['Available', 'OnTrip', 'OffDuty', 'Suspended']);

export const driverCreateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).trim(),
  licenseNumber: z.string().min(3, 'License number must be at least 3 characters').max(30).trim().toUpperCase(),
  licenseCategory: driverCategoryEnum,
  licenseExpiry: z.string().refine((val) => {
    const date = new Date(val);
    return date > new Date();
  }, 'License expiry must be a future date'),
  contactNumber: z.string().min(7, 'Contact number must be at least 7 characters').max(20).trim(),
  safetyScore: z.number().min(0).max(100).default(100),
  status: driverStatusEnum.default('Available'),
});

export const driverUpdateSchema = driverCreateSchema.partial();

export const driverQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
  status: driverStatusEnum.optional(),
  licenseCategory: driverCategoryEnum.optional(),
  sortBy: z.enum(['name', 'licenseNumber', 'licenseExpiry', 'safetyScore', 'status', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ============================================================
// TRIP
// ============================================================

export const tripStatusEnum = z.enum(['Draft', 'Dispatched', 'Completed', 'Cancelled']);

export const tripCreateSchema = z.object({
  source: z.string().min(2, 'Source must be at least 2 characters').max(100).trim(),
  destination: z.string().min(2, 'Destination must be at least 2 characters').max(100).trim(),
  vehicleId: z.string().min(1, 'Vehicle is required'),
  driverId: z.string().min(1, 'Driver is required'),
  cargoWeight: z.number().positive('Cargo weight must be positive'),
  plannedDistance: z.number().positive('Planned distance must be positive'),
  notes: z.string().max(500).optional().nullable(),
});

export const tripCompleteSchema = z.object({
  finalOdometer: z.number().positive('Final odometer must be positive'),
  fuelConsumed: z.number().positive('Fuel consumed must be positive'),
  actualDistance: z.number().positive('Actual distance must be positive'),
});

export const tripQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
  status: tripStatusEnum.optional(),
  vehicleId: z.string().optional(),
  driverId: z.string().optional(),
  sortBy: z.enum(['source', 'destination', 'status', 'createdAt', 'dispatchedAt', 'completedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ============================================================
// MAINTENANCE
// ============================================================

export const maintenanceTypeEnum = z.enum(['OIL_CHANGE', 'TIRE_ROTATION', 'BRAKE_SERVICE', 'ENGINE_REPAIR', 'INSPECTION', 'OTHER']);
export const maintenanceStatusEnum = z.enum(['Open', 'Closed']);

export const maintenanceCreateSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle is required'),
  type: maintenanceTypeEnum,
  description: z.string().max(500).optional().nullable(),
  cost: z.number().min(0, 'Cost must be non-negative'),
});

export const maintenanceUpdateSchema = maintenanceCreateSchema.partial();

export const maintenanceQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  vehicleId: z.string().optional(),
  status: maintenanceStatusEnum.optional(),
  type: maintenanceTypeEnum.optional(),
  sortBy: z.enum(['type', 'cost', 'status', 'startDate', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ============================================================
// FUEL LOG
// ============================================================

export const fuelLogCreateSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle is required'),
  liters: z.number().positive('Liters must be positive'),
  cost: z.number().positive('Cost must be positive'),
  odometer: z.number().min(0, 'Odometer must be non-negative'),
  date: z.string().optional(),
  tripId: z.string().optional().nullable(),
});

export const fuelLogQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  vehicleId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.enum(['date', 'liters', 'cost', 'createdAt']).default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ============================================================
// EXPENSE
// ============================================================

export const expenseTypeEnum = z.enum(['TOLL', 'MAINTENANCE', 'REPAIR', 'INSURANCE', 'OTHER']);

export const expenseCreateSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle is required'),
  type: expenseTypeEnum,
  amount: z.number().positive('Amount must be positive'),
  description: z.string().max(500).optional().nullable(),
  date: z.string().optional(),
});

export const expenseQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  vehicleId: z.string().optional(),
  type: expenseTypeEnum.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.enum(['date', 'amount', 'type', 'createdAt']).default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ============================================================
// TYPES
// ============================================================

export type VehicleCreateInput = z.infer<typeof vehicleCreateSchema>;
export type VehicleUpdateInput = z.infer<typeof vehicleUpdateSchema>;
export type VehicleQuery = z.infer<typeof vehicleQuerySchema>;

export type DriverCreateInput = z.infer<typeof driverCreateSchema>;
export type DriverUpdateInput = z.infer<typeof driverUpdateSchema>;
export type DriverQuery = z.infer<typeof driverQuerySchema>;

export type TripCreateInput = z.infer<typeof tripCreateSchema>;
export type TripCompleteInput = z.infer<typeof tripCompleteSchema>;
export type TripQuery = z.infer<typeof tripQuerySchema>;

export type MaintenanceCreateInput = z.infer<typeof maintenanceCreateSchema>;
export type MaintenanceUpdateInput = z.infer<typeof maintenanceUpdateSchema>;
export type MaintenanceQuery = z.infer<typeof maintenanceQuerySchema>;

export type FuelLogCreateInput = z.infer<typeof fuelLogCreateSchema>;
export type FuelLogQuery = z.infer<typeof fuelLogQuerySchema>;

export type ExpenseCreateInput = z.infer<typeof expenseCreateSchema>;
export type ExpenseQuery = z.infer<typeof expenseQuerySchema>;

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
