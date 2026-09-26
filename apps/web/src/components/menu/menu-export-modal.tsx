'use client';

import React, { useState } from 'react';
import {
  FileDown,
  X,
  Check,
  Sparkles,
  Palette,
  Loader2,
  Utensils,
  Wine,
  Coffee,
  Flame,
  Globe,
  Feather,
  Eye,
  LayoutGrid,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiDownloadFile } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export interface MenuTemplateOption {
  id: string;
  name: string;
  subtitle: string;
  category: 'dark' | 'light' | 'tasting' | 'vintage';
  bgColor: string;
  textColor: string;
  accentColor: string;
  borderColor: string;
  fontStyle: string;
  layoutDescription: string;
  tag: string;
  icon: React.ReactNode;
}

export const MENU_TEMPLATES: MenuTemplateOption[] = [
  {
    id: 'reverie',
    name: 'The Reverie',
    subtitle: 'Modern Minimalist Ivory Tasting',
    category: 'light',
    bgColor: '#f6f4ee',
    textColor: '#1c1917',
    accentColor: '#556b2f',
    borderColor: '#d6d3c9',
    fontStyle: 'Serif / Minimalist Sans',
    layoutDescription: 'Single column numbered courses (01–05), olive botanical accents, clean spacing.',
    tag: 'Tasting Menu',
    icon: <Feather className="w-4 h-4 text-emerald-700" />,
  },
  {
    id: 'lumiere',
    name: 'Café Lumière',
    subtitle: 'Midnight & Gold Parisian Brasserie',
    category: 'dark',
    bgColor: '#0f0f12',
    textColor: '#ffffff',
    accentColor: '#eab308',
    borderColor: '#eab308',
    fontStyle: 'French Brasserie / Fleur-de-lis',
    layoutDescription: 'Dual column Entrées/Plats with gold double borders, bottom boxed Desserts section.',
    tag: 'Parisian Luxe',
    icon: <Sparkles className="w-4 h-4 text-yellow-500" />,
  },
  {
    id: 'omakase',
    name: 'Omakase Tokyo',
    subtitle: 'Japanese Rice Paper & Vermillion Seal',
    category: 'light',
    bgColor: '#f5f0e6',
    textColor: '#18181b',
    accentColor: '#dc2626',
    borderColor: '#dc2626',
    fontStyle: 'Japanese Minimalist / Hanko Seal',
    layoutDescription: 'Vertical Kanji accents, vermillion seal stamp, numbered courses with plus notes.',
    tag: 'Japanese Zen',
    icon: <Globe className="w-4 h-4 text-red-500" />,
  },
  {
    id: 'bellini',
    name: 'Trattoria Bellini',
    subtitle: 'Rustic Tuscan Wine & Cream Parchment',
    category: 'vintage',
    bgColor: '#fdfbf7',
    textColor: '#1c1917',
    accentColor: '#881337',
    borderColor: '#881337',
    fontStyle: 'Tuscan Serif / Italian Vines',
    layoutDescription: '2x2 Quadrant Grid: Antipasti, Pasta, Secondi, Dolci with rich burgundy headings.',
    tag: 'Italian Classic',
    icon: <Utensils className="w-4 h-4 text-rose-800" />,
  },
  {
    id: 'azure',
    name: 'Azure',
    subtitle: 'Mediterranean Coastal Cyan & Sky',
    category: 'light',
    bgColor: '#eaf3fa',
    textColor: '#0f172a',
    accentColor: '#0369a1',
    borderColor: '#0284c7',
    fontStyle: 'Coastal Sans / Oceanic Clean',
    layoutDescription: 'Numbered section bars (01 Mezze, 02 Sea, 03 Land, 04 To Share) with Aegean divider lines.',
    tag: 'Mediterranean',
    icon: <Globe className="w-4 h-4 text-sky-500" />,
  },
  {
    id: 'hudson',
    name: 'The Hudson',
    subtitle: 'Chalkboard Charcoal & Steakhouse Grill',
    category: 'dark',
    bgColor: '#121214',
    textColor: '#ffffff',
    accentColor: '#f59e0b',
    borderColor: '#ffffff',
    fontStyle: 'Industrial Bold Condensed / Slate',
    layoutDescription: 'Charcoal black background, centered white-ring logo, bold white underline category bars.',
    tag: 'Bar & Grill',
    icon: <Flame className="w-4 h-4 text-amber-500" />,
  },
  {
    id: 'arima',
    name: 'Arima',
    subtitle: 'Basque Raw Limestone & Stone Tasting',
    category: 'tasting',
    bgColor: '#dedede',
    textColor: '#111827',
    accentColor: '#4b5563',
    borderColor: '#9ca3af',
    fontStyle: 'Modern Architectural High-Contrast Serif',
    layoutDescription: 'Cool architectural grey limestone, wide-spaced course numbers (Txikiteo 01, Itsaso 02).',
    tag: 'Basque Modern',
    icon: <Utensils className="w-4 h-4 text-zinc-700" />,
  },
  {
    id: 'garden',
    name: 'The Garden',
    subtitle: 'Vintage Botanical Kraft Bistro',
    category: 'vintage',
    bgColor: '#f6eedb',
    textColor: '#292524',
    accentColor: '#78716c',
    borderColor: '#292524',
    fontStyle: 'Antique Botanical / Floral Flourish',
    layoutDescription: 'Vintage kraft paper with hand-drawn leaf corner motifs, 2-column balanced bistro menu.',
    tag: 'Organic Bistro',
    icon: <Feather className="w-4 h-4 text-stone-700" />,
  },
  {
    id: 'kori',
    name: 'Kōri',
    subtitle: 'Obsidian & Imperial Gold Asian Fusion',
    category: 'dark',
    bgColor: '#09090b',
    textColor: '#ffffff',
    accentColor: '#fbbf24',
    borderColor: '#fbbf24',
    fontStyle: 'Obsidian Gold / Kanji Seal',
    layoutDescription: 'Deep pitch-black obsidian backdrop, imperial gold category rules, white dish titles.',
    tag: 'Asian Fusion',
    icon: <Sparkles className="w-4 h-4 text-amber-400" />,
  },
  {
    id: 'grand_cafe',
    name: 'Grand Café 1928',
    subtitle: 'Art Deco Parisian Vintage & Sepia',
    category: 'vintage',
    bgColor: '#f8f2e4',
    textColor: '#451a03',
    accentColor: '#78350f',
    borderColor: '#451a03',
    fontStyle: '1928 Art Deco / Geometric Double Frame',
    layoutDescription: 'Aged French café parchment, geometric art deco border, classic centered French course layout.',
    tag: 'Art Deco 1928',
    icon: <Coffee className="w-4 h-4 text-amber-900" />,
  },
  {
    id: 'vino_dolci',
    name: 'Vino & Dolci',
    subtitle: 'Terracotta Wine & Warm Burgundy',
    category: 'dark',
    bgColor: '#5c1a15',
    textColor: '#fffbeb',
    accentColor: '#fed7aa',
    borderColor: '#fed7aa',
    fontStyle: 'Italian Vineyard Serif / Peach Gold',
    layoutDescription: 'Deep rustic terracotta wine background, peach-gold headers, glass/bottle dual pricing format.',
    tag: 'Wine & Desserts',
    icon: <Wine className="w-4 h-4 text-rose-300" />,
  },
  {
    id: 'daily',
    name: 'The Daily',
    subtitle: 'Swiss Modern Editorial Newspaper Grid',
    category: 'light',
    bgColor: '#ffffff',
    textColor: '#000000',
    accentColor: '#000000',
    borderColor: '#000000',
    fontStyle: 'Swiss Editorial / 2px Heavy Black Grid',
    layoutDescription: 'High-contrast newspaper masthead, 4 distinct quadrant boxes (Bakery, All Day, Coffee, Sweets).',
    tag: 'Editorial Grid',
    icon: <Coffee className="w-4 h-4 text-black" />,
  },
];

