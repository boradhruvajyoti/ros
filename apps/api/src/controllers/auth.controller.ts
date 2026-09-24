// =============================================================================
// Auth Controller
// =============================================================================

import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { OnboardingService } from '../services/onboarding.service';
import { MenuParserService } from '../services/menu-parser.service';
import { sendSuccess, AppError } from '../middlewares/error.middleware';
import { writeAuditLog, AuditActions } from '../middlewares/audit.middleware';
import {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  onboardRestaurantSchema,
} from '../validators/auth.schema';
import { prisma } from '../lib/prisma';

const REFRESH_COOKIE = 'ros_rt';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge:   30 * 24 * 60 * 60 * 1000, // 30 days
  path:     '/api/v1/auth',
};

export class AuthController {
  static async onboard(req: Request, res: Response): Promise<void> {
    const dto = onboardRestaurantSchema.parse(req.body);
    const result = await OnboardingService.onboardRestaurant(dto);

    res.cookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTIONS);

    await writeAuditLog(
      { user: { tid: result.tenant.id, bid: result.branch.id, sub: result.user.id } } as any,
      { action: AuditActions.LOGIN, entity: 'Tenant', entityId: result.tenant.id }
    );

    sendSuccess(
      res,
      {
        accessToken: result.accessToken,
        user: result.user,
        tenant: result.tenant,
        branch: result.branch,
        summary: result.summary,
        message: `Welcome to ROS! '${result.tenant.name}' has been successfully onboarded.`,
      },
      201
    );
  }

  static async parseMenu(req: Request, res: Response): Promise<void> {
    const { imageBase64, fileName, mimeType, sampleText } = req.body;
    if (!imageBase64 && !sampleText) {
      throw new AppError('VALIDATION_ERROR', 'Please provide an image (imageBase64) or sampleText', 400);
    }

    const result = await MenuParserService.parseMenuUpload({
      imageBase64,
      fileName,
      mimeType,
      sampleText,
    });

    sendSuccess(res, result);
  }

  static async login(req: Request, res: Response): Promise<void> {
    const dto = loginSchema.parse(req.body);
    const deviceInfo = req.headers['user-agent'];
    const ipAddress = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.ip;

    const result = await AuthService.login(
      dto.email,
      dto.password,
      dto.branchId,
      deviceInfo,
      ipAddress
    );

    // Set refresh token in httpOnly cookie
    res.cookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTIONS);

    await writeAuditLog(
      { user: { tid: result.user.tenantId, bid: result.user.branchId, sub: result.user.id } } as any,
      { action: AuditActions.LOGIN, entity: 'User', entityId: result.user.id }
    );

    sendSuccess(res, { accessToken: result.accessToken, user: result.user });
  }

  static async logout(req: Request, res: Response): Promise<void> {
    const refreshToken = req.cookies[REFRESH_COOKIE];
    if (refreshToken) {
      await AuthService.logout(refreshToken);
    }
    res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });

    if (req.user) {
      await writeAuditLog(req, { action: AuditActions.LOGOUT, entity: 'User', entityId: req.user.sub });
    }

    sendSuccess(res, { message: 'Logged out successfully' });
  }

  static async refresh(req: Request, res: Response): Promise<void> {
    const refreshToken = req.cookies[REFRESH_COOKIE];
    if (!refreshToken) {
      throw new AppError('TOKEN_INVALID', 'No refresh token', 401);
    }

    const deviceInfo = req.headers['user-agent'];
    const ipAddress = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.ip;

    const result = await AuthService.refresh(refreshToken, deviceInfo, ipAddress);
    res.cookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTIONS);
    sendSuccess(res, { accessToken: result.accessToken });
  }

  static async forgotPassword(req: Request, res: Response): Promise<void> {
    const { email } = forgotPasswordSchema.parse(req.body);
    const result = await AuthService.forgotPassword(email);
    sendSuccess(res, result);
  }

  static async resetPassword(req: Request, res: Response): Promise<void> {
    const dto = resetPasswordSchema.parse(req.body);
    await AuthService.resetPassword(dto.token, dto.newPassword);
    sendSuccess(res, { message: 'Password reset successfully. Please log in.' });
  }

  static async me(req: Request, res: Response): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        tenantId: true,
        isActive: true,
        lastLoginAt: true,
        branchRoles: {
          include: { branch: { select: { id: true, name: true } }, role: { select: { id: true, name: true } } },
        },
      },
    });
    sendSuccess(res, { user, permissions: req.user!.permissions });
  }

  static async changePassword(req: Request, res: Response): Promise<void> {
    const dto = changePasswordSchema.parse(req.body);
    await AuthService.changePassword(req.user!.sub, dto.currentPassword, dto.newPassword);

    await writeAuditLog(req, { action: AuditActions.PASSWORD_RESET, entity: 'User', entityId: req.user!.sub });

    // Clear all sessions after password change
    res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });
    sendSuccess(res, { message: 'Password changed. Please log in again.' });
  }

  static async switchBranch(req: Request, res: Response): Promise<void> {
    const { branchId } = req.body;
    if (!branchId) throw new AppError('VALIDATION_ERROR', 'branchId is required', 400);

    const result = await AuthService.switchBranch(req.user!.sub, branchId);
    sendSuccess(res, result);
  }

  static async switchTenant(req: Request, res: Response): Promise<void> {
    const { tenantId, branchId } = req.body;
    if (!tenantId) throw new AppError('VALIDATION_ERROR', 'tenantId is required', 400);

    const result = await AuthService.switchTenant(req.user!.sub, tenantId, branchId);
    sendSuccess(res, result);
  }
}
