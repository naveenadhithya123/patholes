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
  Sparkles
} from 'lucide-react';

export default function OfficerLoginPage({ onLogin, onCancel }) {
  // Active Role Switcher: 'head_admin' (Top Head) | 'area_head' (Zonal / Ward Engineer)
  const [selectedRole, setSelectedRole] = useState('head_admin');

  // Head Admin credentials
  const [headEmail, setHeadEmail] = useState('head.admin@bbmp.gov.in');
  const [headPassword, setHeadPassword] = useState('admin123');

  // Area Head credentials
  const [selectedZone, setSelectedZone] = useState('South');
  const [areaEmail, setAreaEmail] = useState('area.south@bbmp.gov.in');
  const [areaPassword, setAreaPassword] = useState('admin123');

  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);

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
    e.preventDefault();
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

  // 1-Click Quick Demo Login for instant testing
  const triggerQuickLogin = (role, zoneId = 'South') => {
    setIsLoading(true);
    setLoginError(null);

    if (role === 'head_admin') {
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

  return (
    <div className="max-w-2xl mx-auto my-10 px-4">
      
      {/* Container Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        
        {/* Glow ambient background effect */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>

        {/* Top Header */}
        <div className="text-center space-y-3 mb-8 relative">
          <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-blue-500/20 ring-1 ring-white/20">
            <ShieldAlert className="w-7 h-7 text-white" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Infra AI • Authority Portal
          </h1>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Authorized administrative access for Karnataka Urban Infrastructure & BBMP Road Maintenance Wings.
          </p>
        </div>

        {/* THE 2 ROLE TABS (Head Admin vs Area Head) */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-950 rounded-2xl border border-slate-800 mb-8 relative">
          
          {/* TAB 1: HEAD ADMIN */}
          <button
            type="button"
            onClick={() => { setSelectedRole('head_admin'); setLoginError(null); }}
            className={`py-3 px-3 rounded-xl font-bold text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2 transition-all cursor-pointer ${
              selectedRole === 'head_admin'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30 font-extrabold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>👑</span>
            <span>Head Admin (Top Head)</span>
          </button>

          {/* TAB 2: AREA HEAD */}
          <button
            type="button"
            onClick={() => { setSelectedRole('area_head'); setLoginError(null); }}
            className={`py-3 px-3 rounded-xl font-bold text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2 transition-all cursor-pointer ${
              selectedRole === 'area_head'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-600/30 font-extrabold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>👷</span>
            <span>Area Head (Zonal Admin)</span>
          </button>

        </div>

        {/* Role Description Card */}
        <div className={`p-4 rounded-2xl border mb-6 text-xs space-y-1.5 transition-all ${
          selectedRole === 'head_admin'
            ? 'bg-purple-950/30 border-purple-500/30 text-purple-200'
            : 'bg-blue-950/30 border-blue-500/30 text-blue-200'
        }`}>
          <div className="font-bold flex items-center space-x-2">
            <span>{selectedRole === 'head_admin' ? '👑 HEAD ADMIN RESPONSIBILITIES:' : '👷 AREA HEAD RESPONSIBILITIES:'}</span>
          </div>
          <p className="text-[11px] leading-relaxed opacity-90">
            {selectedRole === 'head_admin'
              ? 'Receives incoming defects directly from citizen & patrol cameras across all 198 wards. Distributes tickets to territorial Area Heads by radius, and performs final verification of completed repairs before authorizing public release.'
              : 'Receives distributed defects within territorial jurisdiction radius. Dispatches field repair crews, supervises road leveling, and uploads completion "After" photos to Head Admin for verification.'}
          </p>
        </div>

        {/* Error Alert */}
        {loginError && (
          <div className="p-3 mb-6 rounded-xl bg-rose-950/50 border border-rose-500/50 text-rose-300 text-xs flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{loginError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLoginSubmit} className="space-y-5">
          
          {/* AREA HEAD JURISDICTION SELECTOR (Visible only when Area Head is selected) */}
          {selectedRole === 'area_head' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block flex items-center justify-between">
                <span>Select Your Area / Zonal Jurisdiction</span>
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

              <div className="text-[11px] text-slate-400 font-mono pl-1">
                Covered Wards: {AREA_ZONES.find(z => z.id === selectedZone)?.wards}
              </div>
            </div>
          )}

          {/* Email Field */}
          <div className="space-y-1.5">
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
                placeholder={selectedRole === 'head_admin' ? 'head.admin@bbmp.gov.in' : 'area.south@bbmp.gov.in'}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              Security Passcode
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
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 rounded-xl font-bold text-xs sm:text-sm text-white shadow-xl transition-all cursor-pointer flex items-center justify-center space-x-2 ${
              selectedRole === 'head_admin'
                ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 shadow-purple-600/30'
                : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-blue-600/30'
            }`}
          >
            <span>{isLoading ? 'Verifying Credentials...' : `Sign In as ${selectedRole === 'head_admin' ? 'Head Admin' : 'Area Head'}`}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

        </form>

        {/* 1-CLICK DEMO BUTTONS FOR EVALUATION */}
        <div className="mt-8 pt-6 border-t border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span className="uppercase tracking-wider">1-Click Evaluation Login:</span>
            <span className="text-cyan-400">Instant Access</span>
          </div>

          {selectedRole === 'head_admin' ? (
            <button
              type="button"
              onClick={() => triggerQuickLogin('head_admin')}
              className="w-full py-2.5 px-4 bg-purple-950/40 hover:bg-purple-900/50 text-purple-300 font-bold text-xs rounded-xl border border-purple-500/40 transition flex items-center justify-center space-x-2"
            >
              <span>👑 Demo Sign In: Dr. B. K. Shivakumar (Head Admin)</span>
            </button>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {AREA_ZONES.slice(0, 4).map(z => (
                <button
                  key={z.id}
                  type="button"
                  onClick={() => triggerQuickLogin('area_head', z.id)}
                  className="py-2 px-2.5 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white font-medium text-[11px] rounded-lg border border-slate-800 hover:border-cyan-500/40 transition text-left flex items-center justify-between"
                >
                  <span className="truncate">{z.name.split(' (')[0]}</span>
                  <span className="text-[10px] text-cyan-400 font-mono">Login</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {onCancel && (
          <div className="text-center mt-6">
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
