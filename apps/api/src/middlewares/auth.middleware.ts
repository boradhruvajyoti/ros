// =============================================================================
// Auth middleware — JWT verification + user & branch context on req
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
      tenantId?: string;
      branchId?: string;
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
      // Resolve active branch context from header override, query param, or JWT payload
      const headerBranchId = req.headers['x-branch-id'] as string;
      const queryBranchId = req.query?.branchId as string;
      req.branchId = headerBranchId || queryBranchId || payload.bid;
      next();
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        return next(new AppError(ErrorCodes.TOKEN_EXPIRED, 'Access token expired', 401));
      }
      return next(new AppError(ErrorCodes.TOKEN_INVALID, 'Invalid access token', 401));
    }
  };
}
