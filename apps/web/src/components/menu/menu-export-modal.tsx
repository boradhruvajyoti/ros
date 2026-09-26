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
}

export function MenuExportModal({ isOpen, onClose, restaurantName }: MenuExportModalProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('hudson');
  const [filterCategory, setFilterCategory] = useState<string>('all');
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

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-card border border-border/80 rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-5 sm:px-8 border-b border-border/70 flex items-center justify-between bg-muted/20">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                <Palette className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Export Restaurant Menu PDF
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Choose from 12 styles matching your restaurant ambiance · 300 DPI A4 Vector Print Ready · Zero Server Retention
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="px-5 sm:px-8 py-3 border-b border-border/40 bg-muted/10 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'all', label: 'All 12 Styles' },
              { id: 'dark', label: '🌙 Dark & Obsidian' },
              { id: 'light', label: '☀️ Light & Ivory' },
              { id: 'vintage', label: '📜 Vintage & Tuscan' },
              { id: 'tasting', label: '✨ Tasting & Minimalist' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setFilterCategory(cat.id)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border',
                  filterCategory === cat.id
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm font-bold'
                    : 'bg-card/80 border-border text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <span className="text-xs text-muted-foreground font-medium hidden sm:inline">
            Showing {filteredTemplates.length} templates
          </span>
        </div>

        {/* Templates Grid (Scrollable) */}
        <div className="p-5 sm:px-8 overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTemplates.map((template) => {
            const isSelected = selectedTemplateId === template.id;

            return (
              <div
                key={template.id}
                onClick={() => setSelectedTemplateId(template.id)}
                className={cn(
                  'group relative rounded-2xl border-2 p-3.5 flex flex-col justify-between cursor-pointer transition-all duration-200 overflow-hidden',
                  isSelected
                    ? 'border-primary ring-2 ring-primary/30 shadow-lg scale-[1.02] bg-primary/[0.02]'
                    : 'border-border/80 hover:border-border hover:shadow-md bg-card/60'
                )}
              >
                {/* Mini Preview Box */}
                <div
                  className="w-full h-36 rounded-xl border p-2.5 flex flex-col justify-between relative shadow-inner overflow-hidden"
                  style={{
                    backgroundColor: template.bgColor,
                    borderColor: template.borderColor,
                  }}
                >
                  {/* Top mini header */}
                  <div className="flex items-center justify-between">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border"
                      style={{
                        backgroundColor: template.bgColor,
                        color: template.textColor,
                        borderColor: template.borderColor,
                      }}
                    >
                      {template.name.charAt(0)}
                    </div>
                    <span
                      className="text-[9px] font-bold uppercase tracking-wider"
                      style={{ color: template.accentColor }}
                    >
                      {template.tag}
                    </span>
                  </div>

                  {/* Center sample title */}
                  <div className="text-center my-auto">
                    <div
                      className="text-xs font-bold tracking-wider uppercase truncate px-1"
                      style={{ color: template.textColor }}
                    >
                      {template.name}
                    </div>
                    <div
                      className="text-[9px] truncate px-1 opacity-80"
                      style={{ color: template.accentColor }}
                    >
                      {template.subtitle}
                    </div>
                  </div>

                  {/* Bottom mock items lines */}
                  <div className="space-y-1 opacity-70">
                    <div
                      className="h-1 rounded-full w-full"
                      style={{ backgroundColor: template.accentColor }}
                    />
                    <div className="flex justify-between items-center text-[8px] font-mono" style={{ color: template.textColor }}>
                      <span>Course Dish</span>
                      <span>₹250</span>
                    </div>
                  </div>

                  {/* Selection Badge */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground p-1 rounded-full shadow-md animate-in zoom-in">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </div>

                {/* Template Info Details */}
                <div className="mt-3 space-y-1.5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                        {template.icon}
                        {template.name}
                      </h4>
                      <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                        {template.tag}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                      {template.layoutDescription}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="truncate max-w-[150px] font-medium">{template.fontStyle}</span>
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-border shadow-xs shrink-0"
                      style={{ backgroundColor: template.bgColor }}
                      title={`Background: ${template.bgColor}`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 sm:px-8 border-t border-border/70 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Selected Style:</span>
            <span className="font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20 flex items-center gap-1.5">
              {selectedTemplate.icon}
              {selectedTemplate.name} ({selectedTemplate.tag})
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
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
