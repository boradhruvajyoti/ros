export type Role = 'SUPER_ADMIN' | 'PLATFORM_SUPPORT' | 'OWNER' | 'ADMINISTRATOR' | 'GENERAL_MANAGER' | 'BRANCH_MANAGER' | 'ACCOUNTANT' | 'CASHIER' | 'WAITER' | 'CHEF' | 'KITCHEN_STAFF' | 'INVENTORY_MANAGER' | 'PROCUREMENT_MANAGER' | 'DELIVERY_STAFF';
export type Permission = 'orders:view' | 'orders:create' | 'orders:edit' | 'orders:cancel' | 'orders:void' | 'orders:refund' | 'payments:view' | 'payments:create' | 'payments:refund' | 'menu:view' | 'menu:create' | 'menu:edit' | 'menu:delete' | 'tables:view' | 'tables:create' | 'tables:edit' | 'tables:delete' | 'reservations:view' | 'reservations:create' | 'reservations:edit' | 'reservations:cancel' | 'kitchen:view' | 'kitchen:update' | 'inventory:view' | 'inventory:adjust' | 'inventory:count' | 'inventory:transfer' | 'inventory:write-off' | 'procurement:view' | 'procurement:create' | 'procurement:approve' | 'procurement:receive' | 'customers:view' | 'customers:create' | 'customers:edit' | 'loyalty:view' | 'loyalty:adjust' | 'staff:view' | 'staff:create' | 'staff:edit' | 'attendance:view' | 'attendance:manage' | 'payroll:view' | 'payroll:approve' | 'expenses:view' | 'expenses:create' | 'expenses:approve' | 'cash:open' | 'cash:close' | 'cash:adjust' | 'cash:view' | 'reports:view' | 'reports:export' | 'settings:view' | 'settings:edit' | 'discount:apply' | 'price:override' | 'users:view' | 'users:create' | 'users:edit' | 'users:delete' | 'roles:view' | 'roles:create' | 'roles:edit' | 'tenants:manage' | 'branches:view' | 'branches:create' | 'branches:edit';
export interface JwtPayload {
    sub: string;
    tid: string;
    bid: string;
    roles: string[];
    permissions: Permission[];
    jti: string;
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
//# sourceMappingURL=auth.types.d.ts.map