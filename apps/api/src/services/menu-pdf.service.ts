// =============================================================================
// Restaurant Menu PDF Generator (PDFKit)
// Strictly In-Memory — Zero disk storage, streamed directly to client
// Supports 20+ Dynamic Design Templates (Colors, Fonts, Badges, Borders)
// A4 Vector Resolution (300+ DPI Equivalent)
// =============================================================================

import PDFDocument from 'pdfkit';
import { getMenuTemplateById, MenuTemplate } from './menu-templates.data';

export interface MenuPdfData {
  tenantName: string;
  tagline?: string;
  logoUrl?: string | null;
  branchName?: string;
  branchAddress?: string;
  branchPhone?: string;
  currency?: string;
  templateId?: string;
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
   * Renders dynamically using the chosen template's colors, typography, borders, and badge styles.
   * A4 vector layout (crisp 300+ DPI equivalent).
   */
  static async generateMenuPdf(data: MenuPdfData, chosenTemplateId?: string): Promise<Buffer> {
    const template: MenuTemplate = getMenuTemplateById(chosenTemplateId || data.templateId);
    const theme = template.themeConfig;
    const logoBuffer = await resolveLogoBuffer(data.logoUrl);

    return new Promise((resolve, reject) => {
      const pageWidth = 595.28; // Standard A4 width (points)
      const pageHeight = 841.89; // Standard A4 height (points)
      const margin = 36;
      const contentWidth = pageWidth - margin * 2;

      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: margin, bottom: margin, left: margin, right: margin },
        bufferPages: true,
        autoFirstPage: true,
        info: {
          Title: `${data.tenantName} - Menu (${template.name})`,
          Author: data.tenantName,
          Subject: `Restaurant Menu - ${template.name}`,
        },
      });

      const buffers: Buffer[] = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      // Helper to paint page background & decorative borders per template
      const paintPageBackground = () => {
        doc.save();
        // 1. Full page background fill
        doc.rect(0, 0, pageWidth, pageHeight).fill(theme.pageBg);

        // 2. Outer decorative frame
        doc
          .rect(14, 14, pageWidth - 28, pageHeight - 28)
          .lineWidth(1)
          .strokeColor(theme.frameColor)
          .stroke();

        // 3. Inner fine hairline border if specified
        if (theme.innerFrameColor) {
          doc
            .rect(17, 17, pageWidth - 34, pageHeight - 34)
            .lineWidth(0.5)
            .strokeColor(theme.innerFrameColor)
            .stroke();
        }

        doc.restore();
      };

      // Handle subsequent pages added automatically or manually
      doc.on('pageAdded', () => {
        paintPageBackground();
      });

      // Paint initial page background
      paintPageBackground();

      // ── CENTERED RESTAURANT LOGO WITH BORDER OUTLINE ─────────────────────────
      const centerX = pageWidth / 2;
      const logoRadius = 26;
      const logoDiameter = logoRadius * 2;
      const logoCenterY = 48;
      const logoTopY = logoCenterY - logoRadius;

