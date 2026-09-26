// =============================================================================
// Restaurant Menu PDF Generator (PDFKit)
// Strictly In-Memory — Zero disk storage, streamed directly to client
// 12 Professional Restaurant Menu Templates matching the Design Reference
// =============================================================================

import PDFDocument from 'pdfkit';

export type MenuTemplateId =
  | 'reverie'       // 01: The Reverie (Modern Minimalist Ivory Tasting)
  | 'lumiere'       // 02: Café Lumière (Midnight & Gold Parisian Brasserie)
  | 'omakase'       // 03: Omakase Tokyo (Japanese Rice Paper Minimalist)
  | 'bellini'       // 04: Trattoria Bellini (Rustic Tuscan Wine & Cream)
  | 'azure'         // 05: Azure (Mediterranean Coastal Cyan & Sky)
  | 'hudson'        // 06: The Hudson (Chalkboard Slate & Grill)
  | 'arima'         // 07: Arima (Basque Limestone & Raw Stone Tasting)
  | 'garden'        // 08: The Garden (Vintage Botanical Kraft Bistro)
  | 'kori'          // 09: Kōri (Obsidian & Gold Asian Fusion)
  | 'grand_cafe'    // 10: Grand Café (1928 Art Deco Parisian Vintage)
  | 'vino_dolci'    // 11: Vino & Dolci (Terracotta Wine & Warm Burgundy)
  | 'daily';        // 12: The Daily (Swiss Editorial Newspaper Grid)

export interface MenuPdfItemVariant {
  id: string;
  name: string;
  price: number;
}

export interface MenuPdfItem {
  id: string;
  name: string;
  description?: string | null;
  foodType: string;
  spiceLevel: string;
  variants: MenuPdfItemVariant[];
}

export interface MenuPdfCategory {
  id: string;
  name: string;
  items: MenuPdfItem[];
}

export interface MenuPdfData {
  tenantName: string;
  tagline?: string;
  logoUrl?: string | null;
  branchName?: string;
  branchAddress?: string;
  branchPhone?: string;
  currency?: string;
  categories: MenuPdfCategory[];
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
    console.warn('[MenuPdfService] Logo buffer resolution error:', err);
  }
  return null;
}

export class MenuPdfService {
  /**
   * Generates a beautifully formatted restaurant menu PDF in-memory.
   * Supports 12 distinct visual design templates based on the user's reference.
   */
  static async generateMenuPdf(data: MenuPdfData, template: MenuTemplateId = 'hudson'): Promise<Buffer> {
    const logoBuffer = await resolveLogoBuffer(data.logoUrl);

    return new Promise((resolve, reject) => {
      const pageWidth = 595.28;  // A4 standard points
      const pageHeight = 841.89; // A4 standard points

      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 32, bottom: 32, left: 32, right: 32 },
        bufferPages: true,
        autoFirstPage: true,
        info: {
          Title: `${data.tenantName} - Menu`,
          Author: data.tenantName,
          Subject: `${template.toUpperCase()} Restaurant Menu`,
        },
      });

      const buffers: Buffer[] = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      // Route to chosen template generator
      switch (template) {
        case 'reverie':
          renderTheReverie(doc, data, logoBuffer, pageWidth, pageHeight);
          break;
        case 'lumiere':
          renderCafeLumiere(doc, data, logoBuffer, pageWidth, pageHeight);
          break;
        case 'omakase':
          renderOmakaseTokyo(doc, data, logoBuffer, pageWidth, pageHeight);
          break;
        case 'bellini':
          renderTrattoriaBellini(doc, data, logoBuffer, pageWidth, pageHeight);
          break;
        case 'azure':
          renderAzureMediterranean(doc, data, logoBuffer, pageWidth, pageHeight);
          break;
        case 'arima':
          renderArimaBasque(doc, data, logoBuffer, pageWidth, pageHeight);
          break;
        case 'garden':
          renderTheGarden(doc, data, logoBuffer, pageWidth, pageHeight);
          break;
        case 'kori':
          renderKoriAsian(doc, data, logoBuffer, pageWidth, pageHeight);
          break;
        case 'grand_cafe':
          renderGrandCafe(doc, data, logoBuffer, pageWidth, pageHeight);
          break;
        case 'vino_dolci':
          renderVinoDolci(doc, data, logoBuffer, pageWidth, pageHeight);
          break;
        case 'daily':
          renderTheDaily(doc, data, logoBuffer, pageWidth, pageHeight);
          break;
        case 'hudson':
        default:
          renderTheHudson(doc, data, logoBuffer, pageWidth, pageHeight);
          break;
      }

      doc.end();
    });
  }
}

// =============================================================================
// HELPER DRAWING UTILITIES
// =============================================================================

function drawCenteredLogo(
  doc: PDFKit.PDFDocument,
  logoBuffer: Buffer | null,
  tenantName: string,
  centerX: number,
  centerY: number,
  radius: number,
  borderOutlineColor: string,
  bgColor: string,
  textColor: string,
  borderWidth = 1.5
) {
  const diameter = radius * 2;
  const topY = centerY - radius;

  doc.save();
  // Background circle
  doc.circle(centerX, centerY, radius + 1).fillColor(bgColor).fill();

  let drawn = false;
  if (logoBuffer) {
    try {
      doc.save();
      doc.circle(centerX, centerY, radius - 1).clip();
      doc.image(logoBuffer, centerX - radius + 1, topY + 1, {
        width: diameter - 2,
        height: diameter - 2,
        fit: [diameter - 2, diameter - 2],
        align: 'center',
        valign: 'center',
      });
      doc.restore();
      drawn = true;
    } catch (e) {
      drawn = false;
    }
  }

  if (!drawn) {
    const initial = (tenantName || 'R').trim().charAt(0).toUpperCase();
    doc
      .font('Helvetica-Bold')
      .fontSize(radius * 0.8)
      .fillColor(textColor)
      .text(initial, centerX - radius, centerY - radius * 0.45, {
        width: diameter,
        align: 'center',
      });
  }

  // Border outline
  doc
    .circle(centerX, centerY, radius)
    .lineWidth(borderWidth)
    .strokeColor(borderOutlineColor)
    .stroke();

  doc.restore();
}

function formatItemPrice(item: MenuPdfItem, curr: string): string {
  if (item.variants && item.variants.length > 0) {
    if (item.variants.length === 1) {
      return `${curr} ${Number(item.variants[0].price).toFixed(2)}`;
    }
    return item.variants
      .map((v) => `${v.name}: ${curr}${Number(v.price).toFixed(0)}`)
      .join(' | ');
  }
  return `${curr} 0.00`;
}

