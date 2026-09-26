// =============================================================================
// Restaurant Menu PDF Generator (PDFKit)
// Strictly In-Memory — Zero disk storage, streamed directly to client
// Charcoal Black Theme with Centered White-Outlined Logo & 300 DPI A4 Layout
// =============================================================================

import PDFDocument from 'pdfkit';

export interface MenuPdfData {
  tenantName: string;
  tagline?: string;
  logoUrl?: string | null;
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

/**
 * Resolves a base64 or remote URL image into a Buffer.
 * Times out quickly (3.5s) if remote to prevent hanging.
 */
async function resolveLogoBuffer(logoUrl?: string | null): Promise<Buffer | null> {
  if (!logoUrl || typeof logoUrl !== 'string' || !logoUrl.trim()) return null;
  const trimmed = logoUrl.trim();

  try {
    if (trimmed.startsWith('data:image/')) {
      const base64Data = trimmed.replace(/^data:image\/\w+;base64,/, '');
      return Buffer.from(base64Data, 'base64');
    }
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(trimmed, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        return Buffer.from(arrayBuf);
      }
    }
  } catch (err) {
    console.warn('[MenuPdfService] Logo buffer resolution error (falling back to emblem):', err);
  }
  return null;
}

export class MenuPdfService {
  /**
   * Generates a beautifully formatted restaurant menu PDF in-memory.
   * Charcoal black background, centered restaurant logo with white outline, white fonts.
   * A4 vector layout (crisp 300+ DPI equivalent).
   */
  static async generateMenuPdf(data: MenuPdfData): Promise<Buffer> {
    const logoBuffer = await resolveLogoBuffer(data.logoUrl);

    return new Promise((resolve, reject) => {
      const pageWidth = 595.28; // Standard A4 width (points)
      const pageHeight = 841.89; // Standard A4 height (points)
      const margin = 36;
      const contentWidth = pageWidth - margin * 2;

      // ── COLOR PALETTE (Charcoal Black Theme) ────────────────────────────────
      const charcoalBg = '#121214';       // Deep Charcoal Black
      const cardBg = '#1c1c21';           // Dark Card Background
      const headerBorder = '#ffffff';     // White Outline
      const textWhite = '#ffffff';        // Pure White for primary text
      const textOffWhite = '#f1f5f9';     // Off-white / Silver
      const textMuted = '#94a3b8';        // Secondary slate for descriptions
      const accentGold = '#f59e0b';       // Warm Amber / Gold for subtle highlights
      const vegColor = '#22c55e';         // Bright Green
      const nonVegColor = '#ef4444';      // Bright Crimson Red
      const eggColor = '#f59e0b';         // Warm Amber
      const veganColor = '#10b981';       // Emerald Green
      const dividerColor = '#27272a';     // Subtle Charcoal Divider

      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: margin, bottom: margin, left: margin, right: margin },
        bufferPages: true,
        autoFirstPage: true,
        info: {
          Title: `${data.tenantName} - Menu`,
          Author: data.tenantName,
          Subject: 'Restaurant Menu',
        },
      });

      const buffers: Buffer[] = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      // Helper to paint page background & decorative borders
      const paintPageBackground = () => {
        doc.save();
        // 1. Full page charcoal black fill
        doc.rect(0, 0, pageWidth, pageHeight).fill(charcoalBg);

        // 2. Outer elegant frame with subtle charcoal border
        doc
          .rect(14, 14, pageWidth - 28, pageHeight - 28)
          .lineWidth(1)
          .strokeColor(dividerColor)
          .stroke();

        // 3. Inner fine hairline border
        doc
          .rect(17, 17, pageWidth - 34, pageHeight - 34)
          .lineWidth(0.5)
          .strokeColor('#18181b')
          .stroke();

        doc.restore();
      };

      // Handle subsequent pages added automatically or manually
      doc.on('pageAdded', () => {
        paintPageBackground();
      });

      // Paint initial page background
      paintPageBackground();

      // ── CENTERED RESTAURANT LOGO WITH WHITE OUTLINE ─────────────────────────
      const centerX = pageWidth / 2;
      const logoRadius = 26;
      const logoDiameter = logoRadius * 2;
      const logoCenterY = 48;
      const logoTopY = logoCenterY - logoRadius;

      // Base circle background
      doc.save();
      doc.circle(centerX, logoCenterY, logoRadius + 1).fillColor('#18181b').fill();

