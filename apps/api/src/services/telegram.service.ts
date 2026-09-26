// =============================================================================
// Telegram Bot Service — Multi-Tenant Operational Notifications
// =============================================================================

import fs from 'fs';
import path from 'path';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { cacheGet, cacheSet, cacheDel } from '../lib/redis';

export const TELEGRAM_NOTIFICATION_META = [
  {
    category: 'Orders & Kitchen Operations',
    items: [
      {
        id: 'ORDER_QR_NEW',
        label: '1. QR Menu New Order',
        description: 'New orders placed directly by customers via table QR code',
      },
      {
        id: 'KOT_SENT',
        label: '2. KOT Dispatched to Kitchen',
        description: 'New kitchen order tickets sent from POS or Table service',
      },
      {
        id: 'KOT_ACCEPTED',
        label: '3. Ticket Accepted in Kitchen (KDS)',
        description: 'Kitchen chef accepts ticket and starts preparing',
      },
      {
        id: 'FOOD_READY',
        label: '4. Food Ready to Serve',
        description: 'Kitchen marks dish/order as cooked and ready for pickup',
      },
      {
        id: 'FOOD_SERVED',
        label: '5. Food Served to Table',
        description: 'Waiter or runner delivers order to guest table',
      },
    ],
  },
  {
    category: 'Billing & Order Changes',
    items: [
      {
        id: 'BILL_PAID',
        label: '6. Bill Settled & Paid',
        description: 'Customer bill settled via Cash, UPI, Card with itemized summary',
      },
      {
        id: 'ORDER_CANCELLED_TABLES',
        label: '7. Order Cancelled (Tables)',
        description: 'Partial or full order cancellation from floor tables section',
      },
      {
        id: 'ORDER_CANCELLED_KITCHEN',
        label: '8. Order Cancelled (Kitchen)',
        description: 'Partial or full order cancellation inside kitchen display',
      },
    ],
  },
  {
    category: 'Reports & Analytics',
    items: [
      {
        id: 'DAILY_SALES_REPORT',
        label: '9. Daily Tablewise & Top Seller Sales Report',
        description: 'End-of-day revenue breakdown, table performance & bestsellers',
      },
      {
        id: 'DAILY_EXPENSES_REPORT',
        label: '10. Daily Expense Summary',
        description: 'Daily operational expenses logged across all departments',
      },
      {
        id: 'MONTHLY_REPORT',
        label: '12. Monthly Performance Report',
        description: 'Comprehensive month-end P&L, revenue vs expenses summary',
      },
    ],
  },
  {
    category: 'Management & Catalogs',
    items: [
      {
        id: 'STAFF_MODIFIED',
        label: '11. Staff Member Added / Modified',
        description: 'Staff enrollment, salary adjustment, permission updates',
      },
      {
        id: 'INVENTORY_MODIFIED',
        label: '13. Stock & Inventory Changes',
        description: 'Stock additions, adjustments, transfers, and inventory counts',
      },
      {
        id: 'MENU_MODIFIED',
        label: '14. Menu Items Added / Updated / Deleted',
        description: 'Changes to dishes, prices, variants, or categories',
      },
    ],
  },
];

export class TelegramService {
  /** Helper to get full name of user for notifications */
  static async getUserName(userOrReqOrId?: any, fallback = 'Staff'): Promise<string> {
    if (!userOrReqOrId) return fallback;
    if (typeof userOrReqOrId === 'string') {
      try {
        const u = await prisma.user.findUnique({ where: { id: userOrReqOrId }, select: { name: true } });
        if (u?.name) return u.name;
      } catch {}
      return fallback;
    }
    const reqUser = userOrReqOrId.user || userOrReqOrId;
    if (reqUser?.name) return reqUser.name;
    if (reqUser?.sub || reqUser?.id) {
      try {
        const u = await prisma.user.findUnique({ where: { id: reqUser.sub || reqUser.id }, select: { name: true } });
        if (u?.name) return u.name;
      } catch {}
    }
    if (reqUser?.email) {
      const prefix = reqUser.email.split('@')[0];
      return prefix.charAt(0).toUpperCase() + prefix.slice(1);
    }
    return fallback;
  }

  /** Get current bot token from environment */
  static getBotToken(): string {
    return process.env.TELEGRAM_BOT_TOKEN?.trim() || '';
  }

