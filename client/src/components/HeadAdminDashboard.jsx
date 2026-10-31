import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Layers, 
  Check, 
  RotateCcw, 
  Sparkles, 
  Eye, 
  Car, 
  RefreshCw, 
  Filter, 
  LogOut,
  ArrowRight,
  TrendingUp,
  FileText,
  Search,
  HardHat,
  ChevronLeft,
  Calendar,
  ShieldCheck,
  ExternalLink,
  Sliders,
  CheckCircle,
  XCircle,
  Maximize2
} from 'lucide-react';
import allSubdivisions from '../data/subdivisions.json';
import GISMapView from './GISMapView';
import DefectDetailModal from './DefectDetailModal';

export default function HeadAdminDashboard({ govUser, onLogout, defects = [], roads = [], onDefectUpdated }) {
  // Navigation: Sub-division Drill-down state
  // When null, shows the 50 Sub-Divisions Directory Matrix
  // When set to a sub-division object, expands into that specific sub-division's dedicated inspection page
  const [selectedSubdivision, setSelectedSubdivision] = useState(null);

  // Sub-tab when on the main directory: 'subdivisions' (50 Sub-Divisions) | 'citywide_feed' (All Posted Issues) | 'gis_map' (City Map)
  const [mainViewTab, setMainViewTab] = useState('subdivisions');

  // Corporation Filter on the 50 Sub-Divisions Grid
  const [selectedCorpFilter, setSelectedCorpFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Drill-down sub-tab: 'solved' (Before/After Inspection) | 'pending' (Active Issues)
  const [drillDownTab, setDrillDownTab] = useState('solved');

  // Modal for Enlarged Before / After Comparison
  const [inspectionModalDefect, setInspectionModalDefect] = useState(null);
  const [comparisonMode, setComparisonMode] = useState('side_by_side'); // 'side_by_side' | 'slider'
  const [sliderPosition, setSliderPosition] = useState(50);

  // Detail Modal for single defect inspection
  const [selectedDefect, setSelectedDefect] = useState(null);

  // GIS Tab Specific Severity Stage Filter & Selected Defect Drawer
  const [gisStageFilter, setGisStageFilter] = useState('ALL');
  const [gisSelectedDefect, setGisSelectedDefect] = useState(null);

  // Simulation loading state
  const [isSimulatingDefect, setIsSimulatingDefect] = useState(false);

  const CORPORATIONS = ['All', 'Central', 'East', 'South', 'West', 'North'];

  // Calculate Sub-Division performance dynamically from active defects
  const enrichedSubdivisions = allSubdivisions.map(sub => {
    const assigned = defects.filter(d => 
      d.assigned_subdivision?.id === sub.id ||
      d.assigned_subdivision?.name === sub.name ||
      (d.location?.ward_no && sub.wards?.includes(d.location.ward_no))
    );
    const solved = assigned.filter(d => d.status === 'Resolved');
    const inProgress = assigned.filter(d => d.status === 'In Progress');
    const pending = assigned.filter(d => d.status !== 'Resolved');
    const rate = assigned.length > 0 ? Math.round((solved.length / assigned.length) * 100) : 100;

    return {
      ...sub,
      total_assigned: assigned.length,
      solved_count: solved.length,
      in_progress_count: inProgress.length,
      pending_count: pending.length,
      resolution_rate_pct: rate,
      defects_list: assigned
    };
  });

  // Filter Sub-Divisions by Corporation and Search
  const filteredSubdivisions = enrichedSubdivisions.filter(sub => {
    const matchesCorp = selectedCorpFilter === 'All' || sub.corporation === selectedCorpFilter;
    const matchesSearch = !searchQuery ||
      sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.engineer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sub.wards && sub.wards.some(w => String(w).includes(searchQuery)));
    return matchesCorp && matchesSearch;
  });

  // Citywide Aggregate KPIs
  const totalCityDefects = defects.length;
  const totalCitySolved = defects.filter(d => d.status === 'Resolved').length;
  const totalCityPending = defects.filter(d => d.status !== 'Resolved').length;
  const totalCityInProgress = defects.filter(d => d.status === 'In Progress').length;
  const citywideResolutionRate = totalCityDefects > 0 ? Math.round((totalCitySolved / totalCityDefects) * 100) : 100;

  // If a Sub-Division is selected for drill-down, compute its defects
  const currentSubdivDefects = selectedSubdivision 
    ? defects.filter(d => 
        d.assigned_subdivision?.id === selectedSubdivision.id ||
        d.assigned_subdivision?.name === selectedSubdivision.name ||
        (d.location?.ward_no && selectedSubdivision.wards?.includes(d.location.ward_no))
      )
    : [];

  const currentSubdivSolved = currentSubdivDefects
    .filter(d => d.status === 'Resolved')
    .sort((a, b) => new Date(b.resolved_at || b.created_at) - new Date(a.resolved_at || a.created_at));

  const currentSubdivPending = currentSubdivDefects
    .filter(d => d.status !== 'Resolved')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  // Action: Simulate a defect in this sub-division
  const handleSimulateDefectInSubdiv = async (subdivId) => {
    setIsSimulatingDefect(true);
    try {
      const res = await fetch(`/api/subdivisions/${subdivId}/simulate-defect`, {
        method: 'POST'
      });
      const data = await res.json();
      setIsSimulatingDefect(false);
      if (data.success && data.defect && onDefectUpdated) {
        onDefectUpdated(data.defect);
      }
    } catch (err) {
      setIsSimulatingDefect(false);
      alert('Simulation error: ' + err.message);
    }
  };

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
      
      {/* Top Municipal Commissioner Header */}
      <div className="bg-gradient-to-r from-blue-950/80 via-slate-900 to-indigo-950/80 p-6 sm:p-7 rounded-3xl border border-blue-500/30 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 text-white flex items-center justify-center shadow-xl shadow-blue-500/20 ring-2 ring-blue-400/30 shrink-0">
            <Building2 className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase tracking-wider">
                Municipal Central Command HQ
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                5 Corporations • 50 Sub-Divisions
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              Dr. B. K. Shivakumar
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Chief Municipal Infrastructure Commissioner • Bengaluru City Corporations
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
          {selectedSubdivision && (
            <button
              type="button"
              onClick={() => setSelectedSubdivision(null)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center space-x-1.5 border border-slate-700 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to All 50 Sub-Divisions</span>
            </button>
          )}

          <button
            type="button"
            onClick={onLogout}
            className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-bold transition flex items-center space-x-1.5 border border-rose-500/30 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Citywide Overview KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow-md">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Citywide Posted</div>
          <div className="text-2xl font-extrabold text-white mt-1">{totalCityDefects}</div>
          <div className="text-[11px] text-blue-400 mt-0.5 font-medium">All 5 Corporations</div>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow-md">
          <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">Pending Assignment</div>
          <div className="text-2xl font-extrabold text-amber-400 mt-1">{totalCityPending}</div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-medium">Awaiting Area Action</div>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow-md">
          <div className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">In Progress Work</div>
          <div className="text-2xl font-extrabold text-cyan-400 mt-1">{totalCityInProgress}</div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-medium">Field Crews Dispatched</div>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow-md">
          <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Solved & Verified</div>
          <div className="text-2xl font-extrabold text-emerald-400 mt-1">{totalCitySolved}</div>
          <div className="text-[11px] text-emerald-400/80 mt-0.5 font-medium">With Before/After Photos</div>
        </div>

        <div className="col-span-2 lg:col-span-1 bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow-md">
          <div className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">Resolution Rate</div>
          <div className="text-2xl font-extrabold text-indigo-400 mt-1">{citywideResolutionRate}%</div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div className="bg-indigo-500 h-full rounded-full transition-all" style={{ width: `${citywideResolutionRate}%` }}></div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          VIEW 1: SUB-DIVISION DRILL-DOWN PAGE (WHEN A SUB-DIVISION IS CLICKED)
          ========================================================================= */}
      {selectedSubdivision ? (
        <div className="space-y-6 animate-fade-in">
          
          {/* Sub-Division Profile & Breadcrumbs Banner */}
          <div className="bg-slate-900/90 rounded-3xl border border-cyan-500/30 p-6 sm:p-7 shadow-xl">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <button
                  type="button"
                  onClick={() => setSelectedSubdivision(null)}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center space-x-1 mb-2 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>← Back to All 50 Sub-Divisions Directory</span>
                </button>
                <div className="flex items-center space-x-3">
                  <h2 className="text-2xl font-extrabold text-white">
                    {selectedSubdivision.name}
                  </h2>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                    {selectedSubdivision.corporation} Corporation
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 mt-2">
                  <span>Executive Officer: <strong className="text-slate-200">{selectedSubdivision.engineer}</strong></span>
                  <span>•</span>
                  <span>Official Email: <strong className="text-slate-200 font-mono">{selectedSubdivision.email}</strong></span>
                  <span>•</span>
                  <span>Coverage: <strong className="text-slate-200">{selectedSubdivision.radius_km} km radius</strong></span>
                  <span>•</span>
                  <span>Covered Wards: <strong className="text-slate-200">{selectedSubdivision.wards?.join(', ') || 'Territory'}</strong></span>
                </div>
              </div>

              <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
                <button
                  type="button"
                  disabled={isSimulatingDefect}
                  onClick={() => handleSimulateDefectInSubdiv(selectedSubdivision.id)}
                  className="px-4 py-2.5 rounded-xl bg-cyan-600/90 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/20 transition flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isSimulatingDefect ? 'Simulating...' : 'Simulate Defect in this Division'}</span>
                </button>
              </div>
            </div>

            {/* Division Sub-Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Assigned</div>
                <div className="text-xl font-bold text-white mt-0.5">{currentSubdivDefects.length}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                <div className="text-[10px] text-emerald-400 uppercase font-semibold">Solved & Completed</div>
                <div className="text-xl font-bold text-emerald-400 mt-0.5">{currentSubdivSolved.length}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                <div className="text-[10px] text-amber-400 uppercase font-semibold">Pending / In-Progress</div>
                <div className="text-xl font-bold text-amber-400 mt-0.5">{currentSubdivPending.length}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                <div className="text-[10px] text-cyan-400 uppercase font-semibold">Resolution Rate</div>
                <div className="text-xl font-bold text-cyan-400 mt-0.5">
                  {currentSubdivDefects.length > 0 ? Math.round((currentSubdivSolved.length / currentSubdivDefects.length) * 100) : 100}%
                </div>
              </div>
            </div>
          </div>

          {/* Sub-Division Drill-Down Tabs */}
          <div className="flex items-center space-x-3 border-b border-slate-800 pb-3">
            <button
              type="button"
              onClick={() => setDrillDownTab('solved')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer border ${
                drillDownTab === 'solved'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/20'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Solved Problems & Before/After Proof ({currentSubdivSolved.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setDrillDownTab('pending')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer border ${
                drillDownTab === 'pending'
                  ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-600/20'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Pending & Active Issues ({currentSubdivPending.length})</span>
            </button>
          </div>

          {/* TAB CONTENT: SOLVED PROBLEMS WITH BEFORE & AFTER PHOTOS */}
          {drillDownTab === 'solved' && (
            <div className="space-y-4">
              {currentSubdivSolved.length === 0 ? (
                <div className="p-12 text-center bg-slate-900/60 rounded-3xl border border-slate-800">
                  <CheckCircle2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-white">No Solved Problems Yet in this Sub-Division</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                    When {selectedSubdivision.engineer} and their field crew complete road repairs and submit the After photo, it will appear here for quality review.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {currentSubdivSolved.map(defect => {
                    const beforeImg = defect.image_url || '/images/pothole_before.jpg';
                    const afterImg = defect.completion_details?.after_image_url || '/images/pothole_after.jpg';

                    return (
                      <div 
                        key={defect.id}
                        className="bg-slate-900/90 rounded-3xl border border-slate-800 p-6 shadow-xl hover:border-slate-700 transition"
                      >
                        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-4">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                                {defect.ticket_code}
                              </span>
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">
                                {defect.category_label || defect.type}
                              </span>
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                ✓ Solved & Verified
                              </span>
                            </div>
                            <h3 className="text-lg font-bold text-white mt-1.5">{defect.title}</h3>
                            <p className="text-xs text-slate-400 flex items-center space-x-1.5 mt-0.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span>{defect.location?.address || `${selectedSubdivision.name}, Ward ${defect.location?.ward_no}`}</span>
                            </p>
                          </div>

                          <div className="flex items-center space-x-3 w-full lg:w-auto justify-end">
                            <div className="text-right">
                              <div className="text-[10px] text-slate-400 uppercase font-semibold">Turnaround Duration</div>
                              <div className="text-sm font-extrabold text-emerald-400">
                                {defect.duration_took_str || defect.completion_details?.duration_str || '18 hours'}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setInspectionModalDefect(defect)}
                              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold border border-slate-700 transition flex items-center space-x-1.5 cursor-pointer"
                            >
                              <Maximize2 className="w-3.5 h-3.5" />
                              <span>Enlarge & Compare</span>
                            </button>
                          </div>
                        </div>

                        {/* Side-by-Side Before and After Photo Display */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
                          {/* Before Photo */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-rose-400 flex items-center space-x-1.5">
                                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                                <span>Before Repair (Original Report)</span>
                              </span>
                              <span className="text-[11px] text-slate-400 font-mono">
                                Reported: {formatCivicDate(defect.created_at)}
                              </span>
                            </div>
                            <div 
                              className="relative h-56 rounded-2xl overflow-hidden border border-rose-500/30 bg-slate-950 cursor-pointer group"
                              onClick={() => setInspectionModalDefect(defect)}
                            >
                              <img
                                src={beforeImg}
                                alt="Before repair"
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                              />
                              <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-rose-950/80 backdrop-blur-md border border-rose-500/40 text-[10px] font-bold text-rose-300">
                                Damaged Road Crater
                              </div>
                            </div>
                          </div>

                          {/* After Photo */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-emerald-400 flex items-center space-x-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                <span>After Repair (Completed Work)</span>
                              </span>
                              <span className="text-[11px] text-slate-400 font-mono">
                                Completed: {formatCivicDate(defect.resolved_at || defect.completion_details?.completed_at)}
                              </span>
                            </div>
                            <div 
                              className="relative h-56 rounded-2xl overflow-hidden border border-emerald-500/30 bg-slate-950 cursor-pointer group"
                              onClick={() => setInspectionModalDefect(defect)}
                            >
                              <img
                                src={afterImg}
                                alt="After repair"
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                              />
                              <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-emerald-950/80 backdrop-blur-md border border-emerald-500/40 text-[10px] font-bold text-emerald-300">
                                Restored Asphalt Surface
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Repair Notes & Crew Footer */}
                        <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-3">
                          <div className="space-y-1">
                            <span className="text-slate-400">Field Crew: </span>
                            <strong className="text-slate-200">
                              {defect.completion_details?.completed_by_workers || defect.field_crew || `${selectedSubdivision.name} Paving Gang`}
                            </strong>
                            <p className="text-slate-400 italic">
                              "{defect.completion_details?.repair_notes || 'Excavated, tack-coated, filled with hot bituminous macadam and vibratory compacted flush with roadway.'}"
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold inline-flex items-center space-x-1">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Chief Approved</span>
                            </span>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB CONTENT: PENDING ISSUES IN THIS SUB-DIVISION */}
          {drillDownTab === 'pending' && (
            <div className="space-y-4">
              {currentSubdivPending.length === 0 ? (
                <div className="p-12 text-center bg-slate-900/60 rounded-3xl border border-slate-800">
                  <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-white">Zero Pending Defects in this Sub-Division!</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                    All reported road defects in {selectedSubdivision.name} have been fixed and approved.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentSubdivPending.map(defect => (
                    <div 
                      key={defect.id}
                      className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-lg space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                          {defect.ticket_code}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          defect.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {defect.severity}
                        </span>
                      </div>

                      <h4 className="font-bold text-sm text-white">{defect.title}</h4>
                      <p className="text-xs text-slate-400 line-clamp-2">{defect.description}</p>

                      <div className="h-40 rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                        <img 
                          src={defect.image_url || '/images/pothole_before.jpg'} 
                          alt="Pending issue" 
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                        <span>Reported: {formatCivicDate(defect.created_at)}</span>
                        <span className="text-amber-400 font-semibold">{defect.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      ) : (
        /* =========================================================================
           VIEW 2: 50 SUB-DIVISIONS DIRECTORY MATRIX (PRIMARY VIEW)
           ========================================================================= */
        <div className="space-y-6">
          
          {/* View Mode Selector Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setMainViewTab('subdivisions')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer border ${
                  mainViewTab === 'subdivisions'
                    ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>50 Sub-Divisions Matrix</span>
              </button>

              <button
                type="button"
                onClick={() => setMainViewTab('citywide_feed')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer border ${
                  mainViewTab === 'citywide_feed'
                    ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>All Posted Problems Stack ({defects.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setMainViewTab('gis_map')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer border ${
                  mainViewTab === 'gis_map'
                    ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <MapPin className="w-4 h-4" />
                <span>City GIS Map</span>
              </button>
            </div>

            <div className="text-xs text-slate-400 font-medium">
              Showing <strong className="text-white">{filteredSubdivisions.length}</strong> of 50 Sub-Divisions
            </div>
          </div>

          {/* MAIN TAB 1: 50 SUB-DIVISIONS MATRIX */}
          {mainViewTab === 'subdivisions' && (
            <div className="space-y-6">
              
              {/* Corporation Selector Tabs & Search Filter */}
              <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
                {/* Corporation Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
                  {CORPORATIONS.map(corp => {
                    const count = corp === 'All' 
                      ? allSubdivisions.length 
                      : allSubdivisions.filter(s => s.corporation === corp).length;
                    const isActive = selectedCorpFilter === corp;
                    return (
                      <button
                        key={corp}
                        type="button"
                        onClick={() => setSelectedCorpFilter(corp)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer border ${
                          isActive
                            ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-600/30'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                        }`}
                      >
                        {corp} ({count})
                      </button>
                    );
                  })}
                </div>

                {/* Search Bar */}
                <div className="relative w-full md:w-72">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search sub-division, engineer or ward..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Sub-Divisions Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredSubdivisions.map(sub => (
                  <div
                    key={sub.id}
                    onClick={() => {
                      setSelectedSubdivision(sub);
                      setDrillDownTab('solved');
                    }}
                    className="bg-slate-900/90 hover:bg-slate-900 rounded-3xl border border-slate-800 hover:border-blue-500/50 p-5 shadow-xl transition transform hover:-translate-y-1 cursor-pointer flex flex-col justify-between group"
                  >
                    <div>
                      {/* Top Corporation Badge & Division ID */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {sub.corporation} Corporation
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {sub.radius_km} km radius
                        </span>
                      </div>

                      {/* Sub-Division Name */}
                      <h3 className="font-extrabold text-base text-white group-hover:text-blue-300 transition">
                        {sub.name}
                      </h3>

                      {/* Officer Info */}
                      <div className="mt-2 flex items-center space-x-2 text-xs text-slate-300">
                        <HardHat className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="font-semibold">{sub.engineer}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">
                        {sub.email}
                      </div>

                      {/* Covered Wards */}
                      <div className="text-[11px] text-slate-400 mt-2">
                        Wards: <span className="text-slate-300">{sub.wards?.join(', ') || 'Coverage Area'}</span>
                      </div>
                    </div>

                    {/* Stats & Click-to-Drill Trigger */}
                    <div className="mt-5 pt-4 border-t border-slate-800/80">
                      <div className="grid grid-cols-3 gap-2 text-center mb-3">
                        <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800/60">
                          <div className="text-[9px] uppercase font-semibold text-slate-400">Total</div>
                          <div className="text-sm font-bold text-white mt-0.5">{sub.total_assigned}</div>
                        </div>
                        <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800/60">
                          <div className="text-[9px] uppercase font-semibold text-amber-400">Pending</div>
                          <div className="text-sm font-bold text-amber-400 mt-0.5">{sub.pending_count}</div>
                        </div>
                        <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800/60">
                          <div className="text-[9px] uppercase font-semibold text-emerald-400">Solved</div>
                          <div className="text-sm font-bold text-emerald-400 mt-0.5">{sub.solved_count}</div>
                        </div>
                      </div>

                      {/* Action Bar */}
                      <div className="flex items-center justify-between text-xs text-blue-400 font-bold pt-1 group-hover:text-blue-300">
                        <span>Inspect Solved Work & Issues</span>
                        <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition" />
                      </div>
                    </div>

                  </div>
                ))}
              </div>

            </div>
          )}

          {/* MAIN TAB 2: ALL POSTED PROBLEMS STACK */}
          {mainViewTab === 'citywide_feed' && (
            <div className="space-y-4">
              <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">
                  Citywide Issues Stack (Latest Defect on Top)
                </span>
                <span className="text-xs text-blue-400 font-mono">
                  {defects.length} Total Registered Defects
                </span>
              </div>

              <div className="space-y-3">
                {defects.map(d => (
                  <div
                    key={d.id}
                    onClick={() => setSelectedDefect(d)}
                    className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer"
                  >
                    <div className="flex items-center space-x-3.5">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-950 shrink-0 border border-slate-800">
                        <img 
                          src={d.image_url || '/images/pothole_before.jpg'} 
                          alt="Defect" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-bold text-blue-400">{d.ticket_code}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            d.status === 'Resolved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {d.status}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-white mt-0.5">{d.title}</h4>
                        <p className="text-xs text-slate-400">
                          Assigned: <strong className="text-slate-200">{d.assigned_subdivision?.name || 'Auto-Assigned'}</strong> • {d.location?.address}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-mono text-slate-400">{formatCivicDate(d.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MAIN TAB 3: GIS MAP VIEW (WITH CRITICAL, MEDIUM, AND LOW STAGES TELEMETRY) */}
          {mainViewTab === 'gis_map' && (() => {
            const gisCriticalCount = defects.filter(d => ['CRITICAL', 'SEVERE'].includes((d.severity || '').toUpperCase())).length;
            const gisMediumCount = defects.filter(d => ['MEDIUM', 'MODERATE', 'HIGH'].includes((d.severity || '').toUpperCase())).length;
            const gisLowCount = defects.filter(d => ['LOW', 'MINOR'].includes((d.severity || '').toUpperCase())).length;
            const gisResolvedCount = defects.filter(d => d.status === 'Resolved').length;

            const displayedGisDefects = defects.filter(d => {
              if (gisStageFilter === 'CRITICAL') return ['CRITICAL', 'SEVERE'].includes((d.severity || '').toUpperCase());
              if (gisStageFilter === 'MEDIUM') return ['MEDIUM', 'MODERATE', 'HIGH'].includes((d.severity || '').toUpperCase());
              if (gisStageFilter === 'LOW') return ['LOW', 'MINOR'].includes((d.severity || '').toUpperCase());
              if (gisStageFilter === 'RESOLVED') return d.status === 'Resolved';
              return true;
            });

            return (
              <div className="space-y-4">
                {/* Stage Telemetry & Interactive Filter Bar */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
                        <h3 className="text-base font-extrabold text-white">
                          Municipal Road Defect Stages GIS Satellite Map
                        </h3>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Real-time citywide geospatial distribution across 5 Corporations and 50 Sub-Divisions
                      </p>
                    </div>

                    <div className="text-xs font-mono text-cyan-400 bg-cyan-950/50 border border-cyan-800/60 px-3 py-1.5 rounded-xl">
                      Displaying <strong>{displayedGisDefects.length}</strong> of {defects.length} registered defects
                    </div>
                  </div>

                  {/* Stage Filter Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono text-slate-400 flex items-center mr-1">
                      <Filter className="w-3.5 h-3.5 mr-1 text-slate-500" /> Filter Stage:
                    </span>

                    <button
                      type="button"
                      onClick={() => setGisStageFilter('ALL')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                        gisStageFilter === 'ALL'
                          ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-600/30'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      All Stages ({defects.length})
                    </button>

                    <button
                      type="button"
                      onClick={() => setGisStageFilter('CRITICAL')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 border ${
                        gisStageFilter === 'CRITICAL'
                          ? 'bg-rose-600 text-white border-rose-400 shadow-md shadow-rose-600/30'
                          : 'bg-slate-950 text-rose-400 border-rose-900/60 hover:bg-rose-950/40'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                      <span>🔴 Critical Stage ({gisCriticalCount})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setGisStageFilter('MEDIUM')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 border ${
                        gisStageFilter === 'MEDIUM'
                          ? 'bg-amber-600 text-white border-amber-400 shadow-md shadow-amber-600/30'
                          : 'bg-slate-950 text-amber-400 border-amber-900/60 hover:bg-amber-950/40'
                      }`}
                    >
                      <span>🟡 Medium Stage ({gisMediumCount})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setGisStageFilter('LOW')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 border ${
                        gisStageFilter === 'LOW'
                          ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-600/30'
                          : 'bg-slate-950 text-emerald-400 border-emerald-900/60 hover:bg-emerald-950/40'
                      }`}
                    >
                      <span>🟢 Low Stage ({gisLowCount})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setGisStageFilter('RESOLVED')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 border ${
                        gisStageFilter === 'RESOLVED'
                          ? 'bg-teal-600 text-white border-teal-400 shadow-md shadow-teal-600/30'
                          : 'bg-slate-950 text-teal-400 border-teal-900/60 hover:bg-teal-950/40'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Solved / Repaired ({gisResolvedCount})</span>
                    </button>
                  </div>

                  {/* 3 Severity Stages Explanatory Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                    <div className="bg-slate-950/60 border border-rose-900/40 p-3 rounded-2xl flex items-start space-x-3">
                      <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 font-black text-sm">
                        !
                      </div>
                      <div className="text-xs">
                        <div className="font-extrabold text-rose-300">Critical Stage (Depth &ge; 11cm)</div>
                        <div className="text-slate-400 text-[11px] mt-0.5">
                          Severe axle strike & tire blowout hazard. Auto-dispatched for immediate hot-mix compaction.
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-950/60 border border-amber-900/40 p-3 rounded-2xl flex items-start space-x-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 font-black text-sm">
                        ▲
                      </div>
                      <div className="text-xs">
                        <div className="font-extrabold text-amber-300">Medium Stage (Depth 6-10cm)</div>
                        <div className="text-slate-400 text-[11px] mt-0.5">
                          Roadway bumps, edge chipping, asphalt depression. 48-hour scheduled work order.
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-950/60 border border-emerald-900/40 p-3 rounded-2xl flex items-start space-x-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-black text-sm">
                        ●
                      </div>
                      <div className="text-xs">
                        <div className="font-extrabold text-emerald-300">Low Stage (Depth 2-5cm)</div>
                        <div className="text-slate-400 text-[11px] mt-0.5">
                          Surface raveling, minor micro-cracks. Monitored for preventive bituminous sealing.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Satellite Leaflet Map Container */}
                <div className="bg-slate-900 rounded-3xl border border-slate-800 p-3 shadow-xl">
                  <div className="h-[580px] rounded-2xl overflow-hidden">
                    <GISMapView 
                      defects={displayedGisDefects}
                      roads={roads}
                      onSelectDefect={(d) => {
                        setGisSelectedDefect(d);
                      }}
                    />
                  </div>
                </div>

                {/* Defect Quick-Inspect Card when an official clicks a pin */}
                {gisSelectedDefect && (
                  <div className="bg-slate-900 border border-blue-500/40 rounded-3xl p-5 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shrink-0">
                        <img 
                          src={gisSelectedDefect.image_url || '/images/pothole_before.jpg'} 
                          alt="Pothole"
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-bold text-blue-400">
                            #{gisSelectedDefect.ticket_code}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            ['CRITICAL', 'SEVERE'].includes((gisSelectedDefect.severity || '').toUpperCase())
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : ['MEDIUM', 'MODERATE', 'HIGH'].includes((gisSelectedDefect.severity || '').toUpperCase())
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            {gisSelectedDefect.severity || 'CRITICAL'} STAGE
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            gisSelectedDefect.status === 'Resolved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-300'
                          }`}>
                            {gisSelectedDefect.status}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-white mt-1">{gisSelectedDefect.title}</h4>
                        <p className="text-xs text-slate-400">
                          Assigned: <strong className="text-white">{gisSelectedDefect.assigned_subdivision?.name || 'Local Sub-Division'}</strong> ({gisSelectedDefect.assigned_subdivision?.corporation || 'Bangalore'} Corp) • {gisSelectedDefect.location?.address}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
                      <button
                        type="button"
                        onClick={() => setSelectedDefect(gisSelectedDefect)}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-lg shadow-blue-600/30 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect Full Work Order</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setGisSelectedDefect(null)}
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-semibold cursor-pointer"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

        </div>
      )}

      {/* =========================================================================
          MODAL: FULLSCREEN BEFORE VS AFTER IMAGE COMPARISON
          ========================================================================= */}
      {inspectionModalDefect && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative my-8">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-bold text-emerald-400 font-mono">
                  Ticket #{inspectionModalDefect.ticket_code} • Quality Verification
                </span>
                <h3 className="text-xl font-extrabold text-white mt-1">
                  {inspectionModalDefect.title}
                </h3>
                <p className="text-xs text-slate-400">
                  Sub-Division: {inspectionModalDefect.assigned_subdivision?.name} • Duration: {inspectionModalDefect.duration_took_str || inspectionModalDefect.completion_details?.duration_str || '18 hours'}
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setComparisonMode(comparisonMode === 'side_by_side' ? 'slider' : 'side_by_side')}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 cursor-pointer"
                >
                  {comparisonMode === 'side_by_side' ? 'Switch to Slider' : 'Switch to Side-by-Side'}
                </button>

                <button
                  type="button"
                  onClick={() => setInspectionModalDefect(null)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Mode 1: Side by Side */}
            {comparisonMode === 'side_by_side' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-xs font-bold text-rose-400">Before Repair (Original Problem)</div>
                  <div className="h-72 rounded-2xl overflow-hidden border border-rose-500/30 bg-slate-950">
                    <img
                      src={inspectionModalDefect.image_url || '/images/pothole_before.jpg'}
                      alt="Before"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-bold text-emerald-400">After Repair (Repaired Road)</div>
                  <div className="h-72 rounded-2xl overflow-hidden border border-emerald-500/30 bg-slate-950">
                    <img
                      src={inspectionModalDefect.completion_details?.after_image_url || '/images/pothole_after.jpg'}
                      alt="After"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* Mode 2: Interactive Split Slider */
              <div className="space-y-4">
                <div className="relative h-80 rounded-2xl overflow-hidden border border-slate-700 select-none">
                  {/* After Image (Full background) */}
                  <img
                    src={inspectionModalDefect.completion_details?.after_image_url || '/images/pothole_after.jpg'}
                    alt="After"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3 px-2 py-1 rounded-md bg-emerald-950/80 backdrop-blur-md text-emerald-300 text-[10px] font-bold border border-emerald-500/40">
                    After Repair
                  </div>

                  {/* Before Image (Clipped by slider position) */}
                  <div
                    className="absolute inset-0 overflow-hidden"
                    style={{ width: `${sliderPosition}%` }}
                  >
                    <img
                      src={inspectionModalDefect.image_url || '/images/pothole_before.jpg'}
                      alt="Before"
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{ width: '100%', maxWidth: 'none' }}
                    />
                    <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-rose-950/80 backdrop-blur-md text-rose-300 text-[10px] font-bold border border-rose-500/40">
                      Before Repair
                    </div>
                  </div>

                  {/* Divider line */}
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-white shadow-2xl"
                    style={{ left: `${sliderPosition}%` }}
                  >
                    <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white text-slate-950 shadow-xl flex items-center justify-center text-xs font-extrabold border-2 border-slate-900">
                      ↔
                    </div>
                  </div>
                </div>

                {/* Slider range input */}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sliderPosition}
                  onChange={(e) => setSliderPosition(Number(e.target.value))}
                  className="w-full cursor-pointer accent-emerald-500"
                />
              </div>
            )}

            {/* Verification Footer */}
            <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 text-xs flex items-center justify-between">
              <div>
                <span className="text-slate-400">Crew: </span>
                <strong className="text-white">
                  {inspectionModalDefect.completion_details?.completed_by_workers || 'Rapid Asphalt Paving Gang'}
                </strong>
                <p className="text-slate-400 italic mt-0.5">
                  "{inspectionModalDefect.completion_details?.repair_notes || 'Excavated, packed with dense bituminous macadam and vibratory roller leveled.'}"
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectionModalDefect(null)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer transition"
              >
                Close Verification
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Defect Detail Modal */}
      {selectedDefect && (
        <DefectDetailModal
          defect={selectedDefect}
          onClose={() => setSelectedDefect(null)}
          onStatusChange={() => {}}
        />
      )}

    </div>
  );
}