function drawFoodTypeIndicator(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  foodType: string,
  vegColor = '#16a34a',
  nonVegColor = '#dc2626',
  eggColor = '#d97706',
  veganColor = '#059669',
  boxBacking = '#ffffff'
) {
  const isVeg = foodType === 'VEG';
  const isVegan = foodType === 'VEGAN';
  const isEgg = foodType === 'EGG';
  const color = isVegan ? veganColor : isVeg ? vegColor : isEgg ? eggColor : nonVegColor;

  doc.save();
  const boxSize = 7.5;
  if (boxBacking) {
    doc.rect(x, y, boxSize, boxSize).fillColor(boxBacking).fill();
  }
  doc.rect(x, y, boxSize, boxSize).strokeColor(color).lineWidth(1).stroke();
  doc.circle(x + boxSize / 2, y + boxSize / 2, 1.8).fillColor(color).fill();
  doc.restore();
}

// =============================================================================
// TEMPLATE 01: THE REVERIE (Modern Minimalist Ivory Tasting)
// =============================================================================
function renderTheReverie(
  doc: PDFKit.PDFDocument,
  data: MenuPdfData,
  logoBuffer: Buffer | null,
  pageWidth: number,
  pageHeight: number
) {
  const bg = '#f6f4ee';
  const margin = 36;
  const contentWidth = pageWidth - margin * 2;
  const textDark = '#1c1917';
  const textMuted = '#78716c';
  const oliveAccent = '#556b2f';
  const divider = '#d6d3c9';
  const curr = data.currency || '₹';

  const paintBg = () => {
    doc.save();
    doc.rect(0, 0, pageWidth, pageHeight).fill(bg);
    doc.rect(14, 14, pageWidth - 28, pageHeight - 28).lineWidth(0.75).strokeColor(divider).stroke();
    // Decorative leaf branch line in top-left
    doc.strokeColor(oliveAccent).lineWidth(1.5).moveTo(24, 24).lineTo(70, 24).stroke();
    doc.restore();
  };

  doc.on('pageAdded', paintBg);
  paintBg();

  // Centered Logo with clean white outline
  const centerX = pageWidth / 2;
  drawCenteredLogo(doc, logoBuffer, data.tenantName, centerX, 50, 24, '#ffffff', '#ffffff', textDark, 2);

  // Header
  doc.y = 82;
  doc.font('Helvetica').fontSize(9).fillColor(oliveAccent).text('THE', { align: 'center', characterSpacing: 4 });
  doc.font('Helvetica-Bold').fontSize(22).fillColor(textDark).text(data.tenantName.toUpperCase(), { align: 'center', characterSpacing: 3 });
  doc.font('Helvetica').fontSize(9).fillColor(textMuted).text('BISTRO • TASTING MENU', { align: 'center', characterSpacing: 2 });

  if (data.tagline) {
    doc.font('Helvetica-Oblique').fontSize(8.5).fillColor(oliveAccent).text(data.tagline, { align: 'center' });
  }

  doc.moveDown(0.6);
  const lineY = doc.y;
  doc.strokeColor(divider).lineWidth(0.75).moveTo(centerX - 60, lineY).lineTo(centerX + 60, lineY).stroke();
  doc.y = lineY + 14;

  // Numbered Courses / Categories
  let globalItemIndex = 1;
  for (const cat of data.categories) {
    if (!cat.items || cat.items.length === 0) continue;

    if (doc.y > 690) {
      doc.addPage();
      doc.y = margin + 15;
    }

    doc.moveDown(0.3);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(oliveAccent).text(cat.name.toUpperCase(), margin + 10, doc.y, { characterSpacing: 1.5 });
    doc.moveDown(0.3);

    for (const item of cat.items) {
      if (doc.y > 730) {
        doc.addPage();
        doc.y = margin + 15;
      }

      const itemY = doc.y;
      const numStr = globalItemIndex < 10 ? `0${globalItemIndex}` : `${globalItemIndex}`;
      globalItemIndex++;

      // Number badge
      doc.font('Helvetica-Bold').fontSize(10).fillColor(oliveAccent).text(numStr, margin + 8, itemY);

      // Dish name
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(textDark).text(item.name.toUpperCase(), margin + 35, itemY, { width: contentWidth - 140 });

      // Price
      const priceStr = formatItemPrice(item, curr);
      doc.font('Helvetica-Bold').fontSize(9).fillColor(textDark).text(priceStr, pageWidth - margin - 120, itemY, { width: 120, align: 'right' });

      // Description
      if (item.description && item.description.trim()) {
        doc.font('Helvetica-Oblique').fontSize(8).fillColor(textMuted).text(item.description.trim(), margin + 35, doc.y + 2, { width: contentWidth - 140 });
      }

      doc.moveDown(0.4);
      doc.strokeColor(divider).lineWidth(0.5).moveTo(margin + 35, doc.y).lineTo(pageWidth - margin - 8, doc.y).stroke();
      doc.moveDown(0.4);
    }
  }

  // Footer on all pages
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.font('Helvetica').fontSize(7.5).fillColor(textMuted).text('SIMPLE INGREDIENTS • EXTRAORDINARY MOMENTS', margin, 804, { align: 'center', width: contentWidth, characterSpacing: 1 });
  }
}

