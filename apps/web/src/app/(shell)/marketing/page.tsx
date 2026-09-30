'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Tag, Percent, Plus, Gift, Clock, Send, CheckCircle2,
  Sparkles, Megaphone, Users, ArrowUpRight, Calendar,
  UtensilsCrossed, Layers, Flame, Coffee, Check, Trash2,
  Power, Copy, HelpCircle, ShieldCheck, QrCode, Sliders,
  Printer, FileText, Scissors
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@ros/utils';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { printHtmlInSameTab } from '@/lib/print-utils';
import { cn } from '@/lib/utils';

export interface PromotionCampaign {
  id: string;
  tenantId?: string;
  name: string;
  code: string;
  type: 'LIMITED_TIME_COUPON' | 'BILL_THRESHOLD' | 'ITEM_COMBO_COMPLIMENTARY' | 'CUSTOM_DISCOUNT';
  discountType?: 'PERCENTAGE' | 'FLAT';
  discountValue?: number;
  minOrderValue?: number;
  maxDiscount?: number | null;
  validFrom: string;
  validTo: string;
  rewardType?: 'DISCOUNT' | 'COMPLIMENTARY_ITEM';
  complementaryItemId?: string;
  complementaryItemName?: string;
  complementaryItemQuantity?: number;
  triggerItems?: Array<{ menuItemId: string; name: string; quantity: number }>;
  customPresets?: {
    percentages: number[];
    flatAmounts: number[];
    reasons: string[];
  };
  autoApply?: boolean;
  highlightOnQrMenu?: boolean;
  status: 'ACTIVE' | 'PAUSED';
  redemptions: number;
  totalSavings: number;
  createdAt?: string;
}

type PromoTypeTab = 'ALL' | 'LIMITED_TIME_COUPON' | 'BILL_THRESHOLD' | 'ITEM_COMBO_COMPLIMENTARY' | 'CUSTOM_DISCOUNT';

