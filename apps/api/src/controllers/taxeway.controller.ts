import { Request, Response } from 'express';

interface EInvoiceRecord {
  id: string;
  invoiceNumber: string;
  irnHash: string; // 64-char SHA256 Invoice Reference Number
  ackNumber: string;
  buyerName: string;
  buyerGstin: string;
  taxableValueINR: number;
  cgstINR: number;
  sgstINR: number;
  totalInvoiceValueINR: number;
  qrPayload: string;
  status: 'IRN_GENERATED' | 'CANCELLED';
  generatedAt: string;
}

interface EWayBillRecord {
  id: string;
  ewayBillNumber: string;
  transferSlipId: string;
  fromLocation: string;
  toLocation: string;
  vehicleNumber: string;
  cargoValueINR: number;
  validUntil: string;
  status: 'ACTIVE_IN_TRANSIT' | 'DELIVERED_CLOSED';
}

const mockInvoices: EInvoiceRecord[] = [];
const mockEwayBills: EWayBillRecord[] = [];

export const getTaxOverview = async (req: Request, res: Response) => {
  return res.json({
    success: true,
    data: {
      portalStatus: 'NIC_GSTN_PORTAL_ACTIVE',
      digitalSignatureStatus: 'DSC_READY',
      monthlyTaxLiabilityINR: {
        cgstPayable: 0,
        sgstPayable: 0,
        inputTaxCreditAvailable: 0,
        netPayableINR: 0
      },
      eInvoices: mockInvoices,
      ewayBills: mockEwayBills
    }
  });
};

export const generateEInvoice = async (req: Request, res: Response) => {
  const { buyerName, buyerGstin, invoiceAmount } = req.body;
  const taxable = Number(invoiceAmount) || 50000;
  const gst = taxable * 0.05;

  const newEInv: EInvoiceRecord = {
    id: `EINV-${Math.floor(10 + Math.random() * 90)}`,
    invoiceNumber: `INV-2026-B2B-${Math.floor(100 + Math.random() * 900)}`,
    irnHash: 'a7b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7',
    ackNumber: `${Math.floor(100000000000000 + Math.random() * 900000000000000)}`,
    buyerName: buyerName || 'Apex Corporate Dining LLP',
    buyerGstin: buyerGstin || '27AAACB1234D1Z5',
    taxableValueINR: taxable,
    cgstINR: gst / 2,
    sgstINR: gst / 2,
    totalInvoiceValueINR: taxable + gst,
    qrPayload: 'GSTIN:27AABCT3514Q1Z8|SIGNED_BY_NIC',
    status: 'IRN_GENERATED',
    generatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
  };

  mockInvoices.unshift(newEInv);

  return res.status(201).json({
    success: true,
    data: newEInv,
    message: 'E-Invoice IRN generated and registered on Govt NIC portal'
  });
};
