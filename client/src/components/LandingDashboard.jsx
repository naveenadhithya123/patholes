import React from 'react';
import { Map, Camera, Search, Activity, ShieldCheck, MapPin, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';

export default function LandingDashboard({ onSelectView, defects = [] }) {
  const criticalCount = defects.filter(d => d.severity === 'CRITICAL').length;
  const totalCount = defects.length || 24;

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      
      {/* Top Hero Branding */}
      <div className="text-center space-y-4 pt-4 sm:pt-8">
        <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
          <Activity className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
          <span>Smart City Road Asset & Defect Management</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white">
          Infra <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">AI</span>
        </h1>

        <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto font-normal leading-relaxed">
          Autonomous road safety platform featuring real-time computer vision defect tracking, spatial GIS mapping, and on-demand civic reporting.
        </p>
      </div>

      {/* THE 3 CORE BUTTONS (HERO ACTION CARDS) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-10 max-w-5xl mx-auto w-full">
        
        {/* BUTTON 1: MAP VIEW */}
        <button
          type="button"
          onClick={() => onSelectView('map')}
          className="group relative p-6 sm:p-7 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-blue-500/50 transition-all duration-300 text-left shadow-xl hover:shadow-2xl hover:shadow-blue-500/10 flex flex-col justify-between hover:-translate-y-1"
        >
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-md">
              <Map className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-white group-hover:text-blue-300 transition-colors">
                Map View
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Interactive geographic GIS map displaying road asset defects, traffic corridor overlays, and municipal priority heatmaps.
              </p>
            </div>
          </div>

          <div className="pt-6 flex items-center space-x-2 text-xs font-bold text-blue-400 group-hover:text-cyan-300 transition-colors">
            <span>Open Map Explorer</span>
            <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform" />
          </div>
        </button>

        {/* BUTTON 2: CAPTURE POTHOLES (PRIMARY ACTION) */}
        <button
          type="button"
          onClick={() => onSelectView('capture')}
          className="group relative p-6 sm:p-7 rounded-2xl bg-gradient-to-b from-blue-950/60 via-slate-900 to-indigo-950/40 border-2 border-cyan-500/50 hover:border-cyan-400 transition-all duration-300 text-left shadow-xl hover:shadow-2xl hover:shadow-cyan-500/20 flex flex-col justify-between hover:-translate-y-1.5 ring-1 ring-cyan-500/20"
        >
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-cyan-500/30 group-hover:scale-105 transition-all duration-300">
              <Camera className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-extrabold text-white group-hover:text-cyan-300 transition-colors">
                  Capture Potholes
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  OpenCV AI
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Real-time camera scanner. Dynamically detects cavity depth, width & severity, and submits reports with verified device GPS.
              </p>
            </div>
          </div>

          <div className="pt-6 flex items-center space-x-2 text-xs font-extrabold text-cyan-300 group-hover:text-white transition-colors">
            <span>Launch Live Camera</span>
            <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform" />
          </div>
        </button>

        {/* BUTTON 3: FIND BY AREA */}
        <button
          type="button"
          onClick={() => onSelectView('area')}
          className="group relative p-6 sm:p-7 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-emerald-500/50 transition-all duration-300 text-left shadow-xl hover:shadow-2xl hover:shadow-emerald-500/10 flex flex-col justify-between hover:-translate-y-1"
        >
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shadow-md">
              <Search className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-white group-hover:text-emerald-300 transition-colors">
                Find By Area
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Search, filter, and inspect road defects by Ward, Zone, or Neighborhood corridor across the metropolitan network.
              </p>
            </div>
          </div>

          <div className="pt-6 flex items-center space-x-2 text-xs font-bold text-emerald-400 group-hover:text-emerald-300 transition-colors">
            <span>Browse Area Directory</span>
            <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform" />
          </div>
        </button>

      </div>

      {/* Bottom Telemetry Bar */}
      <div className="border-t border-slate-900 pt-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto text-center font-mono">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-lg font-bold text-white">{totalCount}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Active Defects</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-lg font-bold text-rose-400">{criticalCount}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Critical Hazards</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-lg font-bold text-cyan-400">7 Zones</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Covered Wards</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-lg font-bold text-emerald-400">Live GPS</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">On-Demand Sync</div>
          </div>
        </div>
      </div>

    </div>
  );
}
