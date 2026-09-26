// =============================================================================
// In-Memory Low-Quality Thermal Bill JPEG Generator
// Pure In-Memory (Zero disk I/O, no PDF or image files stored on server)
// =============================================================================

import jpeg from 'jpeg-js';

// Standard 5x7 font table for ASCII 32..126
// Each character is 5 columns wide (7 bits high per column)
const FONT_5X7: Record<number, number[]> = {
  32: [0x00, 0x00, 0x00, 0x00, 0x00], // Space
  33: [0x00, 0x00, 0x5F, 0x00, 0x00], // !
  34: [0x00, 0x07, 0x00, 0x07, 0x00], // "
  35: [0x14, 0x7F, 0x14, 0x7F, 0x14], // #
  36: [0x24, 0x2A, 0x7F, 0x2A, 0x12], // $
  37: [0x23, 0x13, 0x08, 0x64, 0x62], // %
  38: [0x36, 0x49, 0x55, 0x22, 0x50], // &
  39: [0x00, 0x05, 0x03, 0x00, 0x00], // '
  40: [0x00, 0x1C, 0x22, 0x41, 0x00], // (
  41: [0x00, 0x41, 0x22, 0x1C, 0x00], // )
  42: [0x14, 0x08, 0x3E, 0x08, 0x14], // *
  43: [0x08, 0x08, 0x3E, 0x08, 0x08], // +
  44: [0x00, 0x50, 0x30, 0x00, 0x00], // ,
  45: [0x08, 0x08, 0x08, 0x08, 0x08], // -
  46: [0x00, 0x60, 0x60, 0x00, 0x00], // .
  47: [0x20, 0x10, 0x08, 0x04, 0x02], // /
  48: [0x3E, 0x51, 0x49, 0x45, 0x3E], // 0
  49: [0x00, 0x42, 0x7F, 0x40, 0x00], // 1
  50: [0x42, 0x61, 0x51, 0x49, 0x46], // 2
  51: [0x21, 0x41, 0x45, 0x4B, 0x31], // 3
  52: [0x18, 0x14, 0x12, 0x7F, 0x10], // 4
  53: [0x27, 0x45, 0x45, 0x45, 0x39], // 5
  54: [0x3C, 0x4A, 0x49, 0x49, 0x30], // 6
  55: [0x01, 0x71, 0x09, 0x05, 0x03], // 7
  56: [0x36, 0x49, 0x49, 0x49, 0x36], // 8
  57: [0x06, 0x49, 0x49, 0x29, 0x1E], // 9
  58: [0x00, 0x36, 0x36, 0x00, 0x00], // :
  59: [0x00, 0x56, 0x36, 0x00, 0x00], // ;
  60: [0x08, 0x14, 0x22, 0x41, 0x00], // <
  61: [0x14, 0x14, 0x14, 0x14, 0x14], // =
  62: [0x00, 0x41, 0x22, 0x14, 0x08], // >
  63: [0x02, 0x01, 0x51, 0x09, 0x06], // ?
  64: [0x32, 0x49, 0x79, 0x41, 0x3E], // @
  65: [0x7E, 0x11, 0x11, 0x11, 0x7E], // A
  66: [0x7F, 0x49, 0x49, 0x49, 0x36], // B
  67: [0x3E, 0x41, 0x41, 0x41, 0x22], // C
  68: [0x7F, 0x41, 0x41, 0x22, 0x1C], // D
  69: [0x7F, 0x49, 0x49, 0x49, 0x41], // E
  70: [0x7F, 0x09, 0x09, 0x09, 0x01], // F
  71: [0x3E, 0x41, 0x49, 0x49, 0x7A], // G
  72: [0x7F, 0x08, 0x08, 0x08, 0x7F], // H
  73: [0x00, 0x41, 0x7F, 0x41, 0x00], // I
  74: [0x20, 0x40, 0x41, 0x3F, 0x01], // J
  75: [0x7F, 0x08, 0x14, 0x22, 0x41], // K
  76: [0x7F, 0x40, 0x40, 0x40, 0x40], // L
  77: [0x7F, 0x02, 0x0C, 0x02, 0x7F], // M
  78: [0x7F, 0x04, 0x08, 0x10, 0x7F], // N
  79: [0x3E, 0x41, 0x41, 0x41, 0x3E], // O
  80: [0x7F, 0x09, 0x09, 0x09, 0x06], // P
  81: [0x3E, 0x41, 0x51, 0x21, 0x5E], // Q
  82: [0x7F, 0x09, 0x19, 0x29, 0x46], // R
  83: [0x46, 0x49, 0x49, 0x49, 0x31], // S
  84: [0x01, 0x01, 0x7F, 0x01, 0x01], // T
  85: [0x3F, 0x40, 0x40, 0x40, 0x3F], // U
  86: [0x1F, 0x20, 0x40, 0x20, 0x1F], // V
  87: [0x3F, 0x40, 0x38, 0x40, 0x3F], // W
  88: [0x63, 0x14, 0x08, 0x14, 0x63], // X
  89: [0x07, 0x08, 0x70, 0x08, 0x07], // Y
  90: [0x61, 0x51, 0x49, 0x45, 0x43], // Z
  91: [0x00, 0x7F, 0x41, 0x41, 0x00], // [
  92: [0x02, 0x04, 0x08, 0x10, 0x20], // \
  93: [0x00, 0x41, 0x41, 0x7F, 0x00], // ]
  94: [0x04, 0x02, 0x01, 0x02, 0x04], // ^
  95: [0x40, 0x40, 0x40, 0x40, 0x40], // _
  96: [0x00, 0x01, 0x02, 0x04, 0x00], // `
  97: [0x20, 0x54, 0x54, 0x54, 0x78], // a
  98: [0x7F, 0x48, 0x44, 0x44, 0x38], // b
  99: [0x38, 0x44, 0x44, 0x44, 0x20], // c
  100: [0x38, 0x44, 0x44, 0x48, 0x7F], // d
  101: [0x38, 0x54, 0x54, 0x54, 0x18], // e
  102: [0x08, 0x7E, 0x09, 0x01, 0x02], // f
  103: [0x0C, 0x52, 0x52, 0x52, 0x3E], // g
  104: [0x7F, 0x08, 0x04, 0x04, 0x78], // h
  105: [0x00, 0x44, 0x7D, 0x40, 0x00], // i
  106: [0x20, 0x40, 0x44, 0x3D, 0x00], // j
  107: [0x7F, 0x10, 0x28, 0x44, 0x00], // k
  108: [0x00, 0x41, 0x7F, 0x40, 0x00], // l
  109: [0x7C, 0x04, 0x18, 0x04, 0x78], // m
  110: [0x7C, 0x08, 0x04, 0x04, 0x78], // n
  111: [0x38, 0x44, 0x44, 0x44, 0x38], // o
  112: [0x7C, 0x14, 0x14, 0x14, 0x08], // p
  113: [0x08, 0x14, 0x14, 0x18, 0x7C], // q
  114: [0x7C, 0x08, 0x04, 0x04, 0x08], // r
  115: [0x48, 0x54, 0x54, 0x54, 0x20], // s
  116: [0x04, 0x3F, 0x44, 0x40, 0x20], // t
  117: [0x3C, 0x40, 0x40, 0x20, 0x7C], // u
  118: [0x1C, 0x20, 0x40, 0x20, 0x1C], // v
  119: [0x3C, 0x40, 0x30, 0x40, 0x3C], // w
  120: [0x44, 0x28, 0x10, 0x28, 0x44], // x
  121: [0x0C, 0x50, 0x50, 0x50, 0x3C], // y
  122: [0x44, 0x64, 0x54, 0x4C, 0x44], // z
  123: [0x00, 0x08, 0x36, 0x41, 0x00], // {
  124: [0x00, 0x00, 0x7F, 0x00, 0x00], // |
  125: [0x00, 0x41, 0x36, 0x08, 0x00], // }
  126: [0x10, 0x08, 0x08, 0x10, 0x08], // ~
};

