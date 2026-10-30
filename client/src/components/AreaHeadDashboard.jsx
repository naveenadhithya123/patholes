import React, { useState } from 'react';
import { 
  HardHat, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  Camera, 
  Send, 
  AlertTriangle, 
  Upload, 
  Sparkles, 
  LogOut, 
  RefreshCw,
  Eye,
  ArrowRight,
  ShieldCheck,
  Check,
  Building2,
  Sliders,
  ChevronRight,
  Calendar,
  Maximize2
} from 'lucide-react';

export default function AreaHeadDashboard({ govUser, onLogout, defects = [], onDefectUpdated }) {
  // Sub-tabs: 'active' (Assigned Work Orders) | 'completed' (Repaired & Solved)
  const [activeTab, setActiveTab] = useState('active');

  // Completion Modal State
  const [completionModalDefect, setCompletionModalDefect] = useState(null);
  const [afterImageUrl, setAfterImageUrl] = useState('/images/pothole_after.jpg');
  const [workerCrew, setWorkerCrew] = useState(`${govUser?.subdivision_name || 'Sub-Division'} Rapid Asphalt Crew #1`);
  const [repairNotes, setRepairNotes] = useState('Cavity excavated, tack-coat applied, 50mm dense bituminous macadam hot-mix compacted flush with roadway.');
  const [isSubmittingCompletion, setIsSubmittingCompletion] = useState(false);

  // Simulation loading state
  const [isSimulatingDefect, setIsSimulatingDefect] = useState(false);

  // Filter defects for this Sub-Division Area Head
  const subId = govUser?.subdivision_id || govUser?.id;
  const subName = govUser?.subdivision_name || '';
  const subWards = govUser?.wards || [];

  const myAssignedDefects = defects.filter(d => {
    if (d.status === 'Resolved') return false;
    if (d.assigned_subdivision?.id === subId) return true;
    if (d.assigned_subdivision?.name === subName) return true;
    if (d.location?.ward_no && subWards.includes(d.location.ward_no)) return true;
    return false;
  });

  const myCompletedDefects = defects.filter(d => {
    if (d.status !== 'Resolved') return false;
    if (d.assigned_subdivision?.id === subId) return true;
    if (d.assigned_subdivision?.name === subName) return true;
    if (d.location?.ward_no && subWards.includes(d.location.ward_no)) return true;
    return false;
  });

  // Preset Authentic Repaired Road Photos for Instant Demo
  const REPAIR_PHOTO_PRESETS = [
    {
      name: 'Matching Bituminous Hot Patch (Leveled)',
      url: '/images/pothole_after.jpg'
    },
    {
      name: 'Fresh Hot-Mix Bituminous Patch (Smooth)',
      url: 'https://images.unsplash.com/photo-1545459720-aac8509eb02c?auto=format&fit=crop&w=800&q=80'
    },
    {
      name: 'Modern Resurfaced Multi-Lane Highway',
      url: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=800&q=80'
    },
    {
      name: 'Paved Urban Street with Restored Kerb',
      url: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=800&q=80'
    }
  ];

  // Action 1: Dispatch Workers / Start Repair
  const handleStartRepair = async (defect) => {
    try {
      const res = await fetch(`/api/defects/${defect.id}/start-repair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field_crew: `${govUser?.subdivision_name || 'Sub-Division'} Rapid Asphalt Crew #1`
        })
      });
      const data = await res.json();
      if (data.success && onDefectUpdated) {
        onDefectUpdated(data.defect);
      }
    } catch (err) {
      alert('Failed to dispatch workers: ' + err.message);
    }
  };

  // Action 2: Submit Completed Repair with After Photo
  const handleSubmitCompletion = async () => {
    if (!completionModalDefect) return;
    setIsSubmittingCompletion(true);

    try {
      const res = await fetch(`/api/defects/${completionModalDefect.id}/submit-completion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          after_image_url: afterImageUrl,
          completed_by_workers: workerCrew,
          repair_notes: repairNotes
        })
      });

      const data = await res.json();
      setIsSubmittingCompletion(false);

      if (data.success) {
        if (onDefectUpdated) onDefectUpdated(data.defect);
        setCompletionModalDefect(null);
      }
    } catch (err) {
      setIsSubmittingCompletion(false);
      alert('Failed to submit repair: ' + err.message);
    }
  };

  // Action 3: Simulate New Defect in This Sub-Division
  const handleSimulateDefect = async () => {
    if (!subId) return;
    setIsSimulatingDefect(true);
    try {
      const res = await fetch(`/api/subdivisions/${subId}/simulate-defect`, {
        method: 'POST'
      });
      const data = await res.json();
      setIsSimulatingDefect(false);
      if (data.success && data.defect && onDefectUpdated) {
        onDefectUpdated(data.defect);
        setActiveTab('active');
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
      
      {/* Top Header Card: Sub-Division Area Head Profile */}
      <div className="bg-gradient-to-r from-cyan-950/70 via-slate-900 to-blue-950/70 p-6 sm:p-7 rounded-3xl border border-cyan-500/30 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-xl shadow-cyan-500/20 ring-2 ring-cyan-400/30 shrink-0">
            <HardHat className="w-8 h-8" />
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase tracking-wider">
                {govUser?.corporation || 'Municipal'} Corporation
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Sub-Division Area Head
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              {govUser?.name || 'Sub-Division Area Head'}
            </h1>

            <p className="text-xs sm:text-sm text-cyan-300 font-medium">
              {govUser?.subdivision_name || govUser?.title || 'Sub-Division Head'}
            </p>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-1.5">
              <span>Jurisdiction: <strong className="text-slate-200">{govUser?.radius_km || 5} km radius</strong></span>
              <span>•</span>
              <span>Wards: <strong className="text-slate-200">{subWards.join(', ') || 'Territory'}</strong></span>
              <span>•</span>
              <span className="font-mono text-slate-300">{govUser?.email}</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
          <button
            type="button"
            disabled={isSimulatingDefect}
            onClick={handleSimulateDefect}
            className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/25 transition flex items-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isSimulatingDefect ? 'Simulating...' : 'Simulate Defect in My Division'}</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition flex items-center space-x-1.5 border border-slate-700 cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-slate-400" />
            <span>Sign Out</span>
          </button>
        </div>

      </div>

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow-md">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total in My Jurisdiction</div>
          <div className="text-2xl font-extrabold text-white mt-1">
            {myAssignedDefects.length + myCompletedDefects.length}
          </div>
          <div className="text-[11px] text-cyan-400 mt-0.5">Auto-routed via GPS</div>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow-md">
          <div className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">Active Work Orders</div>
          <div className="text-2xl font-extrabold text-amber-400 mt-1">
            {myAssignedDefects.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Assigned / In Progress</div>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow-md">
          <div className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Repaired & Solved</div>
          <div className="text-2xl font-extrabold text-emerald-400 mt-1">
            {myCompletedDefects.length}
          </div>
          <div className="text-[11px] text-emerald-400/80 mt-0.5">Verified Before/After</div>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow-md">
          <div className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">Division Resolution Rate</div>
          <div className="text-2xl font-extrabold text-indigo-400 mt-1">
            {(myAssignedDefects.length + myCompletedDefects.length) > 0
              ? Math.round((myCompletedDefects.length / (myAssignedDefects.length + myCompletedDefects.length)) * 100)
              : 100}%
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Turnaround & Quality</div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center space-x-3 border-b border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer border ${
            activeTab === 'active'
              ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-600/20'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Active Assigned Issues ({myAssignedDefects.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('completed')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer border ${
            activeTab === 'completed'
              ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/20'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Repaired & Solved Proof ({myCompletedDefects.length})</span>
        </button>
      </div>

      {/* TAB 1: ACTIVE ASSIGNED DEFECTS */}
      {activeTab === 'active' && (
        <div className="space-y-4">
          {myAssignedDefects.length === 0 ? (
            <div className="bg-slate-900/60 rounded-3xl border border-slate-800 p-12 text-center space-y-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">No Pending Defects in Your Sub-Division</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  All road defects reported within {govUser?.subdivision_name} ({govUser?.radius_km} km radius) have been repaired and resolved!
                </p>
              </div>
              <button
                type="button"
                onClick={handleSimulateDefect}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition shadow-lg shadow-cyan-600/20 inline-flex items-center space-x-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Simulate Defect to Test Workflow</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {myAssignedDefects.map(defect => (
                <div 
                  key={defect.id}
                  className="bg-slate-900/90 rounded-3xl border border-slate-800 p-6 shadow-xl flex flex-col justify-between space-y-4 hover:border-slate-700 transition"
                >
                  <div className="space-y-3">
                    {/* Top Badges */}
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20">
                        {defect.ticket_code}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        defect.severity === 'CRITICAL' 
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {defect.severity}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white">{defect.title}</h3>
                    <p className="text-xs text-slate-400 line-clamp-2">{defect.description}</p>

                    {/* Defect Photo */}
                    <div className="h-48 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 relative">
                      <img 
                        src={defect.image_url || '/images/pothole_before.jpg'} 
                        alt="Defect" 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-[10px] text-white font-mono">
                        ~{defect.dimensions?.depth_cm || 12}cm depth • ~{defect.dimensions?.width_cm || 50}cm width
                      </div>
                    </div>

                    {/* Location Info */}
                    <div className="text-xs text-slate-400 space-y-1 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                      <div className="flex items-center space-x-1.5 text-slate-300 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="truncate">{defect.location?.address}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Reported: {formatCivicDate(defect.created_at)}</span>
                        <span>Ward {defect.location?.ward_no}</span>
                      </div>
                    </div>
                  </div>

                  {/* Field Actions */}
                  <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center gap-2">
                    {defect.status !== 'In Progress' ? (
                      <button
                        type="button"
                        onClick={() => handleStartRepair(defect)}
                        className="w-full sm:flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center justify-center space-x-1.5 border border-slate-700 cursor-pointer"
                      >
                        <HardHat className="w-4 h-4 text-amber-400" />
                        <span>Dispatch Workers</span>
                      </button>
                    ) : (
                      <div className="w-full sm:flex-1 py-2 px-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-bold flex items-center justify-center space-x-1.5">
                        <Clock className="w-3.5 h-3.5 animate-spin text-amber-400" />
                        <span>Workers Dispatched (In Progress)</span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setCompletionModalDefect(defect);
                        setAfterImageUrl('/images/pothole_after.jpg');
                      }}
                      className="w-full sm:flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/25 transition flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Upload After Photo & Solve</span>
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: REPAIRED & SOLVED PROOF */}
      {activeTab === 'completed' && (
        <div className="space-y-6">
          {myCompletedDefects.length === 0 ? (
            <div className="bg-slate-900/60 rounded-3xl border border-slate-800 p-12 text-center space-y-2">
              <Clock className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No Solved Repairs Yet</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Once you complete work on active tickets and upload After photos, they will appear here with Before/After verification.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {myCompletedDefects.map(defect => (
                <div 
                  key={defect.id}
                  className="bg-slate-900/90 rounded-3xl border border-slate-800 p-6 shadow-xl space-y-4"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                          {defect.ticket_code}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          ✓ Repaired & Resolved
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white mt-1">{defect.title}</h3>
                      <p className="text-xs text-slate-400">{defect.location?.address}</p>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Turnaround Time</div>
                      <div className="text-sm font-extrabold text-emerald-400">
                        {defect.duration_took_str || defect.completion_details?.duration_str || '18 hours'}
                      </div>
                    </div>
                  </div>

                  {/* Side by Side Photos */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <div className="text-xs font-bold text-rose-400">Before Repair (Original Crater)</div>
                      <div className="h-56 rounded-2xl overflow-hidden border border-rose-500/30 bg-slate-950">
                        <img 
                          src={defect.image_url || '/images/pothole_before.jpg'} 
                          alt="Before" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="text-[11px] text-slate-500">Reported: {formatCivicDate(defect.created_at)}</div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-xs font-bold text-emerald-400">After Repair (Compacted Road)</div>
                      <div className="h-56 rounded-2xl overflow-hidden border border-emerald-500/30 bg-slate-950">
                        <img 
                          src={defect.completion_details?.after_image_url || '/images/pothole_after.jpg'} 
                          alt="After" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="text-[11px] text-slate-500">Resolved: {formatCivicDate(defect.resolved_at)}</div>
                    </div>
                  </div>

                  {/* Notes Footer */}
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-slate-400">Crew: </span>
                      <strong className="text-slate-200">{defect.completion_details?.completed_by_workers || defect.field_crew}</strong>
                      <p className="text-slate-400 italic mt-0.5">"{defect.completion_details?.repair_notes}"</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold shrink-0">
                      Chief Commissioner Verified
                    </span>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODAL: UPLOAD AFTER PHOTO & COMPLETE REPAIR
          ========================================================================= */}
      {completionModalDefect && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative my-8">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-bold text-emerald-400 font-mono">
                  Ticket #{completionModalDefect.ticket_code}
                </span>
                <h3 className="text-lg font-extrabold text-white mt-0.5">
                  Complete Road Repair & Upload After Photo
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCompletionModalDefect(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Before Photo Comparison Preview */}
            <div className="flex items-center space-x-4 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-rose-500/30">
                <img 
                  src={completionModalDefect.image_url || '/images/pothole_before.jpg'} 
                  alt="Original" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <div className="text-[11px] font-bold text-rose-400">Original Defect (Before Photo)</div>
                <div className="text-xs font-bold text-white mt-0.5">{completionModalDefect.title}</div>
                <div className="text-[11px] text-slate-400">{completionModalDefect.location?.address}</div>
              </div>
            </div>

            {/* Select Authentic Repaired Photo Preset */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-300">
                1. Select Repaired Road Photo ("After" Photo Proof)
              </label>
              
              <div className="grid grid-cols-2 gap-3">
                {REPAIR_PHOTO_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAfterImageUrl(preset.url)}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer relative overflow-hidden flex items-center space-x-2.5 ${
                      afterImageUrl === preset.url
                        ? 'bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/30'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <img 
                      src={preset.url} 
                      alt={preset.name} 
                      className="w-12 h-12 rounded-lg object-cover shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white truncate">{preset.name}</div>
                      <div className="text-[10px] text-emerald-400">Click to use</div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Or enter custom URL */}
              <div>
                <input
                  type="text"
                  placeholder="Or paste custom After image URL..."
                  value={afterImageUrl}
                  onChange={(e) => setAfterImageUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            {/* Field Crew & Repair Notes */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Worker Paving Crew Name</label>
                <input
                  type="text"
                  value={workerCrew}
                  onChange={(e) => setWorkerCrew(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Engineering Repair Notes</label>
                <textarea
                  rows={2}
                  value={repairNotes}
                  onChange={(e) => setRepairNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>
            </div>

            {/* Submit Action */}
            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                disabled={isSubmittingCompletion}
                onClick={handleSubmitCompletion}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-xl shadow-emerald-600/25 transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{isSubmittingCompletion ? 'Recording Completion...' : 'Submit Repaired Photo & Resolve'}</span>
              </button>

              <button
                type="button"
                onClick={() => setCompletionModalDefect(null)}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