interface MenuExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantName?: string;
  tenant?: any;
  categories?: any[];
  items?: any[];
}

export function MenuExportModal({
  isOpen,
  onClose,
  restaurantName,
  tenant,
  categories = [],
  items = [],
}: MenuExportModalProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('hudson');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [mobileTab, setMobileTab] = useState<'templates' | 'preview'>('templates');
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen) return null;

  const filteredTemplates = MENU_TEMPLATES.filter((tpl) => {
    if (filterCategory === 'all') return true;
    return tpl.category === filterCategory;
  });

  const selectedTemplate = MENU_TEMPLATES.find((t) => t.id === selectedTemplateId) || MENU_TEMPLATES[0];

  const handleDownload = async () => {
    setIsDownloading(true);
    toast.info(
      'Exporting Menu PDF 📄',
      `Generating "${selectedTemplate.name}" template in 300 DPI A4 vector quality...`
    );

    try {
      const fileName = `${(restaurantName || 'Restaurant').replace(/[^a-zA-Z0-9_-]/g, '_')}_Menu_${selectedTemplate.id}.pdf`;
      await apiDownloadFile(`/menu/export-pdf?template=${selectedTemplate.id}`, fileName);
      toast.success(
        'Download Complete! 🎉',
        `Exported "${selectedTemplate.name}" menu PDF directly to your device with zero server storage.`
      );
      onClose();
    } catch (err: any) {
      toast.error('Export Error', err?.response?.data?.error?.message || err?.message || 'Could not export menu PDF.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Prepare display categories & items for live preview
  const displayCategories = categories.length > 0
    ? categories
        .filter((c) => !c.parentId)
        .slice(0, 4)
        .map((cat) => ({
          ...cat,
          displayItems: items
            .filter((i) => i.categoryId === cat.id || i.category?.id === cat.id)
            .slice(0, 4),
        }))
        .filter((c) => c.displayItems.length > 0)
    : [
        {
          id: '1',
          name: 'Starters & Appetizers',
          displayItems: [
            { id: '1', name: 'Truffle Herb Fries', price: 280, description: 'Hand-cut russet potatoes, parmesan, truffle oil' },
            { id: '2', name: 'Burrata Caprese Salad', price: 420, description: 'Heirloom tomatoes, fresh basil, aged balsamic glaze' },
          ],
        },
        {
          id: '2',
          name: 'Main Courses',
          displayItems: [
            { id: '3', name: 'Wild Mushroom Risotto', price: 540, description: 'Arborio rice, porcini mushrooms, parmigiano reggiano' },
            { id: '4', name: 'Pan-Seared Sea Bass', price: 680, description: 'Citrus beurre blanc, braised baby vegetables' },
          ],
        },
      ];

  const brandName = tenant?.name || restaurantName || 'The Reverie';
  const logoUrl = tenant?.logoUrl;
  let tagline = 'Fine Dining & Hospitality';
  try {
    const parsed = typeof tenant?.settings === 'string' ? JSON.parse(tenant.settings) : (tenant?.settings || {});
    if (parsed?.tagline) tagline = parsed.tagline;
  } catch {}

  const currencySymbol = '₹';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 lg:p-6 animate-in fade-in duration-200">
      <div className="bg-card border border-border/80 rounded-2xl sm:rounded-3xl max-w-6xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Top Header */}
        <div className="p-4 sm:px-6 border-b border-border/70 flex items-center justify-between bg-muted/20 shrink-0">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
                <Palette className="w-4 h-4" />
              </span>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                Export Restaurant Menu PDF
              </h2>
            </div>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Choose from 12 distinct styles · Live 300 DPI A4 Vector Print Preview · Zero Server Storage
            </p>
          </div>

          {/* Mobile Tab Switcher */}
          <div className="flex items-center gap-2">
            <div className="flex lg:hidden items-center bg-muted p-0.5 rounded-xl border border-border">
              <button
                onClick={() => setMobileTab('templates')}
                className={cn(
                  'px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1',
                  mobileTab === 'templates' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'
                )}
              >
                <LayoutGrid className="w-3.5 h-3.5" /> Styles
              </button>
              <button
                onClick={() => setMobileTab('preview')}
                className={cn(
                  'px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1',
                  mobileTab === 'preview' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'
                )}
              >
                <Eye className="w-3.5 h-3.5" /> Preview
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Two-Column Split (Left: Template Picker, Right: Live Menu Preview) */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
          
          {/* LEFT COLUMN: Template Selector */}
          <div
            className={cn(
              'w-full lg:w-[480px] xl:w-[500px] border-r border-border/70 flex flex-col bg-card shrink-0 overflow-hidden',
              mobileTab === 'preview' ? 'hidden lg:flex' : 'flex'
            )}
          >
            {/* Category Filter Pills */}
            <div className="p-3 sm:px-4 border-b border-border/50 bg-muted/10 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
              {[
                { id: 'all', label: 'All 12' },
                { id: 'dark', label: '🌙 Dark' },
                { id: 'light', label: '☀️ Light' },
                { id: 'vintage', label: '📜 Vintage' },
                { id: 'tasting', label: '✨ Tasting' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setFilterCategory(cat.id)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border shrink-0',
                    filterCategory === cat.id
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs font-bold'
                      : 'bg-card/80 border-border text-muted-foreground hover:text-foreground hover:bg-accent'
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Template Cards Grid */}
            <div className="p-3 sm:p-4 overflow-y-auto flex-1 grid grid-cols-2 gap-2.5">
              {filteredTemplates.map((template) => {
                const isSelected = selectedTemplateId === template.id;

                return (
                  <div
                    key={template.id}
                    onClick={() => {
                      setSelectedTemplateId(template.id);
                      if (window.innerWidth < 1024) {
                        setMobileTab('preview');
                      }
                    }}
                    className={cn(
                      'group relative rounded-xl border-2 p-2.5 flex flex-col justify-between cursor-pointer transition-all duration-150 overflow-hidden min-w-0',
                      isSelected
                        ? 'border-primary ring-2 ring-primary/30 shadow-md bg-primary/[0.03]'
                        : 'border-border/80 hover:border-border hover:shadow-xs bg-card/60'
                    )}
                  >
                    {/* Mini Swatch Box */}
                    <div
                      className="w-full h-20 rounded-lg border p-2 flex flex-col justify-between relative shadow-inner overflow-hidden shrink-0"
                      style={{
                        backgroundColor: template.bgColor,
                        borderColor: template.borderColor,
                      }}
                    >
                      <div className="flex items-center justify-between min-w-0">
                        <div
                          className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold border shrink-0"
                          style={{
                            backgroundColor: template.bgColor,
                            color: template.textColor,
                            borderColor: template.borderColor,
                          }}
                        >
                          {template.name.charAt(0)}
                        </div>
                        <span
                          className="text-[8px] font-bold uppercase tracking-wider truncate pl-1"
                          style={{ color: template.accentColor }}
                        >
                          {template.tag}
                        </span>
                      </div>

                      <div className="text-center my-auto min-w-0">
                        <div
                          className="text-[11px] font-bold tracking-wider uppercase truncate px-1"
                          style={{ color: template.textColor }}
                        >
                          {template.name}
                        </div>
                        <div
                          className="text-[8px] truncate px-1 opacity-80"
                          style={{ color: template.accentColor }}
                        >
                          {template.subtitle}
                        </div>
                      </div>

                      <div
                        className="h-0.5 rounded-full w-full opacity-60"
                        style={{ backgroundColor: template.accentColor }}
                      />

                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 bg-primary text-primary-foreground p-0.5 rounded-full shadow-md">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    {/* Template Details */}
                    <div className="mt-2 space-y-0.5 min-w-0 flex-1 flex flex-col justify-between">
                      <div className="flex items-center justify-between gap-1 min-w-0">
                        <span className="text-xs font-bold text-foreground truncate">
                          {template.name}
                        </span>
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-border shrink-0"
                          style={{ backgroundColor: template.bgColor }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate leading-tight">
                        {template.fontStyle}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT COLUMN: Live Menu Preview Panel */}
          <div
            className={cn(
              'flex-1 flex flex-col bg-muted/30 overflow-hidden min-w-0',
              mobileTab === 'templates' ? 'hidden lg:flex' : 'flex'
            )}
          >
            {/* Preview Sub-bar */}
            <div className="px-4 py-2.5 border-b border-border/50 bg-card/60 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20 shrink-0">
                  <Eye className="w-3.5 h-3.5" /> Live A4 Preview
                </span>
                <span className="text-xs font-semibold text-foreground truncate">
                  {selectedTemplate.name} · {selectedTemplate.subtitle}
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground font-mono shrink-0 hidden sm:inline">
                Vector 300 DPI
              </span>
            </div>

            {/* A4 Document Preview Canvas (Scrollable without text overflow) */}
            <div className="flex-1 p-3 sm:p-5 overflow-y-auto flex items-center justify-center min-w-0">
              <div
                className="w-full max-w-[500px] shadow-2xl rounded-xl p-5 sm:p-7 transition-all duration-200 relative flex flex-col justify-between overflow-hidden border"
                style={{
                  backgroundColor: selectedTemplate.bgColor,
                  color: selectedTemplate.textColor,
                  borderColor: selectedTemplate.borderColor,
                  minHeight: '560px',
                }}
              >
                {/* Decorative Frame Line */}
                <div
                  className="absolute inset-2.5 rounded-lg border pointer-events-none opacity-40"
                  style={{ borderColor: selectedTemplate.borderColor }}
                />

                {/* Inner Header Section */}
                <div className="text-center space-y-1 relative z-10 shrink-0">
                  {/* Centered Restaurant Logo with Outline */}
                  <div className="flex justify-center mb-2">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center shadow-sm relative overflow-hidden border-2"
                      style={{
                        backgroundColor: selectedTemplate.bgColor,
                        borderColor: selectedTemplate.id === 'hudson' || selectedTemplate.id === 'lumiere' ? '#ffffff' : selectedTemplate.borderColor,
                      }}
                    >
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt={brandName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span
                          className="text-base font-bold font-serif"
                          style={{ color: selectedTemplate.textColor }}
                        >
                          {brandName.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Template Special Header Flourishes */}
                  {selectedTemplate.id === 'reverie' && (
                    <div className="text-[9px] uppercase tracking-widest font-semibold opacity-75" style={{ color: selectedTemplate.accentColor }}>
                      THE
                    </div>
                  )}

                  {selectedTemplate.id === 'omakase' && (
                    <div className="text-[10px] font-bold text-red-600 tracking-widest mb-0.5">
                      東 京 • TOKYO
                    </div>
                  )}

                  {selectedTemplate.id === 'grand_cafe' && (
                    <div className="text-[9px] font-bold uppercase tracking-widest opacity-80" style={{ color: selectedTemplate.accentColor }}>
                      EST. 1928
                    </div>
                  )}

                  {/* Restaurant Name */}
                  <h3
                    className="text-base sm:text-lg font-bold tracking-wider uppercase truncate px-2"
                    style={{ color: selectedTemplate.textColor }}
                  >
                    {brandName}
                  </h3>

                  {/* Subtitle / Tagline */}
                  <p
                    className="text-[10px] sm:text-[11px] italic truncate px-4 opacity-85"
                    style={{ color: selectedTemplate.accentColor }}
                  >
                    {tagline}
                  </p>

                  {/* Title Banner Divider */}
                  <div className="pt-2 flex items-center justify-center gap-2">
                    <div
                      className="h-px w-10 sm:w-16 opacity-50"
                      style={{ backgroundColor: selectedTemplate.accentColor }}
                    />
                    <span
                      className="text-[9px] font-bold tracking-widest uppercase"
                      style={{ color: selectedTemplate.textColor }}
                    >
                      {selectedTemplate.id === 'omakase'
                        ? 'お任せ • OMAKASE'
                        : selectedTemplate.id === 'vino_dolci'
                        ? 'WINES & DESSERTS'
                        : 'À LA CARTE MENU'}
                    </span>
                    <div
                      className="h-px w-10 sm:w-16 opacity-50"
                      style={{ backgroundColor: selectedTemplate.accentColor }}
                    />
                  </div>
                </div>

                {/* Categories & Dishes (Rendered cleanly without text overflow) */}
                <div className="space-y-4 my-4 flex-1 relative z-10 overflow-hidden">
                  {displayCategories.map((cat: any, cIdx: number) => (
                    <div key={cat.id || cIdx} className="space-y-1.5 overflow-hidden">
                      {/* Category Header */}
                      <div
                        className="py-1 px-2 rounded flex items-center justify-between overflow-hidden"
                        style={{
                          backgroundColor:
                            selectedTemplate.category === 'dark' ? '#1c1c21' : 'rgba(0,0,0,0.03)',
                          borderBottom: `1px solid ${selectedTemplate.borderColor}`,
                        }}
                      >
                        <span
                          className="text-[11px] font-bold uppercase tracking-wider truncate pr-2"
                          style={{ color: selectedTemplate.textColor }}
                        >
                          {selectedTemplate.id === 'reverie' || selectedTemplate.id === 'omakase' || selectedTemplate.id === 'azure'
                            ? `0${cIdx + 1}  ${cat.name}`
                            : cat.name}
                        </span>
                        <span
                          className="text-[9px] font-bold shrink-0 opacity-75"
                          style={{ color: selectedTemplate.accentColor }}
                        >
                          {cat.displayItems?.length || 2} ITEMS
                        </span>
                      </div>

                      {/* Item Rows */}
                      <div className="space-y-2 pt-0.5 overflow-hidden">
                        {(cat.displayItems || []).map((item: any, iIdx: number) => {
                          const itemPrice = item.variants?.[0]?.price || item.price || 250;
                          return (
                            <div key={item.id || iIdx} className="text-xs space-y-0.5 overflow-hidden">
                              <div className="flex items-baseline justify-between gap-2 overflow-hidden">
                                <span
                                  className="font-semibold truncate text-[11px]"
                                  style={{ color: selectedTemplate.textColor }}
                                >
                                  {item.name}
                                </span>
                                <span
                                  className="font-bold font-mono text-[11px] shrink-0"
                                  style={{ color: selectedTemplate.accentColor }}
                                >
                                  {currencySymbol}{itemPrice}
                                </span>
                              </div>
                              {item.description && (
                                <p
                                  className="text-[9.5px] italic line-clamp-1 opacity-70 leading-tight"
                                  style={{ color: selectedTemplate.textColor }}
                                >
                                  {item.description}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer Section */}
                <div
                  className="pt-2 border-t text-center space-y-0.5 relative z-10 shrink-0 opacity-80"
                  style={{ borderColor: selectedTemplate.borderColor }}
                >
                  <p
                    className="text-[8.5px] font-medium tracking-wider uppercase truncate"
                    style={{ color: selectedTemplate.textColor }}
                  >
                    {selectedTemplate.id === 'reverie'
                      ? 'SIMPLE INGREDIENTS • EXTRAORDINARY MOMENTS'
                      : selectedTemplate.id === 'lumiere'
                      ? 'BON APPÉTIT • LUXE & SAVEUR'
                      : selectedTemplate.id === 'omakase'
                      ? 'A SEASONAL JOURNEY THROUGH JAPAN'
                      : selectedTemplate.id === 'bellini'
                      ? 'BUON APPETITO • PASSIONE ITALIANA'
                      : selectedTemplate.id === 'azure'
                      ? 'GOOD FOOD • BRIGHTER DAYS'
                      : selectedTemplate.id === 'arima'
                      ? 'PEOPLE • PLACE • FLAVOUR'
                      : selectedTemplate.id === 'garden'
                      ? 'ORGANIC • LOCALLY SOURCED • FRESH'
                      : selectedTemplate.id === 'kori'
                      ? 'BOLD FLAVOURS • NEW HORIZONS'
                      : selectedTemplate.id === 'grand_cafe'
                      ? '❦  BON APPÉTIT  ❦'
                      : selectedTemplate.id === 'vino_dolci'
                      ? 'FINE VINTAGES & ARTISAN PASTRY'
                      : selectedTemplate.id === 'daily'
                      ? 'GOOD BREAD  |  BETTER DAYS'
                      : 'ALL ITEMS FRESHLY PREPARED TO ORDER'}
                  </p>
                  <p className="text-[7.5px] opacity-60">
                    PAGE 1 OF 1 · A4 PRINT READY
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Controls */}
        <div className="p-3 sm:px-6 border-t border-border/70 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
            <span className="font-semibold text-foreground shrink-0">Selected:</span>
            <span className="font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20 flex items-center gap-1.5 truncate">
              {selectedTemplate.icon}
              <span className="truncate">{selectedTemplate.name} ({selectedTemplate.tag})</span>
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isDownloading}
              className="flex-1 sm:flex-none cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex-1 sm:flex-none gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md px-6 cursor-pointer"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4" />
                  Download Menu PDF (A4)
                </>
              )}
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