export default function MarketingPage() {
  const queryClient = useQueryClient();
  const [activeTypeTab, setActiveTypeTab] = useState<PromoTypeTab>('ALL');
  const [showNewModal, setShowNewModal] = useState(false);
  const [broadcastLog, setBroadcastLog] = useState<string | null>(null);

  // Form State
  const [formType, setFormType] = useState<PromotionCampaign['type']>('LIMITED_TIME_COUPON');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FLAT'>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState('20');
  const [minOrderValue, setMinOrderValue] = useState('499');
  const [maxDiscount, setMaxDiscount] = useState('200');
  const [validFrom, setValidFrom] = useState(() => new Date().toISOString().split('T')[0]);
  const [validTo, setValidTo] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  
  // Bill Threshold specific
  const [thresholdRewardType, setThresholdRewardType] = useState<'DISCOUNT' | 'COMPLIMENTARY_ITEM'>('COMPLIMENTARY_ITEM');
  const [thresholdFreeItem, setThresholdFreeItem] = useState('Signature Chocolate Brownie');
  
  // Combo rule specific
  const [triggerItemInputs, setTriggerItemInputs] = useState<string[]>(['Burger', 'Pizza']);
  const [comboFreeItem, setComboFreeItem] = useState('Fresh Brewed Coffee');
  
  // Custom Discount Presets
  const [customReasons, setCustomReasons] = useState('Owner Courtesy, VIP Guest, Customer Delight / Delay, Staff Meal');
  const [customPercents, setCustomPercents] = useState('5, 10, 15, 20');
  const [customFlats, setCustomFlats] = useState('50, 100, 150, 200');

  // Fetch Menu Categories & Items to populate item pickers
  const { data: menuCategories = [] } = useQuery<any[]>({
    queryKey: ['menu-categories-promos'],
    queryFn: async () => {
      try {
        const res = await apiGet<any[]>('/menu/categories');
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  const allMenuItems = useMemo(() => {
    const items: Array<{ id: string; name: string; categoryName: string; price: number }> = [];
    menuCategories.forEach((cat: any) => {
      (cat.items || []).forEach((item: any) => {
        items.push({
          id: item.id,
          name: item.name,
          categoryName: cat.name,
          price: Number(item.variants?.[0]?.price || 0),
        });
      });
    });
    return items;
  }, [menuCategories]);

  // Fetch Current Tenant for Printable Cards Branding
  const { data: tenant } = useQuery({
    queryKey: ['current-tenant'],
    queryFn: () => apiGet<any>('/tenants/current'),
    staleTime: 1000 * 60 * 10,
  });

  // Fetch Campaigns
  const { data: campaigns = [], isLoading } = useQuery<PromotionCampaign[]>({
    queryKey: ['marketing-promotions'],
    queryFn: async () => {
      try {
        const res = await apiGet<PromotionCampaign[]>('/marketing/promotions');
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  // Printable Coupon Cards State
  const [printCouponModal, setPrintCouponModal] = useState<PromotionCampaign | null>(null);
  const [printCardCount, setPrintCardCount] = useState<number>(8);

  const handleGenerateAndPrintCouponPdf = (camp: PromotionCampaign, count: number) => {
    const restaurantName = tenant?.name || 'Restaurant OS';
    const rawAddress = tenant?.address || tenant?.branches?.[0]?.address || 'Main Branch, City Center';
    const rawPhone = tenant?.phone || tenant?.branches?.[0]?.phone || '+1 (555) 019-2834';
    const logoUrl = tenant?.logoUrl || '';

    const totalCards = Math.max(1, count);
    const cardsPerPage = 8;
    const totalPages = Math.ceil(totalCards / cardsPerPage);

    const discountText = camp.discountType === 'PERCENTAGE'
      ? `${camp.discountValue}% OFF`
      : `₹${camp.discountValue} FLAT OFF`;

    const conditionText = [
      camp.minOrderValue ? `Min Spend: ₹${camp.minOrderValue}` : 'No Min Spend',
      camp.maxDiscount ? `Max Cap: ₹${camp.maxDiscount}` : null,
    ].filter(Boolean).join(' • ');

    const validFromFormatted = camp.validFrom ? camp.validFrom.split('T')[0] : 'Today';
    const validToFormatted = camp.validTo ? camp.validTo.split('T')[0] : 'End of Month';

    // Build pages
    let pagesHtml = '';
    let cardsRemaining = totalCards;

    for (let p = 0; p < totalPages; p++) {
      const cardsInThisPage = Math.min(cardsPerPage, cardsRemaining);
      cardsRemaining -= cardsInThisPage;

      let cardsHtml = '';
      for (let c = 0; c < cardsInThisPage; c++) {
        cardsHtml += `
          <div class="coupon-card">
            <div class="cut-corner-mark cut-tl">✂</div>
            <div class="card-header">
              <div class="brand-left">
                ${logoUrl ? `<img src="${logoUrl}" class="brand-logo" alt="Logo" />` : `<div class="logo-fallback">🍽️</div>`}
                <div>
                  <div class="restaurant-name">${restaurantName}</div>
                  <div class="restaurant-contact">${rawAddress} • Tel: ${rawPhone}</div>
                </div>
              </div>
              <div class="badge-tag">EXCLUSIVE VOUCHER</div>
            </div>

            <div class="offer-row">
              <div class="discount-badge">${discountText}</div>
              <div class="offer-conditions">
                <div class="condition-bold">${conditionText}</div>
                <div class="applicable-text">Valid on Dine-In & Takeaway Orders</div>
              </div>
            </div>

            <div class="code-cutout-container">
              <div class="scissors-line">
                <span>✂ CUT & PRESENT AT BILLING</span>
              </div>
              <div class="code-box">
                <div class="code-label">PROMO CODE</div>
                <div class="code-text">${camp.code}</div>
              </div>
            </div>

            <div class="card-footer">
              <div class="validity-badge">
                <strong>VALIDITY:</strong> ${validFromFormatted} to ${validToFormatted}
              </div>
              <div class="terms-note">*Single use per bill. T&C apply.</div>
            </div>
          </div>
        `;
      }

      pagesHtml += `<div class="a4-page">${cardsHtml}</div>`;
    }

    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Printable Coupons - ${camp.code}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 8mm 6mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            color: #0f172a;
          }
          .a4-page {
            width: 100%;
            height: 281mm;
            max-height: 281mm;
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            grid-template-rows: repeat(4, 1fr);
            gap: 3.5mm;
            page-break-after: always;
            page-break-inside: avoid;
            box-sizing: border-box;
            background: #ffffff;
          }
          .a4-page:last-child {
            page-break-after: auto;
          }
          .coupon-card {
            border: 1.5px dashed #64748b;
            border-radius: 8px;
            padding: 8px 10px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            background: #ffffff;
            position: relative;
            box-sizing: border-box;
            overflow: hidden;
          }
          .cut-corner-mark {
            position: absolute;
            font-size: 8px;
            color: #94a3b8;
            line-height: 1;
          }
          .cut-tl { top: 2px; right: 4px; }
          .card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 4px;
            gap: 6px;
          }
          .brand-left {
            display: flex;
            align-items: center;
            gap: 6px;
            overflow: hidden;
          }
          .brand-logo {
            width: 24px;
            height: 24px;
            object-fit: contain;
            border-radius: 4px;
          }
          .logo-fallback {
            font-size: 16px;
            line-height: 1;
          }
          .restaurant-name {
            font-size: 11px;
            font-weight: 900;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 155px;
          }
          .restaurant-contact {
            font-size: 7px;
            color: #64748b;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 155px;
          }
          .badge-tag {
            font-size: 6.5px;
            font-weight: 800;
            background: #f1f5f9;
            color: #475569;
            padding: 2px 5px;
            border-radius: 4px;
            white-space: nowrap;
            letter-spacing: 0.5px;
            border: 0.5px solid #cbd5e1;
          }
          .offer-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 6px;
            margin: 3px 0;
          }
          .discount-badge {
            font-size: 16px;
            font-weight: 900;
            color: #d97706;
            letter-spacing: -0.3px;
            line-height: 1;
          }
          .offer-conditions {
            text-align: right;
          }
          .condition-bold {
            font-size: 8px;
            font-weight: 800;
            color: #1e293b;
          }
          .applicable-text {
            font-size: 7px;
            color: #64748b;
          }
          .code-cutout-container {
            background: #fffbeb;
            border: 1.2px dashed #f59e0b;
            border-radius: 6px;
            padding: 4px 6px;
            margin: 2px 0;
          }
          .scissors-line {
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 6.5px;
            font-weight: 800;
            color: #b45309;
            letter-spacing: 0.5px;
            margin-bottom: 2px;
          }
          .code-box {
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .code-label {
            font-size: 7px;
            font-weight: 800;
            color: #92400e;
            letter-spacing: 0.5px;
          }
          .code-text {
            font-family: 'Courier New', Courier, monospace;
            font-size: 14px;
            font-weight: 900;
            color: #b45309;
            letter-spacing: 1.5px;
          }
          .card-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-top: 1px solid #f1f5f9;
            padding-top: 3px;
            font-size: 7px;
            color: #64748b;
          }
          .validity-badge {
            color: #0f172a;
          }
          .validity-badge strong {
            color: #d97706;
          }
          .terms-note {
            font-style: italic;
          }
        </style>
      </head>
      <body>
        ${pagesHtml}
      </body>
      </html>
    `;

    printHtmlInSameTab(fullHtml);
    toast.success('Print Dialog Opened', `Prepared ${totalCards} printable coupon cards across ${totalPages} A4 sheet(s).`);
  };

  // Toggle Status Mutation
  const toggleStatusMutation = useMutation({
    mutationFn: (id: string) => apiPatch(`/marketing/promotions/${id}/status`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-promotions'] });
      toast.success('Status Updated', 'Campaign active status has been updated.');
    },
  });

  // Delete Campaign Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/marketing/promotions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-promotions'] });
      toast.success('Promotion Removed', 'The promotion offer was deleted.');
    },
  });

  // Create Campaign Mutation
  const createMutation = useMutation({
    mutationFn: (payload: any) => apiPost('/marketing/promotions', payload),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['marketing-promotions'] });
      setShowNewModal(false);
      resetForm();
      toast.success('Promotion Launched! 🎉', `"${data.name}" is now live and highlighted on the QR menu.`);
    },
    onError: (err: any) => {
      toast.error('Creation Failed', err?.response?.data?.error?.message || err?.message || 'Could not create campaign.');
    }
  });

  const resetForm = () => {
    setName('');
    setCode('');
    setDiscountValue('20');
    setMinOrderValue('499');
    setMaxDiscount('200');
    setTriggerItemInputs(['Burger', 'Pizza']);
  };

  const handleBroadcast = (campaignName: string) => {
    setBroadcastLog(`📱 WhatsApp & SMS Promo blast dispatched to diners for "${campaignName}"!`);
    setTimeout(() => setBroadcastLog(null), 6000);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Required', 'Please enter a campaign name.');
      return;
    }

    let payload: any = {
      name: name.trim(),
      type: formType,
      validFrom,
      validTo,
      highlightOnQrMenu: true,
    };

    if (formType === 'LIMITED_TIME_COUPON') {
      if (!code.trim()) {
        toast.error('Required', 'Please enter a coupon code.');
        return;
      }
      payload.code = code.trim().toUpperCase();
      payload.discountType = discountType;
      payload.discountValue = parseFloat(discountValue) || 0;
      payload.minOrderValue = parseFloat(minOrderValue) || 0;
      payload.maxDiscount = maxDiscount ? parseFloat(maxDiscount) : null;
      payload.autoApply = false;
    } else if (formType === 'BILL_THRESHOLD') {
      payload.code = code.trim() ? code.trim().toUpperCase() : `AUTO-SPEND${minOrderValue}`;
      payload.minOrderValue = parseFloat(minOrderValue) || 1000;
      payload.rewardType = thresholdRewardType;
      payload.autoApply = true;
      if (thresholdRewardType === 'DISCOUNT') {
        payload.discountType = discountType;
        payload.discountValue = parseFloat(discountValue) || 0;
      } else {
        payload.complementaryItemName = thresholdFreeItem;
        payload.complementaryItemQuantity = 1;
      }
    } else if (formType === 'ITEM_COMBO_COMPLIMENTARY') {
      payload.code = code.trim() ? code.trim().toUpperCase() : `COMBO-FREE-${Date.now().toString().slice(-4)}`;
      payload.rewardType = 'COMPLIMENTARY_ITEM';
      payload.complementaryItemName = comboFreeItem;
      payload.complementaryItemQuantity = 1;
      payload.triggerItems = triggerItemInputs.filter(Boolean).map(t => ({
        menuItemId: `item-${t.toLowerCase().replace(/\s+/g, '-')}`,
        name: t,
        quantity: 1,
      }));
      payload.autoApply = true;
    } else if (formType === 'CUSTOM_DISCOUNT') {
      payload.code = 'CUSTOM-BILLING-PRESETS';
      payload.customPresets = {
        percentages: customPercents.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n)),
        flatAmounts: customFlats.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n)),
        reasons: customReasons.split(',').map(s => s.trim()).filter(Boolean),
      };
      payload.autoApply = false;
      payload.highlightOnQrMenu = false;
    }

    createMutation.mutate(payload);
  };

  const filteredCampaigns = useMemo(() => {
    if (activeTypeTab === 'ALL') return campaigns;
    return campaigns.filter(c => c.type === activeTypeTab);
  }, [campaigns, activeTypeTab]);

  const totalRedemptions = campaigns.reduce((acc, c) => acc + (c.redemptions || 0), 0);
  const totalSavings = campaigns.reduce((acc, c) => acc + (c.totalSavings || 0), 0);
  const activeCount = campaigns.filter(c => c.status === 'ACTIVE').length;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card/60 p-5 rounded-3xl border border-border backdrop-blur-sm">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Tag className="w-6 h-6 text-primary" />
            Promotions, Coupons &amp; Discount Rules
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Create limited-time coupons, auto-applied bill threshold rewards, combo freebies, and cashier billing discounts
          </p>
        </div>
        <Button onClick={() => setShowNewModal(true)} className="gap-2 font-bold rounded-2xl h-10 px-4 shadow-md shadow-primary/20">
          <Plus className="w-4 h-4" />
          Create Promo Offer
        </Button>
      </div>

      {/* ── Broadcast Alert Banner ── */}
      {broadcastLog && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2 shadow-sm animate-in slide-in-from-top duration-200">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {broadcastLog}
        </div>
      )}

      {/* ── Key Metrics ── */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl border border-border bg-card/60 backdrop-blur">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Total Redemptions</p>
            <Tag className="w-4 h-4 text-primary opacity-60" />
          </div>
          <p className="text-2xl font-black text-foreground font-mono mt-2">{totalRedemptions}</p>
          <p className="text-[11px] text-muted-foreground mt-1">Claims across POS &amp; QR Standee</p>
        </div>

        <div className="p-5 rounded-3xl border border-border bg-card/60 backdrop-blur">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Active Campaigns</p>
            <Sparkles className="w-4 h-4 text-emerald-400 opacity-60" />
          </div>
          <p className="text-2xl font-black text-primary font-mono mt-2">{activeCount} of {campaigns.length}</p>
          <p className="text-[11px] text-muted-foreground mt-1">Live automated discount rules</p>
        </div>

        <div className="p-5 rounded-3xl border border-border bg-card/60 backdrop-blur">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Customer Savings</p>
            <Percent className="w-4 h-4 text-emerald-500 opacity-60" />
          </div>
          <p className="text-2xl font-black text-emerald-500 font-mono mt-2">{formatCurrency(totalSavings)}</p>
          <p className="text-[11px] text-muted-foreground mt-1">Total discounts &amp; freebies value</p>
        </div>

        <div className="p-5 rounded-3xl border border-border bg-card/60 backdrop-blur">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">QR Menu Standee</p>
            <QrCode className="w-4 h-4 text-primary opacity-60" />
          </div>
          <p className="text-2xl font-black text-foreground mt-2">Active Sync</p>
          <p className="text-[11px] text-muted-foreground mt-1">Highlighted on guest scans</p>
        </div>
      </div>

      {/* ── Type Switcher Tabs ── */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTypeTab('ALL')}
          className={cn(
            'px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer border',
            activeTypeTab === 'ALL'
              ? 'bg-foreground text-background border-transparent shadow-xs'
              : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/40'
          )}
        >
          All Offers ({campaigns.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTypeTab('LIMITED_TIME_COUPON')}
          className={cn(
            'px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 border',
            activeTypeTab === 'LIMITED_TIME_COUPON'
              ? 'bg-primary text-primary-foreground border-transparent shadow-xs'
              : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/40'
          )}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>1. Limited-Time Coupons</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTypeTab('BILL_THRESHOLD')}
          className={cn(
            'px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 border',
            activeTypeTab === 'BILL_THRESHOLD'
              ? 'bg-emerald-600 text-white border-transparent shadow-xs'
              : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/40'
          )}
        >
          <Gift className="w-3.5 h-3.5" />
          <span>2. Bill Threshold Auto-Offers</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTypeTab('ITEM_COMBO_COMPLIMENTARY')}
          className={cn(
            'px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 border',
            activeTypeTab === 'ITEM_COMBO_COMPLIMENTARY'
              ? 'bg-amber-600 text-white border-transparent shadow-xs'
              : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/40'
          )}
        >
          <Coffee className="w-3.5 h-3.5" />
          <span>3. Item Combo Freebies</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTypeTab('CUSTOM_DISCOUNT')}
          className={cn(
            'px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 border',
            activeTypeTab === 'CUSTOM_DISCOUNT'
              ? 'bg-purple-600 text-white border-transparent shadow-xs'
              : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/40'
          )}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>4. Billing Custom Discounts</span>
        </button>
      </div>

      {/* ── Campaigns Grid ── */}
      {filteredCampaigns.length === 0 ? (
        <Card className="p-16 text-center border-dashed border-2 border-border/80 bg-card/30 rounded-3xl">
          <Tag className="w-12 h-12 mx-auto text-primary/30 mb-3" />
          <h3 className="text-lg font-bold text-foreground">No Campaigns in this Category</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
            Create your first coupon discount or promotional campaign to attract more diners.
          </p>
          <Button onClick={() => setShowNewModal(true)} className="gap-2 font-bold rounded-2xl">
            <Plus className="w-4 h-4" /> Create Promotion
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCampaigns.map((camp) => {
            const isCoupon = camp.type === 'LIMITED_TIME_COUPON';
            const isThreshold = camp.type === 'BILL_THRESHOLD';
            const isCombo = camp.type === 'ITEM_COMBO_COMPLIMENTARY';
            const isCustom = camp.type === 'CUSTOM_DISCOUNT';

            return (
              <div
                key={camp.id}
                className={cn(
                  'p-5 rounded-3xl border bg-card/70 backdrop-blur hover:border-primary/40 transition-all flex flex-col justify-between shadow-sm relative overflow-hidden',
                  camp.status === 'PAUSED' ? 'opacity-65 border-border/60' : 'border-border'
                )}
              >
                {/* Top Badge Strip */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] font-black px-2 py-0.5 rounded-full',
                            isCoupon ? 'bg-primary/15 text-primary border-primary/30' :
                            isThreshold ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' :
                            isCombo ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' :
                            'bg-purple-500/15 text-purple-400 border-purple-500/30'
                          )}
                        >
                          {isCoupon ? '🎟️ COUPON' :
                           isThreshold ? '🎁 SPEND & GET REWARD' :
                           isCombo ? '🍔+☕ COMBO FREEBIE' :
                           '⚙️ BILLING PRESET'}
                        </Badge>

                        {camp.autoApply && (
                          <Badge variant="outline" className="bg-blue-500/15 text-blue-400 border-blue-500/30 text-[9px] font-bold">
                            ⚡ Auto-Apply
                          </Badge>
                        )}
                      </div>

                      <h3 className="font-bold text-base text-foreground leading-snug pt-1">{camp.name}</h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleStatusMutation.mutate(camp.id)}
                      className={cn(
                        'text-[10px] px-2.5 py-1 rounded-full font-bold border shrink-0 transition-all cursor-pointer',
                        camp.status === 'ACTIVE'
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                          : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                      )}
                      title="Click to toggle status"
                    >
                      {camp.status}
                    </button>
                  </div>

                  {/* Coupon Code Pill */}
                  {camp.code && !isCustom && (
                    <div className="mt-3 flex items-center justify-between p-2 rounded-xl bg-background border border-dashed border-primary/40 text-xs">
                      <span className="font-mono font-black text-primary tracking-wider">{camp.code}</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(camp.code);
                          toast.success('Code Copied', `"${camp.code}" copied to clipboard.`);
                        }}
                        className="text-[10px] font-bold text-muted-foreground hover:text-primary flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3 h-3" /> Copy
                      </button>
                    </div>
                  )}

                  {/* Promotion Offer Specifications */}
                  <div className="mt-3.5 space-y-1.5 text-xs text-muted-foreground bg-muted/30 p-3 rounded-2xl border border-border/40">
                    {isCoupon && (
                      <>
                        <p className="flex justify-between">
                          <span>Discount:</span>
                          <strong className="text-foreground font-mono">
                            {camp.discountType === 'PERCENTAGE' ? `${camp.discountValue}% OFF` : `₹${camp.discountValue} FLAT OFF`}
                          </strong>
                        </p>
                        {camp.minOrderValue ? (
                          <p className="flex justify-between">
                            <span>Min Order:</span>
                            <strong className="text-foreground">{formatCurrency(camp.minOrderValue)}</strong>
                          </p>
                        ) : null}
                        {camp.maxDiscount ? (
                          <p className="flex justify-between">
                            <span>Max Cap:</span>
                            <strong className="text-foreground">{formatCurrency(camp.maxDiscount)}</strong>
                          </p>
                        ) : null}
                      </>
                    )}

                    {isThreshold && (
                      <>
                        <p className="flex justify-between">
                          <span>Bill Threshold:</span>
                          <strong className="text-emerald-400 font-mono">Spend &gt; {formatCurrency(camp.minOrderValue || 0)}</strong>
                        </p>
                        <p className="flex justify-between">
                          <span>Auto Reward:</span>
                          <strong className="text-foreground">
                            {camp.rewardType === 'COMPLIMENTARY_ITEM'
                              ? `🎁 Free ${camp.complementaryItemName || 'Item'}`
                              : `💰 ${camp.discountType === 'FLAT' ? `₹${camp.discountValue} Flat Off` : `${camp.discountValue}% Off`}`}
                          </strong>
                        </p>
                      </>
                    )}

                    {isCombo && (
                      <>
                        <p className="text-[11px] leading-relaxed">
                          <span className="text-muted-foreground">When ordering: </span>
                          <strong className="text-foreground">{camp.triggerItems?.map(t => t.name).join(' + ') || 'Trigger Items'}</strong>
                        </p>
                        <p className="flex justify-between pt-0.5 border-t border-border/40">
                          <span>Free Gift:</span>
                          <strong className="text-amber-400 font-black">🎁 1x {camp.complementaryItemName}</strong>
                        </p>
                      </>
                    )}

                    {isCustom && camp.customPresets && (
                      <div className="space-y-1">
                        <p className="text-[11px] text-muted-foreground">Presets: <strong className="text-foreground">{camp.customPresets.percentages.map(p => `${p}%`).join(', ')} / ₹{camp.customPresets.flatAmounts.join(', ₹')}</strong></p>
                        <p className="text-[10px] text-muted-foreground line-clamp-1">Reasons: {camp.customPresets.reasons.join(', ')}</p>
                      </div>
                    )}

                    {/* Validity Period */}
                    <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                      <Clock className="w-3 h-3 text-primary shrink-0" />
                      <span>{camp.validFrom} to {camp.validTo}</span>
                    </p>
                  </div>

                  {/* Redemptions & Savings Counters */}
                  <div className="grid grid-cols-2 gap-2 my-3 p-2.5 rounded-2xl bg-background/50 border border-border/40 text-center">
                    <div>
                      <p className="text-[10px] text-muted-foreground font-semibold">Claimed</p>
                      <p className="text-sm font-black font-mono text-foreground">{camp.redemptions || 0}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground font-semibold">Total Savings</p>
                      <p className="text-sm font-black font-mono text-emerald-400">{formatCurrency(camp.totalSavings || 0)}</p>
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/60 mt-2">
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(camp.id)}
                    className="text-xs text-muted-foreground hover:text-red-400 p-1.5 rounded-xl hover:bg-red-500/10 transition-colors cursor-pointer"
                    title="Delete Promotion"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-1.5">
                    {camp.highlightOnQrMenu && (
                      <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/30">
                        QR Standee
                      </Badge>
                    )}

                    {isCoupon && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setPrintCouponModal(camp);
                          setPrintCardCount(8);
                        }}
                        className="gap-1 text-xs font-bold rounded-xl border-amber-500/40 text-amber-500 hover:bg-amber-500/10 hover:text-amber-400 h-8 px-2.5"
                        title="Generate Printable A4 Coupon Cards PDF"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print Cards</span>
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleBroadcast(camp.name)}
                      className="gap-1 text-xs font-bold rounded-xl border-primary/40 text-primary hover:bg-primary/10 h-8 px-2.5"
                    >
                      <Megaphone className="w-3 h-3" />
                      <span>Broadcast</span>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          CREATION MODAL FOR ALL 4 OFFER TYPES
      ───────────────────────────────────────────────────────────────────────────── */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Create New Promotion Rule
              </h3>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Type Selection */}
              <div>
                <label className="text-xs font-bold text-muted-foreground">Select Promotion Type</label>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setFormType('LIMITED_TIME_COUPON')}
                    className={cn(
                      'p-2.5 rounded-2xl text-left border text-xs font-bold transition-all cursor-pointer',
                      formType === 'LIMITED_TIME_COUPON'
                        ? 'bg-primary/15 border-primary text-primary'
                        : 'bg-muted/40 border-border text-foreground hover:bg-muted'
                    )}
                  >
                    <p className="flex items-center gap-1.5"><span>🎟️</span> 1. Limited-Time Coupon</p>
                    <p className="text-[10px] text-muted-foreground font-normal mt-0.5">Date-range coupon code with % or ₹ off</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormType('BILL_THRESHOLD')}
                    className={cn(
                      'p-2.5 rounded-2xl text-left border text-xs font-bold transition-all cursor-pointer',
                      formType === 'BILL_THRESHOLD'
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400'
                        : 'bg-muted/40 border-border text-foreground hover:bg-muted'
                    )}
                  >
                    <p className="flex items-center gap-1.5"><span>🎁</span> 2. Bill Threshold (Auto-Apply)</p>
                    <p className="text-[10px] text-muted-foreground font-normal mt-0.5">Spend &gt; ₹X to get ₹ discount or free item</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormType('ITEM_COMBO_COMPLIMENTARY')}
                    className={cn(
                      'p-2.5 rounded-2xl text-left border text-xs font-bold transition-all cursor-pointer',
                      formType === 'ITEM_COMBO_COMPLIMENTARY'
                        ? 'bg-amber-500/15 border-amber-500 text-amber-400'
                        : 'bg-muted/40 border-border text-foreground hover:bg-muted'
                    )}
                  >
                    <p className="flex items-center gap-1.5"><span>🍔+☕</span> 3. Food Item Combo Freebie</p>
                    <p className="text-[10px] text-muted-foreground font-normal mt-0.5">Buy Dish A + B -&gt; Get Dish C Complimentary</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormType('CUSTOM_DISCOUNT')}
                    className={cn(
                      'p-2.5 rounded-2xl text-left border text-xs font-bold transition-all cursor-pointer',
                      formType === 'CUSTOM_DISCOUNT'
                        ? 'bg-purple-500/15 border-purple-500 text-purple-400'
                        : 'bg-muted/40 border-border text-foreground hover:bg-muted'
                    )}
                  >
                    <p className="flex items-center gap-1.5"><span>⚙️</span> 4. Billing Custom Discounts</p>
                    <p className="text-[10px] text-muted-foreground font-normal mt-0.5">Cashier manual discount amount presets</p>
                  </button>
                </div>
              </div>

              {/* Campaign Title */}
              <div>
                <label className="text-xs font-bold text-muted-foreground">Promotion / Campaign Name</label>
                <Input
                  type="text"
                  required
                  placeholder={
                    formType === 'LIMITED_TIME_COUPON' ? 'e.g. Weekend Mega 20% Off' :
                    formType === 'BILL_THRESHOLD' ? 'e.g. Free Brownie on Bills over ₹999' :
                    formType === 'ITEM_COMBO_COMPLIMENTARY' ? 'e.g. Free Cappuccino with Burger & Pizza' :
                    'e.g. Cashier VIP & Courtesy Discount Presets'
                  }
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 h-10 rounded-xl bg-background border-border text-xs font-bold"
                />
              </div>

              {/* Dynamic Inputs based on Type */}
              {formType === 'LIMITED_TIME_COUPON' && (
                <div className="space-y-3 p-3.5 rounded-2xl bg-muted/30 border border-border">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">Coupon Code</label>
                      <Input
                        type="text"
                        required
                        placeholder="WEEKEND20"
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        className="mt-1 h-9 rounded-xl bg-background border-border text-xs font-mono font-black text-primary uppercase"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">Discount Type</label>
                      <div className="grid grid-cols-2 gap-1 mt-1">
                        <button
                          type="button"
                          onClick={() => setDiscountType('PERCENTAGE')}
                          className={cn(
                            'py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer',
                            discountType === 'PERCENTAGE' ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground'
                          )}
                        >
                          % Percentage
                        </button>
                        <button
                          type="button"
                          onClick={() => setDiscountType('FLAT')}
                          className={cn(
                            'py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer',
                            discountType === 'FLAT' ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground'
                          )}
                        >
                          ₹ Flat Amount
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">Discount Value</label>
                      <Input
                        type="number"
                        required
                        placeholder="20"
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                        className="mt-1 h-9 rounded-xl bg-background border-border text-xs font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">Min Order (₹)</label>
                      <Input
                        type="number"
                        placeholder="499"
                        value={minOrderValue}
                        onChange={(e) => setMinOrderValue(e.target.value)}
                        className="mt-1 h-9 rounded-xl bg-background border-border text-xs font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">Max Cap (₹)</label>
                      <Input
                        type="number"
                        placeholder="200"
                        value={maxDiscount}
                        onChange={(e) => setMaxDiscount(e.target.value)}
                        className="mt-1 h-9 rounded-xl bg-background border-border text-xs font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}

              {formType === 'BILL_THRESHOLD' && (
                <div className="space-y-3 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">Bill Threshold (Spend &gt; ₹)</label>
                      <Input
                        type="number"
                        required
                        placeholder="999"
                        value={minOrderValue}
                        onChange={(e) => setMinOrderValue(e.target.value)}
                        className="mt-1 h-9 rounded-xl bg-background border-border text-xs font-black font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">Reward Choice</label>
                      <div className="grid grid-cols-2 gap-1 mt-1">
                        <button
                          type="button"
                          onClick={() => setThresholdRewardType('COMPLIMENTARY_ITEM')}
                          className={cn(
                            'py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer',
                            thresholdRewardType === 'COMPLIMENTARY_ITEM' ? 'bg-emerald-600 text-white border-emerald-600' : 'border-border text-muted-foreground'
                          )}
                        >
                          🎁 Free Item
                        </button>
                        <button
                          type="button"
                          onClick={() => setThresholdRewardType('DISCOUNT')}
                          className={cn(
                            'py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer',
                            thresholdRewardType === 'DISCOUNT' ? 'bg-emerald-600 text-white border-emerald-600' : 'border-border text-muted-foreground'
                          )}
                        >
                          💰 Money Off
                        </button>
                      </div>
                    </div>
                  </div>

                  {thresholdRewardType === 'COMPLIMENTARY_ITEM' ? (
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">Select Complementary Menu Item</label>
                      <Input
                        type="text"
                        required
                        placeholder="e.g. Signature Chocolate Brownie / Fresh Lime Soda"
                        value={thresholdFreeItem}
                        onChange={(e) => setThresholdFreeItem(e.target.value)}
                        className="mt-1 h-9 rounded-xl bg-background border-border text-xs font-bold"
                      />
                      {allMenuItems.length > 0 && (
                        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pt-1.5">
                          {allMenuItems.slice(0, 6).map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setThresholdFreeItem(item.name)}
                              className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-background border border-border hover:border-emerald-500 shrink-0 cursor-pointer"
                            >
                              + {item.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground">Discount Value</label>
                        <Input
                          type="number"
                          placeholder="150"
                          value={discountValue}
                          onChange={(e) => setDiscountValue(e.target.value)}
                          className="mt-1 h-9 rounded-xl bg-background border-border text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground">Type</label>
                        <select
                          value={discountType}
                          onChange={(e: any) => setDiscountType(e.target.value)}
                          className="w-full mt-1 h-9 rounded-xl bg-background border border-border text-xs font-bold px-2"
                        >
                          <option value="FLAT">₹ Flat Off</option>
                          <option value="PERCENTAGE">% Percentage Off</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {formType === 'ITEM_COMBO_COMPLIMENTARY' && (
                <div className="space-y-3 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">When Customer Selects Trigger Dishes (e.g. Burger + Pizza)</label>
                    <Input
                      type="text"
                      required
                      placeholder="Burger, Pizza"
                      value={triggerItemInputs.join(', ')}
                      onChange={(e) => setTriggerItemInputs(e.target.value.split(',').map(s => s.trim()))}
                      className="mt-1 h-9 rounded-xl bg-background border-border text-xs font-bold"
                    />
                    <p className="text-[10px] text-muted-foreground mt-0.5">Comma-separated list of required menu dishes</p>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Customer Gets Free Complementary Item</label>
                    <Input
                      type="text"
                      required
                      placeholder="e.g. Hot Brewed Coffee / Cappuccino"
                      value={comboFreeItem}
                      onChange={(e) => setComboFreeItem(e.target.value)}
                      className="mt-1 h-9 rounded-xl bg-background border-border text-xs font-bold"
                    />
                  </div>
                </div>
              )}

              {formType === 'CUSTOM_DISCOUNT' && (
                <div className="space-y-3 p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/30">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Allowed Percentage Presets (%)</label>
                    <Input
                      type="text"
                      value={customPercents}
                      onChange={(e) => setCustomPercents(e.target.value)}
                      className="mt-1 h-9 rounded-xl bg-background border-border text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Allowed Flat Amount Presets (₹)</label>
                    <Input
                      type="text"
                      value={customFlats}
                      onChange={(e) => setCustomFlats(e.target.value)}
                      className="mt-1 h-9 rounded-xl bg-background border-border text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Common Discount Reasons (Comma separated)</label>
                    <Input
                      type="text"
                      value={customReasons}
                      onChange={(e) => setCustomReasons(e.target.value)}
                      className="mt-1 h-9 rounded-xl bg-background border-border text-xs font-bold"
                    />
                  </div>
                </div>
              )}

              {/* Validity Date Range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Valid From
                  </label>
                  <Input
                    type="date"
                    required
                    value={validFrom}
                    onChange={(e) => setValidFrom(e.target.value)}
                    className="mt-1 h-9 rounded-xl bg-background border-border text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Valid To (Expiry)
                  </label>
                  <Input
                    type="date"
                    required
                    value={validTo}
                    onChange={(e) => setValidTo(e.target.value)}
                    className="mt-1 h-9 rounded-xl bg-background border-border text-xs font-bold"
                  />
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setShowNewModal(false)} className="rounded-xl font-bold">
                  Cancel
                </Button>
                <Button type="submit" loading={createMutation.isPending} className="rounded-xl font-bold shadow-md">
                  Publish Promotion
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          PRINTABLE COUPON CARDS MODAL (A4 Multi-Card PDF Layout)
      ───────────────────────────────────────────────────────────────────────────── */}
      {printCouponModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-foreground">Printable Coupon Cards</h3>
                  <p className="text-xs text-muted-foreground">
                    Standard A4 Sheet Layout (8 Single-Sided Cards / Page in 2x4 Grid with Cut Guides)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPrintCouponModal(null)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold p-1 rounded-lg hover:bg-muted"
              >
                ✕
              </button>
            </div>

            {/* Print Configuration Controls */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-foreground">
                    How many coupon cards would you like to create?
                  </label>
                  <span className="text-xs font-mono font-bold text-amber-500">
                    {Math.ceil(printCardCount / 8)} A4 Page{Math.ceil(printCardCount / 8) > 1 ? 's' : ''} ({printCardCount} cards)
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={1}
                    max={500}
                    value={printCardCount || ''}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setPrintCardCount(isNaN(val) ? 0 : Math.max(1, Math.min(val, 500)));
                    }}
                    className="h-10 w-32 rounded-xl bg-background border-border font-mono font-bold text-sm"
                    placeholder="e.g. 16"
                  />
                  
                  {/* Quick Preset Buttons */}
                  <div className="flex flex-wrap gap-1.5">
                    {[8, 16, 24, 32, 48, 80].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setPrintCardCount(num)}
                        className={cn(
                          'text-xs font-bold px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer',
                          printCardCount === num
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-sm'
                            : 'bg-muted/40 text-muted-foreground border-border/60 hover:bg-muted'
                        )}
                      >
                        {num} ({num / 8} {num / 8 === 1 ? 'page' : 'pages'})
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Live Single Card Preview */}
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                  Card Preview & Print Details:
                </label>

                <div className="p-4 rounded-2xl bg-muted/30 border border-border flex flex-col md:flex-row items-center justify-center gap-4">
                  {/* Card Simulation */}
                  <div className="w-full max-w-sm bg-white text-slate-900 border-2 border-dashed border-slate-400 rounded-xl p-3.5 shadow-md relative overflow-hidden space-y-2.5">
                    <div className="absolute top-1 right-2 text-[10px] text-slate-400 font-mono">✂ cut line</div>

                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2 gap-2">
                      <div className="flex items-center gap-2 overflow-hidden">
                        {tenant?.logoUrl ? (
                          <img src={tenant.logoUrl} alt="Logo" className="w-7 h-7 object-contain rounded" />
                        ) : (
                          <div className="w-7 h-7 bg-amber-100 text-amber-700 rounded flex items-center justify-center font-bold text-xs">
                            🍽️
                          </div>
                        )}
                        <div className="truncate">
                          <h4 className="text-xs font-black uppercase text-slate-900 leading-tight truncate">
                            {tenant?.name || 'Restaurant OS'}
                          </h4>
                          <p className="text-[9px] text-slate-500 truncate">
                            {tenant?.address || tenant?.branches?.[0]?.address || 'Main Branch, City Center'} • {tenant?.phone || tenant?.branches?.[0]?.phone || '+1 555-0199'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[8px] font-black uppercase bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                        Voucher
                      </span>
                    </div>

                    {/* Offer Highlight */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-lg font-black text-amber-600 tracking-tight">
                        {printCouponModal.discountType === 'PERCENTAGE'
                          ? `${printCouponModal.discountValue}% OFF`
                          : `₹${printCouponModal.discountValue} FLAT OFF`}
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-bold text-slate-800">
                          {printCouponModal.minOrderValue ? `Min Spend: ₹${printCouponModal.minOrderValue}` : 'No Minimum Order'}
                        </div>
                        {printCouponModal.maxDiscount && (
                          <div className="text-[9px] text-slate-500">Max Discount: ₹{printCouponModal.maxDiscount}</div>
                        )}
                      </div>
                    </div>

                    {/* Coupon Code Pill */}
                    <div className="bg-amber-50 border border-dashed border-amber-400 rounded-lg p-2 flex items-center justify-between">
                      <div className="text-[9px] font-black text-amber-800">✂ PROMO CODE:</div>
                      <div className="font-mono text-sm font-black tracking-widest text-amber-700">
                        {printCouponModal.code}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between text-[9px] text-slate-500 border-t border-slate-100 pt-1.5">
                      <div>
                        <strong>Valid:</strong> {printCouponModal.validFrom.split('T')[0]} → {printCouponModal.validTo.split('T')[0]}
                      </div>
                      <div className="italic text-[8px] text-slate-400">*Single use per bill</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Layout Specifications Note */}
              <div className="p-3 rounded-2xl bg-background/50 border border-border/70 text-xs text-muted-foreground flex items-center gap-2.5">
                <Scissors className="w-4 h-4 text-amber-500 shrink-0" />
                <p>
                  Cards are sized for standard wallet/voucher dimensions (<span className="font-semibold text-foreground">94mm × 62mm</span>), laid out in an <span className="font-semibold text-foreground">8-card 2×4 grid per A4 page</span> with minimum cutting gaps to save paper.
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPrintCouponModal(null)}
                className="rounded-xl font-bold"
              >
                Close
              </Button>
              <Button
                type="button"
                onClick={() => {
                  handleGenerateAndPrintCouponPdf(printCouponModal, printCardCount);
                  setPrintCouponModal(null);
                }}
                className="rounded-xl font-bold gap-2 bg-amber-500 hover:bg-amber-600 text-black shadow-lg"
              >
                <Printer className="w-4 h-4" />
                Generate & Print A4 PDF ({printCardCount} Cards)
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
