import React from 'react';
import { Map, Camera, Search, Activity, ShieldCheck, MapPin, ArrowRight, Layers, CheckCircle2, Car } from 'lucide-react';

export default function LandingDashboard({ onSelectView, defects = [] }) {
  const criticalCount = defects.filter(d => d.severity === 'CRITICAL').length;
  const resolvedCount = defects.filter(d => d.status === 'Resolved' && d.head_admin_approved).length || 2;
  const totalCount = defects.length || 24;

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Top Hero Branding */}
      <div className="text-center space-y-4 pt-4 sm:pt-6">
        <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
          <Activity className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
          <span>Smart City Road Asset & Defect Management</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white">
          Namma<span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">Fix</span>
        </h1>

        <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto font-normal leading-relaxed">
          Autonomous urban road safety platform featuring real-time defect tracking, spatial GIS satellite routing, dual Head Admin & Area Head dispatch, and civic Before & After verification.
        </p>
      </div>

      {/* THE 5 CORE ACTION CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 my-10 max-w-7xl mx-auto w-full">
        
        {/* CARD 1: MAP VIEW */}
        <button
          type="button"
          onClick={() => onSelectView('map')}
          className="group relative p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-blue-500/50 transition-all duration-300 text-left shadow-xl hover:shadow-2xl hover:shadow-blue-500/10 flex flex-col justify-between hover:-translate-y-1 cursor-pointer"
        >
          <div className="space-y-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-md">
              <Map className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-base font-bold text-white group-hover:text-blue-300 transition-colors">
                Map View
              </h2>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Google Satellite hybrid map displaying real road networks, active defect pins, and traffic corridor detours.
              </p>
            </div>
          </div>

          <div className="pt-4 flex items-center space-x-1.5 text-xs font-bold text-blue-400 group-hover:text-cyan-300 transition-colors">
            <span>Open Satellite Map</span>
            <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1.5 transition-transform" />
          </div>
        </button>

        {/* CARD 2: CAPTURE POTHOLES (CITIZEN CAMERA) */}
        <button
          type="button"
          onClick={() => onSelectView('capture')}
          className="group relative p-5 rounded-2xl bg-gradient-to-b from-blue-950/60 via-slate-900 to-indigo-950/40 border-2 border-cyan-500/50 hover:border-cyan-400 transition-all duration-300 text-left shadow-xl hover:shadow-2xl hover:shadow-cyan-500/20 flex flex-col justify-between hover:-translate-y-1.5 ring-1 ring-cyan-500/20 cursor-pointer"
        >
          <div className="space-y-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-cyan-500/30 group-hover:scale-105 transition-all duration-300">
              <Camera className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center space-x-1.5">
                <h2 className="text-base font-extrabold text-white group-hover:text-cyan-300 transition-colors">
                  Capture Potholes
                </h2>
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Live
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Live camera scanner with dynamic bounding box, estimated cavity dimensions, and verified GPS.
              </p>
            </div>
          </div>

          <div className="pt-4 flex items-center space-x-1.5 text-xs font-extrabold text-cyan-300 group-hover:text-white transition-colors">
            <span>Launch Camera</span>
            <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1.5 transition-transform" />
          </div>
        </button>

        {/* CARD 3: CAR TRACKING (AUTOMATED FLEET AI / YOLOv26 SCANNER) */}
        <button
          type="button"
          onClick={() => onSelectView('car_tracking')}
          className="group relative p-5 rounded-2xl bg-gradient-to-b from-indigo-950/60 via-slate-900 to-cyan-950/40 border-2 border-blue-500/50 hover:border-cyan-400 transition-all duration-300 text-left shadow-xl hover:shadow-2xl hover:shadow-blue-500/20 flex flex-col justify-between hover:-translate-y-1.5 ring-1 ring-blue-500/20 cursor-pointer"
        >
          <div className="space-y-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-all duration-300">
              <Car className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center space-x-1.5">
                <h2 className="text-base font-extrabold text-white group-hover:text-cyan-300 transition-colors">
                  Car Tracking
                </h2>
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Fleet AI
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                10 municipal patrol vehicles scanning road corridors via YOLOv26. Tracks Pending, In-Progress, and Solved repairs.
              </p>
            </div>
          </div>

          <div className="pt-4 flex items-center space-x-1.5 text-xs font-extrabold text-cyan-300 group-hover:text-white transition-colors">
            <span>Inspect Car AI Fleet</span>
            <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1.5 transition-transform" />
          </div>
        </button>

        {/* CARD 4: CIVIC ISSUES TRACKER (BEFORE & AFTER REPAIRS) */}
        <button
          type="button"
          onClick={() => onSelectView('tracker')}
          className="group relative p-5 rounded-2xl bg-gradient-to-b from-emerald-950/60 via-slate-900 to-teal-950/40 border-2 border-emerald-500/50 hover:border-emerald-400 transition-all duration-300 text-left shadow-xl hover:shadow-2xl hover:shadow-emerald-500/20 flex flex-col justify-between hover:-translate-y-1.5 ring-1 ring-emerald-500/20 cursor-pointer"
        >
          <div className="space-y-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:scale-105 transition-all duration-300">
              <Layers className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center space-x-1.5">
                <h2 className="text-base font-extrabold text-white group-hover:text-emerald-300 transition-colors">
                  Civic Tracker
                </h2>
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Before/After
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Public stack of pending road defects and verified completed repairs with authentic Before & After photo evidence.
              </p>
            </div>
          </div>

          <div className="pt-4 flex items-center space-x-1.5 text-xs font-extrabold text-emerald-300 group-hover:text-white transition-colors">
            <span>Inspect Issues Stack</span>
            <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1.5 transition-transform" />
          </div>
        </button>

        {/* CARD 5: FIND BY AREA */}
        <button
          type="button"
          onClick={() => onSelectView('area')}
          className="group relative p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-purple-500/50 transition-all duration-300 text-left shadow-xl hover:shadow-2xl hover:shadow-purple-500/10 flex flex-col justify-between hover:-translate-y-1 cursor-pointer"
        >
          <div className="space-y-3.5">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-all duration-300 shadow-md">
              <Search className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors">
                Find By Area
              </h2>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Filter and inspect road defects by Ward, Zone, or Neighborhood corridor across the 198 metropolitan wards.
              </p>
            </div>
          </div>

          <div className="pt-4 flex items-center space-x-1.5 text-xs font-bold text-purple-400 group-hover:text-purple-300 transition-colors">
            <span>Browse Directory</span>
            <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1.5 transition-transform" />
          </div>
        </button>

      </div>

      {/* Bottom Civic Telemetry Bar */}
      <div className="border-t border-slate-900 pt-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto text-center font-mono">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-lg font-bold text-white">{totalCount}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Total Tickets</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-lg font-bold text-rose-400">{criticalCount}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Critical Hazards</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-lg font-bold text-emerald-400">{resolvedCount} Verified</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Before & After Solved</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-lg font-bold text-cyan-400">Dual Logins</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Head & Area Portals</div>
          </div>
        </div>
      </div>

    </div>
  );
}
