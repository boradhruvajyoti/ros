// =============================================================================
// Invoice PDF Generator (PDFKit)
// =============================================================================

import PDFDocument from 'pdfkit';
import { formatCurrency, toAmount } from '@ros/utils';

export async function generateInvoicePdf(order: any): Promise<typeof PDFDocument.prototype> {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  // ── Header ────────────────────────────────────────────────────────────────
  doc.fontSize(22).font('Helvetica-Bold').text('INVOICE', { align: 'center' });
  doc.moveDown(0.5);

  // Restaurant info (from branch settings in real impl)
  doc.fontSize(10).font('Helvetica')
    .text('Restaurant Name', { align: 'center' })
    .text('Address Line, City, State — PIN', { align: 'center' })
    .text('GSTIN: XX-XXXXX-XX', { align: 'center' });

  doc.moveDown();
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.5);

  // ── Order meta ────────────────────────────────────────────────────────────
  const leftX = 50, rightX = 350;
  const metaY = doc.y;

  doc.font('Helvetica-Bold').text('Invoice #:', leftX, metaY)
    .font('Helvetica').text(order.orderNumber, leftX + 80, metaY);
  doc.font('Helvetica-Bold').text('Date:', leftX, metaY + 15)
    .font('Helvetica').text(new Date(order.createdAt).toLocaleDateString('en-IN'), leftX + 80, metaY + 15);
  doc.font('Helvetica-Bold').text('Type:', leftX, metaY + 30)
    .font('Helvetica').text(order.type, leftX + 80, metaY + 30);

  if (order.table) {
    doc.font('Helvetica-Bold').text('Table:', leftX, metaY + 45)
      .font('Helvetica').text(order.table.name, leftX + 80, metaY + 45);
  }

  if (order.customer) {
    doc.font('Helvetica-Bold').text('Customer:', rightX, metaY)
      .font('Helvetica').text(order.customer.name, rightX + 80, metaY);
    doc.font('Helvetica-Bold').text('Phone:', rightX, metaY + 15)
      .font('Helvetica').text(order.customer.phone, rightX + 80, metaY + 15);
  }

  doc.y = metaY + 70;
  doc.moveDown();
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.5);

  // ── Items table header ────────────────────────────────────────────────────
  const col1 = 50, col2 = 270, col3 = 360, col4 = 430, col5 = 490;
  doc.font('Helvetica-Bold').fontSize(9);
  doc.text('Item', col1, doc.y);
  doc.text('Variant', col2, doc.y);
  doc.text('Qty', col3, doc.y);
  doc.text('Unit Price', col4, doc.y);
  doc.text('Total', col5, doc.y);
  doc.moveDown(0.3);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.3);

  // ── Items ──────────────────────────────────────────────────────────────────
  doc.font('Helvetica').fontSize(9);
  const activeItems = order.items.filter((i: any) => !['VOIDED','CANCELLED'].includes(i.status));

  for (const item of activeItems) {
    const y = doc.y;
    doc.text(item.menuItem?.name || 'Item', col1, y, { width: 200 });
    doc.text(item.variant?.name || '-', col2, y, { width: 80 });
    doc.text(String(item.quantity), col3, y, { width: 50 });
    doc.text(formatCurrency(toAmount(item.unitPrice)), col4, y, { width: 70 });
    doc.text(formatCurrency(toAmount(item.lineTotal)), col5, y, { width: 70 });
    doc.moveDown(0.5);

    // Modifiers
    if (item.modifiers?.length > 0) {
      item.modifiers.forEach((m: any) => {
        doc.fillColor('#666666').text(`  + ${m.name} (${formatCurrency(toAmount(m.price))})`, col1, doc.y, { width: 300 });
        doc.fillColor('#000000').moveDown(0.3);
      });
    }
  }

  doc.moveDown(0.3);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.5);

  // ── Totals ────────────────────────────────────────────────────────────────
  const totalX = 400;
  const addTotalRow = (label: string, value: number, bold = false) => {
    const y = doc.y;
    if (bold) doc.font('Helvetica-Bold');
    else doc.font('Helvetica');
    doc.text(label, totalX, y, { width: 90 });
    doc.text(formatCurrency(value), totalX + 95, y, { width: 60, align: 'right' });
    doc.moveDown(0.4);
  };

  addTotalRow('Subtotal', toAmount(order.subtotal));
  if (toAmount(order.discountAmount) > 0) {
    addTotalRow(`Discount`, -toAmount(order.discountAmount));
  }
  if (toAmount(order.taxAmount) > 0) {
    addTotalRow('GST', toAmount(order.taxAmount));
  }
  if (toAmount(order.serviceCharge) > 0) {
    addTotalRow('Service Charge', toAmount(order.serviceCharge));
  }
  if (toAmount(order.deliveryCharge) > 0) {
    addTotalRow('Delivery Charge', toAmount(order.deliveryCharge));
  }

  doc.moveDown(0.3);
  doc.moveTo(totalX, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.3);
  addTotalRow('TOTAL', toAmount(order.total), true);

  if (order.payments?.length > 0) {
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').text('Payments:', 50);
    order.payments.forEach((p: any) => {
      doc.font('Helvetica').text(
        `${p.method}: ${formatCurrency(toAmount(p.amount))}${p.referenceNumber ? ` (${p.referenceNumber})` : ''}`,
        60
      );
    });
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  doc.moveDown(2);
  doc.font('Helvetica').fontSize(8).fillColor('#666666')
    .text('Thank you for dining with us!', { align: 'center' })
    .text('This is a computer-generated invoice.', { align: 'center' });

  return doc;
}
