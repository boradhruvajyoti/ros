'use client';

import React, { useState } from 'react';
import { 
  Building2, 
  Bike, 
  Package, 
  Clock, 
  CheckCircle2, 
  Flame, 
  Layers, 
  Radio, 
  ShieldCheck, 
  ChevronRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

interface CloudBrand {
  id: string;
  name: string;
  cuisine: string;
  activeOrders: number;
  rating: number;
  isOpen: boolean;
}

interface DispatchOrder {
  id: string;
  orderNumber: string;
  brand: string;
  aggregator: 'SWIGGY' | 'ZOMATO' | 'DIRECT_APP' | 'UBER_EATS';
  items: string[];
  pickupBay: string;
  riderName?: string;
  riderPhone?: string;
  status: 'PREPARING' | 'PACKAGED' | 'READY_FOR_PICKUP' | 'DISPATCHED';
  prepTimeRemainingMins: number;
}

const BRANDS: CloudBrand[] = [
  { id: 'BRD-01', name: 'Dum Darbar Biryani Co.', cuisine: 'Hyderabadi & Mughlai', activeOrders: 8, rating: 4.6, isOpen: true },
  { id: 'BRD-02', name: 'Crust Craft Neapolitan Pizza', cuisine: 'Woodfired Pizza & Calzones', activeOrders: 5, rating: 4.7, isOpen: true },
  { id: 'BRD-03', name: 'Wok & Roll Street Asian', cuisine: 'Pan-Asian & Dim Sums', activeOrders: 6, rating: 4.5, isOpen: true },
  { id: 'BRD-04', name: 'Sweet Alchemy Desserts', cuisine: 'Pastries & Cheesecakes', activeOrders: 2, rating: 4.8, isOpen: true }
];

const INITIAL_ORDERS: DispatchOrder[] = [
  {
    id: 'DSP-101',
    orderNumber: '#SW-8891',
    brand: 'Dum Darbar Biryani Co.',
    aggregator: 'SWIGGY',
    items: ['2x Mutton Dum Biryani', '1x Mirchi Ka Salan', '2x Thums Up'],
    pickupBay: 'Bay #3 (South Shelf)',
    riderName: 'Mahesh Kumar',
    riderPhone: '+91 98765 11223',
    status: 'READY_FOR_PICKUP',
    prepTimeRemainingMins: 0
  },
  {
    id: 'DSP-102',
    orderNumber: '#ZM-4412',
    brand: 'Crust Craft Neapolitan Pizza',
    aggregator: 'ZOMATO',
    items: ['1x Truffle Burrata 12"', '1x Spicy Pepperoni 12"', '1x Garlic Knots'],
    pickupBay: 'Bay #1 (Hot Hold Station)',
    riderName: 'Vikrant Rathi',
    riderPhone: '+91 97112 33445',
    status: 'PACKAGED',
    prepTimeRemainingMins: 2
  },
  {
    id: 'DSP-103',
    orderNumber: '#DIR-092',
    brand: 'Wok & Roll Street Asian',
    aggregator: 'DIRECT_APP',
    items: ['2x Chili Garlic Noodles', '1x Steamed Truffle Edamame Dim Sums'],
    pickupBay: 'Bay #4 (Main Dispatch)',
    status: 'PREPARING',
    prepTimeRemainingMins: 7
  },
  {
    id: 'DSP-104',
    orderNumber: '#SW-8895',
    brand: 'Sweet Alchemy Desserts',
    aggregator: 'SWIGGY',
    items: ['1x Belgian Dark Truffle Cake', '2x New York Cheesecake Slice'],
    pickupBay: 'Bay #2 (Cold Chill Bay)',
    riderName: 'Imran Ali',
    riderPhone: '+91 98200 44321',
    status: 'READY_FOR_PICKUP',
    prepTimeRemainingMins: 0
  }
];

export default function DarkKitchenPage() {
  const [brands, setBrands] = useState<CloudBrand[]>(BRANDS);
  const [orders, setOrders] = useState<DispatchOrder[]>(INITIAL_ORDERS);
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');

  const handleUpdateStatus = (id: string, newStatus: DispatchOrder['status']) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
  };

  const filteredOrders = selectedBrand === 'ALL'
    ? orders
    : orders.filter(o => o.brand === selectedBrand);

  const activeOrdersCount = orders.filter(o => o.status !== 'DISPATCHED').length;
  const readyForPickupCount = orders.filter(o => o.status === 'READY_FOR_PICKUP').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Building2 className="w-7 h-7 text-indigo-400" /> Dark Kitchen & Cloud Brand Dispatch Matrix
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Ghost Kitchen Controller
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Centralized production line dispatching across 4+ virtual cloud brands with automated rider bay routing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl p-1">
            <button
              onClick={() => setSelectedBrand('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedBrand === 'ALL' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Cloud Brands
            </button>
            {brands.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedBrand(b.name)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  selectedBrand === b.name ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                {b.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Brand Orders</span>
            <Package className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">{activeOrdersCount} Live Orders</div>
            <div className="text-xs text-indigo-400 mt-1 font-medium">
              4 Virtual Brands Online
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ready in Rider Bays</span>
            <Bike className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-300">{readyForPickupCount} Packed</div>
            <div className="text-xs text-emerald-400/90 mt-1">
              Riders arriving at designated bays
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Dark Kitchen SLA</span>
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-amber-300">11.4 mins</div>
            <div className="text-xs text-slate-400 mt-1">
              Ticket-to-Rider handoff speed
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Packaging QA Score</span>
            <ShieldCheck className="w-5 h-5 text-teal-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-teal-300">99.6%</div>
            <div className="text-xs text-slate-400 mt-1">
              Tamper-evident seal verified
            </div>
          </div>
        </div>
      </div>

      {/* Dispatch Orders Cards */}
      <div className="space-y-4">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Live Dispatch Pipeline ({filteredOrders.length} Orders)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredOrders.map((order) => {
            const isReady = order.status === 'READY_FOR_PICKUP';
            const isPackaged = order.status === 'PACKAGED';
            const isDispatched = order.status === 'DISPATCHED';

            return (
              <div
                key={order.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                  isReady 
                    ? 'bg-emerald-950/20 border-emerald-500/60 ring-1 ring-emerald-500/20' 
                    : 'bg-slate-900/60 border-slate-800/80'
                } ${isDispatched ? 'opacity-50' : ''}`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-white">{order.orderNumber}</span>
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                      {order.aggregator}
                    </span>
                  </div>

                  <div className="text-xs font-bold text-indigo-300 mt-2">{order.brand}</div>
                  <div className="text-[11px] font-mono text-emerald-400 mt-0.5">{order.pickupBay}</div>

                  <div className="my-3 py-2 border-y border-slate-800 space-y-1">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="text-xs text-slate-300 font-medium truncate">
                        • {item}
                      </div>
                    ))}
                  </div>

                  {order.riderName && (
                    <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-3">
                      <Bike className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Rider: <strong>{order.riderName}</strong></span>
                    </div>
                  )}
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-800/60">
                  {order.status === 'PREPARING' && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'PACKAGED')}
                      className="w-full py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold border border-amber-500/40 transition flex items-center justify-center gap-1.5"
                    >
                      <Package className="w-3.5 h-3.5" /> Mark Packaged
                    </button>
                  )}

                  {order.status === 'PACKAGED' && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'READY_FOR_PICKUP')}
                      className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/20"
                    >
                      <Bike className="w-3.5 h-3.5" /> Move to Rider Bay
                    </button>
                  )}

                  {order.status === 'READY_FOR_PICKUP' && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'DISPATCHED')}
                      className="w-full py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Handed to Delivery Rider
                    </button>
                  )}

                  {order.status === 'DISPATCHED' && (
                    <div className="text-center py-1 text-xs font-semibold text-slate-500 flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Dispatched
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