// =============================================================================
// TEMPLATE 02: CAFÉ LUMIÈRE (Midnight & Gold Parisian Brasserie)
// =============================================================================
function renderCafeLumiere(
  doc: PDFKit.PDFDocument,
  data: MenuPdfData,
  logoBuffer: Buffer | null,
  pageWidth: number,
  pageHeight: number
) {
  const bg = '#0f0f12';
  const margin = 32;
  const contentWidth = pageWidth - margin * 2;
  const gold = '#eab308';
  const goldLight = '#fef08a';
  const textWhite = '#ffffff';
  const textMuted = '#a1a1aa';
  const curr = data.currency || '€';

  const paintBg = () => {
    doc.save();
    doc.rect(0, 0, pageWidth, pageHeight).fill(bg);
    // Ornate Gold Double Border
    doc.rect(14, 14, pageWidth - 28, pageHeight - 28).lineWidth(1.5).strokeColor(gold).stroke();
    doc.rect(18, 18, pageWidth - 36, pageHeight - 36).lineWidth(0.75).strokeColor('#854d0e').stroke();

    // Corner fleur-de-lis accents
    doc.font('Helvetica-Bold').fontSize(11).fillColor(gold);
    doc.text('✦', 22, 22);
    doc.text('✦', pageWidth - 32, 22);
    doc.text('✦', 22, pageHeight - 32);
    doc.text('✦', pageWidth - 32, pageHeight - 32);
    doc.restore();
  };

  doc.on('pageAdded', paintBg);
  paintBg();

  // Centered Logo with Gold outline
  const centerX = pageWidth / 2;
  drawCenteredLogo(doc, logoBuffer, data.tenantName, centerX, 48, 25, gold, '#18181b', gold, 2);

  // Header
  doc.y = 78;
  doc.font('Helvetica-Bold').fontSize(21).fillColor(gold).text(data.tenantName.toUpperCase(), { align: 'center', characterSpacing: 2 });
  doc.font('Helvetica-Oblique').fontSize(9).fillColor(goldLight).text(data.tagline || 'BRASSERIE PARISIENNE', { align: 'center', characterSpacing: 1.5 });
  doc.font('Helvetica').fontSize(10).fillColor(gold).text('⚜', { align: 'center' });

  doc.y += 6;

  // Render 2-Column Categories
  const colWidth = (contentWidth - 16) / 2;

  for (let cIdx = 0; cIdx < data.categories.length; cIdx += 2) {
    const catLeft = data.categories[cIdx];
    const catRight = data.categories[cIdx + 1];

    if (doc.y > 680) {
      doc.addPage();
      doc.y = margin + 15;
    }

    const rowStartY = doc.y;

    // Render Left Category
    if (catLeft && catLeft.items.length > 0) {
      const leftX = margin + 4;
      doc.save();
      doc.rect(leftX, rowStartY, colWidth, 18).fillColor('#1c1917').fill();
      doc.rect(leftX, rowStartY, colWidth, 18).lineWidth(1).strokeColor(gold).stroke();
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(gold).text(catLeft.name.toUpperCase(), leftX, rowStartY + 4.5, { width: colWidth, align: 'center', characterSpacing: 1 });
      doc.restore();

      let currentY = rowStartY + 24;
      for (const item of catLeft.items) {
        doc.font('Helvetica-Bold').fontSize(9).fillColor(textWhite).text(item.name, leftX, currentY, { width: colWidth - 45 });
        const priceStr = formatItemPrice(item, curr);
        doc.font('Helvetica-Bold').fontSize(9).fillColor(gold).text(priceStr, leftX + colWidth - 45, currentY, { width: 45, align: 'right' });

        if (item.description) {
          doc.font('Helvetica-Oblique').fontSize(7.5).fillColor(textMuted).text(item.description, leftX, doc.y + 1, { width: colWidth });
        }
        currentY = doc.y + 6;
      }
    }

    // Render Right Category
    if (catRight && catRight.items.length > 0) {
      const rightX = margin + colWidth + 12;
      doc.save();
      doc.rect(rightX, rowStartY, colWidth, 18).fillColor('#1c1917').fill();
      doc.rect(rightX, rowStartY, colWidth, 18).lineWidth(1).strokeColor(gold).stroke();
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(gold).text(catRight.name.toUpperCase(), rightX, rowStartY + 4.5, { width: colWidth, align: 'center', characterSpacing: 1 });
      doc.restore();

      let currentY = rowStartY + 24;
      for (const item of catRight.items) {
        doc.font('Helvetica-Bold').fontSize(9).fillColor(textWhite).text(item.name, rightX, currentY, { width: colWidth - 45 });
        const priceStr = formatItemPrice(item, curr);
        doc.font('Helvetica-Bold').fontSize(9).fillColor(gold).text(priceStr, rightX + colWidth - 45, currentY, { width: 45, align: 'right' });

        if (item.description) {
          doc.font('Helvetica-Oblique').fontSize(7.5).fillColor(textMuted).text(item.description, rightX, doc.y + 1, { width: colWidth });
        }
        currentY = doc.y + 6;
      }
    }

    doc.moveDown(1.5);
  }

  // Footer
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.font('Helvetica-Oblique').fontSize(8).fillColor(gold).text('BON APPÉTIT • LUXE & SAVEUR', margin, 804, { align: 'center', width: contentWidth, characterSpacing: 1.5 });
  }
}

// =============================================================================
// TEMPLATE 03: OMAKASE TOKYO (Japanese Rice Paper Minimalist)
// =============================================================================
function renderOmakaseTokyo(
  doc: PDFKit.PDFDocument,
  data: MenuPdfData,
  logoBuffer: Buffer | null,
  pageWidth: number,
  pageHeight: number
) {
  const bg = '#f5f0e6';
  const margin = 36;
  const contentWidth = pageWidth - margin * 2;
  const inkBlack = '#18181b';
  const redHanko = '#dc2626';
  const subText = '#71717a';
  const curr = data.currency || '¥';

  const paintBg = () => {
    doc.save();
    doc.rect(0, 0, pageWidth, pageHeight).fill(bg);
    doc.rect(14, 14, pageWidth - 28, pageHeight - 28).lineWidth(0.5).strokeColor('#d4cebe').stroke();

    // Red Japanese Stamp Seal
    doc.rect(pageWidth - 65, 32, 24, 24).lineWidth(1.2).strokeColor(redHanko).stroke();
    doc.font('Helvetica-Bold').fontSize(9).fillColor(redHanko).text('和食', pageWidth - 63, 38, { width: 20, align: 'center' });
    doc.restore();
  };

  doc.on('pageAdded', paintBg);
  paintBg();

  // Top header with kanji and centered logo
  const centerX = pageWidth / 2;
  doc.font('Helvetica-Bold').fontSize(11).fillColor(inkBlack).text('東 京\nTOKYO', margin + 10, 36);

  drawCenteredLogo(doc, logoBuffer, data.tenantName, centerX, 52, 26, '#ffffff', '#ffffff', inkBlack, 2);

  doc.y = 86;
  doc.font('Helvetica-Bold').fontSize(22).fillColor(inkBlack).text(data.tenantName.toUpperCase(), { align: 'center', characterSpacing: 4 });
  doc.font('Helvetica').fontSize(9).fillColor(redHanko).text('お 任 せ • OMAKASE', { align: 'center', characterSpacing: 2 });

  doc.moveDown(0.5);
  doc.strokeColor(redHanko).lineWidth(1).moveTo(centerX - 40, doc.y).lineTo(centerX + 40, doc.y).stroke();
  doc.moveDown(0.8);

  let courseNum = 1;
  for (const cat of data.categories) {
    if (!cat.items || cat.items.length === 0) continue;

    if (doc.y > 690) {
      doc.addPage();
      doc.y = margin + 15;
    }

    doc.font('Helvetica-Bold').fontSize(10).fillColor(redHanko).text(cat.name.toUpperCase(), margin + 15, doc.y, { characterSpacing: 1.5 });
    doc.moveDown(0.3);

    for (const item of cat.items) {
      if (doc.y > 730) {
        doc.addPage();
        doc.y = margin + 15;
      }

      const itemY = doc.y;
      const numStr = courseNum < 10 ? `0${courseNum}` : `${courseNum}`;
      courseNum++;

      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(redHanko).text(numStr, margin + 15, itemY);
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(inkBlack).text(item.name.toUpperCase(), margin + 42, itemY, { width: contentWidth - 140 });

      const priceStr = formatItemPrice(item, curr);
      doc.font('Helvetica-Bold').fontSize(9).fillColor(inkBlack).text(priceStr, pageWidth - margin - 110, itemY, { width: 110, align: 'right' });

      if (item.description) {
        doc.font('Helvetica').fontSize(8).fillColor(subText).text(`+  ${item.description.trim()}`, margin + 42, doc.y + 1.5, { width: contentWidth - 140 });
      }

      doc.moveDown(0.45);
    }
    doc.moveDown(0.4);
  }

  // Footer
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.font('Helvetica').fontSize(7.5).fillColor(subText).text('A SEASONAL JOURNEY THROUGH JAPAN', margin, 804, { align: 'center', width: contentWidth, characterSpacing: 2 });
  }
}

