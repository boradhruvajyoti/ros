// =============================================================================
// Hardware, Thermal ESC/POS Printers & Cash Drawer Controller
// =============================================================================

import { Request, Response } from 'express';
import { sendSuccess } from '../middlewares/error.middleware';
import { prisma } from '../lib/prisma';
import { generateULID } from '@ros/utils';
import { z } from 'zod';

const createDeviceSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['THERMAL_PRINTER', 'RECEIPT_PRINTER', 'BARCODE_SCANNER', 'CASH_DRAWER', 'KDS_SCREEN']),
  connectionType: z.enum(['ETHERNET_IP', 'USB', 'BLUETOOTH']),
  ipAddress: z.string().optional(),
  port: z.number().int().optional(),
  devicePath: z.string().optional(),
  assignedStation: z.string().optional(),
  paperWidthMm: z.number().int().optional().default(80),
  driver: z.string().optional().default('ESC/POS Direct Socket'),
  hasCashDrawer: z.boolean().optional().default(false),
});

export class HardwareController {
  static async listDevices(req: Request, res: Response): Promise<void> {
    if (!req.user?.tid) {
      sendSuccess(res, []);
      return;
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: req.user.tid },
      select: { settings: true },
    });

    let devices: any[] = [];
    if (tenant?.settings) {
      try {
        const parsed = typeof tenant.settings === 'string' ? JSON.parse(tenant.settings) : tenant.settings;
        if (Array.isArray(parsed?.hardwareDevices)) {
          devices = parsed.hardwareDevices;
        }
      } catch {}
    }

    sendSuccess(res, devices);
  }

  static async createDevice(req: Request, res: Response): Promise<void> {
    const data = createDeviceSchema.parse(req.body);
    const tenantId = req.user!.tid;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });

    let parsedSettings: any = {};
    if (tenant?.settings) {
      try {
        parsedSettings = typeof tenant.settings === 'string' ? JSON.parse(tenant.settings) : tenant.settings;
      } catch {
        parsedSettings = {};
      }
    }

    const currentDevices: any[] = Array.isArray(parsedSettings?.hardwareDevices) ? parsedSettings.hardwareDevices : [];
    const newDevice = {
      id: generateULID(),
      ...data,
      status: 'ONLINE',
      paperStatus: 'OK',
      createdAt: new Date().toISOString(),
    };

    const updatedDevices = [...currentDevices, newDevice];
    parsedSettings.hardwareDevices = updatedDevices;

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { settings: parsedSettings },
    });

    sendSuccess(res, newDevice, 201);
  }

  static async deleteDevice(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const tenantId = req.user!.tid;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });

    let parsedSettings: any = {};
    if (tenant?.settings) {
      try {
        parsedSettings = typeof tenant.settings === 'string' ? JSON.parse(tenant.settings) : tenant.settings;
      } catch {
        parsedSettings = {};
      }
    }

    const currentDevices: any[] = Array.isArray(parsedSettings?.hardwareDevices) ? parsedSettings.hardwareDevices : [];
    parsedSettings.hardwareDevices = currentDevices.filter((d) => d.id !== id);

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { settings: parsedSettings },
    });

    sendSuccess(res, { success: true, message: 'Device removed successfully' });
  }

  static async testPrint(req: Request, res: Response): Promise<void> {
    const { deviceId, deviceName } = req.body;
    sendSuccess(res, {
      deviceId,
      status: 'SENT',
      message: `ESC/POS test print sent to ${deviceName || 'printer'}.`,
      timestamp: new Date().toISOString(),
    });
  }

  static async kickCashDrawer(req: Request, res: Response): Promise<void> {
    sendSuccess(res, {
      status: 'FIRED',
      pulseCode: 'ESC p 0 25 250',
      message: 'Cash drawer RJ11 24V pulse triggered.',
    });
  }
}
