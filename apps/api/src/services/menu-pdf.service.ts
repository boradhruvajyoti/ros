// =============================================================================
// Restaurant Menu PDF Generator — Premium Redesign v2
// Beautiful A4 layout with category/subcategory grouping, variant price columns,
// FSSAI-standard Veg/Non-Veg/Egg/Vegan color indicators, spice levels, cover page.
// Strictly in-memory streaming — zero disk storage.
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
    parentId?: string | null;
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

// ── Color Palette ────────────────────────────────────────────────────────────
const C = {
  // Background layers
  pageBg:        '#0e0e11',   // Near-black page fill
  coverBg:       '#111116',   // Slightly warmer cover
  cardBg:        '#18181f',   // Dark card
  sectionBg:     '#1a1a22',   // Category header bg
  subSectionBg:  '#141419',   // Sub-category header bg
  rowAlt:        '#13131a',   // Alternating item row tint

  // Borders
  borderWeak:    '#2a2a35',   // Subtle divider
  borderStrong:  '#3a3a4a',   // Stronger border
  borderGold:    '#a07730',   // Gold accent border

  // Typography
  white:         '#ffffff',
  offWhite:      '#f0eee8',   // Warm parchment white
  muted:         '#8a8898',   // Slate muted text
  dimmed:        '#4a4a5a',   // Very dim accent

  // Accents
  gold:          '#e8a020',   // Warm gold heading
  goldLight:     '#f0c060',   // Highlight gold
  copper:        '#c8763a',   // Copper tint
  cream:         '#f5e6c8',   // Cream item text

  // Food type indicators (FSSAI standard colors)
  veg:           '#00a550',   // FSSAI green
  nonVeg:        '#e8220a',   // FSSAI red
  egg:           '#f59e0b',   // Amber (egg)
  vegan:         '#22d3ee',   // Cyan (vegan plant-based)

  // Spice
  spice1:        '#f97316',   // One chilli orange
  spice2:        '#ef4444',   // Two chilli red
  spice3:        '#b91c1c',   // Three chilli deep red
};

// ── Helpers ──────────────────────────────────────────────────────────────────

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
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(trimmed, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) return Buffer.from(await res.arrayBuffer());
    }
  } catch (e) {
    console.warn('[MenuPdf] Logo fetch failed, using monogram:', e);
  }
  return null;
}

function formatPrice(price: number, currency: string): string {
  if (price === 0) return `${currency}0`;
  // Format Indian style
  return `${currency}${Math.round(price).toLocaleString('en-IN')}`;
}

function foodTypeColor(type: string): string {
  switch (type) {
    case 'VEG':    return C.veg;
    case 'NON_VEG': return C.nonVeg;
    case 'EGG':    return C.egg;
    case 'VEGAN':  return C.vegan;
    default:       return C.veg;
  }
}

function foodTypeLabel(type: string): string {
  switch (type) {
    case 'VEG':    return 'VEG';
    case 'NON_VEG': return 'NON-VEG';
    case 'EGG':    return 'EGG';
    case 'VEGAN':  return 'VEGAN';
    default:       return 'VEG';
  }
}

function spiceLabel(level: string): string {
  switch (level) {
    case 'MILD':     return '🌶';
    case 'MEDIUM':   return '🌶🌶';
    case 'HOT':      return '🌶🌶🌶';
    case 'VERY_HOT': return '🌶🌶🌶🌶';
    default:         return '';
  }
}

// ── Main PDF Generator ───────────────────────────────────────────────────────