// =============================================================================
// TEMPLATE 04: TRATTORIA BELLINI (Rustic Italian Tuscan Wine)
// =============================================================================
function renderTrattoriaBellini(
  doc: PDFKit.PDFDocument,
  data: MenuPdfData,
  logoBuffer: Buffer | null,
  pageWidth: number,
  pageHeight: number
) {
  const bg = '#fdfbf7';
  const margin = 32;
  const contentWidth = pageWidth - margin * 2;
  const wineRed = '#881337';
  const textDark = '#1c1917';
  const textMuted = '#78716c';
  const curr = data.currency || '€';

  const paintBg = () => {
    doc.save();
    doc.rect(0, 0, pageWidth, pageHeight).fill(bg);
    doc.rect(14, 14, pageWidth - 28, pageHeight - 28).lineWidth(1.2).strokeColor(wineRed).stroke();
    doc.rect(17, 17, pageWidth - 34, pageHeight - 34).lineWidth(0.5).strokeColor('#e7e5e4').stroke();
    doc.restore();
  };

  doc.on('pageAdded', paintBg);
  paintBg();

  const centerX = pageWidth / 2;
  drawCenteredLogo(doc, logoBuffer, data.tenantName, centerX, 48, 25, '#ffffff', '#ffffff', wineRed, 2);

  doc.y = 80;
  doc.font('Helvetica').fontSize(9).fillColor(textMuted).text('TRATTORIA', { align: 'center', characterSpacing: 3 });
  doc.font('Helvetica-Bold').fontSize(22).fillColor(wineRed).text(data.tenantName.toUpperCase(), { align: 'center', characterSpacing: 2 });
  doc.font('Helvetica-Oblique').fontSize(8.5).fillColor(textDark).text('CUCINA ITALIANA AUTENTICA', { align: 'center', characterSpacing: 1 });

  doc.moveDown(0.6);

  // 2-Column Quadrant Layout
  const colWidth = (contentWidth - 16) / 2;
  for (let cIdx = 0; cIdx < data.categories.length; cIdx += 2) {
    const catLeft = data.categories[cIdx];
    const catRight = data.categories[cIdx + 1];

    if (doc.y > 680) {
      doc.addPage();
      doc.y = margin + 15;
    }

    const rowStartY = doc.y;

    if (catLeft && catLeft.items.length > 0) {
      const leftX = margin + 4;
      doc.font('Helvetica-Bold').fontSize(11).fillColor(wineRed).text(catLeft.name.toUpperCase(), leftX, rowStartY, { width: colWidth });
      doc.strokeColor(wineRed).lineWidth(1).moveTo(leftX, rowStartY + 14).lineTo(leftX + 60, rowStartY + 14).stroke();

      let curY = rowStartY + 20;
      for (const item of catLeft.items) {
        doc.font('Helvetica-Bold').fontSize(9).fillColor(textDark).text(item.name, leftX, curY, { width: colWidth - 40 });
        const priceStr = formatItemPrice(item, curr);
        doc.font('Helvetica-Bold').fontSize(9).fillColor(wineRed).text(priceStr, leftX + colWidth - 40, curY, { width: 40, align: 'right' });

        if (item.description) {
          doc.font('Helvetica-Oblique').fontSize(7.5).fillColor(textMuted).text(item.description, leftX, doc.y + 1, { width: colWidth });
        }
        curY = doc.y + 5;
      }
    }

    if (catRight && catRight.items.length > 0) {
      const rightX = margin + colWidth + 12;
      doc.font('Helvetica-Bold').fontSize(11).fillColor(wineRed).text(catRight.name.toUpperCase(), rightX, rowStartY, { width: colWidth });
      doc.strokeColor(wineRed).lineWidth(1).moveTo(rightX, rowStartY + 14).lineTo(rightX + 60, rowStartY + 14).stroke();

      let curY = rowStartY + 20;
      for (const item of catRight.items) {
        doc.font('Helvetica-Bold').fontSize(9).fillColor(textDark).text(item.name, rightX, curY, { width: colWidth - 40 });
        const priceStr = formatItemPrice(item, curr);
        doc.font('Helvetica-Bold').fontSize(9).fillColor(wineRed).text(priceStr, rightX + colWidth - 40, curY, { width: 40, align: 'right' });

        if (item.description) {
          doc.font('Helvetica-Oblique').fontSize(7.5).fillColor(textMuted).text(item.description, rightX, doc.y + 1, { width: colWidth });
        }
        curY = doc.y + 5;
      }
    }

    doc.moveDown(1.4);
  }

  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.font('Helvetica-Oblique').fontSize(8).fillColor(wineRed).text('BUON APPETITO • PASSIONE ITALIANA', margin, 804, { align: 'center', width: contentWidth });
  }
}

// =============================================================================
// TEMPLATE 05: AZURE (Mediterranean Coastal Cyan & Sky)
// =============================================================================
function renderAzureMediterranean(
  doc: PDFKit.PDFDocument,
  data: MenuPdfData,
  logoBuffer: Buffer | null,
  pageWidth: number,
  pageHeight: number
) {
  const bg = '#eaf3fa';
  const margin = 36;
  const contentWidth = pageWidth - margin * 2;
  const oceanBlue = '#0369a1';
  const deepNavy = '#0c4a6e';
  const textDark = '#0f172a';
  const textMuted = '#64748b';
  const curr = data.currency || '€';

  const paintBg = () => {
    doc.save();
    doc.rect(0, 0, pageWidth, pageHeight).fill(bg);
    doc.rect(14, 14, pageWidth - 28, pageHeight - 28).lineWidth(1).strokeColor('#bae6fd').stroke();
    doc.restore();
  };

  doc.on('pageAdded', paintBg);
  paintBg();

  const centerX = pageWidth / 2;
  drawCenteredLogo(doc, logoBuffer, data.tenantName, centerX, 50, 26, '#ffffff', '#ffffff', oceanBlue, 2);

  doc.y = 84;
  doc.font('Helvetica-Bold').fontSize(22).fillColor(oceanBlue).text(data.tenantName.toUpperCase(), { align: 'center', characterSpacing: 3 });
  doc.font('Helvetica').fontSize(9).fillColor(deepNavy).text('MEDITERRANEAN KITCHEN', { align: 'center', characterSpacing: 2 });

  doc.moveDown(0.6);

  let sectionIdx = 1;
  for (const cat of data.categories) {
    if (!cat.items || cat.items.length === 0) continue;

    if (doc.y > 690) {
      doc.addPage();
      doc.y = margin + 15;
    }

    const secNum = sectionIdx < 10 ? `0${sectionIdx}` : `${sectionIdx}`;
    sectionIdx++;

    // Section Bar
    doc.save();
    doc.font('Helvetica-Bold').fontSize(11).fillColor(oceanBlue).text(`${secNum}  ${cat.name.toUpperCase()}`, margin + 5, doc.y, { characterSpacing: 1 });
    doc.strokeColor(oceanBlue).lineWidth(1.2).moveTo(margin + 5, doc.y + 4).lineTo(pageWidth - margin - 5, doc.y + 4).stroke();
    doc.restore();

    doc.y += 10;

    for (const item of cat.items) {
      if (doc.y > 730) {
        doc.addPage();
        doc.y = margin + 15;
      }

      const itemY = doc.y;
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(textDark).text(item.name, margin + 12, itemY, { width: contentWidth - 100 });
      const priceStr = formatItemPrice(item, curr);
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(deepNavy).text(priceStr, pageWidth - margin - 80, itemY, { width: 80, align: 'right' });

      if (item.description) {
        doc.font('Helvetica').fontSize(8).fillColor(textMuted).text(item.description, margin + 12, doc.y + 1.5, { width: contentWidth - 100 });
      }

      doc.moveDown(0.4);
    }
    doc.moveDown(0.4);
  }

  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(oceanBlue).text('GOOD FOOD • BRIGHTER DAYS', margin, 804, { align: 'center', width: contentWidth, characterSpacing: 1.5 });
  }
}

