import React from 'react';
import { ShieldAlert, Activity, Award, LogOut, Home, Layers, Lock, CheckCircle2 } from 'lucide-react';

export default function Navbar({ currentView, onSelectView, govUser, onLogout, isLoginPage, onNavigate }) {
  return (
    <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Civic Identity: NammaFix */}
          <div 
            className="flex items-center space-x-3 cursor-pointer" 
            onClick={() => {
              if (onSelectView) onSelectView('home');
              if (onNavigate) onNavigate('/');
            }}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20 ring-1 ring-white/20">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  Namma<span className="text-blue-400">Fix</span>
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Smart City Portal
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Bengaluru Road Safety & Defect Resolution System
              </p>
            </div>
          </div>

          {/* Civic Badge */}
          <div className="hidden md:flex items-center space-x-2 text-[11px] bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Bengaluru Road Safety & Pothole Resolution Network</span>
          </div>

          {/* Navigation Controls */}
          {!isLoginPage ? (
            <div className="flex items-center space-x-2 sm:space-x-3">
              
              {/* Home button if viewing subview */}
              {currentView && currentView !== 'home' && (
                <button
                  type="button"
                  onClick={() => onSelectView('home')}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-800 hover:border-slate-700 transition shadow-sm cursor-pointer"
                >
                  <Home className="w-3.5 h-3.5 text-blue-400" />
                  <span className="hidden sm:inline">Main Dashboard</span>
                </button>
              )}

              {/* Public Issues Tracker Button */}
              <button
                type="button"
                onClick={() => onSelectView('tracker')}
                className={`flex items-center space-x-1.5 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer border ${
                  currentView === 'tracker'
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-600/25'
                    : 'bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border-emerald-500/40'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Civic Tracker (Before/After)</span>
              </button>

              {/* Official Officer Portal Login Link */}
              <button
                type="button"
                onClick={() => {
                  if (onNavigate) onNavigate('/login');
                }}
                className="flex items-center space-x-1.5 px-3 sm:px-3.5 py-1.5 rounded-xl bg-purple-950/40 hover:bg-purple-900/50 text-purple-300 text-xs font-bold border border-purple-500/40 transition shadow-sm cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Officer Login</span>
              </button>

            </div>
          ) : (
            /* On /login route */
            <div className="flex items-center space-x-3">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center space-x-1.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>
                  {govUser ? (govUser.role === 'HEAD_ADMIN' ? '👑 Head Admin Command' : '👷 Area Head Workspace') : 'Authority Portal'}
                </span>
              </span>

              {govUser ? (
                <button
                  type="button"
                  onClick={onLogout}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-950/40 text-slate-300 hover:text-rose-400 text-xs font-medium border border-slate-800 transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Exit Portal</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (onNavigate) onNavigate('/');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-slate-800 transition"
                >
                  ← Return Home
                </button>
              )}
            </div>
          )}

        </div>
      </div>
    </header>
  );
}