export class MenuPdfService {
  static async generateMenuPdf(data: MenuPdfData): Promise<Buffer> {
    const logoBuffer = await resolveLogoBuffer(data.logoUrl);
    const curr = data.currency || '₹';

    return new Promise((resolve, reject) => {
      const W = 595.28;   // A4 width (points at 72dpi)
      const H = 841.89;   // A4 height
      const ML = 38;      // Margin left
      const MR = 38;      // Margin right
      const MT = 36;      // Margin top
      const MB = 44;      // Margin bottom
      const CW = W - ML - MR;  // Content width

      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: MT, bottom: MB, left: ML, right: MR },
        bufferPages: true,
        autoFirstPage: true,
        info: {
          Title: `${data.tenantName} — À La Carte Menu`,
          Author: data.tenantName,
          Subject: 'Restaurant Menu',
          Keywords: 'menu, food, restaurant',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ── Page background painter ─────────────────────────────────────────
      const paintBg = (isCover = false) => {
        doc.save();
        doc.rect(0, 0, W, H).fill(isCover ? C.coverBg : C.pageBg);

        // Outer frame
        doc.rect(10, 10, W - 20, H - 20)
          .lineWidth(0.6).strokeColor(C.borderGold).stroke();

        // Inner hairline
        doc.rect(13, 13, W - 26, H - 26)
          .lineWidth(0.3).strokeColor(C.borderWeak).stroke();

        doc.restore();
      };

      // Paint first page background
      paintBg(true);

      doc.on('pageAdded', () => {
        paintBg(false);
      });

      // ────────────────────────────────────────────────────────────────────
      // COVER PAGE
      // ────────────────────────────────────────────────────────────────────

      const cx = W / 2;

      // Top gold rule
      doc.save()
        .strokeColor(C.gold).lineWidth(1)
        .moveTo(ML + 20, 30).lineTo(W - MR - 20, 30).stroke()
        .restore();

      // Logo circle
      const logoR = 40;
      const logoCY = 100;
      doc.save()
        .circle(cx, logoCY, logoR + 3).fillColor('#0d0d11').fill()
        .circle(cx, logoCY, logoR + 3).lineWidth(1.5).strokeColor(C.gold).stroke();

      let logoDrawn = false;
      if (logoBuffer) {
        try {
          doc.save();
          doc.circle(cx, logoCY, logoR - 1).clip();
          doc.image(logoBuffer, cx - logoR + 1, logoCY - logoR + 1, {
            width: (logoR - 1) * 2,
            height: (logoR - 1) * 2,
            fit: [(logoR - 1) * 2, (logoR - 1) * 2],
            align: 'center',
            valign: 'center',
          });
          doc.restore();
          logoDrawn = true;
        } catch {
          logoDrawn = false;
        }
      }

      if (!logoDrawn) {
        const initial = (data.tenantName || 'R').trim().charAt(0).toUpperCase();
        doc.font('Helvetica-Bold').fontSize(34).fillColor(C.gold)
          .text(initial, cx - 30, logoCY - 20, { width: 60, align: 'center' });
      }
      doc.restore();

      // Decorative dots left/right of logo
      [cx - 70, cx - 55, cx + 55, cx + 70].forEach((x, i) => {
        const r = i % 2 === 0 ? 2 : 1.2;
        doc.circle(x, logoCY, r).fillColor(C.gold).fill();
      });

      // Restaurant name
      doc.font('Helvetica-Bold').fontSize(24).fillColor(C.offWhite)
        .text(data.tenantName.toUpperCase(), ML, logoCY + logoR + 14, {
          width: CW,
          align: 'center',
          characterSpacing: 3,
        });

      // Gold hairline below name
      const nameBottomY = doc.y + 4;
      doc.save().strokeColor(C.gold).lineWidth(0.8)
        .moveTo(cx - 80, nameBottomY).lineTo(cx + 80, nameBottomY).stroke().restore();
      doc.y = nameBottomY + 6;

      // Tagline
      if (data.tagline?.trim()) {
        doc.font('Helvetica-Oblique').fontSize(10.5).fillColor(C.gold)
          .text(data.tagline.trim(), ML, doc.y, {
            width: CW, align: 'center', characterSpacing: 0.8,
          });
        doc.moveDown(0.2);
      }

      // Branch info box
      const branchParts: string[] = [];
      if (data.branchName) branchParts.push(data.branchName);
      if (data.branchAddress) branchParts.push(data.branchAddress);
      if (data.branchPhone) branchParts.push(`☎ ${data.branchPhone}`);

      if (branchParts.length > 0) {
        doc.moveDown(0.4);
        const infoStr = branchParts.join('   •   ');
        doc.font('Helvetica').fontSize(8).fillColor(C.muted)
          .text(infoStr, ML, doc.y, { width: CW, align: 'center' });
      }

      // "À LA CARTE MENU" banner
      doc.moveDown(0.9);
      const bannerY = doc.y;
      const bannerH = 28;

      doc.save()
        .rect(ML, bannerY, CW, bannerH)
        .fillColor(C.sectionBg).fill();
      doc.rect(ML, bannerY, CW, bannerH)
        .lineWidth(1).strokeColor(C.borderGold).stroke();
      doc.restore();

      // Gold left accent bar in banner
      doc.rect(ML, bannerY, 3, bannerH).fillColor(C.gold).fill();

      doc.font('Helvetica-Bold').fontSize(11).fillColor(C.gold)
        .text('À LA CARTE MENU', ML, bannerY + 8, {
          width: CW, align: 'center', characterSpacing: 3,
        });

      doc.y = bannerY + bannerH + 16;

      // ── Legend / Key ─────────────────────────────────────────────────────
      const legendItems: Array<{ color: string; label: string }> = [
        { color: C.veg,    label: 'Vegetarian' },
        { color: C.nonVeg, label: 'Non-Vegetarian' },
        { color: C.egg,    label: 'Egg / Contains Egg' },
        { color: C.vegan,  label: 'Vegan / Plant-Based' },
      ];

      const legendY = doc.y;
      const lItemW = CW / legendItems.length;

      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.muted)
        .text('DIETARY INDICATORS', ML, legendY, {
          width: CW, align: 'center', characterSpacing: 1,
        });

      const legendDotsY = legendY + 14;
      legendItems.forEach((li, i) => {
        const lx = ML + i * lItemW + lItemW / 2;
        const dotX = lx - 30;
        // FSSAI square with inner circle
        doc.rect(dotX, legendDotsY, 9, 9)
          .lineWidth(1.2).strokeColor(li.color).stroke();
        doc.circle(dotX + 4.5, legendDotsY + 4.5, 2.5)
          .fillColor(li.color).fill();
        doc.font('Helvetica').fontSize(7.5).fillColor(C.offWhite)
          .text(li.label, dotX + 13, legendDotsY + 1);
      });

      doc.y = legendDotsY + 18;

      // Spice level legend
      const spiceLegendY = doc.y + 4;
      const spiceItems = [
        { icon: '🌶',       label: 'Mild' },
        { icon: '🌶🌶',     label: 'Medium' },
        { icon: '🌶🌶🌶',   label: 'Hot' },
        { icon: '🌶🌶🌶🌶', label: 'Very Hot' },
      ];

      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.muted)
        .text('SPICE LEVELS', ML, spiceLegendY, {
          width: CW, align: 'center', characterSpacing: 1,
        });

      const spiceIconsY = spiceLegendY + 12;
      const sItemW = CW / spiceItems.length;
      spiceItems.forEach((si, i) => {
        const sx = ML + i * sItemW;
        doc.font('Helvetica').fontSize(8.5).fillColor(C.offWhite)
          .text(`${si.icon}  ${si.label}`, sx + 4, spiceIconsY, {
            width: sItemW - 8, align: 'center',
          });
      });

      doc.y = spiceIconsY + 22;

      // Gold divider
      doc.save().strokeColor(C.borderGold).lineWidth(0.5)
        .moveTo(ML, doc.y).lineTo(W - MR, doc.y).stroke().restore();

      // Summary stats row
      const parentCats = data.categories.filter(c => !c.parentId);
      const totalItems = data.categories.reduce((s, c) => s + c.items.length, 0);
      const vegCount = data.categories.reduce((s, c) =>
        s + c.items.filter(i => i.foodType === 'VEG' || i.foodType === 'VEGAN').length, 0);
      const nonVegCount = data.categories.reduce((s, c) =>
        s + c.items.filter(i => i.foodType === 'NON_VEG' || i.foodType === 'EGG').length, 0);

      const statsY = doc.y + 10;
      const statW = CW / 4;
      const stats = [
        { value: String(parentCats.length), label: 'Categories' },
        { value: String(totalItems), label: 'Dishes' },
        { value: String(vegCount), label: 'Veg Items' },
        { value: String(nonVegCount), label: 'Non-Veg Items' },
      ];

      stats.forEach((st, i) => {
        const sx = ML + i * statW;
        doc.font('Helvetica-Bold').fontSize(18).fillColor(C.gold)
          .text(st.value, sx, statsY, { width: statW, align: 'center' });
        doc.font('Helvetica').fontSize(7.5).fillColor(C.muted)
          .text(st.label.toUpperCase(), sx, statsY + 20, {
            width: statW, align: 'center', characterSpacing: 0.5,
          });
      });

      doc.y = statsY + 36;

      // Bottom gold rule on cover
      doc.save().strokeColor(C.gold).lineWidth(1)
        .moveTo(ML + 20, H - 30).lineTo(W - MR - 20, H - 30).stroke().restore();

      // Copyright note
      doc.font('Helvetica').fontSize(7).fillColor(C.dimmed)
        .text(
          `All prices are in ${curr} and are inclusive of applicable taxes. Subject to change without prior notice.`,
          ML, H - 26, { width: CW, align: 'center' }
        );

      // ────────────────────────────────────────────────────────────────────
      // CONTENT PAGES — Category / Subcategory structure
      // ────────────────────────────────────────────────────────────────────

      // Separate parents vs children
      const topLevelCategories = data.categories.filter(c => !c.parentId);
      const childCategories    = data.categories.filter(c => !!c.parentId);

      // Build parent → children map
      const childMap = new Map<string, typeof childCategories>();
      for (const child of childCategories) {
        const pid = child.parentId!;
        if (!childMap.has(pid)) childMap.set(pid, []);
        childMap.get(pid)!.push(child);
      }

      // For orphan items: add them directly under the parent category as well
      // We also include standalone categories without children

      const safeY = () => doc.y;

      const addNewPageIfNeeded = (neededHeight: number) => {
        if (safeY() + neededHeight > H - MB - 30) {
          doc.addPage();
          doc.y = MT + 10;
        }
      };

      const drawHorizontalRule = (y: number, color = C.borderWeak, weight = 0.4) => {
        doc.save().strokeColor(color).lineWidth(weight)
          .moveTo(ML, y).lineTo(W - MR, y).stroke().restore();
      };

      // ── Collect all unique variant names across the dataset ──────────────
      // We compute a global set of variant column headers
      // This makes prices align perfectly across all items
      // We allow up to 4 variant columns on one line
      const allVariantNames = new Set<string>();
      for (const cat of data.categories) {
        for (const item of cat.items) {
          for (const v of item.variants) {
            allVariantNames.add(v.name);
          }
        }
      }
      // Sort to put single-variant items first
      // We collect variant names per category/subcategory section instead
      // to avoid a 10-column table. Per-section we detect the variant set.

      const drawCategoryHeader = (catName: string, itemCount: number, isTop: boolean) => {
        addNewPageIfNeeded(32);
        const hy = safeY();
        const hh = isTop ? 26 : 20;
        const hFontSize = isTop ? 11 : 9.5;
        const hBg = isTop ? C.sectionBg : C.subSectionBg;
        const hText = isTop ? catName.toUpperCase() : catName.toUpperCase();
        const hTextColor = isTop ? C.gold : C.offWhite;
        const hBorderColor = isTop ? C.borderGold : C.borderStrong;

        // Background
        doc.rect(ML, hy, CW, hh).fillColor(hBg).fill();
        doc.rect(ML, hy, CW, hh).lineWidth(isTop ? 1 : 0.5)
          .strokeColor(hBorderColor).stroke();

        // Left accent bar
        doc.rect(ML, hy, isTop ? 4 : 2, hh).fillColor(isTop ? C.gold : C.copper).fill();

        // Category name
        const indent = ML + (isTop ? 12 : 8);
        doc.font('Helvetica-Bold').fontSize(hFontSize).fillColor(hTextColor)
          .text(hText, indent, hy + (hh - hFontSize) / 2, {
            characterSpacing: isTop ? 1.5 : 0.8,
          });

        // Item count badge (right side)
        const badge = `${itemCount} ${itemCount === 1 ? 'ITEM' : 'ITEMS'}`;
        doc.font('Helvetica-Bold').fontSize(7.5)
          .fillColor(isTop ? C.muted : C.dimmed)
          .text(badge, ML, hy + (hh - 7.5) / 2, {
            width: CW - 10, align: 'right',
          });

        doc.y = hy + hh + 4;
      };

      const drawVariantHeader = (variantNames: string[], nameColW: number) => {
        if (variantNames.length === 0) return;
        const headerY = safeY();
        const varColW = (CW - nameColW - 22) / Math.min(variantNames.length, 4);

        // Only draw if multiple variants
        if (variantNames.length > 1) {
          // Draw column labels
          variantNames.slice(0, 4).forEach((vName, i) => {
            const vx = ML + nameColW + 22 + i * varColW;
            doc.font('Helvetica-Bold').fontSize(7).fillColor(C.muted)
              .text(vName.toUpperCase(), vx, headerY, {
                width: varColW - 2, align: 'right', characterSpacing: 0.3,
              });
          });
          doc.y = headerY + 10;
          drawHorizontalRule(doc.y, C.borderStrong, 0.3);
          doc.y += 4;
        }
      };

      const drawItem = (
        item: typeof data['categories'][0]['items'][0],
        variantNames: string[],
        nameColW: number,
        rowIndex: number,
      ) => {
        const hasDesc = !!(item.description?.trim());
        const itemHeight = hasDesc ? 30 : 19;
        addNewPageIfNeeded(itemHeight + 6);

        const iy = safeY();
        const varColW = variantNames.length > 0
          ? (CW - nameColW - 22) / Math.min(variantNames.length, 4)
          : 80;

        // Alternating row tint
        if (rowIndex % 2 === 0) {
          doc.rect(ML, iy, CW, itemHeight).fillColor(C.rowAlt).fill();
        }

        // ── Food type FSSAI dot indicator ──────────────────────────────
        const ftColor = foodTypeColor(item.foodType);
        const dotX = ML + 4;
        const dotY = iy + 5;
        doc.rect(dotX, dotY, 9, 9).lineWidth(1.2).strokeColor(ftColor).stroke();
        doc.circle(dotX + 4.5, dotY + 4.5, 2.5).fillColor(ftColor).fill();

        // ── Dish name ─────────────────────────────────────────────────
        const textX = ML + 18;
        const maxNameW = nameColW - 18;

        doc.font('Helvetica-Bold').fontSize(9).fillColor(C.offWhite)
          .text(item.name, textX, iy + 4, {
            width: maxNameW,
            lineBreak: false,
            ellipsis: true,
          });

        // ── Spice indicator ───────────────────────────────────────────
        const spice = spiceLabel(item.spiceLevel);
        if (spice) {
          const nameWidth = doc.widthOfString(item.name);
          const spiceX = Math.min(textX + nameWidth + 4, textX + maxNameW - 30);
          doc.font('Helvetica').fontSize(7.5).fillColor(C.spice1)
            .text(spice, spiceX, iy + 5, { lineBreak: false });
        }

        // ── Description ───────────────────────────────────────────────
        if (hasDesc) {
          doc.font('Helvetica-Oblique').fontSize(7.5).fillColor(C.muted)
            .text(item.description!.trim(), textX, iy + 15, {
              width: maxNameW + 10, lineBreak: false, ellipsis: true,
            });
        }

        // ── Variant prices ────────────────────────────────────────────
        const vMap = new Map<string, number>();
        item.variants.forEach(v => vMap.set(v.name, v.price));

        if (variantNames.length === 1) {
          // Single price — right-aligned bold
          const price = item.variants[0]?.price ?? 0;
          const px = ML + nameColW + 22;
          doc.font('Helvetica-Bold').fontSize(9.5).fillColor(C.goldLight)
            .text(formatPrice(price, curr), px, iy + 4, {
              width: CW - nameColW - 22, align: 'right',
            });
        } else {
          // Multi-variant column prices
          variantNames.slice(0, 4).forEach((vName, i) => {
            const vx = ML + nameColW + 22 + i * varColW;
            const price = vMap.get(vName);
            const priceText = price !== undefined ? formatPrice(price, curr) : '—';
            const isMain = i === 0;
            doc.font(isMain ? 'Helvetica-Bold' : 'Helvetica')
              .fontSize(isMain ? 9 : 8.5)
              .fillColor(isMain ? C.goldLight : C.offWhite)
              .text(priceText, vx, iy + (hasDesc ? 8 : 4), {
                width: varColW - 2, align: 'right',
              });
          });
        }

        doc.y = iy + itemHeight;

        // Light hairline divider
        drawHorizontalRule(doc.y, C.borderWeak, 0.3);
        doc.y += 3;
      };

      // ── Render each top-level category as a section ──────────────────────────

      // Dynamic name column width: 55% of content width
      const NAME_COL = CW * 0.55;

      // Render sections
      const renderSection = (
        cat: typeof topLevelCategories[0],
        subCats: typeof childCategories,
      ) => {
        // Collect all items in this section (parent + all children)
        const allSectionItems = [
          ...cat.items,
          ...subCats.flatMap(sc => sc.items),
        ];
        if (allSectionItems.length === 0) return;

        addNewPageIfNeeded(80);
        doc.moveDown(0.5);

        // ── Parent category header ─────────────────────────────────────
        drawCategoryHeader(cat.name, allSectionItems.length, true);

        // Collect variant names for this entire section
        const sectionVariantSet = new Set<string>();
        allSectionItems.forEach(item =>
          item.variants.forEach(v => sectionVariantSet.add(v.name))
        );
        const sectionVariants = Array.from(sectionVariantSet);

        // Draw column headers for multi-variant sections
        if (sectionVariants.length > 1 && cat.items.length > 0) {
          drawVariantHeader(sectionVariants, NAME_COL);
        }

        // ── Items directly under parent (no subcategory) ───────────────
        if (cat.items.length > 0) {
          let rowIdx = 0;
          // If no subcategories, skip sub-header; else show sub-header
          if (subCats.length === 0) {
            // Draw variant column header
            if (sectionVariants.length > 1) {
              // already drawn above
            } else {
              drawVariantHeader(sectionVariants, NAME_COL);
            }
            for (const item of cat.items) {
              drawItem(item, sectionVariants, NAME_COL, rowIdx++);
            }
          } else {
            // Items in parent that belong to no sub-category
            if (cat.items.length > 0) {
              drawVariantHeader(sectionVariants, NAME_COL);
              for (const item of cat.items) {
                drawItem(item, sectionVariants, NAME_COL, rowIdx++);
              }
            }
          }
        }

        // ── Subcategories ──────────────────────────────────────────────
        for (const sub of subCats) {
          if (sub.items.length === 0) continue;

          addNewPageIfNeeded(36);
          doc.moveDown(0.3);
          drawCategoryHeader(sub.name, sub.items.length, false);

          // Sub-section variant names
          const subVariantSet = new Set<string>();
          sub.items.forEach(item => item.variants.forEach(v => subVariantSet.add(v.name)));
          const subVariants = Array.from(subVariantSet);

          drawVariantHeader(subVariants, NAME_COL);

          let subRowIdx = 0;
          for (const item of sub.items) {
            drawItem(item, subVariants, NAME_COL, subRowIdx++);
          }
        }

        doc.moveDown(0.6);
        // Section end gold rule
        const ruleY = safeY();
        if (ruleY < H - MB - 20) {
          doc.save()
            .strokeColor(C.borderGold).lineWidth(0.5)
            .moveTo(ML + 30, ruleY)
            .lineTo(W - MR - 30, ruleY).stroke().restore();
        }
      };

      // Render standalone child cats (parentId pointing to non-existent parent)
      const orphanChildren = childCategories.filter(
        c => !topLevelCategories.find(p => p.id === c.parentId)
      );

      for (const topCat of topLevelCategories) {
        const subCats = childMap.get(topCat.id) || [];
        renderSection(topCat, subCats);
      }

      // Render orphan children as standalone sections
      for (const orphan of orphanChildren) {
        renderSection({ ...orphan, parentId: null }, []);
      }

      // ── FOOTER on all pages ──────────────────────────────────────────────────
      const range = doc.bufferedPageRange();
      for (let pg = range.start; pg < range.start + range.count; pg++) {
        doc.switchToPage(pg);

        const fy = H - MB + 6;

        // Footer rule
        doc.save().strokeColor(C.borderWeak).lineWidth(0.4)
          .moveTo(ML, fy - 6).lineTo(W - MR, fy - 6).stroke().restore();

        // Left: restaurant name
        doc.font('Helvetica').fontSize(7).fillColor(C.dimmed)
          .text(data.tenantName, ML, fy, { width: CW / 3 });

        // Center: disclaimer
        doc.font('Helvetica').fontSize(7).fillColor(C.dimmed)
          .text('Prices & availability subject to change.', ML, fy, {
            width: CW, align: 'center',
          });

        // Right: page number
        doc.font('Helvetica-Bold').fontSize(7).fillColor(C.muted)
          .text(
            pg === range.start
              ? 'MENU'
              : `PAGE ${pg} OF ${range.count - 1}`,
            ML, fy, { width: CW, align: 'right', characterSpacing: 0.5 }
          );
      }

      doc.end();
    });
  }
}
