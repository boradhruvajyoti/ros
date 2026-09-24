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

const mockInvoices: EInvoiceRecord[] = [
  {
    id: 'EINV-01',
    invoiceNumber: 'INV-2026-B2B-049',
    irnHash: '8e4f129c78b4a03e54f9d21c081e74a89bc213ef5421a7cd9812e45bf0912ab4',
    ackNumber: '112233445566778',
    buyerName: 'Tata Consultancy Services Ltd (Corporate Event)',
    buyerGstin: '27AAACT2727Q1ZW',
    taxableValueINR: 180000,
    cgstINR: 4500,
    sgstINR: 4500,
    totalInvoiceValueINR: 189000,
    qrPayload: 'GSTIN:27AABCT3514Q1Z8|INV:INV-2026-B2B-049|AMT:189000|IRN:8e4f...',
    status: 'IRN_GENERATED',
    generatedAt: '2026-09-22 18:30:14'
  }
];

const mockEwayBills: EWayBillRecord[] = [
  {
    id: 'EWAY-01',
    ewayBillNumber: '241088921455',
    transferSlipId: 'TRF-COMM-004',
    fromLocation: 'Central Commissary Warehouse (Bhiwandi)',
    toLocation: 'Spice Garden Flagship (Bandra)',
    vehicleNumber: 'MH-04-AZ-8812',
    cargoValueINR: 320000,
    validUntil: '2026-09-24 23:59:00',
    status: 'ACTIVE_IN_TRANSIT'
  }
];

export const getTaxOverview = async (req: Request, res: Response) => {
  return res.json({
    success: true,
    data: {
      portalStatus: 'NIC_GSTN_PORTAL_ACTIVE',
      digitalSignatureStatus: 'DSC_VALID_2028',
      monthlyTaxLiabilityINR: {
        cgstPayable: 142800,
        sgstPayable: 142800,
        inputTaxCreditAvailable: 94500,
        netPayableINR: 191100
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