// =============================================================================
// TEMPLATE 06: THE HUDSON (Chalkboard Slate & Bar & Grill)
// =============================================================================
function renderTheHudson(
  doc: PDFKit.PDFDocument,
  data: MenuPdfData,
  logoBuffer: Buffer | null,
  pageWidth: number,
  pageHeight: number
) {
  const bg = '#121214';
  const margin = 32;
  const contentWidth = pageWidth - margin * 2;
  const textWhite = '#ffffff';
  const textMuted = '#94a3b8';
  const divider = '#27272a';
  const curr = data.currency || '₹';

  const paintBg = () => {
    doc.save();
    doc.rect(0, 0, pageWidth, pageHeight).fill(bg);
    doc.rect(14, 14, pageWidth - 28, pageHeight - 28).lineWidth(1).strokeColor(divider).stroke();
    doc.restore();
  };

  doc.on('pageAdded', paintBg);
  paintBg();

  const centerX = pageWidth / 2;
  drawCenteredLogo(doc, logoBuffer, data.tenantName, centerX, 48, 26, '#ffffff', '#18181b', textWhite, 2);

  doc.y = 82;
  doc.font('Helvetica').fontSize(9).fillColor(textMuted).text('THE', { align: 'center', characterSpacing: 3 });
  doc.font('Helvetica-Bold').fontSize(22).fillColor(textWhite).text(data.tenantName.toUpperCase(), { align: 'center', characterSpacing: 2 });
  doc.font('Helvetica').fontSize(9).fillColor(textMuted).text('BAR & GRILL', { align: 'center', characterSpacing: 3 });

  doc.moveDown(0.6);

  for (const cat of data.categories) {
    if (!cat.items || cat.items.length === 0) continue;

    if (doc.y > 690) {
      doc.addPage();
      doc.y = margin + 15;
    }

    doc.font('Helvetica-Bold').fontSize(11).fillColor(textWhite).text(cat.name.toUpperCase(), margin + 6, doc.y, { characterSpacing: 1.5 });
    doc.strokeColor(textWhite).lineWidth(1).moveTo(margin + 6, doc.y + 3).lineTo(margin + 120, doc.y + 3).stroke();
    doc.y += 8;

    for (const item of cat.items) {
      if (doc.y > 730) {
        doc.addPage();
        doc.y = margin + 15;
      }

      const itemY = doc.y;
      drawFoodTypeIndicator(doc, margin + 6, itemY + 2, item.foodType, '#22c55e', '#ef4444', '#f59e0b', '#10b981', '#18181b');

      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(textWhite).text(item.name, margin + 20, itemY, { width: contentWidth - 110 });
      const priceStr = formatItemPrice(item, curr);
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(textWhite).text(priceStr, pageWidth - margin - 90, itemY, { width: 90, align: 'right' });

      if (item.description) {
        doc.font('Helvetica').fontSize(8).fillColor(textMuted).text(item.description, margin + 20, doc.y + 1, { width: contentWidth - 110 });
      }

      doc.moveDown(0.35);
      doc.strokeColor(divider).lineWidth(0.5).moveTo(margin + 20, doc.y).lineTo(pageWidth - margin - 6, doc.y).stroke();
      doc.moveDown(0.35);
    }
    doc.moveDown(0.4);
  }

  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.font('Helvetica').fontSize(7.5).fillColor(textMuted).text('ALL ITEMS FRESHLY GRILLED TO ORDER', margin, 804, { align: 'center', width: contentWidth });
  }
}

// =============================================================================
// TEMPLATE 07: ARIMA (Basque Limestone & Raw Stone Tasting)
// =============================================================================
function renderArimaBasque(
  doc: PDFKit.PDFDocument,
  data: MenuPdfData,
  logoBuffer: Buffer | null,
  pageWidth: number,
  pageHeight: number
) {
  const bg = '#dedede';
  const margin = 36;
  const contentWidth = pageWidth - margin * 2;
  const inkDark = '#111827';
  const subText = '#4b5563';
  const curr = data.currency || '€';

  const paintBg = () => {
    doc.save();
    doc.rect(0, 0, pageWidth, pageHeight).fill(bg);
    doc.rect(14, 14, pageWidth - 28, pageHeight - 28).lineWidth(0.75).strokeColor('#9ca3af').stroke();
    doc.restore();
  };

  doc.on('pageAdded', paintBg);
  paintBg();

  const centerX = pageWidth / 2;
  drawCenteredLogo(doc, logoBuffer, data.tenantName, centerX, 50, 25, '#ffffff', '#ffffff', inkDark, 2);

  doc.y = 82;
  doc.font('Helvetica-Bold').fontSize(22).fillColor(inkDark).text(data.tenantName.toUpperCase(), { align: 'center', characterSpacing: 4 });
  doc.font('Helvetica').fontSize(8.5).fillColor(subText).text('BASQUE CUISINE • MODERN TRADITION', { align: 'center', characterSpacing: 1.5 });

  doc.moveDown(0.8);

  let courseNum = 1;
  for (const cat of data.categories) {
    if (!cat.items || cat.items.length === 0) continue;

    if (doc.y > 690) {
      doc.addPage();
      doc.y = margin + 15;
    }

    doc.font('Helvetica-Bold').fontSize(10.5).fillColor(inkDark).text(cat.name.toUpperCase(), margin + 10, doc.y, { characterSpacing: 2 });
    doc.moveDown(0.3);

    for (const item of cat.items) {
      if (doc.y > 730) {
        doc.addPage();
        doc.y = margin + 15;
      }

      const itemY = doc.y;
      const numStr = courseNum < 10 ? `0${courseNum}` : `${courseNum}`;
      courseNum++;

      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(inkDark).text(item.name.toUpperCase(), margin + 10, itemY, { width: contentWidth - 100 });
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(inkDark).text(numStr, pageWidth - margin - 40, itemY, { width: 40, align: 'right' });

      const priceStr = formatItemPrice(item, curr);
      if (item.description) {
        doc.font('Helvetica-Oblique').fontSize(8).fillColor(subText).text(`${item.description}  (${priceStr})`, margin + 10, doc.y + 1.5, { width: contentWidth - 100 });
      }

      doc.moveDown(0.45);
    }
    doc.moveDown(0.4);
  }

  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.font('Helvetica').fontSize(7.5).fillColor(inkDark).text('PEOPLE • PLACE • FLAVOUR', margin, 804, { align: 'center', width: contentWidth, characterSpacing: 2 });
  }
}

