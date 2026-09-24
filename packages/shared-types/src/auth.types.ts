// =============================================================================
// ROS Shared Types — Core / Auth
// =============================================================================

export type Role =
  | 'SUPER_ADMIN'
  | 'PLATFORM_SUPPORT'
  | 'OWNER'
  | 'ADMINISTRATOR'
  | 'GENERAL_MANAGER'
  | 'BRANCH_MANAGER'
  | 'ACCOUNTANT'
  | 'CASHIER'
  | 'WAITER'
  | 'CHEF'
  | 'KITCHEN_STAFF'
  | 'INVENTORY_MANAGER'
  | 'PROCUREMENT_MANAGER'
  | 'DELIVERY_STAFF';

export type Permission =
  // Orders
  | 'orders:view' | 'orders:create' | 'orders:edit' | 'orders:cancel'
  | 'orders:void' | 'orders:refund'
  // Payments
  | 'payments:view' | 'payments:create' | 'payments:refund'
  // Menu
  | 'menu:view' | 'menu:create' | 'menu:edit' | 'menu:delete'
  // Tables
  | 'tables:view' | 'tables:create' | 'tables:edit' | 'tables:delete'
  // Reservations
  | 'reservations:view' | 'reservations:create' | 'reservations:edit'
  | 'reservations:cancel'
  // Kitchen
  | 'kitchen:view' | 'kitchen:update'
  // Inventory
  | 'inventory:view' | 'inventory:adjust' | 'inventory:count'
  | 'inventory:transfer' | 'inventory:write-off'
  // Procurement
  | 'procurement:view' | 'procurement:create' | 'procurement:approve'
  | 'procurement:receive'
  // Customers
  | 'customers:view' | 'customers:create' | 'customers:edit'
  // Loyalty
  | 'loyalty:view' | 'loyalty:adjust'
  // Staff
  | 'staff:view' | 'staff:create' | 'staff:edit'
  // Attendance
  | 'attendance:view' | 'attendance:manage'
  // Payroll
  | 'payroll:view' | 'payroll:approve'
  // Expenses
  | 'expenses:view' | 'expenses:create' | 'expenses:approve'
  // Cash
  | 'cash:open' | 'cash:close' | 'cash:adjust' | 'cash:view'
  // Reports
  | 'reports:view' | 'reports:export'
  // Settings
  | 'settings:view' | 'settings:edit'
  // Discounts / Overrides
  | 'discount:apply' | 'price:override'
  // Users / Roles
  | 'users:view' | 'users:create' | 'users:edit' | 'users:delete'
  | 'roles:view' | 'roles:create' | 'roles:edit'
  // Tenants / Branches
  | 'tenants:manage' | 'branches:view' | 'branches:create' | 'branches:edit';

export interface JwtPayload {
  sub: string;        // user id
  email?: string;     // user email
  tid: string;        // tenant id
  bid: string;        // active branch id
  roles: string[];
  permissions: Permission[];
  jti: string;        // JWT id
  iat: number;
  exp: number;
}

export interface AuthenticatedUser {
  id: string;
  tenantId: string;
  branchId: string;
  name: string;
  email: string;
  roles: string[];
  permissions: Permission[];
}