  /** Read or detect .env file path */
  private static getEnvFilePath(): string {
    const candidates = [
      path.resolve(process.cwd(), '.env'),
      path.resolve(process.cwd(), 'apps/api/.env'),
      path.resolve(__dirname, '../../.env'),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
    return candidates[0];
  }

  /** Save new Telegram bot token to .env file and runtime environment */
  static async saveBotToken(token: string): Promise<{ success: boolean; botInfo?: any }> {
    const cleanToken = token.trim();
    process.env.TELEGRAM_BOT_TOKEN = cleanToken;

    // Test token validity with Telegram getMe
    let botInfo: any = null;
    if (cleanToken) {
      botInfo = await this.getBotInfo(cleanToken);
      if (!botInfo || !botInfo.is_bot) {
        throw new Error('Invalid Telegram Bot Token. Could not connect to Telegram API.');
      }
      process.env.TELEGRAM_BOT_USERNAME = botInfo.username || '';
    } else {
      process.env.TELEGRAM_BOT_USERNAME = '';
    }

    try {
      const envPath = this.getEnvFilePath();
      let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

      if (envContent.includes('TELEGRAM_BOT_TOKEN=')) {
        envContent = envContent.replace(/TELEGRAM_BOT_TOKEN=.*(\r?\n|$)/g, `TELEGRAM_BOT_TOKEN="${cleanToken}"$1`);
      } else {
        envContent += `\nTELEGRAM_BOT_TOKEN="${cleanToken}"\n`;
      }

      const botUsername = botInfo?.username || '';
      if (envContent.includes('TELEGRAM_BOT_USERNAME=')) {
        envContent = envContent.replace(/TELEGRAM_BOT_USERNAME=.*(\r?\n|$)/g, `TELEGRAM_BOT_USERNAME="${botUsername}"$1`);
      } else {
        envContent += `TELEGRAM_BOT_USERNAME="${botUsername}"\n`;
      }

      fs.writeFileSync(envPath, envContent, 'utf8');
    } catch (err: any) {
      logger.warn(`Could not persist TELEGRAM_BOT_TOKEN to .env file: ${err.message}`);
    }

    return { success: true, botInfo };
  }

  /** Retrieve bot details from Telegram API */
  static async getBotInfo(customToken?: string): Promise<any> {
    const token = (customToken || this.getBotToken()).trim();
    if (!token) return null;

    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const data = (await res.json()) as any;
      if (data && data.ok) {
        return data.result;
      }
      return null;
    } catch (err: any) {
      logger.error(`Telegram getMe error: ${err.message}`);
      return null;
    }
  }

