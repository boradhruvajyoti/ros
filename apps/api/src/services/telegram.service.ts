// =============================================================================
// Telegram Bot Service — Multi-Tenant Operational Notifications
// =============================================================================

import fs from 'fs';
import path from 'path';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

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
}
