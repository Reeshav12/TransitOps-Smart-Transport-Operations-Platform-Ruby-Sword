// RBAC (Role-Based Access Control) for TransitOps

export const ROLES = {
  FLEET_MANAGER: 'FLEET_MANAGER',
  DRIVER: 'DRIVER',
  SAFETY_OFFICER: 'SAFETY_OFFICER',
  FINANCIAL_ANALYST: 'FINANCIAL_ANALYST',
} as const;

export type RoleName = keyof typeof ROLES;

export const ROLE_DESCRIPTIONS: Record<RoleName, string> = {
  FLEET_MANAGER: 'Oversees fleet assets, maintenance, vehicle lifecycle, and operational efficiency',
  DRIVER: 'Creates trips, assigns vehicles and drivers, and monitors active deliveries',
  SAFETY_OFFICER: 'Ensures driver compliance, tracks license validity, and monitors safety scores',
  FINANCIAL_ANALYST: 'Reviews operational expenses, fuel consumption, maintenance costs, and profitability',
};

// Permission matrix: action -> allowed roles
export const PERMISSIONS: Record<string, RoleName[]> = {
  // Vehicle
  'vehicle:read': [ROLES.FLEET_MANAGER, ROLES.DRIVER, ROLES.SAFETY_OFFICER, ROLES.FINANCIAL_ANALYST],
  'vehicle:create': [ROLES.FLEET_MANAGER],
  'vehicle:update': [ROLES.FLEET_MANAGER],
  'vehicle:delete': [ROLES.FLEET_MANAGER],

  // Driver
  'driver:read': [ROLES.FLEET_MANAGER, ROLES.DRIVER, ROLES.SAFETY_OFFICER, ROLES.FINANCIAL_ANALYST],
  'driver:create': [ROLES.FLEET_MANAGER, ROLES.SAFETY_OFFICER],
  'driver:update': [ROLES.FLEET_MANAGER, ROLES.SAFETY_OFFICER],
  'driver:delete': [ROLES.SAFETY_OFFICER],

  // Trip
  'trip:read': [ROLES.FLEET_MANAGER, ROLES.DRIVER, ROLES.SAFETY_OFFICER, ROLES.FINANCIAL_ANALYST],
  'trip:create': [ROLES.FLEET_MANAGER, ROLES.DRIVER],
  'trip:dispatch': [ROLES.FLEET_MANAGER, ROLES.DRIVER],
  'trip:complete': [ROLES.FLEET_MANAGER, ROLES.DRIVER],
  'trip:cancel': [ROLES.FLEET_MANAGER, ROLES.DRIVER],

  // Maintenance
  'maintenance:read': [ROLES.FLEET_MANAGER, ROLES.SAFETY_OFFICER, ROLES.FINANCIAL_ANALYST],
  'maintenance:create': [ROLES.FLEET_MANAGER],
  'maintenance:update': [ROLES.FLEET_MANAGER],
  'maintenance:close': [ROLES.FLEET_MANAGER],

  // Fuel & Expense
  'fuel:read': [ROLES.FLEET_MANAGER, ROLES.FINANCIAL_ANALYST],
  'fuel:create': [ROLES.FLEET_MANAGER, ROLES.FINANCIAL_ANALYST],
  'expense:read': [ROLES.FLEET_MANAGER, ROLES.FINANCIAL_ANALYST],
  'expense:create': [ROLES.FLEET_MANAGER, ROLES.FINANCIAL_ANALYST],

  // Reports & Analytics
  'dashboard:read': [ROLES.FLEET_MANAGER, ROLES.DRIVER, ROLES.SAFETY_OFFICER, ROLES.FINANCIAL_ANALYST],
  'reports:read': [ROLES.FLEET_MANAGER, ROLES.SAFETY_OFFICER, ROLES.FINANCIAL_ANALYST],
  'reports:export': [ROLES.FLEET_MANAGER, ROLES.FINANCIAL_ANALYST],

  // Audit
  'audit:read': [ROLES.FLEET_MANAGER],
};

export function can(roleName: string, action: string): boolean {
  const allowedRoles = PERMISSIONS[action];
  if (!allowedRoles) return false;
  return allowedRoles.includes(roleName as RoleName);
}

// Sidebar navigation config
export interface NavItem {
  title: string;
  href: string;
  icon: string; // lucide icon name
  requiredPermissions: string[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: 'LayoutDashboard',
    requiredPermissions: ['dashboard:read'],
  },
  {
    title: 'Vehicles',
    href: '/vehicles',
    icon: 'Truck',
    requiredPermissions: ['vehicle:read'],
  },
  {
    title: 'Drivers',
    href: '/drivers',
    icon: 'Users',
    requiredPermissions: ['driver:read'],
  },
  {
    title: 'Trips',
    href: '/trips',
    icon: 'Route',
    requiredPermissions: ['trip:read'],
  },
  {
    title: 'Maintenance',
    href: '/maintenance',
    icon: 'Wrench',
    requiredPermissions: ['maintenance:read'],
  },
  {
    title: 'Fuel & Expenses',
    href: '/fuel-expenses',
    icon: 'Fuel',
    requiredPermissions: ['fuel:read'],
  },
  {
    title: 'Reports',
    href: '/reports',
    icon: 'BarChart3',
    requiredPermissions: ['reports:read'],
  },
];

export function getNavItemsForRole(roleName: string): NavItem[] {
  return NAV_ITEMS.filter((item) =>
    item.requiredPermissions.some((perm) => can(roleName, perm))
  );
}