      let logoDrawn = false;
      if (logoBuffer) {
        try {
          doc.save();
          // Clip circular region for the logo image
          doc.circle(centerX, logoCenterY, logoRadius - 1).clip();
          doc.image(logoBuffer, centerX - logoRadius + 1, logoTopY + 1, {
            width: logoDiameter - 2,
            height: logoDiameter - 2,
            fit: [logoDiameter - 2, logoDiameter - 2],
            align: 'center',
            valign: 'center',
          });
          doc.restore();
          logoDrawn = true;
        } catch (imgErr) {
          console.warn('[MenuPdfService] Could not embed logo image:', imgErr);
          logoDrawn = false;
        }
      }

      // If no image or failed to render, draw elegant monogram emblem
      if (!logoDrawn) {
        const initial = (data.tenantName || 'R').trim().charAt(0).toUpperCase();
        doc
          .font('Helvetica-Bold')
          .fontSize(22)
          .fillColor(textWhite)
          .text(initial, centerX - 20, logoCenterY - 10, {
            width: 40,
            align: 'center',
          });
      }

      // Draw crisp WHITE BORDER OUTLINE around logo
      doc
        .circle(centerX, logoCenterY, logoRadius)
        .lineWidth(2)
        .strokeColor(headerBorder)
        .stroke();

      doc.restore();

      // ── RESTAURANT HEADER TEXT ──────────────────────────────────────────────
      doc.y = logoCenterY + logoRadius + 10;

      // Restaurant Name (White, Bold, Uppercase, Centered)
      doc
        .font('Helvetica-Bold')
        .fontSize(20)
        .fillColor(textWhite)
        .text(data.tenantName.toUpperCase(), {
          align: 'center',
          characterSpacing: 2,
        });

      // Tagline (Subtle Gold / Silver Accent)
      if (data.tagline && data.tagline.trim()) {
        doc.moveDown(0.2);
        doc
          .font('Helvetica-Oblique')
          .fontSize(9.5)
          .fillColor(accentGold)
          .text(data.tagline.trim(), { align: 'center', characterSpacing: 0.5 });
      }

      // Branch & Location / Contact Info
      const outletParts: string[] = [];
      if (data.branchName) outletParts.push(data.branchName);
      if (data.branchAddress) outletParts.push(data.branchAddress);
      if (data.branchPhone) outletParts.push(`Tel: ${data.branchPhone}`);

      if (outletParts.length > 0) {
        doc.moveDown(0.25);
        doc
          .font('Helvetica')
          .fontSize(8)
          .fillColor(textMuted)
          .text(outletParts.join('  •  '), { align: 'center' });
      }

      // Title Banner: "À LA CARTE MENU" with White / Slate Divider Bars
      doc.moveDown(0.5);
      const titleY = doc.y;
      const barY = titleY + 6;

      doc
        .strokeColor(dividerColor)
        .lineWidth(0.75)
        .moveTo(margin + 30, barY)
        .lineTo(centerX - 75, barY)
        .stroke();

      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(textWhite)
        .text('À LA CARTE MENU', margin, titleY, {
          width: contentWidth,
          align: 'center',
          characterSpacing: 2.5,
        });

      doc
        .strokeColor(dividerColor)
        .lineWidth(0.75)
        .moveTo(centerX + 75, barY)
        .lineTo(pageWidth - margin - 30, barY)
        .stroke();

      doc.y = titleY + 22;

      // ── CATEGORIES & DISHES ──────────────────────────────────────────────────
      const curr = data.currency || '₹';

