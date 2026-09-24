'use client';

import React, { useState, useEffect } from 'react';
import { 
  PhoneCall, 
  Mic, 
  Bot, 
  User, 
  CheckCircle2, 
  Clock, 
  ShoppingBag, 
  Sparkles, 
  Volume2, 
  Play, 
  PhoneOff,
  PhoneForwarded,
  Layers,
  Calendar,
  AlertCircle
} from 'lucide-react';

interface CallTranscriptItem {
  speaker: 'BOT' | 'CALLER';
  text: string;
  timestamp: string;
}

interface VoiceSession {
  id: string;
  callerNumber: string;
  callerName: string;
  intent: 'TAKEOUT_ORDER' | 'TABLE_BOOKING' | 'GENERAL_INQUIRY';
  status: 'ACTIVE' | 'ORDER_CAPTURED' | 'COMPLETED';
  duration: string;
  confidenceScore: number;
  transcript: CallTranscriptItem[];
  orderSummary?: {
    items: string[];
    total: number;
    pickupTime: string;
  };
}

const INITIAL_CALLS: VoiceSession[] = [
  {
    id: 'CALL-901',
    callerNumber: '+91 98201 44521',
    callerName: 'Rohan Mehra',
    intent: 'TAKEOUT_ORDER',
    status: 'ORDER_CAPTURED',
    duration: '1m 54s',
    confidenceScore: 98.2,
    transcript: [
      { speaker: 'BOT', text: 'Namaste! Welcome to Spice Garden. Are you looking to order for pickup, delivery, or reserve a table?', timestamp: '00:02' },
      { speaker: 'CALLER', text: 'Hi, I would like to place a pickup order for 2 Hyderabadi Dum Biryanis and 1 Butter Naan.', timestamp: '00:15' },
      { speaker: 'BOT', text: 'Sure! 2 Hyderabadi Dum Biryanis and 1 Butter Naan. Any spice preferences or extra raita?', timestamp: '00:28' },
      { speaker: 'CALLER', text: 'Medium spice please, and add one Burani Raita.', timestamp: '00:40' },
      { speaker: 'BOT', text: 'Got it. Total is ₹1,120. It will be ready in 25 minutes. Shall I confirm this order?', timestamp: '00:55' },
      { speaker: 'CALLER', text: 'Yes, please confirm.', timestamp: '01:05' },
      { speaker: 'BOT', text: 'Your order #VOICE-902 is confirmed! We will send an SMS payment link shortly.', timestamp: '01:14' }
    ],
    orderSummary: {
      items: ['2x Hyderabadi Dum Biryani (Medium)', '1x Butter Naan', '1x Burani Raita'],
      total: 1120,
      pickupTime: '25 mins (7:45 PM)'
    }
  },
  {
    id: 'CALL-902',
    callerNumber: '+91 97118 90022',
    callerName: 'Kavita Iyer',
    intent: 'TABLE_BOOKING',
    status: 'ACTIVE',
    duration: '0m 42s',
    confidenceScore: 96.5,
    transcript: [
      { speaker: 'BOT', text: 'Namaste! Welcome to Spice Garden. How can I help you this evening?', timestamp: '00:02' },
      { speaker: 'CALLER', text: 'Hello, I want to reserve a table for 4 people tonight around 8:30 PM.', timestamp: '00:14' },
      { speaker: 'BOT', text: 'We have a pleasant indoor booth available at 8:30 PM for 4 guests. May I reserve under the name Kavita?', timestamp: '00:26' },
      { speaker: 'CALLER', text: 'Yes, please. Also, it is an anniversary dinner.', timestamp: '00:38' }
    ]
  }
];

