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
export declare const ErrorCodes: {
    readonly UNAUTHORIZED: "UNAUTHORIZED";
    readonly FORBIDDEN: "FORBIDDEN";
    readonly INVALID_CREDENTIALS: "INVALID_CREDENTIALS";
    readonly TOKEN_EXPIRED: "TOKEN_EXPIRED";
    readonly TOKEN_INVALID: "TOKEN_INVALID";
    readonly MFA_REQUIRED: "MFA_REQUIRED";
    readonly VALIDATION_ERROR: "VALIDATION_ERROR";
    readonly NOT_FOUND: "NOT_FOUND";
    readonly ALREADY_EXISTS: "ALREADY_EXISTS";
    readonly INVALID_STATE_TRANSITION: "INVALID_STATE_TRANSITION";
    readonly INSUFFICIENT_STOCK: "INSUFFICIENT_STOCK";
    readonly PAYMENT_AMOUNT_MISMATCH: "PAYMENT_AMOUNT_MISMATCH";
    readonly ORDER_ALREADY_PAID: "ORDER_ALREADY_PAID";
    readonly TABLE_OCCUPIED: "TABLE_OCCUPIED";
    readonly COUPON_INVALID: "COUPON_INVALID";
    readonly COUPON_EXPIRED: "COUPON_EXPIRED";
    readonly COUPON_USAGE_LIMIT: "COUPON_USAGE_LIMIT";
    readonly INTERNAL_ERROR: "INTERNAL_ERROR";
    readonly RATE_LIMITED: "RATE_LIMITED";
    readonly TENANT_MISMATCH: "TENANT_MISMATCH";
};
//# sourceMappingURL=api.types.d.ts.map