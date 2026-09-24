// =============================================================================
// Rate limiting middleware
// =============================================================================

import rateLimit from 'express-rate-limit';
import { ErrorCodes } from '@ros/shared-types';

const isDev = process.env.NODE_ENV !== 'production';
const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10);
const max = parseInt(process.env.RATE_LIMIT_MAX || (isDev ? '10000' : '200'), 10);

const errorResponse = {
  success: false,
  error: {
    code: ErrorCodes.RATE_LIMITED,
    message: 'Too many requests. Please try again later.',
  },
};

/** General API rate limit */
export const apiRateLimit = rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, default: false },
  message: errorResponse,
  keyGenerator: (req) => {
    const tenantId = req.user?.tid || 'anon';
    const ip = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.ip || 'unknown';
    return `${tenantId}:${ip}`;
  },
});

/** Auth endpoint limit */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 1000 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, default: false },
  message: {
    success: false,
    error: {
      code: ErrorCodes.RATE_LIMITED,
      message: 'Too many auth attempts. Please try again later.',
    },
  },
});