export default function VoiceAgentPage() {
  const [calls, setCalls] = useState<VoiceSession[]>(INITIAL_CALLS);
  const [selectedCall, setSelectedCall] = useState<VoiceSession>(INITIAL_CALLS[0]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [audioWaves, setAudioWaves] = useState<number[]>([40, 65, 80, 50, 90, 75, 45, 60, 85, 95, 70, 50, 60, 40]);

  // Animate audio waveform
  useEffect(() => {
    const interval = setInterval(() => {
      setAudioWaves(prev => prev.map(() => Math.floor(20 + Math.random() * 80)));
    }, 200);
    return () => clearInterval(interval);
  }, []);

  const handleSimulateNewCall = () => {
    setIsSimulating(true);
    const newCall: VoiceSession = {
      id: `CALL-${Math.floor(905 + Math.random() * 90)}`,
      callerNumber: '+91 99304 88712',
      callerName: 'Aditya Sen',
      intent: 'TAKEOUT_ORDER',
      status: 'ACTIVE',
      duration: '0m 18s',
      confidenceScore: 97.8,
      transcript: [
        { speaker: 'BOT', text: 'Namaste! Welcome to Spice Garden. Are you ordering for takeaway or table booking?', timestamp: '00:02' },
        { speaker: 'CALLER', text: 'Hi! Do you have the Truffle Galouti Kebab and Dal Makhani ready for quick takeaway?', timestamp: '00:10' },
        { speaker: 'BOT', text: 'Yes! Both are freshly prepped. Would you like 2 Garlic Butter Naans with that?', timestamp: '00:16' }
      ]
    };

    setTimeout(() => {
      setCalls(prev => [newCall, ...prev]);
      setSelectedCall(newCall);
      setIsSimulating(false);
    }, 800);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <PhoneCall className="w-7 h-7 text-emerald-400" /> AI Conversational Phone & Voice Agent
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Autonomous Voice LLM
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            24/7 autonomous telephone order capture, table reservations, NLP allergen checking & instant POS cart injection.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSimulateNewCall}
            disabled={isSimulating}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition"
          >
            <PhoneCall className="w-4 h-4 animate-pulse" /> Simulate Inbound Call
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Voice Resolution Rate</span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Bot className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">93.4%</div>
            <div className="text-xs text-emerald-400 mt-1 font-medium">
              Zero staff human intervention needed
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Phone Lines</span>
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
              <PhoneForwarded className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-indigo-300">4 Lines Live</div>
            <div className="text-xs text-slate-400 mt-1">
              SIP Trunking: Latency 142ms
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Call Duration</span>
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-purple-300">1m 12s</div>
            <div className="text-xs text-slate-400 mt-1">
              -60% faster than manual cashier calls
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Voice Orders (Today)</span>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-amber-300">₹46,800</div>
            <div className="text-xs text-amber-400/90 mt-1">
              38 Takeout Orders Captured
            </div>
          </div>
        </div>
      </div>

      {/* Main Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Calls Roster (Left 4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Inbound Call Stream ({calls.length})
          </h2>

          <div className="space-y-2.5">
            {calls.map((call) => {
              const isSelected = selectedCall?.id === call.id;
              return (
                <div
                  key={call.id}
                  onClick={() => setSelectedCall(call)}
                  className={`cursor-pointer p-4 rounded-2xl border transition-all ${
                    isSelected
                      ? 'bg-slate-800 border-emerald-500/80 shadow-lg ring-1 ring-emerald-500/30'
                      : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-emerald-400">{call.callerNumber}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      call.status === 'ACTIVE'
                        ? 'bg-emerald-500/20 text-emerald-300 animate-pulse'
                        : 'bg-slate-800 text-slate-300'
                    }`}>
                      {call.status}
                    </span>
                  </div>

                  <div className="text-sm font-bold text-white mt-1">{call.callerName}</div>

                  <div className="flex items-center justify-between text-xs text-slate-400 mt-2 pt-2 border-t border-slate-800">
                    <span>{call.intent.replace('_', ' ')}</span>
                    <span className="font-mono">{call.duration}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Call Feed & Transcript (Right 8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl shadow-2xl space-y-6">
            {/* Top Waveform Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-950/70 border border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Mic className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{selectedCall.callerName}</span>
                    <span className="text-xs font-normal text-slate-400 font-mono">({selectedCall.callerNumber})</span>
                  </div>
                  <div className="text-xs text-emerald-400 flex items-center gap-1 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5" /> NLP Speech Confidence: {selectedCall.confidenceScore}%
                  </div>
                </div>
              </div>

              {/* Live Audio Waveform */}
              <div className="flex items-center gap-1 h-8 px-4 bg-slate-900/80 rounded-xl border border-slate-800">
                {audioWaves.map((height, idx) => (
                  <div
                    key={idx}
                    className="w-1 bg-emerald-400 rounded-full transition-all duration-150"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
            </div>

            {/* Conversational Transcript Feed */}
            <div className="space-y-3 max-h-[340px] overflow-y-auto pr-2">
              {selectedCall.transcript.map((msg, idx) => {
                const isBot = msg.speaker === 'BOT';
                return (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 ${isBot ? '' : 'flex-row-reverse'}`}
                  >
                    <div className={`p-2 rounded-xl shrink-0 ${
                      isBot 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                    }`}>
                      {isBot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>

                    <div className={`max-w-[75%] p-3.5 rounded-2xl text-xs space-y-1 ${
                      isBot 
                        ? 'bg-slate-800/80 text-slate-200 border border-slate-700/60 rounded-tl-sm' 
                        : 'bg-indigo-600/30 text-indigo-100 border border-indigo-500/30 rounded-tr-sm'
                    }`}>
                      <div className="flex items-center justify-between gap-4 text-[10px] text-slate-400">
                        <span className="font-bold uppercase tracking-wider">{isBot ? 'ROS AI Phone Agent' : selectedCall.callerName}</span>
                        <span className="font-mono">{msg.timestamp}</span>
                      </div>
                      <p className="leading-relaxed text-slate-100">{msg.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Extracted POS Order Card */}
            {selectedCall.orderSummary && (
              <div className="p-4 rounded-xl bg-slate-950/80 border border-emerald-500/30 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Order Extracted & Synced to Kitchen POS
                  </span>
                  <span className="text-slate-400 font-mono">Pickup: {selectedCall.orderSummary.pickupTime}</span>
                </div>

                <div className="space-y-1">
                  {selectedCall.orderSummary.items.map((item, idx) => (
                    <div key={idx} className="text-xs text-slate-300 font-medium">
                      • {item}
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-800 pt-2 flex items-center justify-between text-sm font-bold text-white">
                  <span>Total Amount</span>
                  <span className="text-emerald-400">₹{selectedCall.orderSummary.total.toLocaleString('en-IN')}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