// =============================================================================
// TEMPLATE 08: THE GARDEN (Vintage Botanical Kraft Bistro)
// =============================================================================
function renderTheGarden(
  doc: PDFKit.PDFDocument,
  data: MenuPdfData,
  logoBuffer: Buffer | null,
  pageWidth: number,
  pageHeight: number
) {
  const bg = '#f6eedb';
  const margin = 32;
  const contentWidth = pageWidth - margin * 2;
  const espresso = '#292524';
  const mutedText = '#78716c';
  const curr = data.currency || '₹';

  const paintBg = () => {
    doc.save();
    doc.rect(0, 0, pageWidth, pageHeight).fill(bg);
    doc.rect(14, 14, pageWidth - 28, pageHeight - 28).lineWidth(1).strokeColor(espresso).stroke();
    doc.rect(17, 17, pageWidth - 34, pageHeight - 34).lineWidth(0.5).strokeColor('#a8a29e').stroke();
    // Vintage corner floral motif text
    doc.font('Helvetica').fontSize(10).fillColor(espresso);
    doc.text('❦', 22, 22);
    doc.text('❦', pageWidth - 32, 22);
    doc.text('❦', 22, pageHeight - 32);
    doc.text('❦', pageWidth - 32, pageHeight - 32);
    doc.restore();
  };

  doc.on('pageAdded', paintBg);
  paintBg();

  const centerX = pageWidth / 2;
  drawCenteredLogo(doc, logoBuffer, data.tenantName, centerX, 48, 25, '#ffffff', '#ffffff', espresso, 2);

  doc.y = 80;
  doc.font('Helvetica-Oblique').fontSize(9).fillColor(mutedText).text('THE', { align: 'center' });
  doc.font('Helvetica-Bold').fontSize(22).fillColor(espresso).text(data.tenantName.toUpperCase(), { align: 'center', characterSpacing: 2 });
  doc.font('Helvetica').fontSize(9).fillColor(espresso).text('BISTRO & BOTANICAL GARDEN', { align: 'center', characterSpacing: 1.5 });

  doc.moveDown(0.6);

  const colWidth = (contentWidth - 16) / 2;
  for (let cIdx = 0; cIdx < data.categories.length; cIdx += 2) {
    const catLeft = data.categories[cIdx];
    const catRight = data.categories[cIdx + 1];

    if (doc.y > 680) {
      doc.addPage();
      doc.y = margin + 15;
    }

    const rowStartY = doc.y;

    if (catLeft && catLeft.items.length > 0) {
      const leftX = margin + 4;
      doc.font('Helvetica-Bold').fontSize(10.5).fillColor(espresso).text(catLeft.name.toUpperCase(), leftX, rowStartY, { width: colWidth });
      doc.strokeColor(espresso).lineWidth(0.75).moveTo(leftX, rowStartY + 13).lineTo(leftX + colWidth, rowStartY + 13).stroke();

      let curY = rowStartY + 18;
      for (const item of catLeft.items) {
        doc.font('Helvetica-Bold').fontSize(9).fillColor(espresso).text(item.name, leftX, curY, { width: colWidth - 40 });
        const priceStr = formatItemPrice(item, curr);
        doc.font('Helvetica-Bold').fontSize(9).fillColor(espresso).text(priceStr, leftX + colWidth - 40, curY, { width: 40, align: 'right' });

        if (item.description) {
          doc.font('Helvetica-Oblique').fontSize(7.5).fillColor(mutedText).text(item.description, leftX, doc.y + 1, { width: colWidth });
        }
        curY = doc.y + 5;
      }
    }

    if (catRight && catRight.items.length > 0) {
      const rightX = margin + colWidth + 12;
      doc.font('Helvetica-Bold').fontSize(10.5).fillColor(espresso).text(catRight.name.toUpperCase(), rightX, rowStartY, { width: colWidth });
      doc.strokeColor(espresso).lineWidth(0.75).moveTo(rightX, rowStartY + 13).lineTo(rightX + colWidth, rowStartY + 13).stroke();

      let curY = rowStartY + 18;
      for (const item of catRight.items) {
        doc.font('Helvetica-Bold').fontSize(9).fillColor(espresso).text(item.name, rightX, curY, { width: colWidth - 40 });
        const priceStr = formatItemPrice(item, curr);
        doc.font('Helvetica-Bold').fontSize(9).fillColor(espresso).text(priceStr, rightX + colWidth - 40, curY, { width: 40, align: 'right' });

        if (item.description) {
          doc.font('Helvetica-Oblique').fontSize(7.5).fillColor(mutedText).text(item.description, rightX, doc.y + 1, { width: colWidth });
        }
        curY = doc.y + 5;
      }
    }

    doc.moveDown(1.3);
  }

  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.font('Helvetica-Oblique').fontSize(8).fillColor(espresso).text('ORGANIC • LOCALLY SOURCED • FRESH', margin, 804, { align: 'center', width: contentWidth });
  }
}