      doc.save();
      // Base circle background
      doc.circle(centerX, logoCenterY, logoRadius + 1).fillColor(theme.logoBgColor || theme.cardBg).fill();

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
          .font(theme.fontFamilyHeader)
          .fontSize(22)
          .fillColor(theme.textPrimary)
          .text(initial, centerX - 20, logoCenterY - 10, {
            width: 40,
            align: 'center',
          });
      }

      // Draw crisp BORDER OUTLINE around logo
      doc
        .circle(centerX, logoCenterY, logoRadius)
        .lineWidth(2)
        .strokeColor(theme.logoBorderColor)
        .stroke();

      doc.restore();

      // ── RESTAURANT HEADER TEXT ──────────────────────────────────────────────
      doc.y = logoCenterY + logoRadius + 10;

      // Restaurant Name (Centered, Uppercase)
      doc
        .font(theme.fontFamilyHeader)
        .fontSize(20)
        .fillColor(theme.textPrimary)
        .text(data.tenantName.toUpperCase(), {
          align: 'center',
          characterSpacing: 2,
        });

      // Tagline
      if (data.tagline && data.tagline.trim()) {
        doc.moveDown(0.2);
        doc
          .font(theme.fontFamilyItalic)
          .fontSize(9.5)
          .fillColor(theme.textAccent)
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
          .font(theme.fontFamilyBody)
          .fontSize(8)
          .fillColor(theme.textSecondary)
          .text(outletParts.join('  •  '), { align: 'center' });
      }

      // Title Banner: "À LA CARTE MENU" with Decorative Dividers
      doc.moveDown(0.5);
      const titleY = doc.y;
      const barY = titleY + 6;

      doc
        .strokeColor(theme.dividerColor)
        .lineWidth(0.75)
        .moveTo(margin + 30, barY)
        .lineTo(centerX - 75, barY)
        .stroke();

      doc
        .font(theme.fontFamilyHeader)
        .fontSize(10)
        .fillColor(theme.textPrimary)
        .text('À LA CARTE MENU', margin, titleY, {
          width: contentWidth,
          align: 'center',
          characterSpacing: 2.5,
        });

      doc
        .strokeColor(theme.dividerColor)
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

        // Category Header Bar (Card + Border + Category Name)
        const catY = doc.y;
        doc.save();

        if (theme.headerBannerStyle === 'solid-card') {
          doc
            .roundedRect(margin, catY, contentWidth, 22, 3)
            .fillColor(theme.cardBg)
            .fill();
        } else if (theme.headerBannerStyle === 'vintage-ornate') {
          doc
            .rect(margin, catY, contentWidth, 22)
            .fillColor(theme.cardBg)
            .fill();
          doc
            .rect(margin, catY, contentWidth, 22)
            .lineWidth(1)
            .strokeColor(theme.cardBorderColor)
            .stroke();
          doc
            .rect(margin + 2, catY + 2, contentWidth - 4, 18)
            .lineWidth(0.5)
            .strokeColor(theme.dividerColor)
            .stroke();
        } else {
          // Outlined card
          doc
            .roundedRect(margin, catY, contentWidth, 22, 3)
            .fillColor(theme.cardBg)
            .fill();
          doc
            .roundedRect(margin, catY, contentWidth, 22, 3)
            .lineWidth(1)
            .strokeColor(theme.cardBorderColor)
            .stroke();
        }
        doc.restore();

        // Category Title
        const catTextColor = theme.headerBannerStyle === 'solid-card' && theme.cardBg === '#000000' && theme.pageBg === '#ffffff'
          ? '#ffffff'
          : theme.textPrimary;

        doc
          .font(theme.fontFamilyHeader)
          .fontSize(10.5)
          .fillColor(catTextColor)
          .text(cat.name.toUpperCase(), margin + 12, catY + 5.5, {
            characterSpacing: 1.2,
          });

        // Category Item Count Badge
        const countStr = `${cat.items.length} ${cat.items.length === 1 ? 'ITEM' : 'ITEMS'}`;
        doc
          .font(theme.fontFamilyHeader)
          .fontSize(8)
          .fillColor(theme.textAccent)
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
          const indicatorColor = isVegan
            ? theme.foodTypeColors.vegan
            : isVeg
            ? theme.foodTypeColors.veg
            : isEgg
            ? theme.foodTypeColors.egg
            : theme.foodTypeColors.nonVeg;

          const boxSize = 8;
          const boxX = margin + 4;
          const boxY = itemStartY + 2;

          doc.save();
          // Dark/Light backing for badge
          doc.rect(boxX, boxY, boxSize, boxSize).fillColor(theme.cardBg).fill();
          // Crisp border outline
          doc.rect(boxX, boxY, boxSize, boxSize).strokeColor(indicatorColor).lineWidth(1.2).stroke();
          // Inner dot
          doc.circle(boxX + boxSize / 2, boxY + boxSize / 2, 2).fillColor(indicatorColor).fill();
          doc.restore();

          // 2. Dish Name & Spicy Tag
          doc.font(theme.fontFamilyHeader).fontSize(9.5).fillColor(theme.textPrimary);

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
              .font(theme.fontFamilyHeader)
              .fontSize(7)
              .fillColor('#fb923c')
              .text(spicyText, spiceTagX, itemStartY + 1.5, { lineBreak: false });
            doc.restore();
          }

          // 3. Price & Variants (Right-aligned)
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
            .font(theme.fontFamilyHeader)
            .fontSize(9.5)
            .fillColor(theme.textPrimary)
            .text(priceString, pageWidth - margin - priceColumnWidth, itemStartY, {
              width: priceColumnWidth,
              align: 'right',
            });

          // 4. Description (Italics) if present
          if (item.description && item.description.trim()) {
            doc
              .font(theme.fontFamilyItalic)
              .fontSize(8)
              .fillColor(theme.textSecondary)
              .text(item.description.trim(), textStartX, doc.y + 1.5, {
                width: nameMaxWidth + 35,
                lineBreak: true,
              });
          }

          // Item divider hairline
          doc.moveDown(0.3);
          const lineY = doc.y;
          doc
            .strokeColor(theme.dividerColor)
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
          .strokeColor(theme.dividerColor)
          .lineWidth(0.5)
          .moveTo(margin, footerY - 8)
          .lineTo(pageWidth - margin, footerY - 8)
          .stroke();

        // Footer disclaimer
        doc
          .font(theme.fontFamilyBody)
          .fontSize(7.5)
          .fillColor(theme.textSecondary)
          .text(
            'All items freshly prepared. Applicable taxes & charges apply.',
            margin,
            footerY,
            { align: 'left', width: contentWidth / 2 }
          );

        // Page numbering
        doc
          .font(theme.fontFamilyHeader)
          .fontSize(7.5)
          .fillColor(theme.textPrimary)
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
