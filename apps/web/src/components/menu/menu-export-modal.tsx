'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  X,
  FileDown,
  Sparkles,
  Check,
  Palette,
  Eye,
  Layout,
  Crown,
  Coffee,
  Flame,
  Wine,
  Leaf,
  Layers,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiGet, apiDownloadFile } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export interface MenuTemplateThemeConfig {
  pageBg: string;
  cardBg: string;
  cardBorderColor: string;
  frameColor: string;
  innerFrameColor?: string;
  logoBorderColor: string;
  logoBgColor: string;
  textPrimary: string;
  textSecondary: string;
  textAccent: string;
  dividerColor: string;
  headerBannerStyle: string;
  fontFamilyHeader: string;
  fontFamilyBody: string;
  fontFamilyItalic: string;
  foodTypeColors: {
    veg: string;
    nonVeg: string;
    egg: string;
    vegan: string;
  };
}

export interface MenuTemplate {
  id: string;
  name: string;
  subtitle: string;
  category: 'dark' | 'light' | 'vintage' | 'luxury' | 'modern';
  layoutStyle: 'centered' | 'classic-boxed' | 'ornate-vintage' | 'modern-minimal' | 'two-column-look';
  badge: string;
  themeConfig: MenuTemplateThemeConfig;
  previewColors: {
    bg: string;
    card: string;
    text: string;
    accent: string;
    border: string;
  };
}

// Fallback initial templates in case API is loading
const FALLBACK_TEMPLATES: MenuTemplate[] = [
  {
    id: 'charcoal-noir',
    name: 'Charcoal Noir',
    subtitle: 'Deep charcoal background with pure white typography & amber accents',
    category: 'dark',
    layoutStyle: 'centered',
    badge: 'Popular',
    previewColors: { bg: '#121214', card: '#1c1c21', text: '#ffffff', accent: '#f59e0b', border: '#ffffff' },
    themeConfig: {
      pageBg: '#121214',
      cardBg: '#1c1c21',
      cardBorderColor: '#ffffff',
      frameColor: '#27272a',
      innerFrameColor: '#18181b',
      logoBorderColor: '#ffffff',
      logoBgColor: '#18181b',
      textPrimary: '#ffffff',
      textSecondary: '#94a3b8',
      textAccent: '#f59e0b',
      dividerColor: '#27272a',
      headerBannerStyle: 'outlined-card',
      fontFamilyHeader: 'Helvetica-Bold',
      fontFamilyBody: 'Helvetica',
      fontFamilyItalic: 'Helvetica-Oblique',
      foodTypeColors: { veg: '#22c55e', nonVeg: '#ef4444', egg: '#f59e0b', vegan: '#10b981' },
    },
  },
  {
    id: 'midnight-gold',
    name: 'Midnight Velvet & 24K Gold',
    subtitle: 'Opulent navy dusk with warm champagne gold borders & accents',
    category: 'luxury',
    layoutStyle: 'centered',
    badge: 'Luxury',
    previewColors: { bg: '#0a0e1a', card: '#12182b', text: '#fbf7ee', accent: '#dfb15b', border: '#dfb15b' },
    themeConfig: {
      pageBg: '#0a0e1a',
      cardBg: '#12182b',
      cardBorderColor: '#dfb15b',
      frameColor: '#dfb15b',
      innerFrameColor: '#253257',
      logoBorderColor: '#dfb15b',
      logoBgColor: '#12182b',
      textPrimary: '#fbf7ee',
      textSecondary: '#cbd5e1',
      textAccent: '#dfb15b',
      dividerColor: '#1e293b',
      headerBannerStyle: 'outlined-card',
      fontFamilyHeader: 'Helvetica-Bold',
      fontFamilyBody: 'Helvetica',
      fontFamilyItalic: 'Helvetica-Oblique',
      foodTypeColors: { veg: '#34d399', nonVeg: '#f87171', egg: '#fbbf24', vegan: '#2dd4bf' },
    },
  },
  {
    id: 'royal-emerald',
    name: 'Royal Emerald Bistro',
    subtitle: 'Deep forest botanical green with crisp pearl & mint accents',
    category: 'dark',
    layoutStyle: 'centered',
    badge: 'Bistro',
    previewColors: { bg: '#0c2419', card: '#133928', text: '#f0fdf4', accent: '#34d399', border: '#34d399' },
    themeConfig: {
      pageBg: '#0c2419',
      cardBg: '#133928',
      cardBorderColor: '#34d399',
      frameColor: '#1b4d36',
      innerFrameColor: '#0a1d14',
      logoBorderColor: '#ffffff',
      logoBgColor: '#133928',
      textPrimary: '#f0fdf4',
      textSecondary: '#a7f3d0',
      textAccent: '#fbbf24',
      dividerColor: '#194933',
      headerBannerStyle: 'outlined-card',
      fontFamilyHeader: 'Helvetica-Bold',
      fontFamilyBody: 'Helvetica',
      fontFamilyItalic: 'Helvetica-Oblique',
      foodTypeColors: { veg: '#4ade80', nonVeg: '#f87171', egg: '#fde047', vegan: '#2dd4bf' },
    },
  },
  {
    id: 'burgundy-vintage',
    name: 'Bordeaux & Grand Reserve',
    subtitle: 'Deep vintage wine burgundy with warm cream typography & classic serif',
    category: 'vintage',
    layoutStyle: 'ornate-vintage',
    badge: 'Vintage',
    previewColors: { bg: '#250a14', card: '#381220', text: '#fef3c7', accent: '#f59e0b', border: '#e2b755' },
    themeConfig: {
      pageBg: '#250a14',
      cardBg: '#381220',
      cardBorderColor: '#e2b755',
      frameColor: '#e2b755',
      innerFrameColor: '#4f1a2e',
      logoBorderColor: '#e2b755',
      logoBgColor: '#381220',
      textPrimary: '#fef3c7',
      textSecondary: '#fde68a',
      textAccent: '#e2b755',
      dividerColor: '#4f1a2e',
      headerBannerStyle: 'vintage-ornate',
      fontFamilyHeader: 'Times-Bold',
      fontFamilyBody: 'Times-Roman',
      fontFamilyItalic: 'Times-Italic',
      foodTypeColors: { veg: '#86efac', nonVeg: '#fca5a5', egg: '#fde047', vegan: '#5eead4' },
    },
  },
];

