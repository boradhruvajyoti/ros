'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UtensilsCrossed, Clock, MapPin, Phone, Calendar, Users,
  CheckCircle2, Sparkles, CreditCard, ArrowRight, ShieldCheck,
  AlertCircle, ChevronRight, Navigation, RefreshCw, ChefHat,
  Flame, Check, Lock, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@ros/utils';
import { apiGet, apiPost } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function PreOrderLiveTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const token = (params?.token as string) || '';
  const slug = (params?.slug as string) || '';
  const queryClient = useQueryClient();

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'UPI' | 'CARD' | 'WALLET'>('UPI');
  const [isPaying, setIsPaying] = useState(false);

  // Poll order tracking data every 4 seconds
  const { data: trackData, isLoading, error, refetch } = useQuery({
    queryKey: ['preorder-track', token],
    queryFn: async () => {
      if (!token) return null;
      const res = await apiGet<any>(`/public/pre-order/track/${token}`);
      return res;
    },
    enabled: !!token,
    refetchInterval: 4000,
  });

  const restaurant = trackData?.restaurant;
  const items = trackData?.items || [];
  const kots = trackData?.kots || [];

  // Countdown timer to arrival
  const [timeLeftStr, setTimeLeftStr] = useState<string>('');
  useEffect(() => {
    if (!trackData?.expectedArrivalTime) return;

    const updateTimer = () => {
      const arrival = new Date(trackData.expectedArrivalTime).getTime();
      const now = Date.now();
      const diffMs = arrival - now;

      if (diffMs <= 0) {
        const lateMin = Math.floor(Math.abs(diffMs) / 60000);
        setTimeLeftStr(lateMin === 0 ? 'Due Now' : `${lateMin} mins past scheduled arrival`);
      } else {
        const mins = Math.floor(diffMs / 60000);
        const hrs = Math.floor(mins / 60);
        const remMins = mins % 60;
        if (hrs > 0) {
          setTimeLeftStr(`in ${hrs}h ${remMins}m`);
        } else {
          setTimeLeftStr(`in ${mins} mins`);
        }
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 10000);
    return () => clearInterval(interval);
  }, [trackData?.expectedArrivalTime]);

  // Handle Payment
  const handleCompletePayment = async () => {
    setIsPaying(true);
    try {
      await apiPost(`/public/pre-order/track/${token}/pay`, {
        paymentMethod: selectedPaymentMethod,
      });
      toast.success('Payment Successful! 🎉', 'Your pre-order is confirmed and sent to the kitchen.');
      setShowPaymentModal(false);
      refetch();
    } catch (err: any) {
      toast.error('Payment Error', err?.response?.data?.error?.message || err?.message || 'Payment could not be processed.');
    } finally {
      setIsPaying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-bold text-zinc-400">Loading your live pre-order pass...</p>
      </div>
    );
  }

  if (error || !trackData) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-white">Tracking Link Expired or Invalid</h1>
        <p className="text-sm text-zinc-400 max-w-md mt-2 mb-6">
          This pre-order tracking token is either expired or does not exist.
        </p>
        <Button onClick={() => router.push(slug ? `/${slug}` : '/')} variant="outline" className="rounded-2xl">
          Return to Restaurant
        </Button>
      </div>
    );
  }

  // Stages: 1. Placed, 2. Accepted (Payable), 3. Confirmed & Paid (Kitchen Cooking), 4. Table Ready, 5. Completed
  const stage = trackData.trackingStage;
  const isPaid = trackData.paymentStatus === 'PAID';
  const canPay = (stage === 'ACCEPTED' || trackData.canPay) && !isPaid;

  const stageStep =
    stage === 'COMPLETED' ? 5 :
    stage === 'READY' ? 4 :
    (stage === 'PREPARING' || isPaid) ? 3 :
    stage === 'ACCEPTED' ? 2 :
    1;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-28">
      {/* ── Top Header ── */}
      <header className="bg-zinc-900/90 border-b border-zinc-800/80 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-800 border border-amber-500/40 p-1 flex items-center justify-center overflow-hidden shrink-0">
              {restaurant?.logoUrl ? (
                <img src={restaurant.logoUrl} alt="Logo" className="w-full h-full object-contain rounded-xl" />
              ) : (
                <UtensilsCrossed className="w-5 h-5 text-amber-500" />
              )}
            </div>
            <div>
              <h2 className="text-sm font-black text-white leading-tight">{restaurant?.name || 'Restaurant OS'}</h2>
              <p className="text-[10px] text-zinc-400 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-amber-400" /> {restaurant?.address || 'Main Branch'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40 font-mono font-black text-xs px-2.5 py-1 rounded-xl">
              #{trackData.orderNumber}
            </Badge>
          </div>
        </div>
      </header>

      {/* ── Main Tracking Container ── */}
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* ── Hero Live Status Card ── */}
        <Card className="bg-gradient-to-b from-zinc-900 to-zinc-900/80 border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-5 relative overflow-hidden">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
                Live Pre-Order Status
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-white mt-0.5">
                {stage === 'CANCELLED' ? '❌ Pre-Order Cancelled' :
                 stage === 'COMPLETED' ? '🎉 Order Completed · Hope you enjoyed!' :
                 stage === 'READY' ? '🍽️ Table & Food Ready for Your Arrival' :
                 isPaid ? '👨‍🍳 Food Preparing in Kitchen' :
                 stage === 'ACCEPTED' ? '💳 Order Accepted! Please Pay to Confirm' :
                 '⏳ Awaiting Staff Confirmation'}
              </h1>
            </div>

            <button
              type="button"
              onClick={() => refetch()}
              className="text-xs font-bold text-zinc-400 hover:text-white flex items-center gap-1.5 p-2 rounded-xl bg-zinc-950 border border-zinc-800"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Live Sync</span>
            </button>
          </div>

          {/* Stepper Bar */}
          <div className="grid grid-cols-4 gap-2 pt-2">
            {[
              { num: 1, label: 'Placed', desc: 'Sent to Staff' },
              { num: 2, label: 'Accepted', desc: 'Payment Link' },
              { num: 3, label: 'Preparing', desc: 'In Kitchen' },
              { num: 4, label: 'Table Ready', desc: 'Ready for You' },
            ].map(s => {
              const isDone = stageStep >= s.num;
              const isCurrent = stageStep === s.num;
              return (
                <div key={s.num} className="space-y-1 text-center">
                  <div className={cn(
                    'h-2 rounded-full transition-all',
                    isDone ? 'bg-amber-500' : 'bg-zinc-800'
                  )} />
                  <p className={cn(
                    'text-[11px] font-black',
                    isCurrent ? 'text-amber-400' : isDone ? 'text-white' : 'text-zinc-600'
                  )}>
                    {s.label}
                  </p>
                  <p className="text-[9px] text-zinc-500 hidden sm:block">{s.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Expected Arrival Box */}
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] text-zinc-400 font-semibold">Expected Arrival Time</p>
                <p className="text-sm font-black text-white font-mono">
                  {new Date(trackData.expectedArrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(trackData.expectedArrivalTime).toLocaleDateString()})
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-zinc-500 block">Time to Arrive</span>
              <span className="text-sm font-black text-amber-400 font-mono">{timeLeftStr}</span>
            </div>
          </div>
        </Card>

        {/* ── Payment CTA Card (When Staff Accepted & Payment Unpaid) ── */}
        {canPay && (
          <Card className="bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-zinc-900 border-2 border-amber-500 rounded-3xl p-6 shadow-2xl space-y-4 animate-pulse-subtle">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <Badge className="bg-amber-500 text-black font-black text-[10px] uppercase px-2 py-0.5 rounded-full">
                  ⚡ Action Required
                </Badge>
                <h3 className="text-lg font-black text-white">Staff Accepted Your Pre-Order!</h3>
                <p className="text-xs text-zinc-300">
                  Please complete the payment of <strong className="text-amber-400 font-mono text-sm">{formatCurrency(trackData.total)}</strong> so the kitchen starts preparing your dishes.
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-black flex items-center justify-center font-bold shrink-0 shadow-lg">
                <CreditCard className="w-6 h-6" />
              </div>
            </div>

            <Button
              onClick={() => setShowPaymentModal(true)}
              className="w-full h-12 rounded-2xl font-black bg-amber-500 hover:bg-amber-600 text-black text-sm shadow-xl gap-2"
            >
              <span>Pay Now ({formatCurrency(trackData.total)})</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Card>
        )}

        {/* ── Payment Success Banner (If Paid) ── */}
        {isPaid && (
          <div className="p-4 rounded-3xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-bold">
                ✓
              </div>
              <div>
                <p className="text-xs font-bold text-white">Prepaid Order Confirmed</p>
                <p className="text-[11px] text-emerald-400 font-mono">Paid {formatCurrency(trackData.paidAmount)} · Food is being cooked</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/50 text-[10px] font-bold">
              KITCHEN NOTIFIED
            </Badge>
          </div>
        )}

        {/* ── Table & Booking Card ── */}
        <Card className="bg-zinc-900/80 border-zinc-800 rounded-3xl p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
            <UtensilsCrossed className="w-3.5 h-3.5 text-amber-400" />
            <span>Table & Guest Reservation</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800">
              <span className="text-zinc-500 text-[10px] block">Table:</span>
              <strong className="text-white text-sm">
                {trackData.tableName ? `Table ${trackData.tableName}` : 'Auto-Assigned'}
              </strong>
              <p className="text-[10px] text-zinc-400">{trackData.floorName || 'Dining Room'}</p>
            </div>

            <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800">
              <span className="text-zinc-500 text-[10px] block">Reserved For:</span>
              <strong className="text-white text-sm font-mono">👥 {trackData.guestCount} Guests</strong>
              <p className="text-[10px] text-zinc-400">{trackData.customerName}</p>
            </div>

            <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 col-span-2 sm:col-span-1">
              <span className="text-zinc-500 text-[10px] block">Customer Phone:</span>
              <strong className="text-white text-sm font-mono">{trackData.customerPhone}</strong>
              <p className="text-[10px] text-zinc-500 truncate">{trackData.customerAddress || 'Direct Dine-In'}</p>
            </div>
          </div>
        </Card>

        {/* ── Kitchen Progress / KOT Status ── */}
        {kots.length > 0 && (
          <Card className="bg-zinc-900/80 border-zinc-800 rounded-3xl p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <ChefHat className="w-3.5 h-3.5 text-amber-400" />
              <span>Live Kitchen Preparation Progress</span>
            </h3>

            <div className="space-y-2">
              {kots.map((kot: any, idx: number) => (
                <div key={idx} className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    <div>
                      <strong className="text-white font-bold">{kot.kitchenStationName}</strong>
                      <span className="text-zinc-500 text-[10px] block font-mono">KOT #{kot.kotNumber}</span>
                    </div>
                  </div>
                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40 text-[10px] font-bold">
                    {kot.status === 'SENT' ? '🔥 PREPARING' : kot.status}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ── Ordered Dishes & Pricing ── */}
        <Card className="bg-zinc-900/80 border-zinc-800 rounded-3xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Ordered Food Items ({items.length})
            </h3>
            <span className="text-xs font-mono font-bold text-amber-400">
              Total: {formatCurrency(trackData.total)}
            </span>
          </div>

          <div className="space-y-3">
            {items.map((it: any) => (
              <div key={it.id} className="flex items-center justify-between text-xs py-1 border-b border-zinc-800/40 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                    {it.imageUrl ? (
                      <img src={it.imageUrl} alt={it.name} className="w-full h-full object-cover" />
                    ) : (
                      <UtensilsCrossed className="w-4 h-4 text-zinc-600" />
                    )}
                  </div>
                  <div>
                    <strong className="text-white font-bold">{it.quantity}x {it.name}</strong>
                    {it.variantName && (
                      <span className="text-zinc-500 text-[10px] block">Portion: {it.variantName}</span>
                    )}
                  </div>
                </div>
                <span className="font-mono font-bold text-zinc-300">
                  {formatCurrency(it.total)}
                </span>
              </div>
            ))}
          </div>

          {/* Pricing Summary */}
          <div className="pt-3 border-t border-zinc-800 space-y-1.5 text-xs text-zinc-400">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-mono">{formatCurrency(trackData.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Taxes (CGST & SGST):</span>
              <span className="font-mono">{formatCurrency(trackData.taxAmount)}</span>
            </div>
            {trackData.serviceCharge > 0 && (
              <div className="flex justify-between">
                <span>Service Charge:</span>
                <span className="font-mono">{formatCurrency(trackData.serviceCharge)}</span>
              </div>
            )}
            <div className="flex justify-between text-white font-black text-sm pt-2 border-t border-zinc-800">
              <span>Grand Total:</span>
              <span className="font-mono text-amber-400">{formatCurrency(trackData.total)}</span>
            </div>
          </div>
        </Card>

        {/* ── Restaurant Contact & Directions ── */}
        <div className="p-4 rounded-3xl bg-zinc-900/60 border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div>
            <p className="font-bold text-white">{restaurant?.name}</p>
            <p className="text-zinc-400 text-[11px]">{restaurant?.address} • {restaurant?.phone}</p>
          </div>
          <div className="flex items-center gap-2">
            {restaurant?.phone && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`tel:${restaurant.phone}`)}
                className="rounded-2xl text-xs gap-1.5 h-9"
              >
                <Phone className="w-3.5 h-3.5 text-amber-400" />
                <span>Call Staff</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(restaurant?.address || restaurant?.name)}`)}
              className="rounded-2xl text-xs gap-1.5 h-9"
            >
              <Navigation className="w-3.5 h-3.5 text-amber-400" />
              <span>Get Directions</span>
            </Button>
          </div>
        </div>
      </main>

      {/* ═══════════════════════════════════════════════════════════════════════
          PAYMENT MODAL (Online Checkout Simulation)
      ═══════════════════════════════════════════════════════════════════════ */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <CreditCard className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-white">Pre-Order Payment Link</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="text-zinc-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="text-center py-2 space-y-1">
              <span className="text-xs text-zinc-400">Total Amount to Pay</span>
              <p className="text-3xl font-black text-amber-400 font-mono">{formatCurrency(trackData.total)}</p>
              <p className="text-[11px] text-zinc-500">Includes food items, CGST/SGST taxes and restaurant service.</p>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-300">Select Payment Method</label>
              <div className="space-y-2">
                {[
                  { id: 'UPI', label: 'Instant UPI (GooglePay / PhonePe / Paytm / BHIM)', icon: '⚡' },
                  { id: 'CARD', label: 'Credit / Debit Card (Visa / Mastercard / RuPay)', icon: '💳' },
                  { id: 'WALLET', label: 'NetBanking & Digital Wallets', icon: '🏦' },
                ].map(m => (
                  <div
                    key={m.id}
                    onClick={() => setSelectedPaymentMethod(m.id as any)}
                    className={cn(
                      'p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between text-xs',
                      selectedPaymentMethod === m.id
                        ? 'bg-amber-500/20 border-amber-500 text-white font-bold'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <span>{m.icon}</span>
                      <span>{m.label}</span>
                    </div>
                    {selectedPaymentMethod === m.id && (
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Security Note */}
            <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>256-bit encrypted secure restaurant payment checkout.</span>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
              <Button
                variant="outline"
                onClick={() => setShowPaymentModal(false)}
                className="rounded-2xl"
              >
                Cancel
              </Button>
              <Button
                loading={isPaying}
                onClick={handleCompletePayment}
                className="flex-1 rounded-2xl font-black bg-amber-500 hover:bg-amber-600 text-black"
              >
                Confirm & Pay {formatCurrency(trackData.total)}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
