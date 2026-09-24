// =============================================================================
// Auth middleware — JWT verification + user context on req
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from '@ros/shared-types';
import { ErrorCodes } from '@ros/shared-types';
import { AppError } from './error.middleware';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function auth() {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return next(new AppError(ErrorCodes.UNAUTHORIZED, 'Authentication required', 401));
    }

    const token = authHeader.split(' ')[1];
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
      req.user = payload;
      req.tenantId = payload.tid;
      next();
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        return next(new AppError(ErrorCodes.TOKEN_EXPIRED, 'Access token expired', 401));
      }
      return next(new AppError(ErrorCodes.TOKEN_INVALID, 'Invalid access token', 401));
    }
  };
}
