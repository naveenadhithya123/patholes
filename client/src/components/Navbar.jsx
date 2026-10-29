import React from 'react';
import { Camera, Car, ShieldAlert, Activity, Award, LogOut } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, govUser, onLogout, isLoginPage, onNavigate }) {
  return (
    <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Civic Identity: Infra AI */}
          <div 
            className="flex items-center space-x-3 cursor-pointer" 
            onClick={() => onNavigate('/')}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20 ring-1 ring-white/20">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  Infra <span className="text-blue-400">AI</span>
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  BBMP Smart City
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                AI Urban Infrastructure & Road Asset Monitoring
              </p>
            </div>
          </div>

          {/* SDG Badge - SDGs 9 & 11 */}
          <div className="hidden lg:flex items-center space-x-2 text-[11px] bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
            <Award className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-300">
              <strong className="text-emerald-400">SDG 9</strong> Industry & Infra | <strong className="text-amber-400">SDG 11</strong> Sustainable Cities
            </span>
          </div>

          {/* Navigation Controls: Only Citizen Cam and Vehicle Sensor Simulator!
              NO "Government Portal" button here — government access is ONLY via typing /login in URL! */}
          {!isLoginPage ? (
            <nav className="flex items-center space-x-1 sm:space-x-2 bg-slate-900 p-1 rounded-xl border border-slate-800/80">
              {/* Citizen Mode */}
              <button
                onClick={() => onNavigate('/')}
                className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'citizen'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Citizen Live Cam</span>
                <span className="hidden md:inline text-[10px] opacity-75 font-normal">(No Login)</span>
              </button>

              {/* Vehicle Sensor Ingestion Gateway */}
              <button
                onClick={() => onNavigate('/sensor-gateway')}
                className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'vehicle'
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Car className="w-3.5 h-3.5" />
                <span>Vehicle LiDAR Gateway</span>
                <span className="hidden md:inline px-1 py-0.2 bg-cyan-400/20 text-cyan-300 text-[9px] rounded uppercase font-bold">Hardware Sim</span>
              </button>
            </nav>
          ) : (
            /* On /login route */
            <div className="flex items-center space-x-3">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center space-x-1.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>BBMP Authority Portal (/login)</span>
              </span>

              {govUser && (
                <button
                  onClick={onLogout}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-400 text-xs font-medium border border-slate-700 transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Exit Portal</span>
                </button>
              )}
            </div>
          )}

        </div>
      </div>
    </header>
  );
}