interface MenuExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantName?: string;
  tenantLogoUrl?: string | null;
  tagline?: string;
}

export function MenuExportModal({
  isOpen,
  onClose,
  tenantName = 'The Grand Pavilion',
  tenantLogoUrl,
  tagline = 'Fine Dining & Gastronomy',
}: MenuExportModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('charcoal-noir');
  const [isExporting, setIsExporting] = useState(false);

  // Fetch all 20+ templates from backend
  const { data: templatesData, isLoading } = useQuery<{ count: number; templates: MenuTemplate[] }>({
    queryKey: ['menu', 'templates'],
    queryFn: () => apiGet<{ count: number; templates: MenuTemplate[] }>('/menu/templates'),
    enabled: isOpen,
    staleTime: 1000 * 60 * 60, // 1 hour cache
  });

  const templates = templatesData?.templates || FALLBACK_TEMPLATES;
  const currentTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];
  const theme = currentTemplate.themeConfig;

  // Filter categories
  const categories = [
    { id: 'all', label: 'All Styles', count: templates.length },
    { id: 'dark', label: 'Dark & Noir', count: templates.filter((t) => t.category === 'dark').length },
    { id: 'luxury', label: 'Luxury & Gold', count: templates.filter((t) => t.category === 'luxury').length },
    { id: 'light', label: 'Light & Clean', count: templates.filter((t) => t.category === 'light').length },
    { id: 'vintage', label: 'Vintage & Heritage', count: templates.filter((t) => t.category === 'vintage').length },
    { id: 'modern', label: 'Modern & Vibrant', count: templates.filter((t) => t.category === 'modern').length },
  ];

  const filteredTemplates = templates.filter((t) => {
    if (selectedCategory === 'all') return true;
    return t.category === selectedCategory;
  });

  const handleDownloadPdf = async () => {
    setIsExporting(true);
    toast.info('Crafting PDF 📄', `Exporting with "${currentTemplate.name}" template (300 DPI A4)...`);

    try {
      const cleanName = tenantName.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `${cleanName}_Menu_${currentTemplate.id}.pdf`;
      await apiDownloadFile(`/menu/export-pdf?templateId=${currentTemplate.id}`, filename);
      toast.success('Menu Downloaded! 🎉', `Your menu in "${currentTemplate.name}" style is ready.`);
      onClose();
    } catch (err: any) {
      toast.error('Export Failed', err?.message || 'Could not export menu PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="bg-card text-card-foreground border border-border/70 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-foreground">Choose Menu PDF Template</h2>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold">
                  {templates.length} Styles Available
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Select your preferred theme, typography &amp; background layout. Ready to print in 300 DPI A4.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Split Layout */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-0">
          {/* Left Column: Template Filter & Selector List (7 cols) */}
          <div className="lg:col-span-7 flex flex-col border-r border-border/60 min-h-0">
            {/* Category Filter Tabs */}
            <div className="p-3 border-b border-border/50 bg-background/50 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5',
                    selectedCategory === cat.id
                      ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                      : 'bg-card text-muted-foreground hover:bg-accent hover:text-foreground border border-border/60'
                  )}
                >
                  <span>{cat.label}</span>
                  <span className="text-[10px] opacity-75">({cat.count})</span>
                </button>
              ))}
            </div>

            {/* Templates Grid List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar">
              {isLoading && (
                <div className="flex items-center justify-center py-12 text-sm text-muted-foreground gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" /> Loading templates...
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {filteredTemplates.map((template) => {
                  const isSelected = selectedTemplateId === template.id;
                  const p = template.previewColors;

                  return (
                    <div
                      key={template.id}
                      onClick={() => setSelectedTemplateId(template.id)}
                      className={cn(
                        'p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 text-left relative group',
                        isSelected
                          ? 'border-primary ring-2 ring-primary/40 bg-primary/[0.04] shadow-md'
                          : 'border-border/70 bg-card hover:border-border hover:bg-muted/30'
                      )}
                    >
                      {/* Top: Name & Badges */}
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                            {template.name}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 bg-muted/60 text-muted-foreground border-border">
                            {template.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1 leading-snug">
                          {template.subtitle}
                        </p>
                      </div>

                      {/* Bottom: Color Palette Swatches & Selection Status */}
                      <div className="flex items-center justify-between pt-2 border-t border-border/40">
                        {/* Swatches */}
                        <div className="flex items-center gap-1.5" title="Color palette preview">
                          <span
                            className="w-4 h-4 rounded-full border border-black/20 shadow-xs"
                            style={{ backgroundColor: p.bg }}
                          />
                          <span
                            className="w-4 h-4 rounded-full border border-black/20 shadow-xs"
                            style={{ backgroundColor: p.card }}
                          />
                          <span
                            className="w-4 h-4 rounded-full border border-black/20 shadow-xs"
                            style={{ backgroundColor: p.accent }}
                          />
                          <span
                            className="w-4 h-4 rounded-full border border-black/20 shadow-xs"
                            style={{ backgroundColor: p.border }}
                          />
                        </div>

                        {/* Selected Indicator */}
                        <div className="flex items-center gap-1">
                          {isSelected ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary">
                              <Check className="w-3.5 h-3.5" /> Selected
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground group-hover:text-foreground opacity-60">
                              Click to select
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Live Demo Preview (5 cols) */}
          <div className="lg:col-span-5 flex flex-col bg-muted/10 p-4 sm:p-5 overflow-y-auto min-h-0 custom-scrollbar">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Eye className="w-4 h-4 text-primary" /> Live Menu Design Preview
              </div>
              <Badge variant="outline" className="text-[10px] bg-background/80">
                A4 Vector Sharp
              </Badge>
            </div>

            {/* Rendered Live Menu Simulation Card */}
            <div
              className="flex-1 rounded-xl p-5 shadow-2xl transition-all duration-300 relative flex flex-col justify-between overflow-hidden"
              style={{
                backgroundColor: theme.pageBg,
                border: `2px solid ${theme.frameColor}`,
                color: theme.textPrimary,
                fontFamily: theme.fontFamilyBody.includes('Times') ? 'serif' : 'sans-serif',
              }}
            >
              {/* Inner Decorative Line */}
              <div
                className="absolute inset-1.5 pointer-events-none rounded-lg border opacity-60"
                style={{ borderColor: theme.innerFrameColor || theme.dividerColor }}
              />

              {/* Menu Header Simulation */}
              <div className="relative z-10 text-center space-y-2">
                {/* Centered Restaurant Logo with White/Gold Outline */}
                <div className="flex justify-center">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl shadow-md overflow-hidden relative"
                    style={{
                      backgroundColor: theme.logoBgColor || theme.cardBg,
                      border: `2.5px solid ${theme.logoBorderColor}`,
                      color: theme.textPrimary,
                    }}
                  >
                    {tenantLogoUrl ? (
                      <img
                        src={tenantLogoUrl}
                        alt="Logo"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{(tenantName || 'R').trim().charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                </div>

                {/* Restaurant Name */}
                <h3
                  className="text-base font-extrabold tracking-wider uppercase leading-tight"
                  style={{
                    color: theme.textPrimary,
                    fontFamily: theme.fontFamilyHeader.includes('Times') ? 'serif' : 'sans-serif',
                  }}
                >
                  {tenantName}
                </h3>

                {/* Tagline */}
                {tagline && (
                  <p
                    className="text-[10px] italic tracking-wide -mt-1"
                    style={{ color: theme.textAccent }}
                  >
                    {tagline}
                  </p>
                )}

                {/* Title Banner */}
                <div className="flex items-center justify-center gap-2 pt-1">
                  <div className="h-[1px] flex-1" style={{ backgroundColor: theme.dividerColor }} />
                  <span
                    className="text-[9px] font-bold tracking-widest uppercase px-1"
                    style={{ color: theme.textPrimary }}
                  >
                    À LA CARTE MENU
                  </span>
                  <div className="h-[1px] flex-1" style={{ backgroundColor: theme.dividerColor }} />
                </div>
              </div>

              {/* Demo Menu Content */}
              <div className="relative z-10 space-y-3 my-3">
                {/* Category Header Bar */}
                <div
                  className="px-3 py-1.5 rounded-md flex items-center justify-between text-xs font-bold uppercase tracking-wider"
                  style={{
                    backgroundColor: theme.cardBg,
                    border: `1px solid ${theme.cardBorderColor}`,
                    color:
                      theme.headerBannerStyle === 'solid-card' && theme.cardBg === '#000000' && theme.pageBg === '#ffffff'
                        ? '#ffffff'
                        : theme.textPrimary,
                  }}
                >
                  <span>Chef's Signature Dishes</span>
                  <span className="text-[10px]" style={{ color: theme.textAccent }}>
                    3 DISHES
                  </span>
                </div>

                {/* Demo Dishes */}
                <div className="space-y-2 text-xs">
                  {/* Item 1: Truffle Risotto */}
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-bold">
                        <span
                          className="w-2.5 h-2.5 rounded-xs border flex items-center justify-center shrink-0"
                          style={{ borderColor: theme.foodTypeColors.veg }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: theme.foodTypeColors.veg }}
                          />
                        </span>
                        <span style={{ color: theme.textPrimary }}>Signature Truffle Risotto</span>
                      </div>
                      <span className="font-bold font-mono text-xs" style={{ color: theme.textPrimary }}>
                        ₹ 520.00
                      </span>
                    </div>
                    <p className="text-[10px] pl-4 italic leading-tight" style={{ color: theme.textSecondary }}>
                      Arborio rice, porcini dust, aged parmesan, black truffle oil
                    </p>
                    <div className="h-[0.5px] w-full pt-1" style={{ borderBottom: `0.5px solid ${theme.dividerColor}` }} />
                  </div>

                  {/* Item 2: Charred Angus Ribeye Steak */}
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-bold">
                        <span
                          className="w-2.5 h-2.5 rounded-xs border flex items-center justify-center shrink-0"
                          style={{ borderColor: theme.foodTypeColors.nonVeg }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: theme.foodTypeColors.nonVeg }}
                          />
                        </span>
                        <span style={{ color: theme.textPrimary }}>Charred Angus Ribeye</span>
                        <span className="text-[8px] font-bold text-orange-400 bg-orange-400/10 px-1 py-0.2 rounded">
                          🌶️ SPICY
                        </span>
                      </div>
                      <span className="font-bold font-mono text-[10px]" style={{ color: theme.textPrimary }}>
                        Half: ₹650 | Full: ₹1180
                      </span>
                    </div>
                    <p className="text-[10px] pl-4 italic leading-tight" style={{ color: theme.textSecondary }}>
                      Rosemary garlic butter, smoked pepper glaze, charred asparagus
                    </p>
                    <div className="h-[0.5px] w-full pt-1" style={{ borderBottom: `0.5px solid ${theme.dividerColor}` }} />
                  </div>

                  {/* Item 3: Golden Saffron Kulfi */}
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-bold">
                        <span
                          className="w-2.5 h-2.5 rounded-xs border flex items-center justify-center shrink-0"
                          style={{ borderColor: theme.foodTypeColors.egg }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: theme.foodTypeColors.egg }}
                          />
                        </span>
                        <span style={{ color: theme.textPrimary }}>Saffron Pistachio Kulfi</span>
                      </div>
                      <span className="font-bold font-mono text-xs" style={{ color: theme.textPrimary }}>
                        ₹ 240.00
                      </span>
                    </div>
                    <p className="text-[10px] pl-4 italic leading-tight" style={{ color: theme.textSecondary }}>
                      Slow-churned rabri, Kashmiri saffron, crushed roasted nuts
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer Simulation */}
              <div
                className="relative z-10 pt-2 flex items-center justify-between text-[9px]"
                style={{
                  borderTop: `0.5px solid ${theme.dividerColor}`,
                  color: theme.textSecondary,
                }}
              >
                <span>All items freshly prepared to order.</span>
                <span className="font-bold" style={{ color: theme.textPrimary }}>
                  PAGE 1 OF 3
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border/60 bg-muted/20 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Selected Style:</span>
            <span className="text-xs font-bold text-foreground">{currentTemplate.name}</span>
            <Badge variant="outline" className="text-[10px] capitalize">
              {currentTemplate.category}
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={onClose} disabled={isExporting}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 font-semibold shadow-md px-5"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4" />
                  Export Menu ({currentTemplate.name})
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