// =============================================================================
// TEMPLATE 09: KŌRI (Obsidian & Gold Asian Fusion)
// =============================================================================
function renderKoriAsian(
  doc: PDFKit.PDFDocument,
  data: MenuPdfData,
  logoBuffer: Buffer | null,
  pageWidth: number,
  pageHeight: number
) {
  const bg = '#09090b';
  const margin = 32;
  const contentWidth = pageWidth - margin * 2;
  const gold = '#fbbf24';
  const textWhite = '#ffffff';
  const textMuted = '#94a3b8';
  const curr = data.currency || '₹';

  const paintBg = () => {
    doc.save();
    doc.rect(0, 0, pageWidth, pageHeight).fill(bg);
    doc.rect(14, 14, pageWidth - 28, pageHeight - 28).lineWidth(1).strokeColor('#27272a').stroke();
    // Kanji accent on top right
    doc.font('Helvetica-Bold').fontSize(14).fillColor(gold).text('融合', pageWidth - 50, 26);
    doc.restore();
  };

  doc.on('pageAdded', paintBg);
  paintBg();

  const centerX = pageWidth / 2;
  drawCenteredLogo(doc, logoBuffer, data.tenantName, centerX, 48, 25, '#ffffff', '#18181b', textWhite, 2);

  doc.y = 80;
  doc.font('Helvetica-Bold').fontSize(22).fillColor(textWhite).text(data.tenantName.toUpperCase(), { align: 'center', characterSpacing: 4 });
  doc.font('Helvetica').fontSize(9).fillColor(gold).text('ASIAN FUSION CUISINE', { align: 'center', characterSpacing: 2 });

  doc.moveDown(0.6);

  const colWidth = (contentWidth - 16) / 2;
  for (let cIdx = 0; cIdx < data.categories.length; cIdx += 2) {
    const catLeft = data.categories[cIdx];
    const catRight = data.categories[cIdx + 1];

    if (doc.y > 680) {
      doc.addPage();
      doc.y = margin + 15;
    }

    const rowStartY = doc.y;

    if (catLeft && catLeft.items.length > 0) {
      const leftX = margin + 4;
      doc.font('Helvetica-Bold').fontSize(10.5).fillColor(gold).text(catLeft.name.toUpperCase(), leftX, rowStartY, { width: colWidth });
      doc.strokeColor(gold).lineWidth(1).moveTo(leftX, rowStartY + 13).lineTo(leftX + 70, rowStartY + 13).stroke();

      let curY = rowStartY + 18;
      for (const item of catLeft.items) {
        doc.font('Helvetica-Bold').fontSize(9).fillColor(textWhite).text(item.name, leftX, curY, { width: colWidth - 40 });
        const priceStr = formatItemPrice(item, curr);
        doc.font('Helvetica-Bold').fontSize(9).fillColor(gold).text(priceStr, leftX + colWidth - 40, curY, { width: 40, align: 'right' });

        if (item.description) {
          doc.font('Helvetica').fontSize(7.5).fillColor(textMuted).text(item.description, leftX, doc.y + 1, { width: colWidth });
        }
        curY = doc.y + 5;
      }
    }

    if (catRight && catRight.items.length > 0) {
      const rightX = margin + colWidth + 12;
      doc.font('Helvetica-Bold').fontSize(10.5).fillColor(gold).text(catRight.name.toUpperCase(), rightX, rowStartY, { width: colWidth });
      doc.strokeColor(gold).lineWidth(1).moveTo(rightX, rowStartY + 13).lineTo(rightX + 70, rowStartY + 13).stroke();

      let curY = rowStartY + 18;
      for (const item of catRight.items) {
        doc.font('Helvetica-Bold').fontSize(9).fillColor(textWhite).text(item.name, rightX, curY, { width: colWidth - 40 });
        const priceStr = formatItemPrice(item, curr);
        doc.font('Helvetica-Bold').fontSize(9).fillColor(gold).text(priceStr, rightX + colWidth - 40, curY, { width: 40, align: 'right' });

        if (item.description) {
          doc.font('Helvetica').fontSize(7.5).fillColor(textMuted).text(item.description, rightX, doc.y + 1, { width: colWidth });
        }
        curY = doc.y + 5;
      }
    }

    doc.moveDown(1.3);
  }

  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(textWhite).text('BOLD FLAVOURS • NEW HORIZONS', margin, 804, { align: 'center', width: contentWidth, characterSpacing: 2 });
  }
}

// =============================================================================
// TEMPLATE 10: GRAND CAFÉ (1928 Art Deco Parisian Vintage)
// =============================================================================
function renderGrandCafe(
  doc: PDFKit.PDFDocument,
  data: MenuPdfData,
  logoBuffer: Buffer | null,
  pageWidth: number,
  pageHeight: number
) {
  const bg = '#f8f2e4';
  const margin = 32;
  const contentWidth = pageWidth - margin * 2;
  const sepiaBrown = '#451a03';
  const textMuted = '#78350f';
  const curr = data.currency || '€';

  const paintBg = () => {
    doc.save();
    doc.rect(0, 0, pageWidth, pageHeight).fill(bg);
    // Art Deco geometric corner borders
    doc.rect(14, 14, pageWidth - 28, pageHeight - 28).lineWidth(1.5).strokeColor(sepiaBrown).stroke();
    doc.rect(18, 18, pageWidth - 36, pageHeight - 36).lineWidth(0.5).strokeColor(sepiaBrown).stroke();
    doc.restore();
  };

  doc.on('pageAdded', paintBg);
  paintBg();

  const centerX = pageWidth / 2;
  drawCenteredLogo(doc, logoBuffer, data.tenantName, centerX, 48, 25, '#ffffff', '#ffffff', sepiaBrown, 2);

  doc.y = 80;
  doc.font('Helvetica-Bold').fontSize(9).fillColor(sepiaBrown).text('EST. 1928', { align: 'center', characterSpacing: 2 });
  doc.font('Helvetica-Bold').fontSize(22).fillColor(sepiaBrown).text(data.tenantName.toUpperCase(), { align: 'center', characterSpacing: 3 });
  doc.font('Helvetica-Oblique').fontSize(8.5).fillColor(textMuted).text('CAFÉ • CUISINE • CONVERSATION', { align: 'center', characterSpacing: 1.5 });

  doc.moveDown(0.6);

  for (const cat of data.categories) {
    if (!cat.items || cat.items.length === 0) continue;

    if (doc.y > 690) {
      doc.addPage();
      doc.y = margin + 15;
    }

    doc.font('Helvetica-Bold').fontSize(11).fillColor(sepiaBrown).text(cat.name.toUpperCase(), { align: 'center', characterSpacing: 2 });
    doc.strokeColor(sepiaBrown).lineWidth(0.75).moveTo(centerX - 50, doc.y + 2).lineTo(centerX + 50, doc.y + 2).stroke();
    doc.y += 8;

    for (const item of cat.items) {
      if (doc.y > 730) {
        doc.addPage();
        doc.y = margin + 15;
      }

      const itemY = doc.y;
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(sepiaBrown).text(item.name, margin + 20, itemY, { width: contentWidth - 100 });
      const priceStr = formatItemPrice(item, curr);
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(sepiaBrown).text(priceStr, pageWidth - margin - 80, itemY, { width: 80, align: 'right' });

      if (item.description) {
        doc.font('Helvetica-Oblique').fontSize(8).fillColor(textMuted).text(item.description, margin + 20, doc.y + 1, { width: contentWidth - 100 });
      }

      doc.moveDown(0.35);
    }
    doc.moveDown(0.4);
  }

  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(sepiaBrown).text('❦  BON APPÉTIT  ❦', margin, 804, { align: 'center', width: contentWidth });
  }
}

