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
import { cacheGet, cacheSet, cacheDel } from '../lib/redis';
import { TelegramService } from '../services/telegram.service';

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

  static async getTelegramStatus(req: Request, res: Response): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      select: {
        id: true,
        name: true,
        email: true,
        telegramChatId: true,
        telegramUsername: true,
        telegramNotifications: true,
      },
    });

    const botInfo = await TelegramService.getBotInfo();

    sendSuccess(res, {
      isConnected: Boolean(user?.telegramChatId),
      chatId: user?.telegramChatId || null,
      username: user?.telegramUsername || null,
      notifications: user?.telegramNotifications ? JSON.parse(user.telegramNotifications) : [],
      botUsername: botInfo?.username || process.env.TELEGRAM_BOT_USERNAME || '',
      botConfigured: Boolean(botInfo),
    });
  }

  static async requestTelegramOtp(req: Request, res: Response): Promise<void> {
    const { chatId, username } = req.body;
    if (!chatId) {
      throw new AppError('VALIDATION_ERROR', 'Telegram Chat ID is required', 400);
    }

    const cleanChatId = String(chatId).trim();
    const cleanUsername = username ? String(username).trim().replace(/^@/, '') : undefined;

    // Check if bot token is configured
    const botInfo = await TelegramService.getBotInfo();
    if (!botInfo) {
      throw new AppError('CONFIG_ERROR', 'Telegram Bot is not configured by the Platform Superadmin yet. Please configure the bot token first.', 400);
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in cache with 5 minutes (300 seconds) expiration
    const cacheKey = `tg_otp:${req.user!.sub}`;
    await cacheSet(cacheKey, {
      otp,
      chatId: cleanChatId,
      username: cleanUsername,
      requestedAt: new Date().toISOString(),
    }, 300);

    // Send OTP to the Telegram Chat ID
    try {
      const sendResult = await TelegramService.sendMessage(
        cleanChatId,
        `🔐 <b>ROS Restaurant OS — Telegram Verification Code</b>\n\nYour 6-digit verification code is:\n\n👉 <code>${otp}</code> 👈\n\n⏱️ <i>This code expires in 5 minutes. Enter this code in your Restaurant User Profile to verify and link your Telegram account.</i>`
      );

      if (!sendResult.success) {
        throw new Error(sendResult.error || 'Failed to dispatch Telegram message');
      }
    } catch (err: any) {
      await cacheDel(cacheKey);
      throw new AppError(
        'TELEGRAM_SEND_FAILED',
        `Could not deliver OTP to Telegram Chat ID "${cleanChatId}". Please ensure you have opened the bot (@${botInfo.username || 'your bot'}) in Telegram and clicked START before requesting the OTP code. (${err.message || 'Error'})`,
        400
      );
    }

    sendSuccess(res, {
      message: `A 6-digit verification code was sent to your Telegram chat. Please check Telegram and enter the OTP.`,
      expiresInSeconds: 300,
      chatId: cleanChatId,
    });
  }

  static async verifyTelegramOtp(req: Request, res: Response): Promise<void> {
    const { otp } = req.body;
    if (!otp) {
      throw new AppError('VALIDATION_ERROR', 'Verification code (OTP) is required', 400);
    }

    const cleanOtp = String(otp).trim();
    const cacheKey = `tg_otp:${req.user!.sub}`;
    const stored = await cacheGet<{ otp: string; chatId: string; username?: string }>(cacheKey);

    if (!stored || !stored.otp) {
      throw new AppError('INVALID_OTP', 'The verification code has expired or was not requested. Please request a new OTP code.', 400);
    }

    if (stored.otp !== cleanOtp) {
      throw new AppError('INVALID_OTP', 'Invalid verification code. Please check your Telegram message and enter the correct 6-digit code.', 400);
    }

    // OTP matched! Update user record in database
    const updated = await prisma.user.update({
      where: { id: req.user!.sub },
      data: {
        telegramChatId: stored.chatId,
        ...(stored.username !== undefined ? { telegramUsername: stored.username } : {}),
      },
      select: {
        id: true,
        telegramChatId: true,
        telegramUsername: true,
      },
    });

    // Clean up OTP from cache
    await cacheDel(cacheKey);

    // Send confirmation message to the user on Telegram
    try {
      await TelegramService.sendMessage(
        stored.chatId,
        `🎉 <b>Telegram Linked Successfully!</b>\n\n✅ Your Telegram account is now authenticated and linked to <b>${req.user!.email}</b>.\nYou will now receive live operational notifications (Orders, KOTs, Food Ready, Bills & Reports) on this chat.`
      );
    } catch {}

    sendSuccess(res, {
      message: 'Telegram account verified and connected successfully!',
      user: updated,
    });
  }

  static async updateTelegramConnection(req: Request, res: Response): Promise<void> {
    // Keep legacy direct update as fallback if needed or redirect to OTP
    return this.requestTelegramOtp(req, res);
  }

  static async disconnectTelegram(req: Request, res: Response): Promise<void> {
    await prisma.user.update({
      where: { id: req.user!.sub },
      data: {
        telegramChatId: null,
        telegramUsername: null,
      },
    });

    sendSuccess(res, {
      message: 'Telegram account disconnected.',
    });
  }
}