export interface BillReceiptData {
  restaurantName: string;
  branchName?: string;
  branchAddress?: string;
  branchPhone?: string;
  orderNumber: string;
  tableName: string;
  orderType: string;
  billedBy: string;
  paymentMethod: string;
  date: Date;
  items: Array<{
    name: string;
    variantName?: string | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  subtotal: number;
  discountAmount?: number;
  taxAmount?: number;
  total: number;
  notes?: string | null;
}

export class ReceiptImageService {
  /**
   * Generates a thermal receipt JPEG image Buffer in minimal quality directly in memory.
   * Strictly zero files written to disk.
   */
  static generateReceiptJpeg(data: BillReceiptData): Buffer {
    const width = 420; // 420px width (typical 80mm thermal receipt scale)
    const scale = 2;   // 2x pixel scale for clear reading on smartphones
    const charWidth = 6 * scale;  // 12px per char
    const lineHeight = 10 * scale; // 20px per line
    const margin = 16;
    const printableWidth = width - margin * 2;
    const maxCharsPerLine = Math.floor(printableWidth / charWidth); // 32 chars

    // Pre-calculate line count to dynamically size image height
    let totalLines = 0;
    totalLines += 3; // Top padding & Restaurant header
    if (data.branchName) totalLines++;
    if (data.branchAddress) totalLines++;
    if (data.branchPhone) totalLines++;
    totalLines += 2; // "TAX INVOICE / RECEIPT" & divider
    totalLines += 4; // Order #, Table, Date/Time, Billed By
    totalLines += 2; // Divider & Column header
    totalLines += 1; // Divider
    totalLines += data.items.length * 2; // 2 lines per item (name + details)
    totalLines += 2; // Divider & Subtotal
    if (data.discountAmount && data.discountAmount > 0) totalLines++;
    if (data.taxAmount && data.taxAmount > 0) totalLines++;
    totalLines += 3; // Double divider, GRAND TOTAL, divider
    totalLines += 2; // Payment Method & Status
    totalLines += 4; // Footer "THANK YOU" + bottom margin

    const height = Math.max(500, totalLines * lineHeight + margin * 2);

    // Create raw RGBA buffer filled with crisp off-white paper color
    const rgba = Buffer.alloc(width * height * 4);
    // Fill with paper color #FAFAFA
    for (let i = 0; i < rgba.length; i += 4) {
      rgba[i] = 250;     // R
      rgba[i + 1] = 250; // G
      rgba[i + 2] = 250; // B
      rgba[i + 3] = 255; // Alpha
    }

    // Drawing helper functions
    const setPixel = (x: number, y: number, r = 20, g = 20, b = 20) => {
      if (x < 0 || x >= width || y < 0 || y >= height) return;
      const idx = (y * width + x) * 4;
      rgba[idx] = r;
      rgba[idx + 1] = g;
      rgba[idx + 2] = b;
      rgba[idx + 3] = 255;
    };

    const drawChar = (char: string, startX: number, startY: number, charScale = scale, isBold = false) => {
      let code = char.charCodeAt(0);
      // Replace rupee sign or non-ascii with Rs. or ?
      if (code > 126 || code < 32) {
        if (char === '₹') {
          char = 'R';
          code = 82;
        } else {
          code = 63; // '?'
        }
      }

      const bitmap = FONT_5X7[code] || FONT_5X7[63];
      for (let col = 0; col < 5; col++) {
        const byte = bitmap[col];
        for (let row = 0; row < 7; row++) {
          if ((byte >> row) & 1) {
            for (let dx = 0; dx < charScale; dx++) {
              for (let dy = 0; dy < charScale; dy++) {
                setPixel(startX + col * charScale + dx, startY + row * charScale + dy, 20, 20, 20);
                if (isBold) {
                  setPixel(startX + col * charScale + dx + 1, startY + row * charScale + dy, 10, 10, 10);
                }
              }
            }
          }
        }
      }
    };

    const drawText = (
      text: string,
      x: number,
      y: number,
      align: 'left' | 'center' | 'right' = 'left',
      charScale = scale,
      isBold = false
    ) => {
      const cleanText = text.replace(/₹/g, 'Rs.');
      const len = cleanText.length;
      const totalTextWidth = len * 6 * charScale;
      let startX = x;

      if (align === 'center') {
        startX = Math.floor((width - totalTextWidth) / 2);
      } else if (align === 'right') {
        startX = x - totalTextWidth;
      }

      for (let i = 0; i < len; i++) {
        drawChar(cleanText[i], startX + i * 6 * charScale, y, charScale, isBold);
      }
    };

    const drawDivider = (y: number, doubleLine = false) => {
      const lineChar = doubleLine ? '=' : '-';
      const text = lineChar.repeat(maxCharsPerLine);
      drawText(text, margin, y, 'left', scale, doubleLine);
    };

    const formatRow = (left: string, right: string) => {
      const cleanLeft = left.replace(/₹/g, 'Rs.');
      const cleanRight = right.replace(/₹/g, 'Rs.');
      const availableSpaces = maxCharsPerLine - cleanLeft.length - cleanRight.length;
      if (availableSpaces <= 0) {
        return cleanLeft.slice(0, maxCharsPerLine - cleanRight.length - 1) + ' ' + cleanRight;
      }
      return cleanLeft + ' '.repeat(availableSpaces) + cleanRight;
    };

    let currentY = margin + 4;

    // ── Header ───────────────────────────────────────────────────────────────
    drawText(data.restaurantName.toUpperCase(), margin, currentY, 'center', scale + 1, true);
    currentY += (lineHeight + 6);

    if (data.branchName) {
      drawText(data.branchName, margin, currentY, 'center', scale, false);
      currentY += lineHeight;
    }
    if (data.branchAddress) {
      drawText(data.branchAddress.slice(0, maxCharsPerLine), margin, currentY, 'center', scale, false);
      currentY += lineHeight;
    }
    if (data.branchPhone) {
      drawText(`Phone: ${data.branchPhone}`, margin, currentY, 'center', scale, false);
      currentY += lineHeight;
    }

    currentY += 4;
    drawDivider(currentY);
    currentY += lineHeight;
    drawText('TAX INVOICE / CASH BILL', margin, currentY, 'center', scale, true);
    currentY += lineHeight;
    drawDivider(currentY);
    currentY += lineHeight;

    // ── Metadata ─────────────────────────────────────────────────────────────
    drawText(formatRow(`Bill #: ${data.orderNumber}`, `Table: ${data.tableName}`), margin, currentY, 'left', scale, false);
    currentY += lineHeight;
    const dateStr = new Date(data.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = new Date(data.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    drawText(formatRow(`Date: ${dateStr}`, `Time: ${timeStr}`), margin, currentY, 'left', scale, false);
    currentY += lineHeight;
    drawText(formatRow(`Type: ${data.orderType}`, `Billed: ${data.billedBy}`), margin, currentY, 'left', scale, false);
    currentY += lineHeight;

    drawDivider(currentY);
    currentY += lineHeight;

    // ── Table Column Headers ─────────────────────────────────────────────────
    drawText(formatRow('ITEM (QTY x RATE)', 'AMOUNT'), margin, currentY, 'left', scale, true);
    currentY += lineHeight;
    drawDivider(currentY);
    currentY += lineHeight;

    // ── Items List ───────────────────────────────────────────────────────────
    for (const item of data.items) {
      const itemName = `${item.name}${item.variantName ? ` (${item.variantName})` : ''}`;
      // Line 1: Item Name
      drawText(itemName.slice(0, maxCharsPerLine), margin, currentY, 'left', scale, true);
      currentY += lineHeight;

      // Line 2: Qty x Rate and Line Total
      const qtyRate = `  ${item.quantity} x Rs.${Number(item.unitPrice).toFixed(2)}`;
      const totalAmount = `Rs.${Number(item.lineTotal).toFixed(2)}`;
      drawText(formatRow(qtyRate, totalAmount), margin, currentY, 'left', scale, false);
      currentY += lineHeight + 2;
    }

    drawDivider(currentY);
    currentY += lineHeight;

    // ── Totals ───────────────────────────────────────────────────────────────
    drawText(formatRow('Subtotal:', `Rs.${Number(data.subtotal).toFixed(2)}`), margin, currentY, 'left', scale, false);
    currentY += lineHeight;

    if (data.discountAmount && data.discountAmount > 0) {
      drawText(formatRow('Discount:', `-Rs.${Number(data.discountAmount).toFixed(2)}`), margin, currentY, 'left', scale, false);
      currentY += lineHeight;
    }

    if (data.taxAmount && data.taxAmount > 0) {
      drawText(formatRow('GST / Taxes:', `Rs.${Number(data.taxAmount).toFixed(2)}`), margin, currentY, 'left', scale, false);
      currentY += lineHeight;
    }

    drawDivider(currentY, true);
    currentY += lineHeight + 2;

    // Grand Total (Bold)
    drawText(formatRow('GRAND TOTAL:', `Rs.${Number(data.total).toFixed(2)}`), margin, currentY, 'left', scale, true);
    currentY += lineHeight + 4;

    drawDivider(currentY, true);
    currentY += lineHeight;

    // ── Payment Status ───────────────────────────────────────────────────────
    drawText(formatRow('Payment Method:', data.paymentMethod), margin, currentY, 'left', scale, true);
    currentY += lineHeight;
    drawText(formatRow('Payment Status:', 'PAID [SETTLED]'), margin, currentY, 'left', scale, true);
    currentY += lineHeight + 4;

    drawDivider(currentY);
    currentY += lineHeight + 4;

    // ── Footer ───────────────────────────────────────────────────────────────
    drawText('*** THANK YOU! VISIT AGAIN ***', margin, currentY, 'center', scale, true);
    currentY += lineHeight;
    drawText('Powered by RestaurantOS', margin, currentY, 'center', scale - 1, false);

    const actualContentHeight = Math.min(height, currentY + margin + 10);

    // Slice image buffer to exact content height
    const croppedRgba = rgba.subarray(0, width * actualContentHeight * 4);

    // Encode to JPEG at minimum quality (quality: 35) for ultra-lightweight transmission
    const rawImageData = {
      data: croppedRgba,
      width,
      height: actualContentHeight,
    };

    const jpegImage = jpeg.encode(rawImageData, 35);
    return jpegImage.data;
  }
}
