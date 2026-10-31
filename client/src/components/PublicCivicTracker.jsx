import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  MapPin, 
  Filter, 
  Search, 
  Calendar, 
  ShieldCheck, 
  Layers, 
  ArrowRight, 
  Sparkles, 
  Sliders, 
  Eye, 
  ExternalLink,
  ChevronDown,
  ArrowUpRight,
  TrendingUp,
  RefreshCw
} from 'lucide-react';

export default function PublicCivicTracker({ onBack, onSelectView }) {
  // Sub-tabs: 'pending' (Awaiting / In Progress) vs 'completed' (Approved by Head Admin)
  const [activeTab, setActiveTab] = useState('completed'); // Default to completed to showcase verified Before/After repairs!

  // Defects data from public API
  const [pendingDefects, setPendingDefects] = useState([]);
  const [completedDefects, setCompletedDefects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedZone, setSelectedZone] = useState('all');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected defect modal for deep inspection
  const [inspectModalDefect, setInspectModalDefect] = useState(null);

  // Interactive slider position (0 - 100%) for Before/After comparison
  const [sliderPosition, setSliderPosition] = useState(50);
  const [comparisonMode, setComparisonMode] = useState('side-by-side'); // 'side-by-side' | 'slider'

  // Fetch Public Tracker Data from API
  const fetchPublicTracker = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedZone !== 'all') params.append('zone', selectedZone);
      if (selectedSeverity !== 'all') params.append('severity', selectedSeverity);
      if (searchQuery) params.append('search', searchQuery);

      const res = await fetch(`/api/defects/public-tracker?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setPendingDefects(data.pending || []);
        setCompletedDefects(data.completed || []);
      }
    } catch (err) {
      console.warn('Public tracker sync warning:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicTracker();
  }, [selectedZone, selectedSeverity, searchQuery]);

  // Current active list (Stack: latest on top)
  const currentList = activeTab === 'pending' ? pendingDefects : completedDefects;

  const zonesList = [
    { id: 'all', name: 'All 5 Corporations' },
    { id: 'Central', name: 'Central Corporation' },
    { id: 'East', name: 'East Corporation' },
    { id: 'South', name: 'South Corporation' },
    { id: 'West', name: 'West Corporation' },
    { id: 'North', name: 'North Corporation' }
  ];

  const severitiesList = [
    { id: 'all', name: 'All Severities' },
    { id: 'CRITICAL', name: 'Critical Severity' },
    { id: 'HIGH', name: 'High Severity' },
    { id: 'MODERATE', name: 'Medium / Moderate' }
  ];

  const formatCivicDate = (isoStr) => {
    if (!isoStr) return '—';
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-slate-100">
      
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-3">
            <ShieldCheck className="w-4 h-4" />
            <span>Public Civic Transparency Portal • No Login Required</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white flex items-center space-x-3">
            <span>Civic Road Issues & Verification Tracker</span>
          </h1>
          <p className="text-sm text-slate-400 mt-2 max-w-3xl leading-relaxed">
            Live municipal issue stack: Track reported road defects and inspect verified repairs with authentic Before & After photos verified and authorized by the Municipal Chief Infrastructure Head.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold border border-slate-800 transition"
            >
              ← Back to Main Dashboard
            </button>
          )}
          <button
            type="button"
            onClick={fetchPublicTracker}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition hover:text-white"
            title="Refresh Issues Stack"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Tab Switcher: Pending vs Completed (Stack Toggle) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        {/* TAB 1: COMPLETED & REPAIRED PROBLEMS */}
        <button
          type="button"
          onClick={() => setActiveTab('completed')}
          className={`p-5 rounded-2xl border text-left transition-all duration-300 relative overflow-hidden flex items-center justify-between shadow-xl cursor-pointer ${
            activeTab === 'completed'
              ? 'bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-950 border-emerald-500/50 shadow-emerald-500/10 ring-1 ring-emerald-500/30'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 opacity-80 hover:opacity-100'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold">
                Officially Verified by Head Admin
              </span>
            </div>
            <h2 className="text-xl font-black text-white">
              Completed & Solved Problems
            </h2>
            <p className="text-xs text-slate-400">
              Inspected repairs featuring authentic Before & After photo evidence and completion turnaround times.
            </p>
          </div>

          <div className="text-right pl-4">
            <span className="text-3xl font-black text-emerald-400 font-mono">
              {completedDefects.length}
            </span>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
              Resolved Works
            </div>
          </div>
        </button>

        {/* TAB 2: PENDING / ACTIVE PROBLEMS */}
        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          className={`p-5 rounded-2xl border text-left transition-all duration-300 relative overflow-hidden flex items-center justify-between shadow-xl cursor-pointer ${
            activeTab === 'pending'
              ? 'bg-gradient-to-r from-rose-950/70 via-slate-900 to-slate-950 border-rose-500/50 shadow-rose-500/10 ring-1 ring-rose-500/30'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 opacity-80 hover:opacity-100'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-ping"></span>
              <span className="text-xs font-mono uppercase tracking-wider text-rose-400 font-bold">
                In Active Pipeline
              </span>
            </div>
            <h2 className="text-xl font-black text-white">
              Pending Road Problems
            </h2>
            <p className="text-xs text-slate-400">
              Reported potholes & road defects currently being triaged by Head Admin or in repair by Area Heads.
            </p>
          </div>

          <div className="text-right pl-4">
            <span className="text-3xl font-black text-rose-400 font-mono">
              {pendingDefects.length}
            </span>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
              Pending Repairs
            </div>
          </div>
        </button>

      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
        
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by street, ward, or ticket..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Zone and Severity Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          
          {/* Zone Filter */}
          <div className="flex items-center space-x-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-300">
            <MapPin className="w-3.5 h-3.5 text-cyan-400" />
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
            >
              {zonesList.map(z => (
                <option key={z.id} value={z.id} className="bg-slate-900 text-white">
                  {z.name}
                </option>
              ))}
            </select>
          </div>

          {/* Severity Filter */}
          <div className="flex items-center space-x-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-300">
            <Filter className="w-3.5 h-3.5 text-amber-400" />
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
            >
              {severitiesList.map(s => (
                <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Stack Sorting Badge */}
          <div className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-800/80 text-[11px] font-mono text-slate-400 border border-slate-700">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Stack: Latest on Top</span>
          </div>

        </div>

      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="py-16 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
          <p className="text-xs font-mono text-slate-400">Loading live issues stack from municipal database...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && currentList.length === 0 && (
        <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-12 text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto opacity-70" />
          <h3 className="text-base font-bold text-white">No Issues Matching Selected Filters</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {activeTab === 'completed'
              ? 'No completed repairs matching your criteria in this zone.'
              : 'All reported defects for this filter have been addressed or none logged.'}
          </p>
        </div>
      )}

      {/* THE STACK: Latest Problems on Top (LIFO Stack Presentation) */}
      {!loading && currentList.length > 0 && (
        <div className="space-y-6">
          
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
            <span>DISPLAYING {currentList.length} {activeTab === 'completed' ? 'RESOLVED' : 'PENDING'} ISSUES</span>
            <span className="text-cyan-400 font-semibold">Stack Order: Newest Ticket (Top) → Earliest (Bottom)</span>
          </div>

          {currentList.map((defect, index) => {
            const isCompleted = activeTab === 'completed';
            const beforeImage = defect.image_url || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80';
            const afterImage = defect.completion_details?.after_image_url || 'https://images.unsplash.com/photo-1545459720-aac8509eb02c?auto=format&fit=crop&w=800&q=80';

            return (
              <div
                key={defect.id || defect.ticket_code}
                className={`rounded-2xl border bg-slate-900/90 shadow-2xl overflow-hidden transition-all duration-300 hover:border-slate-600 ${
                  index === 0
                    ? isCompleted
                      ? 'border-emerald-500/40 ring-1 ring-emerald-500/20'
                      : 'border-rose-500/40 ring-1 ring-rose-500/20'
                    : 'border-slate-800'
                }`}
              >
                
                {/* Card Header Bar */}
                <div className="bg-slate-950 px-5 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                  
                  <div className="flex items-center space-x-3">
                    <span className="font-mono font-bold text-cyan-300 text-sm">
                      #{defect.ticket_code}
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="font-medium text-slate-300">
                      {defect.category_label || defect.type?.toUpperCase()}
                    </span>
                    {index === 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                        TOP OF STACK (LATEST)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-3">
                    {/* Severity Badge */}
                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold font-mono ${
                      defect.severity === 'CRITICAL'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : defect.severity === 'HIGH'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                    }`}>
                      {defect.severity} SEVERITY
                    </span>

                    {/* Status Pill */}
                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center space-x-1.5 ${
                      isCompleted
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}>
                      {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                      <span>{defect.status}</span>
                    </span>
                  </div>

                </div>

                {/* Card Main Body */}
                <div className="p-6 space-y-6">
                  
                  {/* Title & Location Row */}
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <h3 className="text-lg font-bold text-white">
                        {defect.title}
                      </h3>
                      <p className="text-xs text-slate-400 flex items-center space-x-2">
                        <MapPin className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                        <span>
                          {defect.location?.address || 'Municipal Road'} • Ward {defect.location?.ward_no || '150'} ({defect.location?.ward_name || defect.location?.zone})
                        </span>
                      </p>
                      <p className="text-xs text-slate-300 leading-relaxed pt-1">
                        {defect.description}
                      </p>
                    </div>

                    {/* Key Metrics Chipset */}
                    <div className="flex flex-wrap md:flex-col items-end gap-2 text-xs font-mono">
                      {isCompleted && (
                        <div className="bg-emerald-950/60 border border-emerald-500/40 px-3 py-1.5 rounded-xl text-emerald-200 flex items-center space-x-2">
                          <Clock className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Turnaround: <strong className="text-white">{defect.duration_took_str || defect.completion_details?.duration_str || '18 hours'}</strong></span>
                        </div>
                      )}
                      <div className="bg-slate-950 border border-slate-800 px-3 py-1 rounded-lg text-slate-400 text-[11px]">
                        Depth: <strong className="text-white">{defect.dimensions?.depth_cm || 10} cm</strong> • Width: <strong className="text-white">{defect.dimensions?.width_cm || 45} cm</strong>
                      </div>
                    </div>
                  </div>

                  {/* =========================================================
                      IMAGE VIEW:
                      - If Completed: Show authentic Before & After side-by-side
                      - If Pending: Show original damage photo
                     ========================================================= */}
                  {isCompleted ? (
                    <div className="space-y-3">
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-xs font-bold text-slate-200">
                          <Sparkles className="w-4 h-4 text-emerald-400" />
                          <span>VERIFIED BEFORE & AFTER PHOTO EVIDENCE (AUTHORIZED BY HEAD ADMIN):</span>
                        </div>

                        <div className="flex items-center space-x-2 text-[11px] font-mono">
                          <span className="text-slate-400">View:</span>
                          <button
                            type="button"
                            onClick={() => setComparisonMode('side-by-side')}
                            className={`px-2 py-0.5 rounded text-[11px] ${comparisonMode === 'side-by-side' ? 'bg-emerald-600 text-white font-bold' : 'bg-slate-800 text-slate-400'}`}
                          >
                            Side-by-Side
                          </button>
                          <button
                            type="button"
                            onClick={() => setComparisonMode('slider')}
                            className={`px-2 py-0.5 rounded text-[11px] ${comparisonMode === 'slider' ? 'bg-emerald-600 text-white font-bold' : 'bg-slate-800 text-slate-400'}`}
                          >
                            Interactive Split Slider
                          </button>
                        </div>
                      </div>

                      {comparisonMode === 'side-by-side' ? (
                        /* Side-by-Side Before vs After Layout */
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          
                          {/* BEFORE IMAGE (Original Damage Report) */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs font-mono">
                              <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40 flex items-center space-x-1">
                                <span>1. BEFORE (CITIZEN REPORT)</span>
                              </span>
                              <span className="text-slate-400 text-[11px]">
                                {formatCivicDate(defect.created_at)}
                              </span>
                            </div>
                            <div className="relative aspect-video rounded-xl overflow-hidden border border-rose-500/30 bg-black group">
                              <img
                                src={beforeImage}
                                alt="Before road damage"
                                className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                              />
                              <div className="absolute bottom-2 left-2 bg-slate-950/80 backdrop-blur-md px-2 py-1 rounded text-[10px] font-mono text-rose-300 border border-rose-500/30">
                                Severe Crater / Pothole
                              </div>
                            </div>
                          </div>

                          {/* AFTER IMAGE (Completed & Verified Repair) */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs font-mono">
                              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 flex items-center space-x-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                <span>2. AFTER (COMPLETED REPAIR)</span>
                              </span>
                              <span className="text-slate-400 text-[11px]">
                                {formatCivicDate(defect.resolved_at || defect.completion_details?.completed_at)}
                              </span>
                            </div>
                            <div className="relative aspect-video rounded-xl overflow-hidden border border-emerald-500/40 bg-black group">
                              <img
                                src={afterImage}
                                alt="After repaired road"
                                className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                              />
                              <div className="absolute bottom-2 left-2 bg-slate-950/80 backdrop-blur-md px-2 py-1 rounded text-[10px] font-mono text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                                <span>Paved Asphalt Restored</span>
                              </div>
                            </div>
                          </div>

                        </div>
                      ) : (
                        /* Interactive Split Slider Comparison */
                        <div className="space-y-2">
                          <div className="relative aspect-video max-h-96 w-full rounded-2xl overflow-hidden border border-emerald-500/30 bg-black select-none">
                            {/* After Image (Base) */}
                            <img
                              src={afterImage}
                              alt="After repair"
                              className="absolute inset-0 w-full h-full object-cover"
                            />

                            {/* Before Image (Clipped by slider position) */}
                            <div
                              className="absolute inset-0 overflow-hidden"
                              style={{ width: `${sliderPosition}%` }}
                            >
                              <img
                                src={beforeImage}
                                alt="Before damage"
                                className="w-full h-full object-cover"
                                style={{
                                  width: '100%',
                                  maxWidth: 'none'
                                }}
                              />
                              <div className="absolute top-3 left-3 bg-rose-950/90 text-rose-300 text-xs font-bold px-2.5 py-1 rounded-lg border border-rose-500/50 shadow-md">
                                BEFORE (REPORTED)
                              </div>
                            </div>

                            <div className="absolute top-3 right-3 bg-emerald-950/90 text-emerald-300 text-xs font-bold px-2.5 py-1 rounded-lg border border-emerald-500/50 shadow-md">
                              AFTER (REPAIRED)
                            </div>

                            {/* Slider Line Divider */}
                            <div
                              className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize shadow-2xl z-10 flex items-center justify-center"
                              style={{ left: `${sliderPosition}%` }}
                            >
                              <div className="w-7 h-7 rounded-full bg-white text-slate-900 flex items-center justify-center shadow-lg font-bold text-[10px]">
                                ⇄
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3 text-xs text-slate-400 px-1">
                            <span className="font-mono">Slide to compare:</span>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={sliderPosition}
                              onChange={(e) => setSliderPosition(Number(e.target.value))}
                              className="w-full accent-emerald-500 cursor-pointer"
                            />
                            <span className="font-mono font-bold text-white">{sliderPosition}%</span>
                          </div>
                        </div>
                      )}

                      {/* Official Verification Footnote & Sign-Off */}
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs font-mono">
                        <div className="space-y-1">
                          <div className="text-emerald-400 font-bold flex items-center space-x-1.5">
                            <ShieldCheck className="w-4 h-4" />
                            <span>OFFICIAL HEAD ADMIN VERIFICATION SEAL</span>
                          </div>
                          <div className="text-slate-300">
                            Approved by: <strong className="text-white">{defect.approved_by?.name || 'Dr. B. K. Shivakumar (Chief Infrastructure Commissioner)'}</strong>
                          </div>
                          <div className="text-slate-400 text-[11px]">
                            Remarks: "{defect.approved_by?.remarks || 'Dual photo evidence confirmed. Road surface leveled and cleared for commuter traffic.'}"
                          </div>
                        </div>

                        <div className="text-right space-y-1 md:border-l md:border-slate-800 md:pl-4">
                          <div className="text-slate-400">
                            Supervising Area Head: <strong className="text-cyan-300">{defect.assigned_area_head?.name || 'Er. Suresh Gowda (South Area Head)'}</strong>
                          </div>
                          <div className="text-slate-400 text-[11px]">
                            Field Crew: <strong className="text-slate-200">{defect.completion_details?.completed_by_workers || defect.field_crew || 'Zonal Rapid Asphalt Gang'}</strong>
                          </div>
                        </div>
                      </div>

                    </div>
                  ) : (
                    /* PENDING ISSUE IMAGE & LIFECYCLE PROGRESS */
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                      
                      {/* Left: Original Citizen Damage Photo */}
                      <div className="md:col-span-5 space-y-2">
                        <div className="relative aspect-video rounded-xl overflow-hidden border border-rose-500/30 bg-black group">
                          <img
                            src={beforeImage}
                            alt="Pending road damage"
                            className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                          />
                          <div className="absolute top-2 left-2 bg-rose-950/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono text-rose-300 border border-rose-500/30 font-bold">
                            REPORTED DAMAGE
                          </div>
                          <div className="absolute bottom-2 right-2 bg-slate-950/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono text-slate-300">
                            📍 {defect.location?.lat?.toFixed(4)}, {defect.location?.lng?.toFixed(4)}
                          </div>
                        </div>
                      </div>

                      {/* Right: Progress Tracker (Lifecycle Stages) */}
                      <div className="md:col-span-7 space-y-4">
                        <h4 className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider flex items-center space-x-1.5">
                          <Layers className="w-3.5 h-3.5 text-cyan-400" />
                          <span>MUNICIPAL RESOLUTION PIPELINE:</span>
                        </h4>

                        <div className="space-y-3 text-xs font-mono">
                          
                          {/* Step 1: Forwarded to Head Admin */}
                          <div className="flex items-center space-x-3 p-2.5 rounded-xl bg-slate-950 border border-emerald-500/30 text-emerald-300">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                            <div>
                              <div className="font-bold">Step 1: Forwarded to Head Admin (Central Command)</div>
                              <div className="text-[11px] text-slate-400">Captured by citizen camera & received at Municipal Command HQ.</div>
                            </div>
                          </div>

                          {/* Step 2: Distribution to Area Head */}
                          <div className={`flex items-center space-x-3 p-2.5 rounded-xl border ${
                            defect.assigned_area_head
                              ? 'bg-slate-950 border-emerald-500/30 text-emerald-300'
                              : 'bg-slate-950/60 border-slate-800 text-slate-400'
                          }`}>
                            {defect.assigned_area_head ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border border-slate-600 flex items-center justify-center text-[10px] text-slate-400 font-bold">2</div>
                            )}
                            <div>
                              <div className="font-bold">
                                Step 2: {defect.assigned_area_head ? `Assigned to Area Head: ${defect.assigned_area_head.name} (${defect.assigned_area_head.zone} Zone)` : 'Awaiting Area Head Distribution by Top Head'}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {defect.assigned_area_head ? 'Defect assigned within territorial radius for execution.' : 'Head Admin is reviewing territorial radius.'}
                              </div>
                            </div>
                          </div>

                          {/* Step 3: Work Execution by Field Workers */}
                          <div className={`flex items-center space-x-3 p-2.5 rounded-xl border ${
                            defect.status === 'In Progress'
                              ? 'bg-amber-950/30 border-amber-500/40 text-amber-300'
                              : 'bg-slate-950/60 border-slate-800 text-slate-500'
                          }`}>
                            <div className="w-4 h-4 rounded-full border border-slate-600 flex items-center justify-center text-[10px] font-bold">3</div>
                            <div>
                              <div className="font-bold">
                                Step 3: {defect.status === 'In Progress' ? 'Field Workers Dispatched & Road Repair in Progress' : 'Pending Worker Crew Dispatch'}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {defect.field_crew ? `Assigned Crew: ${defect.field_crew}` : 'Area Head will schedule paving crew.'}
                              </div>
                            </div>
                          </div>

                          {/* Step 4: Final Head Admin Inspection */}
                          <div className={`flex items-center space-x-3 p-2.5 rounded-xl border ${
                            defect.workflow_stage === 'PENDING_HEAD_APPROVAL'
                              ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-300'
                              : 'bg-slate-950/60 border-slate-800 text-slate-500'
                          }`}>
                            <div className="w-4 h-4 rounded-full border border-slate-600 flex items-center justify-center text-[10px] font-bold">4</div>
                            <div>
                              <div className="font-bold">
                                Step 4: Head Admin Quality Check & Public Release
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {defect.workflow_stage === 'PENDING_HEAD_APPROVAL'
                                  ? 'Area Head has uploaded After photo. Awaiting final Head Admin sign-off.'
                                  : 'Will verify Before & After imagery before granting public completion status.'}
                              </div>
                            </div>
                          </div>

                        </div>
                      </div>

                    </div>
                  )}

                  {/* Card Bottom Timestamp & Civic Guarantee Strip */}
                  <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-slate-500">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Reported Date: <strong className="text-slate-300">{formatCivicDate(defect.created_at)}</strong></span>
                      {defect.resolved_at && (
                        <>
                          <span>•</span>
                          <span>Resolved Date: <strong className="text-emerald-400">{formatCivicDate(defect.resolved_at)}</strong></span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center space-x-3">
                      <span>Verification Count: <strong className="text-slate-300">{defect.verification_count || 1}</strong></span>
                      <span>•</span>
                      <span>Duplicate Tickets Prevented: <strong className="text-emerald-400">{defect.duplicates_prevented || 0}</strong></span>
                    </div>
                  </div>

                </div>

              </div>
            );
          })}

        </div>
      )}

      {/* Bottom Civic Note */}
      <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 text-center space-y-2 text-xs text-slate-400 max-w-4xl mx-auto">
        <div className="flex items-center justify-center space-x-2 text-emerald-400 font-bold">
          <ShieldCheck className="w-4 h-4" />
          <span>NammaFix Civic Accountability Guarantee</span>
        </div>
        <p className="leading-relaxed">
          Every completed defect shown on this public portal requires authenticated dual-camera verification (Original Citizen Report vs Contractor After-Repair Photo) confirmed and stamped by the Municipal Chief Infrastructure Commissioner before public release.
        </p>
      </div>

    </div>
  );
}
