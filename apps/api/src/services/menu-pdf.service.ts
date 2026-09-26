// =============================================================================
// Restaurant Menu PDF Generator (PDFKit)
// Strictly In-Memory — Zero disk storage, streamed directly to client
// =============================================================================

import PDFDocument from 'pdfkit';
import prisma from '../lib/prisma';

export interface MenuPdfData {
  tenantName: string;
  tagline?: string;
  branchName?: string;
  branchAddress?: string;
  branchPhone?: string;
  currency?: string;
  categories: Array<{
    id: string;
    name: string;
    items: Array<{
      id: string;
      name: string;
      description?: string | null;
      foodType: string;
      spiceLevel: string;
      variants: Array<{
        id: string;
        name: string;
        price: number;
      }>;
    }>;
  }>;
}

export class MenuPdfService {
  /**
   * Generates a beautifully formatted restaurant menu PDF in-memory.
   * Returns a Buffer directly without writing any file to disk.
   */
  static async generateMenuPdf(data: MenuPdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 40, bottom: 40, left: 40, right: 40 },
        bufferPages: true,
      });

      const buffers: Buffer[] = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      const pageWidth = 595.28; // A4 width
      const margin = 40;
      const contentWidth = pageWidth - margin * 2;

      // ── COLOR PALETTE ────────────────────────────────────────────────────────
      const primaryColor = '#1e293b';    // Slate 800
      const secondaryColor = '#64748b';  // Slate 500
      const accentColor = '#d97706';     // Amber 600
      const vegColor = '#16a34a';        // Green 600
      const nonVegColor = '#dc2626';     // Red 600
      const eggColor = '#d97706';        // Amber 600
      const lineColor = '#e2e8f0';       // Slate 200

      // ── ELEGANT HEADER ───────────────────────────────────────────────────────
      // Decorative top border
      doc.rect(margin, 25, contentWidth, 3).fill(accentColor);

      doc.moveDown(0.8);
      // Restaurant Name
      doc
        .font('Helvetica-Bold')
        .fontSize(24)
        .fillColor(primaryColor)
        .text(data.tenantName.toUpperCase(), { align: 'center', characterSpacing: 1.5 });

      // Tagline / Subtitle
      if (data.tagline) {
        doc
          .font('Helvetica-Oblique')
          .fontSize(10)
          .fillColor(accentColor)
          .text(data.tagline, { align: 'center' });
      }

      // Outlet info
      const outletParts: string[] = [];
      if (data.branchName) outletParts.push(data.branchName);
      if (data.branchAddress) outletParts.push(data.branchAddress);
      if (data.branchPhone) outletParts.push(`Tel: ${data.branchPhone}`);

      if (outletParts.length > 0) {
        doc.moveDown(0.3);
        doc
          .font('Helvetica')
          .fontSize(8.5)
          .fillColor(secondaryColor)
          .text(outletParts.join('  •  '), { align: 'center' });
      }

      // Title Banner: "À LA CARTE MENU"
      doc.moveDown(0.6);
      const titleY = doc.y;
      doc
        .strokeColor(lineColor)
        .lineWidth(0.75)
        .moveTo(margin + 40, titleY + 7)
        .lineTo(pageWidth / 2 - 80, titleY + 7)
        .stroke();

      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor(primaryColor)
        .text('À LA CARTE MENU', { align: 'center', characterSpacing: 2 });

      doc
        .strokeColor(lineColor)
        .lineWidth(0.75)
        .moveTo(pageWidth / 2 + 80, titleY + 7)
        .lineTo(pageWidth - margin - 40, titleY + 7)
        .stroke();

      doc.moveDown(1);

      // ── CATEGORIES & ITEMS ───────────────────────────────────────────────────
      const curr = data.currency || '₹';

      for (const cat of data.categories) {
        if (!cat.items || cat.items.length === 0) continue;

        // Check if remaining space on page is small; add new page if needed
        if (doc.y > 700) {
          doc.addPage();
        }

        doc.moveDown(0.5);

        // Category Header Badge / Bar
        const catY = doc.y;
        doc
          .roundedRect(margin, catY, contentWidth, 22, 4)
          .fillAndStroke('#f8fafc', '#e2e8f0');

        doc
          .font('Helvetica-Bold')
          .fontSize(11)
          .fillColor(primaryColor)
          .text(cat.name.toUpperCase(), margin + 12, catY + 5.5, { characterSpacing: 1 });

        const itemCountText = `${cat.items.length} ${cat.items.length === 1 ? 'dish' : 'dishes'}`;
        doc
          .font('Helvetica')
          .fontSize(8.5)
          .fillColor(secondaryColor)
          .text(itemCountText, margin, catY + 6.5, { align: 'right', width: contentWidth - 12 });

        doc.y = catY + 28;

        // Render each item in this category
        for (const item of cat.items) {
          if (doc.y > 740) {
            doc.addPage();
          }

          const itemStartY = doc.y;

          // 1. Food Type Indicator (Square with Dot)
          const isVeg = item.foodType === 'VEG' || item.foodType === 'VEGAN';
          const isEgg = item.foodType === 'EGG';
          const indicatorColor = isVeg ? vegColor : isEgg ? eggColor : nonVegColor;

          // Draw square
          const boxSize = 8;
          const boxX = margin + 4;
          const boxY = itemStartY + 2;

          doc.rect(boxX, boxY, boxSize, boxSize).strokeColor(indicatorColor).lineWidth(1).stroke();
          // Draw center dot
          doc.circle(boxX + boxSize / 2, boxY + boxSize / 2, 2).fillColor(indicatorColor).fill();

          // 2. Dish Name & Spice Indicator
          doc.font('Helvetica-Bold').fontSize(10).fillColor(primaryColor);

          let nameText = item.name;
          if (item.spiceLevel === 'HOT' || item.spiceLevel === 'EXTRA_HOT') {
            nameText += '  [Spicy]';
          }

          const textStartX = margin + 18;
          const priceColumnWidth = 140;
          const nameMaxWidth = contentWidth - 24 - priceColumnWidth;

          doc.text(nameText, textStartX, itemStartY, {
            width: nameMaxWidth,
            lineBreak: false,
            ellipsis: true,
          });

          // 3. Price & Variants (Right aligned)
          let priceString = '';
          if (item.variants && item.variants.length > 0) {
            if (item.variants.length === 1) {
              priceString = `${curr} ${Number(item.variants[0].price).toFixed(2)}`;
            } else {
              priceString = item.variants
                .map((v) => `${v.name}: ${curr}${Number(v.price).toFixed(0)}`)
                .join('  |  ');
            }
          } else {
            priceString = `${curr} 0.00`;
          }

          doc
            .font('Helvetica-Bold')
            .fontSize(9.5)
            .fillColor(primaryColor)
            .text(priceString, pageWidth - margin - priceColumnWidth, itemStartY, {
              width: priceColumnWidth,
              align: 'right',
            });

          // 4. Description (Italics) if present
          if (item.description && item.description.trim()) {
            doc
              .font('Helvetica-Oblique')
              .fontSize(8)
              .fillColor(secondaryColor)
              .text(item.description.trim(), textStartX, doc.y + 1.5, {
                width: nameMaxWidth + 40,
                lineBreak: true,
              });
          }

          // Dotted hairline separator below item
          doc.moveDown(0.35);
          const lineY = doc.y;
          doc
            .strokeColor('#f1f5f9')
            .lineWidth(0.5)
            .moveTo(textStartX, lineY)
            .lineTo(pageWidth - margin, lineY)
            .stroke();

          doc.moveDown(0.35);
        }

        doc.moveDown(0.4);
      }

      // ── FOOTER & PAGE NUMBERING ──────────────────────────────────────────────
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);

        const footerY = 800;
        doc
          .strokeColor(lineColor)
          .lineWidth(0.5)
          .moveTo(margin, footerY - 8)
          .lineTo(pageWidth - margin, footerY - 8)
          .stroke();

        doc
          .font('Helvetica')
          .fontSize(7.5)
          .fillColor(secondaryColor)
          .text(
            'All items prepared fresh to order. Taxes & service charges as applicable.',
            margin,
            footerY,
            { align: 'left', width: contentWidth / 2 }
          );

        doc
          .font('Helvetica')
          .fontSize(7.5)
          .fillColor(secondaryColor)
          .text(`Page ${i + 1} of ${range.count}`, pageWidth / 2, footerY, {
            align: 'right',
            width: contentWidth / 2,
          });
      }

      doc.end();
    });
  }
}