      for (const cat of data.categories) {
        if (!cat.items || cat.items.length === 0) continue;

        // Check remaining space on current page
        if (doc.y > 690) {
          doc.addPage();
          doc.y = margin + 10;
        }

        doc.moveDown(0.4);

        // Category Header Bar (Dark Card + White Outline + Bold White Text)
        const catY = doc.y;
        doc.save();
        doc
          .roundedRect(margin, catY, contentWidth, 22, 3)
          .fillColor(cardBg)
          .fill();

        doc
          .roundedRect(margin, catY, contentWidth, 22, 3)
          .lineWidth(1)
          .strokeColor(headerBorder)
          .stroke();
        doc.restore();

        // Category Title
        doc
          .font('Helvetica-Bold')
          .fontSize(10.5)
          .fillColor(textWhite)
          .text(cat.name.toUpperCase(), margin + 12, catY + 5.5, {
            characterSpacing: 1.2,
          });

        // Category Item Count
        const countStr = `${cat.items.length} ${cat.items.length === 1 ? 'ITEM' : 'ITEMS'}`;
        doc
          .font('Helvetica-Bold')
          .fontSize(8)
          .fillColor(accentGold)
          .text(countStr, margin, catY + 6.5, {
            align: 'right',
            width: contentWidth - 12,
            characterSpacing: 0.5,
          });

        doc.y = catY + 28;

        // Render each item in the category
        for (const item of cat.items) {
          if (doc.y > 735) {
            doc.addPage();
            doc.y = margin + 10;
          }

          const itemStartY = doc.y;

          // 1. Food Type Indicator (Square with Dot)
          const isVeg = item.foodType === 'VEG';
          const isVegan = item.foodType === 'VEGAN';
          const isEgg = item.foodType === 'EGG';
          const indicatorColor = isVegan ? veganColor : isVeg ? vegColor : isEgg ? eggColor : nonVegColor;

          const boxSize = 8;
          const boxX = margin + 4;
          const boxY = itemStartY + 2;

          doc.save();
          // Dark background backing for badge
          doc.rect(boxX, boxY, boxSize, boxSize).fillColor('#18181b').fill();
          // Crisp border outline
          doc.rect(boxX, boxY, boxSize, boxSize).strokeColor(indicatorColor).lineWidth(1.2).stroke();
          // Inner dot or triangle
          doc.circle(boxX + boxSize / 2, boxY + boxSize / 2, 2).fillColor(indicatorColor).fill();
          doc.restore();

          // 2. Dish Name & Spicy Tag
          doc.font('Helvetica-Bold').fontSize(9.5).fillColor(textWhite);

          let nameText = item.name;
          const textStartX = margin + 18;
          const priceColumnWidth = 150;
          const nameMaxWidth = contentWidth - 24 - priceColumnWidth;

          doc.text(nameText, textStartX, itemStartY, {
            width: nameMaxWidth,
            lineBreak: false,
            ellipsis: true,
          });

          // Spice indicator tag if spicy
          if (item.spiceLevel === 'HOT' || item.spiceLevel === 'EXTRA_HOT') {
            const spicyText = item.spiceLevel === 'EXTRA_HOT' ? '🌶️🌶️ EXTRA HOT' : '🌶️ SPICY';
            const nameWidth = doc.widthOfString(nameText);
            const spiceTagX = Math.min(textStartX + nameWidth + 6, margin + contentWidth - priceColumnWidth - 65);
            doc.save();
            doc
              .font('Helvetica-Bold')
              .fontSize(7)
              .fillColor('#fb923c')
              .text(spicyText, spiceTagX, itemStartY + 1.5, { lineBreak: false });
            doc.restore();
          }

          // 3. Price & Variants (Right-aligned, Bold White)
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
            .fillColor(textWhite)
            .text(priceString, pageWidth - margin - priceColumnWidth, itemStartY, {
              width: priceColumnWidth,
              align: 'right',
            });

          // 4. Description (Italics Slate/Silver) if present
          if (item.description && item.description.trim()) {
            doc
              .font('Helvetica-Oblique')
              .fontSize(8)
              .fillColor(textMuted)
              .text(item.description.trim(), textStartX, doc.y + 1.5, {
                width: nameMaxWidth + 35,
                lineBreak: true,
              });
          }

          // Item divider hairline
          doc.moveDown(0.3);
          const lineY = doc.y;
          doc
            .strokeColor(dividerColor)
            .lineWidth(0.5)
            .moveTo(textStartX, lineY)
            .lineTo(pageWidth - margin, lineY)
            .stroke();

          doc.moveDown(0.3);
        }

        doc.moveDown(0.35);
      }

      // ── FOOTER & CRISP PAGE NUMBERING (ALL PAGES) ───────────────────────────
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);

        const footerY = 804;

        // Subtle footer top hairline
        doc
          .strokeColor(dividerColor)
          .lineWidth(0.5)
          .moveTo(margin, footerY - 8)
          .lineTo(pageWidth - margin, footerY - 8)
          .stroke();

        // Footer disclaimer (Muted Silver)
        doc
          .font('Helvetica')
          .fontSize(7.5)
          .fillColor(textMuted)
          .text(
            'All items freshly prepared. Applicable taxes & charges apply.',
            margin,
            footerY,
            { align: 'left', width: contentWidth / 2 }
          );

        // Page numbering (White / Silver)
        doc
          .font('Helvetica-Bold')
          .fontSize(7.5)
          .fillColor(textOffWhite)
          .text(`PAGE ${i + 1} OF ${range.count}`, pageWidth / 2, footerY, {
            align: 'right',
            width: contentWidth / 2,
            characterSpacing: 0.5,
          });
      }

      doc.end();
    });
  }
}
