// =============================================================================
// ROS Shared Types — API Response Standards
// =============================================================================

export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    fieldErrors?: Record<string, string[]>;
  };
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

// Common error codes
export const ErrorCodes = {
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
} as const;
