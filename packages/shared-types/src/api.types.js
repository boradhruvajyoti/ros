"use strict";
// =============================================================================
// ROS Shared Types — API Response Standards
// =============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorCodes = void 0;
// Common error codes
exports.ErrorCodes = {
    // Auth
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    TOKEN_INVALID: 'TOKEN_INVALID',
    MFA_REQUIRED: 'MFA_REQUIRED',
    // Validation
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    // Resources
    NOT_FOUND: 'NOT_FOUND',
    ALREADY_EXISTS: 'ALREADY_EXISTS',
    // Business logic
    INVALID_STATE_TRANSITION: 'INVALID_STATE_TRANSITION',
    INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
    PAYMENT_AMOUNT_MISMATCH: 'PAYMENT_AMOUNT_MISMATCH',
    ORDER_ALREADY_PAID: 'ORDER_ALREADY_PAID',
    TABLE_OCCUPIED: 'TABLE_OCCUPIED',
    COUPON_INVALID: 'COUPON_INVALID',
    COUPON_EXPIRED: 'COUPON_EXPIRED',
    COUPON_USAGE_LIMIT: 'COUPON_USAGE_LIMIT',
    // System
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    RATE_LIMITED: 'RATE_LIMITED',
    TENANT_MISMATCH: 'TENANT_MISMATCH',
};
//# sourceMappingURL=api.types.js.map