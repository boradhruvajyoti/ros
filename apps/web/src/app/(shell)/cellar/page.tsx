'use client';

import React, { useState } from 'react';
import { 
  Wine, 
  Thermometer, 
  Droplets, 
  Sparkles, 
  Layers, 
  Search, 
  CheckCircle2, 
  DollarSign, 
  Award,
  ChevronRight,
  ShieldCheck,
  Compass
} from 'lucide-react';

interface WineBottle {
  id: string;
  name: string;
  winery: string;
  vintage: number;
  region: string;
  country: string;
  varietal: string;
  rfidBinRack: string;
  stockCount: number;
  bottlePriceINR: number;
  sommelierPairings: string[];
  tasteNotes: string;
}

const CELLAR_WINES: WineBottle[] = [
  {
    id: 'WINE-01',
    name: 'Château Margaux Premier Grand Cru',
    winery: 'Château Margaux',
    vintage: 2015,
    region: 'Bordeaux (Margaux)',
    country: 'France',
    varietal: 'Cabernet Sauvignon / Merlot Blend',
    rfidBinRack: 'Vault Rack A-04 (Zone 1)',
    stockCount: 14,
    bottlePriceINR: 78000,
    sommelierPairings: ['Wagyu Ribeye', 'Slow Braised Lamb Shank', 'Aged Truffle Gouda'],
    tasteNotes: 'Vibrant blackcurrant, cedar wood, violet florals with velvety structured tannins.'
  },
  {
    id: 'WINE-02',
    name: 'Sula Rasa Cabernet Sauvignon Reserve',
    winery: 'Sula Vineyards',
    vintage: 2020,
    region: 'Nashik Valley',
    country: 'India',
    varietal: 'Cabernet Sauvignon',
    rfidBinRack: 'Rack B-12 (Zone 2)',
    stockCount: 38,
    bottlePriceINR: 4200,
    sommelierPairings: ['Hyderabadi Dum Biryani', 'Mutton Galouti Kebab', 'Tandoori Raan'],
    tasteNotes: 'Rich notes of ripe blackberries, dark chocolate, tobacco, aged 14 months in French oak.'
  },
  {
    id: 'WINE-03',
    name: 'Cloudy Bay Sauvignon Blanc',
    winery: 'Cloudy Bay Vineyards',
    vintage: 2022,
    region: 'Marlborough',
    country: 'New Zealand',
    varietal: 'Sauvignon Blanc',
    rfidBinRack: 'Chilled Vault C-01 (10.5°C)',
    stockCount: 22,
    bottlePriceINR: 8500,
    sommelierPairings: ['Pan Seared Sea Bass', 'Burrata with Heirloom Tomatoes', 'Lemon Butter Prawns'],
    tasteNotes: 'Zesty lime, passionfruit, lemongrass, vibrant acidity with a crisp mineral finish.'
  },
  {
    id: 'WINE-04',
    name: 'Dom Pérignon Vintage Brut Champagne',
    winery: 'Moët & Chandon',
    vintage: 2013,
    region: 'Champagne',
    country: 'France',
    varietal: 'Chardonnay / Pinot Noir',
    rfidBinRack: 'Champagne Cellar D-02 (9.0°C)',
    stockCount: 9,
    bottlePriceINR: 34000,
    sommelierPairings: ['Lobster Thermidor', 'Caviar Blinis', 'Truffle French Fries'],
    tasteNotes: 'Aromas of toasted brioche, white peach, crushed stone minerals and microscopic effervescence.'
  }
];

