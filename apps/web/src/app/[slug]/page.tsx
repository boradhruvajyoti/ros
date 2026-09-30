'use client';

import { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  UtensilsCrossed, Clock, MapPin, Phone, Calendar, Users,
  ShoppingBag, Check, Sparkles, ChevronRight, ArrowRight,
  ShieldCheck, AlertCircle, Plus, Minus, Search, Flame,
  Coffee, Leaf, Heart, Navigation, Info, CreditCard, ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@ros/utils';
import { apiGet, apiPost } from '@/lib/api';
import { cn } from '@/lib/utils';

const RESERVED_SHELL_SLUGS = new Set([
  'dashboard', 'pos', 'orders', 'order-history', 'kitchen', 'kds',
  'tables', 'settings', 'menu', 'inventory', 'customers', 'reports',
  'login', 'register', 'onboard', 'kiosk', 'drivethru', 'marketing',
  'order', 'track', 'api'
]);

interface CartItem {
  menuItemId: string;
  name: string;
  foodType: string;
  imageUrl?: string | null;
  variantId?: string | null;
  variantName?: string | null;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

export default function RestaurantPublicWelcomePage() {
  const params = useParams();
  const router = useRouter();
  const slug = (params?.slug as string) || '';

  // Redirect if reserved internal shell route
  useEffect(() => {
    if (slug && RESERVED_SHELL_SLUGS.has(slug.toLowerCase())) {
      router.replace(`/${slug}`);
    }
  }, [slug, router]);

  // Current Step: 1 = Guest & Arrival, 2 = Table Selection, 3 = Menu & Cart, 4 = Confirm Order
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [guestCount, setGuestCount] = useState(2);
  const [arrivalDate, setArrivalDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [arrivalTime, setArrivalTime] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 45);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [specialNotes, setSpecialNotes] = useState('');

  // Menu Category Filter & Search
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [dietFilter, setDietFilter] = useState<'ALL' | 'VEG' | 'NON_VEG'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Public Restaurant Data by Slug
  const { data: restaurantData, isLoading, error } = useQuery({
    queryKey: ['public-restaurant', slug],
    queryFn: async () => {
      if (!slug || RESERVED_SHELL_SLUGS.has(slug.toLowerCase())) return null;
      const res = await apiGet<any>(`/public/pre-order/restaurants/${slug}`);
      return res;
    },
    enabled: !!slug && !RESERVED_SHELL_SLUGS.has(slug.toLowerCase()),
    retry: 1,
  });

  const restaurant = restaurantData?.restaurant;
  const categories = restaurantData?.categories || [];
  const tables = restaurantData?.tables || [];
  const floors = restaurantData?.floors || [];
  const promotions = restaurantData?.promotions || [];

  // Selected Table Details
  const selectedTable = useMemo(() => {
    if (!selectedTableId) return null;
    return tables.find((t: any) => t.id === selectedTableId) || null;
  }, [tables, selectedTableId]);

  // Filtered Menu Items
  const filteredCategories = useMemo(() => {
    return categories
      .map((cat: any) => {
        const filteredItems = (cat.items || []).filter((item: any) => {
          if (dietFilter === 'VEG' && item.foodType !== 'VEG') return false;
          if (dietFilter === 'NON_VEG' && item.foodType === 'VEG') return false;
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            const nameMatch = item.name.toLowerCase().includes(q);
            const descMatch = (item.description || '').toLowerCase().includes(q);
            return nameMatch || descMatch;
          }
          return true;
        });
        return { ...cat, items: filteredItems };
      })
      .filter((cat: any) => {
        if (selectedCategory !== 'ALL' && cat.id !== selectedCategory) return false;
        return cat.items.length > 0;
      });
  }, [categories, selectedCategory, dietFilter, searchQuery]);

  // Cart Calculations
  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
  }, [cart]);

  const taxRates = restaurant?.taxRates || { cgst: 2.5, sgst: 2.5, serviceChargeRate: 5.0, packagingFee: 0 };
  const cgstAmount = (cartSubtotal * (taxRates.cgst || 2.5)) / 100;
  const sgstAmount = (cartSubtotal * (taxRates.sgst || 2.5)) / 100;
  const serviceChargeAmount = (cartSubtotal * (taxRates.serviceChargeRate || 0)) / 100;
  const cartTotal = Math.round(cartSubtotal + cgstAmount + sgstAmount + serviceChargeAmount);

  // Cart Handlers
  const handleAddToCart = (item: any, variant?: any) => {
    const variantId = variant?.id || item.variants?.[0]?.id || null;
    const variantName = variant?.name || item.variants?.[0]?.name || null;
    const price = Number(variant?.price || item.variants?.[0]?.price || 0);

    setCart(prev => {
      const existingIdx = prev.findIndex(
        i => i.menuItemId === item.id && i.variantId === variantId
      );
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx].quantity += 1;
        return updated;
      }
      return [
        ...prev,
        {
          menuItemId: item.id,
          name: item.name,
          foodType: item.foodType,
          imageUrl: item.imageUrl,
          variantId,
          variantName,
          quantity: 1,
          unitPrice: price,
        },
      ];
    });

    toast.success('Added to Pre-Order', `${item.name} added to your tray.`);
  };

  const handleUpdateQuantity = (menuItemId: string, variantId: string | null | undefined, delta: number) => {
    setCart(prev => {
      return prev
        .map(i => {
          if (i.menuItemId === menuItemId && i.variantId === variantId) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  // Submit Pre-Order
  const handlePlacePreOrder = async () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      toast.error('Required Details Missing', 'Please enter your name and contact phone number.');
      setActiveStep(1);
      return;
    }

    if (cart.length === 0) {
      toast.error('Tray is Empty', 'Please select at least one food item for your pre-order.');
      setActiveStep(3);
      return;
    }

    const arrivalTimestamp = new Date(`${arrivalDate}T${arrivalTime}:00`).toISOString();

    setIsSubmitting(true);
    try {
      const payload = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerAddress: customerAddress.trim(),
        guestCount,
        tableId: selectedTableId || undefined,
        expectedArrivalTime: arrivalTimestamp,
        notes: specialNotes.trim() || undefined,
        items: cart.map(it => ({
          menuItemId: it.menuItemId,
          variantId: it.variantId || undefined,
          quantity: it.quantity,
          notes: it.notes,
        })),
      };

      const res = await apiPost<any>(`/public/pre-order/restaurants/${slug}/order`, payload);

      toast.success('Pre-Order Placed! 🎉', 'Redirecting to your live order tracking pass...');

      if (res?.trackingToken) {
        router.push(`/${slug}/track/${res.trackingToken}`);
      } else {
        router.push(`/${slug}`);
      }
    } catch (err: any) {
      toast.error('Pre-Order Failed', err?.response?.data?.error?.message || err?.message || 'Could not submit pre-order.');
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-bold text-zinc-400">Loading restaurant experience...</p>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-white">Restaurant Not Found</h1>
        <p className="text-sm text-zinc-400 max-w-md mt-2 mb-6">
          The restaurant link <span className="font-mono text-amber-400 font-bold">/{slug}</span> does not exist or is currently inactive.
        </p>
        <Button onClick={() => router.push('/')} variant="outline" className="rounded-2xl">
          Go to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-amber-500 selection:text-black">
      {/* ── Top Hero Bar ── */}
      <header className="relative bg-gradient-to-b from-zinc-900 via-zinc-900/90 to-zinc-950 border-b border-zinc-800/80 overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-1/3 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12 relative z-10">
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
            {/* Brand Information */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-5">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-zinc-800 border-2 border-amber-500/40 p-1 shadow-2xl flex items-center justify-center overflow-hidden shrink-0">
                {restaurant.logoUrl ? (
                  <img src={restaurant.logoUrl} alt={restaurant.name} className="w-full h-full object-contain rounded-2xl" />
                ) : (
                  <UtensilsCrossed className="w-12 h-12 text-amber-500" />
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                    ✨ Online Pre-Order & Table Booking
                  </Badge>
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                    🟢 Kitchen Open
                  </Badge>
                </div>

                <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                  {restaurant.name}
                </h1>
                <p className="text-xs sm:text-sm text-zinc-400 max-w-xl line-clamp-2">
                  {restaurant.tagline || restaurant.description}
                </p>

                {/* Contact & Location Strip */}
                <div className="flex items-center justify-center sm:justify-start gap-4 text-xs text-zinc-400 pt-1 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{restaurant.address}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{restaurant.phone}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Value Proposition Card */}
            <div className="bg-zinc-900/90 border border-amber-500/30 p-4 rounded-3xl backdrop-blur-md max-w-xs shadow-xl text-xs space-y-2 text-zinc-300">
              <div className="flex items-center gap-2 font-bold text-amber-400">
                <Sparkles className="w-4 h-4" />
                <span>How Pre-Order Works:</span>
              </div>
              <p className="text-[11px] leading-relaxed text-zinc-400">
                Order food online from home & reserve your table. Our kitchen begins cooking right on time so your feast is piping hot as you arrive!
              </p>
            </div>
          </div>
        </div>

        {/* ── Step Progress Indicator ── */}
        <div className="max-w-6xl mx-auto px-4 pb-4">
          <div className="grid grid-cols-4 gap-2 border-t border-zinc-800/80 pt-4">
            {[
              { num: 1, label: 'Guest & Time', icon: Users },
              { num: 2, label: 'Choose Table', icon: UtensilsCrossed },
              { num: 3, label: 'Select Dishes', icon: ShoppingBag },
              { num: 4, label: 'Confirm & Pass', icon: Check },
            ].map(s => {
              const Icon = s.icon;
              const isPast = activeStep > s.num;
              const isCurrent = activeStep === s.num;
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => {
                    if (s.num < activeStep) setActiveStep(s.num as any);
                  }}
                  className={cn(
                    'flex items-center justify-center gap-2 py-2.5 px-2 rounded-2xl text-xs font-bold transition-all',
                    isCurrent
                      ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                      : isPast
                      ? 'bg-zinc-800/80 text-amber-400 hover:bg-zinc-800'
                      : 'bg-zinc-900/50 text-zinc-600 cursor-not-allowed'
                  )}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">{s.label}</span>
                  <span className="sm:hidden">{s.num}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ── Main Content Area ── */}
      <main className="max-w-6xl mx-auto px-4 py-8 pb-32">
        {/* ═══════════════════════════════════════════════════════════════════════
            STEP 1: GUEST DETAILS & EXPECTED ARRIVAL TIME
        ═══════════════════════════════════════════════════════════════════════ */}
        {activeStep === 1 && (
          <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-black text-white">Your Guest Details & Expected Arrival</h2>
              <p className="text-xs text-zinc-400">
                Tell us when you plan to visit so we can prepare your table and warm your food.
              </p>
            </div>

            <Card className="bg-zinc-900/80 border-zinc-800 rounded-3xl p-6 shadow-xl space-y-5">
              {/* Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-zinc-300">Your Full Name *</label>
                  <Input
                    required
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="mt-1.5 h-11 rounded-2xl bg-zinc-950 border-zinc-800 text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-300">Phone Number (For Order Pass) *</label>
                  <Input
                    required
                    type="tel"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="mt-1.5 h-11 rounded-2xl bg-zinc-950 border-zinc-800 text-sm font-medium font-mono"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="text-xs font-bold text-zinc-300">Your Home Address / Location</label>
                <Input
                  value={customerAddress}
                  onChange={e => setCustomerAddress(e.target.value)}
                  placeholder="e.g. Apartment / Street name, City"
                  className="mt-1.5 h-11 rounded-2xl bg-zinc-950 border-zinc-800 text-sm font-medium"
                />
              </div>

              {/* Number of Guests */}
              <div>
                <label className="text-xs font-bold text-zinc-300">Number of Guests (Pax) *</label>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {[1, 2, 4, 6, 8, 10].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setGuestCount(n)}
                      className={cn(
                        'px-4 py-2 rounded-2xl text-xs font-black transition-all',
                        guestCount === n
                          ? 'bg-amber-500 text-black shadow-md'
                          : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                      )}
                    >
                      👥 {n} {n === 1 ? 'Guest' : 'Guests'}
                    </button>
                  ))}
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={guestCount}
                    onChange={e => setGuestCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-20 h-10 rounded-2xl bg-zinc-950 border-zinc-800 text-center font-bold text-xs"
                  />
                </div>
              </div>

              {/* Arrival Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-zinc-800/80">
                <div>
                  <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" /> Expected Date
                  </label>
                  <Input
                    type="date"
                    required
                    value={arrivalDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => setArrivalDate(e.target.value)}
                    className="mt-1.5 h-11 rounded-2xl bg-zinc-950 border-zinc-800 text-sm font-bold font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" /> Expected Arrival Time
                  </label>
                  <Input
                    type="time"
                    required
                    value={arrivalTime}
                    onChange={e => setArrivalTime(e.target.value)}
                    className="mt-1.5 h-11 rounded-2xl bg-zinc-950 border-zinc-800 text-sm font-bold font-mono"
                  />
                </div>
              </div>

              {/* Quick Arrival Presets */}
              <div className="flex items-center gap-2 flex-wrap text-xs text-zinc-400">
                <span className="font-semibold text-zinc-500">Quick arrival time:</span>
                {[
                  { label: 'In 30 mins', mins: 30 },
                  { label: 'In 45 mins', mins: 45 },
                  { label: 'In 1 hour', mins: 60 },
                  { label: 'In 2 hours', mins: 120 },
                ].map(p => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setMinutes(d.getMinutes() + p.mins);
                      setArrivalTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
                    }}
                    className="px-2.5 py-1 rounded-xl bg-zinc-950 border border-zinc-800 text-[11px] font-bold hover:border-amber-500/50 hover:text-amber-400 transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Special Instructions */}
              <div>
                <label className="text-xs font-bold text-zinc-300">Special Notes / Dietary Preferences</label>
                <Input
                  value={specialNotes}
                  onChange={e => setSpecialNotes(e.target.value)}
                  placeholder="e.g. Less spicy, high chair needed, anniversary dinner"
                  className="mt-1.5 h-11 rounded-2xl bg-zinc-950 border-zinc-800 text-xs font-medium"
                />
              </div>

              {/* Next Button */}
              <Button
                type="button"
                onClick={() => {
                  if (!customerName.trim() || !customerPhone.trim()) {
                    toast.error('Required Details Missing', 'Please provide your name and phone number.');
                    return;
                  }
                  setActiveStep(2);
                }}
                className="w-full h-12 rounded-2xl font-black gap-2 bg-amber-500 hover:bg-amber-600 text-black text-sm shadow-xl"
              >
                <span>Continue to Table Selection</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Card>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            STEP 2: LIVE TABLE LAYOUT & SELECTION
        ═══════════════════════════════════════════════════════════════════════ */}
        {activeStep === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-white">Choose Your Dining Table</h2>
                <p className="text-xs text-zinc-400">
                  Select a preferred table for your group of <strong className="text-amber-400 font-bold">{guestCount} guests</strong>.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => setSelectedTableId(null)}
                  className={cn(
                    'rounded-2xl text-xs font-bold h-9',
                    !selectedTableId ? 'border-amber-500 text-amber-400 bg-amber-500/10' : 'border-zinc-800'
                  )}
                >
                  Let Restaurant Assign Best Table
                </Button>
                <Button
                  onClick={() => setActiveStep(3)}
                  className="rounded-2xl font-bold bg-amber-500 hover:bg-amber-600 text-black text-xs h-9 gap-1.5 shadow-lg"
                >
                  <span>Select Food Menu</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Floor Sections Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tables.map((table: any) => {
                const isSelected = selectedTableId === table.id;
                const isFit = table.capacity >= guestCount;
                const isOccupied = table.status === 'OCCUPIED' || table.status === 'BLOCKED';

                return (
                  <div
                    key={table.id}
                    onClick={() => {
                      if (!isOccupied) {
                        setSelectedTableId(table.id);
                        toast.success('Table Selected', `Reserved Table ${table.name} (${table.capacity}-Seater).`);
                      }
                    }}
                    className={cn(
                      'p-5 rounded-3xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between',
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500 shadow-xl shadow-amber-500/10'
                        : isOccupied
                        ? 'bg-zinc-950/40 border-zinc-900 opacity-60 cursor-not-allowed'
                        : isFit
                        ? 'bg-zinc-900/80 border-zinc-800 hover:border-amber-500/50'
                        : 'bg-zinc-900/40 border-zinc-800/60'
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-base font-black text-white tracking-wide">
                          Table {table.name}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] font-bold rounded-full px-2 py-0.5',
                            table.status === 'AVAILABLE'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                              : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                          )}
                        >
                          {table.status}
                        </Badge>
                      </div>

                      <p className="text-xs text-zinc-400 mt-1">
                        {table.floor?.name || 'Main Dining Floor'} {table.section?.name ? `• ${table.section.name}` : ''}
                      </p>

                      <div className="mt-4 flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-300 bg-zinc-950 px-2.5 py-1 rounded-xl border border-zinc-800">
                          👥 Capacity: {table.capacity} Persons
                        </span>
                        {isFit ? (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-xl">
                            ✓ Fits {guestCount} Guests
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-zinc-500 bg-zinc-950 px-2 py-1 rounded-xl">
                            Smaller Table
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                      <span className="text-zinc-500">Shape: {table.shape || 'Rectangle'}</span>
                      <span className={cn('font-bold', isSelected ? 'text-amber-400' : 'text-zinc-400')}>
                        {isSelected ? '✓ Selected' : 'Tap to Reserve'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-zinc-800">
              <Button variant="outline" onClick={() => setActiveStep(1)} className="rounded-2xl">
                Back to Details
              </Button>
              <Button
                onClick={() => setActiveStep(3)}
                className="rounded-2xl font-bold bg-amber-500 hover:bg-amber-600 text-black gap-2 shadow-lg"
              >
                <span>Proceed to Food Menu ({cart.length} items)</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            STEP 3: FOOD MENU & ITEM CUSTOMIZER
        ═══════════════════════════════════════════════════════════════════════ */}
        {activeStep === 3 && (
          <div className="space-y-6 animate-fade-in">
            {/* Search and Filters Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-900/90 p-3 rounded-3xl border border-zinc-800">
              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('ALL')}
                  className={cn(
                    'px-3.5 py-1.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all',
                    selectedCategory === 'ALL'
                      ? 'bg-amber-500 text-black'
                      : 'bg-zinc-950 text-zinc-400 border border-zinc-800 hover:text-white'
                  )}
                >
                  All Categories
                </button>
                {categories.map((cat: any) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn(
                      'px-3.5 py-1.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all',
                      selectedCategory === cat.id
                        ? 'bg-amber-500 text-black'
                        : 'bg-zinc-950 text-zinc-400 border border-zinc-800 hover:text-white'
                    )}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Diet & Search */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="flex items-center rounded-2xl bg-zinc-950 border border-zinc-800 p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setDietFilter('ALL')}
                    className={cn(
                      'px-2.5 py-1 rounded-xl font-bold transition-all',
                      dietFilter === 'ALL' ? 'bg-zinc-800 text-white' : 'text-zinc-500'
                    )}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setDietFilter('VEG')}
                    className={cn(
                      'px-2.5 py-1 rounded-xl font-bold transition-all flex items-center gap-1',
                      dietFilter === 'VEG' ? 'bg-emerald-600 text-white' : 'text-zinc-500'
                    )}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Veg
                  </button>
                  <button
                    type="button"
                    onClick={() => setDietFilter('NON_VEG')}
                    className={cn(
                      'px-2.5 py-1 rounded-xl font-bold transition-all flex items-center gap-1',
                      dietFilter === 'NON_VEG' ? 'bg-rose-600 text-white' : 'text-zinc-500'
                    )}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" /> Non-Veg
                  </button>
                </div>

                <div className="relative flex-1 sm:w-48">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <Input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search dishes..."
                    className="pl-8 h-9 rounded-2xl bg-zinc-950 border-zinc-800 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Menu Items Categories List */}
            <div className="space-y-8">
              {filteredCategories.map((cat: any) => (
                <div key={cat.id} className="space-y-3">
                  <h3 className="text-lg font-black text-white flex items-center gap-2 border-b border-zinc-800/80 pb-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>{cat.name}</span>
                    <span className="text-xs font-normal text-zinc-500">({cat.items.length} items)</span>
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {cat.items.map((item: any) => {
                      const basePrice = Number(item.variants?.[0]?.price || 0);
                      const isVeg = item.foodType === 'VEG';

                      // Check if item is in cart
                      const inCart = cart.filter(c => c.menuItemId === item.id);
                      const totalQtyInCart = inCart.reduce((s, c) => s + c.quantity, 0);

                      return (
                        <Card key={item.id} className="bg-zinc-900/70 border-zinc-800 rounded-3xl p-4 flex flex-col justify-between hover:border-zinc-700 transition-all">
                          <div className="flex gap-3.5">
                            {/* Item Image */}
                            <div className="w-20 h-20 rounded-2xl bg-zinc-950 border border-zinc-800 overflow-hidden shrink-0 relative flex items-center justify-center">
                              {item.imageUrl ? (
                                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                              ) : (
                                <UtensilsCrossed className="w-8 h-8 text-zinc-700" />
                              )}
                              <div className={cn(
                                'absolute top-1 left-1 px-1 py-0.5 rounded text-[8px] font-bold border',
                                isVeg ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40' : 'bg-rose-950/80 text-rose-400 border-rose-500/40'
                              )}>
                                {isVeg ? 'VEG' : 'NON-VEG'}
                              </div>
                            </div>

                            {/* Item Info */}
                            <div className="space-y-1 flex-1">
                              <h4 className="text-sm font-bold text-white">{item.name}</h4>
                              {item.description && (
                                <p className="text-[11px] text-zinc-400 line-clamp-2">{item.description}</p>
                              )}
                              <div className="text-xs font-mono font-black text-amber-400 pt-1">
                                {formatCurrency(basePrice)}
                              </div>
                            </div>
                          </div>

                          {/* Item Footer / Add to Cart */}
                          <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between">
                            {/* Variants if any */}
                            {item.variants && item.variants.length > 1 ? (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {item.variants.map((v: any) => (
                                  <button
                                    key={v.id}
                                    type="button"
                                    onClick={() => handleAddToCart(item, v)}
                                    className="px-2 py-1 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-amber-500/50 text-[10px] font-bold text-zinc-300"
                                  >
                                    + {v.name} ({formatCurrency(Number(v.price))})
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[10px] text-zinc-500">Standard Portion</span>
                            )}

                            {/* Add / Quantity Button */}
                            {totalQtyInCart > 0 ? (
                              <div className="flex items-center gap-2 bg-zinc-950 border border-amber-500/40 rounded-2xl px-2 py-1">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQuantity(item.id, item.variants?.[0]?.id || null, -1)}
                                  className="text-amber-400 hover:text-white p-0.5"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="font-mono font-black text-xs text-white px-1">
                                  {totalQtyInCart}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleAddToCart(item)}
                                  className="text-amber-400 hover:text-white p-0.5"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => handleAddToCart(item)}
                                className="h-8 px-3 rounded-2xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-black"
                              >
                                <Plus className="w-3.5 h-3.5 mr-1" /> Add
                              </Button>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Review Button Footer */}
            <div className="flex justify-between items-center pt-6 border-t border-zinc-800">
              <Button variant="outline" onClick={() => setActiveStep(2)} className="rounded-2xl">
                Back to Tables
              </Button>
              <Button
                disabled={cart.length === 0}
                onClick={() => setActiveStep(4)}
                className="rounded-2xl font-bold bg-amber-500 hover:bg-amber-600 text-black gap-2 shadow-lg h-11 px-6"
              >
                <span>Review & Confirm Order ({cart.length} items · {formatCurrency(cartTotal)})</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            STEP 4: CONFIRMATION & ORDER PLACEMENT
        ═══════════════════════════════════════════════════════════════════════ */}
        {activeStep === 4 && (
          <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-black text-white">Review Your Pre-Order</h2>
              <p className="text-xs text-zinc-400">
                Please verify your details. Once submitted, your order pass will be generated!
              </p>
            </div>

            <Card className="bg-zinc-900/80 border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-6">
              {/* Summary Header */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs">
                <div>
                  <span className="text-zinc-500 block">Guest Details:</span>
                  <strong className="text-white text-sm">{customerName}</strong>
                  <p className="text-zinc-400 font-mono">{customerPhone}</p>
                  <p className="text-zinc-500 text-[11px] truncate">{customerAddress}</p>
                </div>
                <div className="text-right">
                  <span className="text-zinc-500 block">Expected Arrival:</span>
                  <strong className="text-amber-400 text-sm font-mono">{arrivalDate} · {arrivalTime}</strong>
                  <p className="text-zinc-300 font-bold">👥 {guestCount} Guests</p>
                  <p className="text-zinc-400 text-[11px]">
                    Table: <strong className="text-white">{selectedTable ? `Table ${selectedTable.name}` : 'Auto-Assigned Table'}</strong>
                  </p>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-400 border-b border-zinc-800 pb-2">
                  <span>Selected Dishes ({cart.length})</span>
                  <span>Price</span>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {cart.map(it => (
                    <div key={`${it.menuItemId}-${it.variantId}`} className="flex items-center justify-between text-xs py-1">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'w-2 h-2 rounded-full',
                          it.foodType === 'VEG' ? 'bg-emerald-400' : 'bg-rose-400'
                        )} />
                        <span className="font-bold text-white">{it.quantity}x {it.name}</span>
                        {it.variantName && (
                          <span className="text-[10px] text-zinc-400 font-mono">({it.variantName})</span>
                        )}
                      </div>
                      <span className="font-mono font-bold text-zinc-300">
                        {formatCurrency(it.unitPrice * it.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bill Breakdown */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2 text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span>Item Subtotal:</span>
                  <span className="font-mono">{formatCurrency(cartSubtotal)}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>CGST ({taxRates.cgst || 2.5}%):</span>
                  <span className="font-mono">{formatCurrency(cgstAmount)}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>SGST ({taxRates.sgst || 2.5}%):</span>
                  <span className="font-mono">{formatCurrency(sgstAmount)}</span>
                </div>
                {serviceChargeAmount > 0 && (
                  <div className="flex justify-between text-zinc-400">
                    <span>Service Charge ({taxRates.serviceChargeRate}%):</span>
                    <span className="font-mono">{formatCurrency(serviceChargeAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-base text-white pt-2 border-t border-zinc-800">
                  <span>Total Amount:</span>
                  <span className="font-mono text-amber-400">{formatCurrency(cartTotal)}</span>
                </div>
              </div>

              {/* Policy Alert */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed text-[11px]">
                  <strong>Prepaid Pre-Order Policy:</strong> Your order will appear on the restaurant's live screen. Once accepted, you can pay online and receive live preparation updates!
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveStep(3)}
                  className="rounded-2xl h-12"
                >
                  Edit Menu Items
                </Button>
                <Button
                  type="button"
                  loading={isSubmitting}
                  onClick={handlePlacePreOrder}
                  className="flex-1 rounded-2xl font-black bg-amber-500 hover:bg-amber-600 text-black text-sm h-12 shadow-xl"
                >
                  Place Pre-Order ({formatCurrency(cartTotal)})
                </Button>
              </div>
            </Card>
          </div>
        )}
      </main>

      {/* ── Floating Tray Bar when browsing menu ── */}
      {activeStep === 3 && cart.length > 0 && (
        <div className="fixed bottom-4 inset-x-4 max-w-2xl mx-auto z-40">
          <div className="p-3.5 rounded-3xl bg-amber-500 text-black shadow-2xl flex items-center justify-between border-2 border-amber-400">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-black/15 flex items-center justify-center font-mono font-black text-sm">
                {cart.reduce((s, i) => s + i.quantity, 0)}
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-black/70">Tray Subtotal</p>
                <p className="text-base font-black font-mono leading-none">{formatCurrency(cartTotal)}</p>
              </div>
            </div>

            <Button
              onClick={() => setActiveStep(4)}
              className="rounded-2xl font-black bg-black text-white hover:bg-zinc-900 text-xs h-10 px-5 shadow-lg gap-1.5"
            >
              <span>Review Pre-Order</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
