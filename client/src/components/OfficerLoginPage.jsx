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
  Layers, 
  Sparkles, 
  KeyRound, 
  Copy, 
  Check,
  Building2,
  HardHat,
  ChevronRight,
  Search
} from 'lucide-react';
import allSubdivisions from '../data/subdivisions.json';

export default function OfficerLoginPage({ onLogin, onCancel }) {
  // Active Role Switcher: 'head_admin' (Top Municipal Head) | 'subdiv_head' (Sub-Division Area Head)
  const [selectedRole, setSelectedRole] = useState('head_admin');

  // Head Admin credentials (pre-filled by default for instant ease!)
  const [headEmail, setHeadEmail] = useState('head.admin@nammafix.gov.in');
  const [headPassword, setHeadPassword] = useState('admin123');

  // 5 Corporations & 50 Sub-Divisions State
  const CORPORATIONS = ['All', 'Central', 'East', 'South', 'West', 'North'];
  const [selectedCorporation, setSelectedCorporation] = useState('South');
  const [subdivSearch, setSubdivSearch] = useState('');

  // Default to HSR Layout Sub-Division in South Corporation
  const defaultSubdiv = allSubdivisions.find(s => s.id === 'subdiv-south-02') || allSubdivisions[0];
  const [selectedSubdiv, setSelectedSubdiv] = useState(defaultSubdiv);
  const [areaEmail, setAreaEmail] = useState(defaultSubdiv.email);
  const [areaPassword, setAreaPassword] = useState('admin123');

  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  // Filter Sub-Divisions by Selected Corporation & Search
  const filteredSubdivisions = allSubdivisions.filter(sub => {
    const matchesCorp = selectedCorporation === 'All' || sub.corporation === selectedCorporation;
    const matchesSearch = !subdivSearch || 
      sub.name.toLowerCase().includes(subdivSearch.toLowerCase()) ||
      sub.engineer.toLowerCase().includes(subdivSearch.toLowerCase()) ||
      sub.email.toLowerCase().includes(subdivSearch.toLowerCase()) ||
      (sub.wards && sub.wards.some(w => String(w).includes(subdivSearch)));
    return matchesCorp && matchesSearch;
  });

  const handleSelectSubdivision = (sub) => {
    setSelectedSubdiv(sub);
    setAreaEmail(sub.email);
    setAreaPassword('admin123');
    setLoginError(null);
  };

  const handleLoginSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setIsLoading(true);
    setLoginError(null);

    const emailToSend = selectedRole === 'head_admin' ? headEmail : areaEmail;
    const passwordToSend = selectedRole === 'head_admin' ? headPassword : areaPassword;
    const roleToSend = selectedRole === 'head_admin' ? 'HEAD_ADMIN' : 'SUBDIVISION_HEAD';

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailToSend,
          password: passwordToSend,
          role: roleToSend,
          subdivision_id: selectedSubdiv?.id
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

  // Instant 1-Click Demo Login
  const triggerQuickLogin = (role, customSubdiv = null) => {
    setIsLoading(true);
    setLoginError(null);

    if (role === 'head_admin') {
      setSelectedRole('head_admin');
      onLogin({
        id: 'HEAD-ADMIN-01',
        name: 'Dr. B. K. Shivakumar',
        title: 'Chief Municipal Infrastructure Commissioner',
        email: 'head.admin@nammafix.gov.in',
        role: 'HEAD_ADMIN',
        agency: 'Bengaluru City Corporations (Central Command HQ)',
        jurisdiction: 'All 5 Corporations & 50 Sub-Divisions (198 Wards)',
        badge: 'CHIEF_COMMISSIONER'
      }, 'jwt-head-admin-token-' + Date.now());
    } else {
      setSelectedRole('subdiv_head');
      const targetSub = customSubdiv || selectedSubdiv || defaultSubdiv;
      onLogin({
        id: targetSub.id,
        name: targetSub.engineer,
        title: `Head of ${targetSub.name}`,
        email: targetSub.email,
        subdivision_id: targetSub.id,
        subdivision_name: targetSub.name,
        corporation: targetSub.corporation,
        center: targetSub.center,
        radius_km: targetSub.radius_km,
        wards: targetSub.wards,
        role: 'SUBDIVISION_HEAD',
        agency: `${targetSub.corporation} Bengaluru Corporation`
      }, 'jwt-subdiv-token-' + Date.now());
    }
  };

  // Popular Quick-Pick Sub-Divisions
  const POPULAR_SUBDIVS = [
    { id: 'subdiv-south-02', name: 'HSR Layout', corp: 'South', engineer: 'Er. K. Suresh Gowda' },
    { id: 'subdiv-east-01', name: 'Indiranagar', corp: 'East', engineer: 'Er. Deepa Nair' },
    { id: 'subdiv-east-08', name: 'Mahadevapura', corp: 'East', engineer: 'Er. Ananya Sharma' },
    { id: 'subdiv-south-01', name: 'Koramangala', corp: 'South', engineer: 'Er. Ajay Prasad' },
    { id: 'subdiv-central-01', name: 'MG Road / CBD', corp: 'Central', engineer: 'Er. Rajesh Patil' },
    { id: 'subdiv-north-01', name: 'Hebbal', corp: 'North', engineer: 'Er. Vikram Rao' },
    { id: 'subdiv-west-01', name: 'Malleshwaram', corp: 'West', engineer: 'Er. Raghavendra Rao' }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 text-slate-100">
      
      {/* Top Banner */}
      <div className="text-center space-y-3 mb-8">
        <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
          <ShieldAlert className="w-4 h-4 text-blue-400" />
          <span>Bengaluru Municipal Corporations • Command Portal</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          Municipal Authority Login
        </h1>
        <p className="text-slate-400 text-sm max-w-2xl mx-auto">
          Secure access portal for the Top Municipal Chief Commissioner and 50 Sub-Division Area Heads across Central, East, South, West, and North Corporations.
        </p>
      </div>

      {/* Role Selection Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        
        {/* Role Tab 1: Top Municipal Head */}
        <button
          type="button"
          onClick={() => {
            setSelectedRole('head_admin');
            setLoginError(null);
          }}
          className={`p-5 rounded-2xl border text-left transition relative cursor-pointer ${
            selectedRole === 'head_admin'
              ? 'bg-blue-950/60 border-blue-500 shadow-xl shadow-blue-500/10 ring-2 ring-blue-500/30'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
          }`}
        >
          <div className="flex items-start space-x-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
              selectedRole === 'head_admin' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}>
              <Building2 className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Top Oversight</span>
                {selectedRole === 'head_admin' && (
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                )}
              </div>
              <h3 className="font-bold text-base text-white mt-1">Top Municipal Head</h3>
              <p className="text-xs text-slate-400 mt-1">
                Chief Infrastructure Commissioner. Citywide oversight over all 5 Corporations and 50 Sub-Divisions.
              </p>
            </div>
          </div>
        </button>

        {/* Role Tab 2: Sub-Division Area Head */}
        <button
          type="button"
          onClick={() => {
            setSelectedRole('subdiv_head');
            setLoginError(null);
          }}
          className={`p-5 rounded-2xl border text-left transition relative cursor-pointer ${
            selectedRole === 'subdiv_head'
              ? 'bg-cyan-950/60 border-cyan-500 shadow-xl shadow-cyan-500/10 ring-2 ring-cyan-500/30'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
          }`}
        >
          <div className="flex items-start space-x-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
              selectedRole === 'subdiv_head' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}>
              <HardHat className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Field Execution</span>
                {selectedRole === 'subdiv_head' && (
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                )}
              </div>
              <h3 className="font-bold text-base text-white mt-1">Sub-Division Area Head</h3>
              <p className="text-xs text-slate-400 mt-1">
                Select from any of the 50 Sub-Divisions across Bangalore. Receive routed defects, dispatch workers, and submit repair photos.
              </p>
            </div>
          </div>
        </button>

      </div>

      {/* Main Login Card */}
      <div className="bg-slate-900/90 rounded-3xl border border-slate-800 p-6 sm:p-8 shadow-2xl relative">

        {/* ROLE 1: TOP MUNICIPAL HEAD VIEW */}
        {selectedRole === 'head_admin' && (
          <div className="space-y-6">
            
            {/* Quick Demo Credentials Info Banner */}
            <div className="bg-blue-950/40 border border-blue-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <KeyRound className="w-5 h-5 text-blue-400 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-blue-300">Official Demo Credentials (Pre-filled):</div>
                  <div className="text-xs text-slate-300 font-mono mt-0.5">
                    User: <span className="text-white font-bold">head.admin@nammafix.gov.in</span> • Pass: <span className="text-white font-bold">admin123</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => triggerQuickLogin('head_admin')}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>1-Click Head Admin Login</span>
              </button>
            </div>

            {/* Officer Profile Preview */}
            <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800 flex items-center space-x-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-md">
                BS
              </div>
              <div>
                <h4 className="font-bold text-white text-base">Dr. B. K. Shivakumar</h4>
                <p className="text-xs text-blue-400 font-medium">Chief Municipal Infrastructure Commissioner</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  HQ: Central Municipal Command, Hudson Circle • Jurisdiction: All 5 Corporations & 50 Sub-Divisions
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Official Municipal Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    value={headEmail}
                    onChange={(e) => setHeadEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Government Security Credential</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    value={headPassword}
                    onChange={(e) => setHeadPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition font-mono"
                    required
                  />
                </div>
              </div>

              {loginError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
                  {loginError}
                </div>
              )}

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-blue-600/25 transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  <span>{isLoading ? 'Authenticating...' : 'Sign In as Head Commissioner'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                {onCancel && (
                  <button
                    type="button"
                    onClick={onCancel}
                    className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

          </div>
        )}

        {/* ROLE 2: SUB-DIVISION AREA HEAD VIEW (50 SUB-DIVISIONS) */}
        {selectedRole === 'subdiv_head' && (
          <div className="space-y-6">
            
            {/* Quick Demo Credentials Info Banner */}
            <div className="bg-cyan-950/40 border border-cyan-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <KeyRound className="w-5 h-5 text-cyan-400 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-cyan-300">Area Head Credentials (Pre-filled):</div>
                  <div className="text-xs text-slate-300 font-mono mt-0.5">
                    User: <span className="text-white font-bold">{selectedSubdiv?.email}</span> • Pass: <span className="text-white font-bold">admin123</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => triggerQuickLogin('subdiv_head')}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/30 transition flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>1-Click Login to {selectedSubdiv?.name.split(' ')[0]}</span>
              </button>
            </div>

            {/* Quick-Pick Popular Sub-Divisions Bar */}
            <div>
              <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center justify-between">
                <span>Quick-Pick Popular Sub-Divisions:</span>
                <span className="text-[11px] text-cyan-400">{allSubdivisions.length} Total Sub-Divisions</span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {POPULAR_SUBDIVS.map(item => {
                  const subObj = allSubdivisions.find(s => s.id === item.id);
                  const isSelected = selectedSubdiv?.id === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => subObj && handleSelectSubdivision(subObj)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer border ${
                        isSelected
                          ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold shadow-md shadow-cyan-500/20'
                          : 'bg-slate-950/70 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      {item.name} ({item.corp})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5 Corporations Selector Tabs */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                1. Select Corporation (5 Corporation System)
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {CORPORATIONS.map(corp => {
                  const count = corp === 'All' 
                    ? allSubdivisions.length 
                    : allSubdivisions.filter(s => s.corporation === corp).length;
                  const isActive = selectedCorporation === corp;
                  return (
                    <button
                      key={corp}
                      type="button"
                      onClick={() => setSelectedCorporation(corp)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold transition text-center cursor-pointer border ${
                        isActive
                          ? 'bg-cyan-600 text-white border-cyan-400 shadow-md shadow-cyan-600/30'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      <div>{corp}</div>
                      <div className="text-[10px] opacity-75">{count} divs</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sub-Division Search & Dropdown Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                2. Choose Sub-Division ({filteredSubdivisions.length} Available in {selectedCorporation})
              </label>
              
              <div className="relative mb-2">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search sub-division name, engineer or ward..."
                  value={subdivSearch}
                  onChange={(e) => setSubdivSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <select
                value={selectedSubdiv?.id || ''}
                onChange={(e) => {
                  const match = allSubdivisions.find(s => s.id === e.target.value);
                  if (match) handleSelectSubdivision(match);
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                {filteredSubdivisions.map(sub => (
                  <option key={sub.id} value={sub.id}>
                    [{sub.corporation} Corp] {sub.name} — {sub.engineer}
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Sub-Division Officer Card */}
            {selectedSubdiv && (
              <div className="bg-slate-950/80 rounded-2xl p-4 border border-cyan-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-3.5">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md shrink-0">
                    <HardHat className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-white text-sm">{selectedSubdiv.engineer}</h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        {selectedSubdiv.corporation} Corporation
                      </span>
                    </div>
                    <p className="text-xs text-cyan-300 font-medium">{selectedSubdiv.name}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Coverage: {selectedSubdiv.radius_km} km radius • Wards: {selectedSubdiv.wards?.join(', ') || 'Jurisdiction'}
                    </p>
                  </div>
                </div>

                <div className="w-full sm:w-auto flex sm:flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => triggerQuickLogin('subdiv_head', selectedSubdiv)}
                    className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition shadow-md shadow-cyan-600/20 flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <span>Instant Login</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Email & Password Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Official Sub-Division Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    value={areaEmail}
                    onChange={(e) => setAreaEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Engineer Access Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    value={areaPassword}
                    onChange={(e) => setAreaPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition font-mono"
                    required
                  />
                </div>
              </div>

              {loginError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
                  {loginError}
                </div>
              )}

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-sm shadow-xl shadow-cyan-600/25 transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  <span>{isLoading ? 'Authenticating...' : `Enter ${selectedSubdiv?.name || 'Sub-Division'} Dashboard`}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                {onCancel && (
                  <button
                    type="button"
                    onClick={onCancel}
                    className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

          </div>
        )}

      </div>

    </div>
  );
}
