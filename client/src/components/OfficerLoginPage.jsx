import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Lock, 
  Mail, 
  MapPin, 
  CheckCircle2, 
  ArrowRight, 
  Briefcase, 
  Compass, 
  Users, 
  Award,
  Layers,
  Sparkles,
  KeyRound,
  Copy,
  Check
} from 'lucide-react';

export default function OfficerLoginPage({ onLogin, onCancel }) {
  // Active Role Switcher: 'head_admin' (Top Head) | 'area_head' (Zonal / Ward Engineer)
  const [selectedRole, setSelectedRole] = useState('head_admin');

  // Head Admin credentials (pre-filled by default for instant ease!)
  const [headEmail, setHeadEmail] = useState('head.admin@bbmp.gov.in');
  const [headPassword, setHeadPassword] = useState('admin123');

  // Area Head credentials (pre-filled by default for instant ease!)
  const [selectedZone, setSelectedZone] = useState('South');
  const [areaEmail, setAreaEmail] = useState('area.south@bbmp.gov.in');
  const [areaPassword, setAreaPassword] = useState('admin123');

  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  const AREA_ZONES = [
    {
      id: 'South',
      name: 'South Zone (HSR Layout, Silk Board, Koramangala)',
      engineer: 'Er. Suresh Gowda',
      email: 'area.south@bbmp.gov.in',
      radius: '8.5 km radius',
      wards: 'Wards 174, 151, 146'
    },
    {
      id: 'East',
      name: 'East Zone (Indiranagar, KR Puram, Hoysala Nagar)',
      engineer: 'Er. Deepa Nair',
      email: 'area.east@bbmp.gov.in',
      radius: '9.0 km radius',
      wards: 'Wards 80, 52, 88'
    },
    {
      id: 'Mahadevapura',
      name: 'Mahadevapura (Bellandur, Whitefield, ITPL)',
      engineer: 'Er. Ananya Sharma',
      email: 'area.mahadevapura@bbmp.gov.in',
      radius: '11.0 km radius',
      wards: 'Wards 150, 84, 85'
    },
    {
      id: 'Central',
      name: 'Central Zone (MG Road, Shanthinagar, CBD)',
      engineer: 'Er. Ramesh Patil',
      email: 'area.central@bbmp.gov.in',
      radius: '6.0 km radius',
      wards: 'Wards 111, 110, 109'
    },
    {
      id: 'North',
      name: 'North Zone (Hebbal, Yelahanka, Expressway)',
      engineer: 'Er. Vikram Rao',
      email: 'area.north@bbmp.gov.in',
      radius: '10.0 km radius',
      wards: 'Wards 7, 6, 8'
    }
  ];

  const handleZoneChange = (zoneId) => {
    setSelectedZone(zoneId);
    const match = AREA_ZONES.find(z => z.id === zoneId);
    if (match) {
      setAreaEmail(match.email);
    }
  };

  const handleLoginSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setIsLoading(true);
    setLoginError(null);

    const emailToSend = selectedRole === 'head_admin' ? headEmail : areaEmail;
    const passwordToSend = selectedRole === 'head_admin' ? headPassword : areaPassword;

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailToSend,
          password: passwordToSend,
          role: selectedRole === 'head_admin' ? 'HEAD_ADMIN' : 'AREA_HEAD',
          zone: selectedRole === 'area_head' ? selectedZone : null
        })
      });

      const data = await response.json();
      setIsLoading(false);

      if (data.success && data.user) {
        onLogin(data.user, data.token);
      } else {
        setLoginError(data.message || 'Authentication failed. Please verify credentials.');
      }
    } catch (err) {
      setIsLoading(false);
      setLoginError('Could not connect to authentication service.');
    }
  };

  // Instant 1-Click Quick Demo Login
  const triggerQuickLogin = (role, zoneId = 'South') => {
    setIsLoading(true);
    setLoginError(null);

    if (role === 'head_admin') {
      setSelectedRole('head_admin');
      onLogin({
        id: 'HEAD-ADMIN-01',
        name: 'Dr. B. K. Shivakumar',
        title: 'Chief Municipal Infrastructure Commissioner',
        email: 'head.admin@bbmp.gov.in',
        role: 'HEAD_ADMIN',
        agency: 'Bruhat Bengaluru Mahanagara Palike (Central Headquarters)',
        jurisdiction: 'Greater Bengaluru Metropolitan Area (All 198 Wards)',
        badge: 'CHIEF_COMMISSIONER'
      }, 'mock-head-jwt-token');
    } else {
      setSelectedRole('area_head');
      const match = AREA_ZONES.find(z => z.id === zoneId) || AREA_ZONES[0];
      onLogin({
        id: `AREA-HEAD-${match.id.toUpperCase()}`,
        name: match.engineer,
        title: `Executive Engineer - ${match.id} Zone`,
        email: match.email,
        zone: match.id,
        role: 'AREA_HEAD',
        agency: 'BBMP Zonal Engineering Wing',
        jurisdiction: `${match.name} (${match.radius})`,
        badge: 'ZONAL_HEAD'
      }, 'mock-area-jwt-token');
    }
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto my-8 px-4">
      
      {/* Outer Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden space-y-6">
        
        {/* Glow ambient background effects */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>

        {/* Top Header */}
        <div className="text-center space-y-2 relative">
          <div className="w-14 h-14 bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-purple-500/20 ring-1 ring-white/20">
            <KeyRound className="w-7 h-7 text-white" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Infra AI • Authority Portal
          </h1>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Restricted login for Municipal Chief Authority & Zonal Area Engineers.
          </p>
        </div>

        {/* =====================================================================
            PROMINENT DEMO LOGIN CREDENTIALS CHEAT SHEET (CLICK TO LOGIN!)
            ===================================================================== */}
        <div className="bg-slate-950 p-5 rounded-2xl border-2 border-indigo-500/40 shadow-xl space-y-4 relative">
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-bold text-cyan-300">
              <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span>OFFICIAL DEMO LOGIN CREDENTIALS (CLICK TO SIGN IN):</span>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Password: admin123
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* DEMO CARD 1: HEAD ADMIN */}
            <div className="bg-gradient-to-br from-purple-950/50 via-slate-900 to-slate-950 p-4 rounded-xl border border-purple-500/40 space-y-2.5 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono">
                    1. HEAD ADMIN (TOP HEAD)
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">All 198 Wards</span>
                </div>
                <div className="text-xs font-bold text-white">
                  Dr. B. K. Shivakumar (Chief Commissioner)
                </div>
                <div className="text-[11px] font-mono text-slate-300 space-y-0.5 bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Email:</span>
                    <strong className="text-purple-300">head.admin@bbmp.gov.in</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Passcode:</span>
                    <strong className="text-white">admin123</strong>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => triggerQuickLogin('head_admin')}
                className="w-full py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition flex items-center justify-center space-x-1.5 cursor-pointer mt-1"
              >
                <span>👑 1-Click Login as Head Admin</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* DEMO CARD 2: AREA HEAD */}
            <div className="bg-gradient-to-br from-blue-950/50 via-slate-900 to-slate-950 p-4 rounded-xl border border-cyan-500/40 space-y-2.5 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/40 font-mono">
                    2. AREA HEAD (ZONAL ADMIN)
                  </span>
                  <span className="text-[10px] text-cyan-400 font-mono">8.5 km radius</span>
                </div>
                <div className="text-xs font-bold text-white">
                  Er. Suresh Gowda (South Zone Area Head)
                </div>
                <div className="text-[11px] font-mono text-slate-300 space-y-0.5 bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Email:</span>
                    <strong className="text-cyan-300">area.south@bbmp.gov.in</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Passcode:</span>
                    <strong className="text-white">admin123</strong>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => triggerQuickLogin('area_head', 'South')}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/30 transition flex items-center justify-center space-x-1.5 cursor-pointer mt-1"
              >
                <span>👷 1-Click Login as Area Head</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

          {/* Quick Zone Switcher for Area Heads */}
          <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
            <span className="text-slate-400">Other Area Head Zones (Passcode: admin123):</span>
            <div className="flex flex-wrap gap-1.5">
              {AREA_ZONES.map(z => (
                <button
                  key={z.id}
                  type="button"
                  onClick={() => triggerQuickLogin('area_head', z.id)}
                  className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-800 hover:border-cyan-500/40 transition cursor-pointer"
                >
                  {z.id} Zone
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* =====================================================================
            MANUAL LOGIN FORM (PRE-FILLED FOR DIRECT SUBMIT)
            ===================================================================== */}
        <div className="space-y-4">
          
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
              Or Sign In with Form Credentials:
            </span>
          </div>

          {/* ROLE SWITCHER TABS */}
          <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => { setSelectedRole('head_admin'); setLoginError(null); }}
              className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 transition cursor-pointer ${
                selectedRole === 'head_admin'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 font-extrabold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>👑 Head Admin</span>
            </button>

            <button
              type="button"
              onClick={() => { setSelectedRole('area_head'); setLoginError(null); }}
              className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 transition cursor-pointer ${
                selectedRole === 'area_head'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-extrabold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>👷 Area Head</span>
            </button>
          </div>

          {/* Error Message */}
          {loginError && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/50 text-rose-300 text-xs flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            
            {/* AREA HEAD JURISDICTION SELECTOR */}
            {selectedRole === 'area_head' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block flex items-center justify-between">
                  <span>Select Jurisdiction / Zone</span>
                  <span className="text-[11px] text-cyan-400 font-mono">Radius: {AREA_ZONES.find(z => z.id === selectedZone)?.radius}</span>
                </label>
                
                <div className="relative">
                  <MapPin className="w-4 h-4 text-cyan-400 absolute left-3.5 top-3.5" />
                  <select
                    value={selectedZone}
                    onChange={(e) => handleZoneChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    {AREA_ZONES.map(z => (
                      <option key={z.id} value={z.id} className="bg-slate-900 text-white">
                        {z.name} — {z.engineer}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 block">
                {selectedRole === 'head_admin' ? 'Head Commissioner Email' : 'Area Executive Engineer Email'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={selectedRole === 'head_admin' ? headEmail : areaEmail}
                  onChange={(e) => {
                    if (selectedRole === 'head_admin') setHeadEmail(e.target.value);
                    else setAreaEmail(e.target.value);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 block">
                Passcode
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={selectedRole === 'head_admin' ? headPassword : areaPassword}
                  onChange={(e) => {
                    if (selectedRole === 'head_admin') setHeadPassword(e.target.value);
                    else setAreaPassword(e.target.value);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 rounded-xl font-bold text-xs sm:text-sm text-white shadow-xl transition-all cursor-pointer flex items-center justify-center space-x-2 ${
                selectedRole === 'head_admin'
                  ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/30'
                  : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'
              }`}
            >
              <span>{isLoading ? 'Verifying...' : `Sign In as ${selectedRole === 'head_admin' ? 'Head Admin' : 'Area Head'}`}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

          </form>

        </div>

        {onCancel && (
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="text-xs text-slate-500 hover:text-slate-300 transition"
            >
              ← Cancel and return to public platform
            </button>
          </div>
        )}

      </div>

    </div>
  );
}
