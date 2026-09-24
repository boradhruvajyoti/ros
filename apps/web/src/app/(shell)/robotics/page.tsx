'use client';

import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  BatteryCharging, 
  Battery, 
  Navigation, 
  RotateCcw, 
  Send, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Zap, 
  Layers,
  Sparkles,
  Play
} from 'lucide-react';

interface RobotUnit {
  id: string;
  name: string;
  model: string;
  batteryPercent: number;
  status: 'IDLE_DOCK' | 'DELIVERING_TO_TABLE' | 'RETURNING_TO_KITCHEN' | 'OBSTACLE_PAUSED';
  currentLocation: string;
  targetDestination?: string;
  assignedOrder?: string;
  deliveredTripsToday: number;
  uptimeHours: number;
}

const INITIAL_ROBOTS: RobotUnit[] = [];

export default function RoboticsPage() {
  const [robots, setRobots] = useState<RobotUnit[]>(INITIAL_ROBOTS);
  const [selectedRobot, setSelectedRobot] = useState<RobotUnit | null>(null);
  const [dispatchTable, setDispatchTable] = useState('Table 7');
  const [dispatchToast, setDispatchToast] = useState<string | null>(null);

  const handleDispatch = (robotId: string) => {
    setRobots(prev => prev.map(r => {
      if (r.id === robotId) {
        return {
          ...r,
          status: 'DELIVERING_TO_TABLE',
          targetDestination: dispatchTable,
          assignedOrder: `KOT-Express (#${Math.floor(4100 + Math.random() * 50)})`,
          deliveredTripsToday: r.deliveredTripsToday + 1
        };
      }
      return r;
    }));

    setDispatchToast(`Dispatched robot to ${dispatchTable}! LiDAR path clearance active.`);
    setTimeout(() => setDispatchToast(null), 4000);
  };

  const handleRecall = (robotId: string) => {
    setRobots(prev => prev.map(r => {
      if (r.id === robotId) {
        return {
          ...r,
          status: 'RETURNING_TO_KITCHEN',
          targetDestination: 'Kitchen Dock',
          assignedOrder: undefined
        };
      }
      return r;
    }));

    setDispatchToast(`Robot returning to kitchen dock.`);
    setTimeout(() => setDispatchToast(null), 3000);
  };

  const totalDeliveries = robots.reduce((acc, r) => acc + r.deliveredTripsToday, 0);
  const avgBattery = robots.length > 0 ? Math.round(robots.reduce((acc, r) => acc + r.batteryPercent, 0) / robots.length) : 0;

  return (
    <div className="space-y-6">
      {/* Toast */}
      {dispatchToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl bg-indigo-600 text-white shadow-2xl border border-indigo-400/30 animate-in slide-in-from-bottom-5">
          <Bot className="w-5 h-5 animate-bounce" />
          <span className="text-sm font-medium">{dispatchToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Bot className="w-7 h-7 text-cyan-400" /> Autonomous Delivery Robots & Cobot Fleet
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              LiDAR SLAM Multi-Robot Fleet
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Real-time telemetry, table waypoint routing, obstacle avoidance logs, and automated return-to-dock triggers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-xs font-medium text-slate-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            ROS Fleet Core: <strong className="text-cyan-300 font-mono">SLAM 3D Navigation Online</strong>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Fleet Size</span>
            <Bot className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">{robots.length} Units Online</div>
            <div className="text-xs text-cyan-400 mt-1 font-medium">
              Zero collision incidents
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Food Trips (Today)</span>
            <Zap className="w-5 h-5 text-amber-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-amber-300">{totalDeliveries} Table Trips</div>
            <div className="text-xs text-slate-400 mt-1">
              -42 km waiter foot travel saved
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Average Battery Health</span>
            <BatteryCharging className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-300">{avgBattery}% Charged</div>
            <div className="text-xs text-emerald-400/90 mt-1">
              Auto-dock threshold at 20%
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Obstacle Avoidance SLA</span>
            <ShieldCheck className="w-5 h-5 text-purple-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-purple-300">99.8%</div>
            <div className="text-xs text-slate-400 mt-1">
              Sub-50ms reactive LiDAR halt
            </div>
          </div>
        </div>
      </div>

      {/* Fleet Dashboard */}
      {robots.length === 0 ? (
        <div className="py-16 text-center space-y-3 rounded-3xl border border-dashed border-slate-800 bg-slate-900/40 p-8">
          <div className="w-16 h-16 rounded-3xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto text-cyan-400">
            <Bot className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-lg font-bold text-white">No Robot Units Paired</h3>
            <p className="text-xs text-slate-400">
              Pair your BellaBot, PuduBot, or Keenon diner robots via local network bridge or ROS fleet gateway.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Robot Cards (Left 5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Robot Units ({robots.length})
            </h2>

            <div className="space-y-3">
              {robots.map((robot) => {
                const isSelected = selectedRobot?.id === robot.id;
                const isDelivering = robot.status === 'DELIVERING_TO_TABLE';
                const isIdle = robot.status === 'IDLE_DOCK';

                return (
                  <div
                    key={robot.id}
                    onClick={() => setSelectedRobot(robot)}
                    className={`cursor-pointer p-5 rounded-2xl border transition-all ${
                      isSelected
                        ? 'bg-slate-800 border-cyan-500/80 shadow-xl ring-1 ring-cyan-500/30'
                        : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-cyan-400">{robot.id}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isDelivering ? 'bg-amber-500/20 text-amber-300 animate-pulse' : isIdle ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {robot.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="text-base font-bold text-white mt-1.5">{robot.name}</div>
                    <div className="text-xs text-slate-400">{robot.model}</div>

                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800 text-xs">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Battery</span>
                        <span className="font-semibold text-emerald-400 flex items-center gap-1">
                          <Battery className="w-3.5 h-3.5" /> {robot.batteryPercent}%
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Location</span>
                        <span className="font-semibold text-slate-300 truncate block">{robot.currentLocation}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Trips Today</span>
                        <span className="font-semibold text-white">{robot.deliveredTripsToday}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Robot Telemetry & Waypoint Control (Right 7 cols) */}
          {selectedRobot && (
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl shadow-2xl space-y-6">
                {/* Telemetry Header */}
                <div className="flex items-start justify-between pb-4 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <Bot className="w-6 h-6 text-cyan-400" />
                      <h3 className="text-lg font-bold text-white">{selectedRobot.name}</h3>
                    </div>
                    <div className="text-xs text-slate-400 mt-1 font-mono">{selectedRobot.model} • Firmware v4.8.2</div>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-bold text-emerald-400">{selectedRobot.batteryPercent}%</div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Lithium Polymer Battery</div>
                  </div>
                </div>

                {/* Live Navigation Mission */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Navigation className="w-4 h-4 text-cyan-400" /> Current Navigation Waypoint
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-500">Current Position:</span>
                      <div className="text-sm font-bold text-white mt-0.5">{selectedRobot.currentLocation}</div>
                    </div>
                    <div>
                      <span className="text-slate-500">Destination:</span>
                      <div className="text-sm font-bold text-cyan-300 mt-0.5">{selectedRobot.targetDestination || 'At Dock'}</div>
                    </div>
                  </div>

                  {selectedRobot.assignedOrder && (
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                      <span className="text-slate-400">Carrying Payload:</span>
                      <div className="font-semibold text-amber-300 mt-0.5">{selectedRobot.assignedOrder}</div>
                    </div>
                  )}
                </div>

                {/* Waypoint Dispatch Controls */}
                <div className="space-y-3 pt-2">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Manual Waypoint Dispatch
                  </div>

                  <div className="flex items-center gap-3">
                    <select
                      value={dispatchTable}
                      onChange={(e) => setDispatchTable(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                    >
                      {['Table 1', 'Table 4', 'Table 7', 'Table 12', 'Table 14', 'VIP Booth 2', 'Patio Deck A'].map(t => (
                        <option key={t} value={t}>{t} (Auto Route via LiDAR)</option>
                      ))}
                    </select>

                    <button
                      onClick={() => handleDispatch(selectedRobot.id)}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 transition cursor-pointer"
                    >
                      <Send className="w-4 h-4" /> Dispatch Food
                    </button>

                    <button
                      onClick={() => handleRecall(selectedRobot.id)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" /> Recall to Dock
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
