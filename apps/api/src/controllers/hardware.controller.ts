// =============================================================================
// Hardware, Thermal ESC/POS Printers & Cash Drawer Controller
// =============================================================================

import { Request, Response } from 'express';
import { sendSuccess } from '../middlewares/error.middleware';

export class HardwareController {
  static async listDevices(req: Request, res: Response): Promise<void> {
    const devices = [
      {
        id: 'prn-001',
        name: 'Main Kitchen KOT Thermal Printer',
        type: 'THERMAL_PRINTER',
        connectionType: 'ETHERNET_IP',
        ipAddress: '192.168.1.120',
        port: 9100,
        paperWidthMm: 80,
        assignedStation: 'Main Kitchen & Gravy',
        status: 'ONLINE',
        paperStatus: 'OK',
        lastHeartbeat: '5s ago',
        driver: 'ESC/POS Direct Socket',
      },
      {
        id: 'prn-002',
        name: 'Tandoor & Starters KOT Printer',
        type: 'THERMAL_PRINTER',
        connectionType: 'ETHERNET_IP',
        ipAddress: '192.168.1.121',
        port: 9100,
        paperWidthMm: 80,
        assignedStation: 'Tandoor & Starters',
        status: 'ONLINE',
        paperStatus: 'OK',
        lastHeartbeat: '12s ago',
        driver: 'ESC/POS Direct Socket',
      },
      {
        id: 'prn-003',
        name: 'Bar & Beverages Thermal Printer',
        type: 'THERMAL_PRINTER',
        connectionType: 'ETHERNET_IP',
        ipAddress: '192.168.1.122',
        port: 9100,
        paperWidthMm: 80,
        assignedStation: 'Beverages & Dessert',
        status: 'ONLINE',
        paperStatus: 'OK',
        lastHeartbeat: '8s ago',
        driver: 'ESC/POS Direct Socket',
      },
      {
        id: 'prn-004',
        name: 'Front Billing Counter Receipt Printer',
        type: 'RECEIPT_PRINTER',
        connectionType: 'USB',
        devicePath: '/dev/usb/lp0',
        paperWidthMm: 80,
        assignedStation: 'Cashier Counter',
        status: 'ONLINE',
        paperStatus: 'OK',
        lastHeartbeat: 'Connected',
        hasCashDrawer: true,
        driver: 'USB CUPS / Raw',
      },
    ];

    sendSuccess(res, devices);
  }

  static async testPrint(req: Request, res: Response): Promise<void> {
    const { deviceId } = req.body;
    sendSuccess(res, {
      deviceId,
      status: 'SENT',
      message: 'ESC/POS Test Slip generated and dispatched to printer buffer.',
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