// =============================================================================
// TEMPLATE 11: VINO & DOLCI (Terracotta Wine & Warm Burgundy)
// =============================================================================
function renderVinoDolci(
  doc: PDFKit.PDFDocument,
  data: MenuPdfData,
  logoBuffer: Buffer | null,
  pageWidth: number,
  pageHeight: number
) {
  const bg = '#5c1a15';
  const margin = 32;
  const contentWidth = pageWidth - margin * 2;
  const textWhite = '#fffbeb';
  const peachGold = '#fed7aa';
  const divider = '#7f1d1d';
  const curr = data.currency || '€';

  const paintBg = () => {
    doc.save();
    doc.rect(0, 0, pageWidth, pageHeight).fill(bg);
    doc.rect(14, 14, pageWidth - 28, pageHeight - 28).lineWidth(1).strokeColor(peachGold).stroke();
    doc.restore();
  };

  doc.on('pageAdded', paintBg);
  paintBg();

  const centerX = pageWidth / 2;
  drawCenteredLogo(doc, logoBuffer, data.tenantName, centerX, 48, 25, '#ffffff', '#7f1d1d', textWhite, 2);

  doc.y = 80;
  doc.font('Helvetica-Bold').fontSize(22).fillColor(textWhite).text(data.tenantName.toUpperCase(), { align: 'center', characterSpacing: 2 });
  doc.font('Helvetica').fontSize(9).fillColor(peachGold).text('A CURATED SELECTION OF WINES & DESSERTS', { align: 'center', characterSpacing: 1.5 });

  doc.moveDown(0.6);

  for (const cat of data.categories) {
    if (!cat.items || cat.items.length === 0) continue;

    if (doc.y > 690) {
      doc.addPage();
      doc.y = margin + 15;
    }

    doc.font('Helvetica-Bold').fontSize(11).fillColor(peachGold).text(cat.name.toUpperCase(), margin + 10, doc.y, { characterSpacing: 1.5 });
    doc.strokeColor(peachGold).lineWidth(0.75).moveTo(margin + 10, doc.y + 3).lineTo(pageWidth - margin - 10, doc.y + 3).stroke();
    doc.y += 8;

    for (const item of cat.items) {
      if (doc.y > 730) {
        doc.addPage();
        doc.y = margin + 15;
      }

      const itemY = doc.y;
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(textWhite).text(item.name, margin + 10, itemY, { width: contentWidth - 100 });
      const priceStr = formatItemPrice(item, curr);
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(peachGold).text(priceStr, pageWidth - margin - 80, itemY, { width: 80, align: 'right' });

      if (item.description) {
        doc.font('Helvetica-Oblique').fontSize(8).fillColor(peachGold).text(item.description, margin + 10, doc.y + 1, { width: contentWidth - 100 });
      }

      doc.moveDown(0.4);
    }
    doc.moveDown(0.4);
  }

  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.font('Helvetica').fontSize(7.5).fillColor(peachGold).text('FINE VINTAGES & ARTISAN PASTRY', margin, 804, { align: 'center', width: contentWidth, characterSpacing: 1 });
  }
}

// =============================================================================
// TEMPLATE 12: THE DAILY (Swiss Editorial Newspaper Grid)
// =============================================================================
function renderTheDaily(
  doc: PDFKit.PDFDocument,
  data: MenuPdfData,
  logoBuffer: Buffer | null,
  pageWidth: number,
  pageHeight: number
) {
  const bg = '#ffffff';
  const margin = 28;
  const contentWidth = pageWidth - margin * 2;
  const black = '#000000';
  const textMuted = '#52525b';
  const curr = data.currency || '₹';

  const paintBg = () => {
    doc.save();
    doc.rect(0, 0, pageWidth, pageHeight).fill(bg);
    // Heavy 2px black editorial outer frame
    doc.rect(12, 12, pageWidth - 24, pageHeight - 24).lineWidth(2).strokeColor(black).stroke();
    doc.restore();
  };

  doc.on('pageAdded', paintBg);
  paintBg();

  // Modern Newspaper Masthead
  doc.rect(margin, margin, contentWidth, 54).fillColor(black).fill();

  // Centered Logo with crisp white border
  const centerX = pageWidth / 2;
  drawCenteredLogo(doc, logoBuffer, data.tenantName, centerX, margin + 27, 20, '#ffffff', '#ffffff', black, 2);

  doc.font('Helvetica-Bold').fontSize(18).fillColor('#ffffff').text(data.tenantName.toUpperCase(), margin + 12, margin + 18, { width: contentWidth / 2 - 30 });
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff').text('ARTISAN BAKERY & KITCHEN\nBREAD • COFFEE • GOOD FOOD', centerX + 30, margin + 16, { width: contentWidth / 2 - 40, align: 'right' });

  doc.y = margin + 64;

  // 4-Quadrant Boxed Editorial Grid
  const colWidth = (contentWidth - 12) / 2;
  for (let cIdx = 0; cIdx < data.categories.length; cIdx += 2) {
    const catLeft = data.categories[cIdx];
    const catRight = data.categories[cIdx + 1];

    if (doc.y > 680) {
      doc.addPage();
      doc.y = margin + 15;
    }

    const rowStartY = doc.y;

    if (catLeft && catLeft.items.length > 0) {
      const leftX = margin;
      doc.rect(leftX, rowStartY, colWidth, 18).fillColor(black).fill();
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#ffffff').text(catLeft.name.toUpperCase(), leftX + 8, rowStartY + 4.5, { width: colWidth - 16 });

      let curY = rowStartY + 24;
      for (const item of catLeft.items) {
        doc.font('Helvetica-Bold').fontSize(9).fillColor(black).text(item.name, leftX + 4, curY, { width: colWidth - 40 });
        const priceStr = formatItemPrice(item, curr);
        doc.font('Helvetica-Bold').fontSize(9).fillColor(black).text(priceStr, leftX + colWidth - 40, curY, { width: 36, align: 'right' });

        if (item.description) {
          doc.font('Helvetica').fontSize(7.5).fillColor(textMuted).text(item.description, leftX + 4, doc.y + 1, { width: colWidth - 8 });
        }
        curY = doc.y + 5;
      }
    }

    if (catRight && catRight.items.length > 0) {
      const rightX = margin + colWidth + 12;
      doc.rect(rightX, rowStartY, colWidth, 18).fillColor(black).fill();
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#ffffff').text(catRight.name.toUpperCase(), rightX + 8, rowStartY + 4.5, { width: colWidth - 16 });

      let curY = rowStartY + 24;
      for (const item of catRight.items) {
        doc.font('Helvetica-Bold').fontSize(9).fillColor(black).text(item.name, rightX + 4, curY, { width: colWidth - 40 });
        const priceStr = formatItemPrice(item, curr);
        doc.font('Helvetica-Bold').fontSize(9).fillColor(black).text(priceStr, rightX + colWidth - 40, curY, { width: 36, align: 'right' });

        if (item.description) {
          doc.font('Helvetica').fontSize(7.5).fillColor(textMuted).text(item.description, rightX + 4, doc.y + 1, { width: colWidth - 8 });
        }
        curY = doc.y + 5;
      }
    }

    doc.moveDown(1.3);
  }

  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(black).text('GOOD BREAD  |  BETTER DAYS', margin, 804, { align: 'center', width: contentWidth, characterSpacing: 2 });
  }
}