  /** Send a direct message to a specific Telegram Chat ID */
  static async sendMessage(
    chatId: string,
    message: string,
    parseMode: 'HTML' | 'Markdown' = 'HTML'
  ): Promise<{ success: boolean; error?: string }> {
    const token = this.getBotToken();
    if (!token) {
      return { success: false, error: 'Telegram Bot Token is not configured' };
    }
    if (!chatId) {
      return { success: false, error: 'Chat ID is required' };
    }

    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: parseMode,
          disable_web_page_preview: true,
        }),
      });

      const data = (await res.json()) as any;
      if (data && data.ok) {
        return { success: true };
      }
      return { success: false, error: data?.description || 'Telegram API returned failure' };
    } catch (err: any) {
      logger.error(`Telegram sendMessage failed: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  /** Send a broadcast notification to all authorized users of a tenant */
  static async sendNotificationToTenant(
    tenantId: string,
    notificationType: string,
    message: string,
    options?: { branchId?: string; excludeUserId?: string }
  ): Promise<number> {
    const token = this.getBotToken();
    if (!token || !tenantId) return 0;

    try {
      // Find all users for this tenant who have a telegramChatId configured
      const users = await prisma.user.findMany({
        where: {
          tenantId,
          isActive: true,
          telegramChatId: { not: null },
          deletedAt: null,
          ...(options?.excludeUserId ? { id: { not: options.excludeUserId } } : {}),
        },
        include: {
          branchRoles: {
            include: {
              role: true,
            },
          },
        },
      });

      let sentCount = 0;

      for (const u of users) {
        if (!u.telegramChatId) continue;

        const isSuperadmin =
          u.email.toLowerCase() === 'superadmin@ros.com' ||
          u.tenantId === 'tenant-platform' ||
          u.branchRoles.some((br) => ['OWNER', 'ADMIN'].includes(br.role.name.toUpperCase()));

        let shouldSend = false;

        if (isSuperadmin) {
          // Tenant superadmin receives ALL notifications by default
          shouldSend = true;
        } else {
          // Staff member: check if staff has this specific notification enabled
          let userPermittedNotifs: string[] = [];
          if (u.telegramNotifications) {
            try {
              userPermittedNotifs = JSON.parse(u.telegramNotifications);
            } catch {
              userPermittedNotifs = [];
            }
          }
          if (Array.isArray(userPermittedNotifs) && userPermittedNotifs.includes(notificationType)) {
            shouldSend = true;
          }
        }

        if (shouldSend) {
          try {
            await this.sendMessage(u.telegramChatId, message);
            sentCount++;
          } catch (err: any) {
            logger.warn(`Failed to send telegram to user ${u.email}: ${err.message}`);
          }
        }
      }

      return sentCount;
    } catch (err: any) {
      logger.error(`sendNotificationToTenant error: ${err.message}`);
      return 0;
    }
  }

  /** Send a photo directly from in-memory Buffer to a specific Telegram Chat ID */
  static async sendPhoto(
    chatId: string,
    photoBuffer: Buffer,
    filename = 'receipt.jpg',
    caption?: string
  ): Promise<{ success: boolean; error?: string }> {
    const token = this.getBotToken();
    if (!token) return { success: false, error: 'Telegram Bot Token is not configured' };
    if (!chatId) return { success: false, error: 'Chat ID is required' };

    try {
      const formData = new FormData();
      formData.append('chat_id', chatId);
      const blob = new Blob([photoBuffer], { type: 'image/jpeg' });
      formData.append('photo', blob, filename);
      if (caption) {
        formData.append('caption', caption);
        formData.append('parse_mode', 'HTML');
      }

      const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: 'POST',
        body: formData,
      });

      const data = (await res.json()) as any;
      if (data && data.ok) {
        return { success: true };
      }
      return { success: false, error: data?.description || 'Telegram sendPhoto returned failure' };
    } catch (err: any) {
      logger.error(`Telegram sendPhoto failed: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  /** Send a photo notification to all authorized users of a tenant */
  static async sendPhotoNotificationToTenant(
    tenantId: string,
    notificationType: string,
    photoBuffer: Buffer,
    filename = 'receipt.jpg',
    caption?: string,
    options?: { branchId?: string; excludeUserId?: string }
  ): Promise<number> {
    const token = this.getBotToken();
    if (!token || !tenantId) return 0;

    try {
      const users = await prisma.user.findMany({
        where: {
          tenantId,
          isActive: true,
          telegramChatId: { not: null },
          deletedAt: null,
          ...(options?.excludeUserId ? { id: { not: options.excludeUserId } } : {}),
        },
        include: {
          branchRoles: {
            include: {
              role: true,
            },
          },
        },
      });

      let sentCount = 0;

      for (const u of users) {
        if (!u.telegramChatId) continue;

        const isSuperadmin =
          u.email.toLowerCase() === 'superadmin@ros.com' ||
          u.tenantId === 'tenant-platform' ||
          u.branchRoles.some((br) => ['OWNER', 'ADMIN'].includes(br.role.name.toUpperCase()));

        let shouldSend = false;

        if (isSuperadmin) {
          shouldSend = true;
        } else {
          let userPermittedNotifs: string[] = [];
          if (u.telegramNotifications) {
            try {
              userPermittedNotifs = JSON.parse(u.telegramNotifications);
            } catch {
              userPermittedNotifs = [];
            }
          }
          if (Array.isArray(userPermittedNotifs) && userPermittedNotifs.includes(notificationType)) {
            shouldSend = true;
          }
        }

        if (shouldSend) {
          try {
            await this.sendPhoto(u.telegramChatId, photoBuffer, filename, caption);
            sentCount++;
          } catch (err: any) {
            logger.warn(`Failed to send telegram photo to user ${u.email}: ${err.message}`);
          }
        }
      }

      return sentCount;
    } catch (err: any) {
      logger.error(`sendPhotoNotificationToTenant error: ${err.message}`);
      return 0;
    }
  }

  private static isPolling = false;
  private static pollOffset = 0;

  /**
   * Start continuous long-polling loop to instantly receive messages & /start commands
   */
  static startPolling(): void {
    if (this.isPolling) return;
    const token = this.getBotToken();
    if (!token) return;

    this.isPolling = true;
    logger.info('🤖 Starting Telegram Bot polling loop for instant OTP delivery...');

    const poll = async () => {
      try {
        const currentToken = this.getBotToken();
        if (!currentToken) {
          setTimeout(poll, 5000);
          return;
        }

        const url = `https://api.telegram.org/bot${currentToken}/getUpdates?offset=${TelegramService.pollOffset}&timeout=15`;
        const res = await fetch(url, {
          signal: AbortSignal.timeout(20000),
        });

        if (res.ok) {
          const data = (await res.json()) as any;
          if (data && data.ok && Array.isArray(data.result)) {
            for (const update of data.result) {
              TelegramService.pollOffset = Math.max(TelegramService.pollOffset, update.update_id + 1);
              await TelegramService.handleTelegramUpdate(update);
            }
          }
        }
      } catch (err: any) {
        // Ignore timeout / network retry errors
      } finally {
        if (TelegramService.isPolling) {
          setTimeout(poll, 1000);
        }
      }
    };

    poll();
  }

  /**
   * Process incoming Telegram webhook updates (messages, /start <token>, shared contact)
   */
  static async handleTelegramUpdate(update: any): Promise<void> {
    try {
      const message = update?.message || update?.channel_post;
      if (!message) return;

      const chatId = String(message.chat?.id || '');
      const rawUsername = message.from?.username || '';
      const cleanUsername = rawUsername ? rawUsername.trim().toLowerCase().replace(/^@/, '') : '';
      const text = String(message.text || '').trim();
      const contact = message.contact;

      if (!chatId) return;

      // Always cache chatId by username if available
      if (cleanUsername) {
        await cacheSet(`tg_chat_username:${cleanUsername}`, chatId, 86400 * 30);
      }

      // Case 1: Deep Link /start link_<userId>
      if (text.startsWith('/start link_')) {
        const userId = text.replace('/start link_', '').trim();
        if (userId) {
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, name: true, phone: true },
          });

          if (user) {
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            await cacheSet(`tg_otp:${user.id}`, {
              otp,
              chatId,
              username: cleanUsername || undefined,
              phone: user.phone,
              requestedAt: new Date().toISOString(),
            }, 300);

            // Cache mapping
            await cacheSet(`tg_chat_user:${user.id}`, chatId, 86400 * 30);
            if (cleanUsername) {
              await cacheSet(`tg_chat_username:${cleanUsername}`, chatId, 86400 * 30);
            }

            await this.sendMessage(
              chatId,
              `🔐 <b>ROS Restaurant OS — Telegram Verification</b>\n\nHello <b>${user.name}</b> (${user.email})!\n\nYour 6-digit verification code is:\n\n👉 <code>${otp}</code> 👈\n\n⏱️ <i>This code expires in 5 minutes. Enter this code in your Restaurant User Profile to connect your account.</i>`
            );
            return;
          }
        }
      }

      // Case 2: Matching by Username pending request
      if (cleanUsername) {
        const pendingUserId = await cacheGet<string>(`tg_username_to_user:${cleanUsername}`);
        if (pendingUserId) {
          const user = await prisma.user.findUnique({
            where: { id: pendingUserId },
            select: { id: true, email: true, name: true },
          });

          if (user) {
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            await cacheSet(`tg_otp:${user.id}`, {
              otp,
              chatId,
              username: cleanUsername,
              requestedAt: new Date().toISOString(),
            }, 300);

            await this.sendMessage(
              chatId,
              `🔐 <b>ROS Restaurant OS — Verification Code</b>\n\nHello <b>${user.name}</b> (@${cleanUsername})!\n\nYour 6-digit verification code is:\n\n👉 <code>${otp}</code> 👈\n\n⏱️ <i>Enter this code in your Restaurant User Profile to connect your Telegram.</i>`
            );
            return;
          }
        }
      }

      // Case 3: Contact Shared (Phone number)
      if (contact?.phone_number) {
        const cleanPhone = contact.phone_number.replace(/\D/g, '');
        await cacheSet(`tg_chat_phone:${cleanPhone}`, chatId, 86400 * 30);

        // Find user by phone in database
        const matchingUsers = await prisma.user.findMany({
          where: {
            isActive: true,
            phone: { contains: cleanPhone.slice(-10) },
          },
          take: 5,
        });

        if (matchingUsers.length > 0) {
          const user = matchingUsers[0];
          const otp = Math.floor(100000 + Math.random() * 900000).toString();
          await cacheSet(`tg_otp:${user.id}`, {
            otp,
            chatId,
            username: cleanUsername || undefined,
            phone: cleanPhone,
            requestedAt: new Date().toISOString(),
          }, 300);

          await this.sendMessage(
            chatId,
            `🔐 <b>ROS Restaurant OS — Verification Code</b>\n\nHello <b>${user.name}</b>!\nYour verification code is: <code>${otp}</code>\n\n⏱️ <i>Enter this code on your Restaurant Portal to link your account.</i>`
          );
          return;
        }
      }

      // Case 4: Default Greeting / Help
      if (text.startsWith('/start') || text === 'hi' || text === 'hello') {
        const usernameTag = cleanUsername ? ` (@${cleanUsername})` : '';
        await this.sendMessage(
          chatId,
          `👋 <b>Welcome to ROS Restaurant Operating System Bot!</b>\n\n` +
          `Your Telegram ID: <code>${chatId}</code>${usernameTag}\n\n` +
          `To connect your account, enter your <b>Username (@${cleanUsername || 'handle'})</b> or <b>Mobile Number</b> on your Restaurant Profile page, and enter the OTP code.`
        );
      }
    } catch (err: any) {
      logger.error(`handleTelegramUpdate error: ${err.message}`);
    }
  }
}