export default function CellarPage() {
  const [wines, setWines] = useState<WineBottle[]>(CELLAR_WINES);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWine, setSelectedWine] = useState<WineBottle>(CELLAR_WINES[0]);
  const [dishPairingSearch, setDishPairingSearch] = useState('');

  const filteredWines = wines.filter(w => 
    w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.varietal.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.country.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalBottles = wines.reduce((acc, w) => acc + w.stockCount, 0);
  const totalValuation = wines.reduce((acc, w) => acc + (w.stockCount * w.bottlePriceINR), 0);

  const pairedWines = dishPairingSearch 
    ? wines.filter(w => w.sommelierPairings.some(p => p.toLowerCase().includes(dishPairingSearch.toLowerCase())))
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Wine className="w-7 h-7 text-rose-400" /> Digital Sommelier & Smart Wine Cellar Vault
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
              RFID Climate Vault
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            RFID bin rack locator, real-time aging climate telemetry, and AI sommelier food-and-wine pairing engine.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-xs font-medium text-slate-300 flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-rose-300">
              <Thermometer className="w-4 h-4" /> 13.2°C
            </div>
            <span className="text-slate-600">|</span>
            <div className="flex items-center gap-1.5 text-sky-300">
              <Droplets className="w-4 h-4" /> 68% Humidity
            </div>
          </div>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cellar Inventory Value</span>
            <DollarSign className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">₹{(totalValuation / 100000).toFixed(2)} Lakhs</div>
            <div className="text-xs text-emerald-400 mt-1 font-medium">
              {totalBottles} Certified Rare Vintages
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Wine Labels</span>
            <Wine className="w-5 h-5 text-rose-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-rose-300">{wines.length} Labels</div>
            <div className="text-xs text-slate-400 mt-1">
              Bordeaux, Nashik, Marlborough, Champagne
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">RFID Bin Accuracy</span>
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-indigo-300">100% Tracked</div>
            <div className="text-xs text-slate-400 mt-1">
              Zero bottle loss or shrinkage
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">AI Sommelier Matches</span>
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-amber-300">98.4% CSAT</div>
            <div className="text-xs text-amber-400/90 mt-1">
              High guest satisfaction on pairings
            </div>
          </div>
        </div>
      </div>

      {/* Main Cellar Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Wine Inventory Table (Left 7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Search vintage, varietal, region..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          <div className="space-y-3">
            {filteredWines.map((wine) => {
              const isSelected = selectedWine.id === wine.id;
              return (
                <div
                  key={wine.id}
                  onClick={() => setSelectedWine(wine)}
                  className={`cursor-pointer p-5 rounded-2xl border transition-all ${
                    isSelected
                      ? 'bg-slate-800 border-rose-500/80 shadow-xl ring-1 ring-rose-500/30'
                      : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-rose-400">{wine.vintage} Vintage</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      ₹{wine.bottlePriceINR.toLocaleString('en-IN')} / btl
                    </span>
                  </div>

                  <div className="text-base font-bold text-white mt-1.5">{wine.name}</div>
                  <div className="text-xs text-slate-400">{wine.winery} • {wine.region}, {wine.country}</div>

                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Varietal</span>
                      <span className="font-semibold text-slate-300 truncate block">{wine.varietal}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">RFID Bin Rack</span>
                      <span className="font-semibold text-rose-300 truncate block">{wine.rfidBinRack}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Stock Count</span>
                      <span className="font-semibold text-white">{wine.stockCount} Bottles</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Sommelier Food Pairing & Tasting Notes (Right 5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl shadow-2xl space-y-5">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">AI Sommelier Pairing Assistant</h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">Instant pairing recommendations for guest orders</p>
            </div>

            {/* Dish Query Input */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <label className="text-xs text-slate-400 block font-semibold">Test Food Pairing for Dish:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Biryani, Ribeye, Sea Bass..."
                  value={dishPairingSearch}
                  onChange={(e) => setDishPairingSearch(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {pairedWines.length > 0 && (
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <div className="text-[11px] font-bold text-emerald-400">Recommended Pairing Matches:</div>
                  {pairedWines.map(pw => (
                    <div key={pw.id} className="text-xs text-slate-200 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                      • <strong>{pw.name}</strong> ({pw.vintage}) — ₹{pw.bottlePriceINR}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Wine Tasting Notes */}
            <div className="space-y-3 pt-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Sommelier Tasting Dossier: {selectedWine.name}
              </div>

              <div className="p-4 rounded-xl bg-slate-950/80 border border-rose-500/30 text-xs text-slate-200 leading-relaxed">
                {selectedWine.tasteNotes}
              </div>

              <div className="space-y-1.5 pt-1">
                <span className="text-xs text-slate-400 font-semibold block">Curated Food Pairings:</span>
                {selectedWine.sommelierPairings.map((p, idx) => (
                  <div key={idx} className="text-xs text-rose-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>{p}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
