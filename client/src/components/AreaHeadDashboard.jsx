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
  Check
} from 'lucide-react';

export default function AreaHeadDashboard({ govUser, onLogout, defects = [], onDefectUpdated }) {
  // Sub-tabs: 'active' (Assigned Work Orders) | 'submitted' (Submitted to Head Admin)
  const [activeTab, setActiveTab] = useState('active');

  // Completion Modal State
  const [completionModalDefect, setCompletionModalDefect] = useState(null);
  const [afterImageUrl, setAfterImageUrl] = useState('https://images.unsplash.com/photo-1545459720-aac8509eb02c?auto=format&fit=crop&w=800&q=80');
  const [workerCrew, setWorkerCrew] = useState('Rapid Asphalt Paving Gang #1');
  const [repairNotes, setRepairNotes] = useState('50mm Dense Bituminous Macadam (DBM) hot-mix filled, tack-coated, vibratory compacted, and road lane markings restored.');
  const [isSubmittingCompletion, setIsSubmittingCompletion] = useState(false);

  // Filter defects for this Area Head
  // Either assigned directly to this user ID, or matching their zone, or fallback to all assigned
  const userZone = govUser?.zone || 'South';
  const myAssignedDefects = defects.filter(d => {
    if (d.status === 'Resolved') return false;
    if (d.assigned_area_head?.id === govUser?.id) return true;
    if (d.assigned_area_head?.zone?.toLowerCase() === userZone.toLowerCase()) return true;
    if (d.location?.zone?.toLowerCase() === userZone.toLowerCase() && d.assigned_area_head) return true;
    return false;
  });

  const mySubmittedDefects = defects.filter(d => {
    const isMine = d.assigned_area_head?.id === govUser?.id || 
                   d.assigned_area_head?.zone?.toLowerCase() === userZone.toLowerCase();
    return isMine && (d.workflow_stage === 'PENDING_HEAD_APPROVAL' || d.status === 'Resolved');
  });

  // Preset Realistic Repaired Road Photos for Instant Demo
  const REPAIR_PHOTO_PRESETS = [
    {
      name: 'Compacted Asphalt Patch (Matching Frame)',
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
          field_crew: `${govUser?.zone || 'Zonal'} Rapid Asphalt Paving Gang #1`
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

  // Action 2: Submit Completed Repair with After Photo to Head Admin
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
      alert('Failed to submit repair to Head Admin: ' + err.message);
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
      
      {/* Top Header Card: Area Head Profile */}
      <div className="bg-gradient-to-r from-blue-950/70 via-slate-900 to-cyan-950/70 p-6 sm:p-7 rounded-3xl border border-cyan-500/30 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 text-white flex items-center justify-center shadow-xl shadow-cyan-500/20 ring-2 ring-cyan-400/30">
            <HardHat className="w-8 h-8" />
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/40 uppercase font-mono tracking-wider">
                ZONAL AREA HEAD
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                {govUser?.zone || 'South'} Zone Jurisdiction ({govUser?.radius_km || 8.5} km radius)
              </span>
            </div>

            <h1 className="text-2xl font-black text-white mt-1">
              {govUser?.name || 'Er. Suresh Gowda'}
            </h1>
            <p className="text-xs text-slate-400">
              {govUser?.title || 'Executive Engineer - South Zone'} • {govUser?.agency || 'BBMP Zonal Engineering Wing'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          <button
            type="button"
            onClick={onLogout}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 font-bold text-xs border border-slate-800 transition flex items-center space-x-1.5"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>

      </div>

      {/* Triage Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        {/* TAB 1: ACTIVE WORK ORDERS */}
        <button
          type="button"
          onClick={() => setActiveTab('active')}
          className={`p-5 rounded-2xl border text-left transition-all duration-300 relative overflow-hidden flex items-center justify-between shadow-xl cursor-pointer ${
            activeTab === 'active'
              ? 'bg-gradient-to-r from-blue-950/80 via-slate-900 to-slate-950 border-blue-500/60 shadow-blue-500/10 ring-1 ring-blue-500/40'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 opacity-80 hover:opacity-100'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse"></span>
              <span className="text-xs font-mono uppercase tracking-wider text-blue-400 font-bold">
                1. Road Defect Work Orders
              </span>
            </div>
            <h2 className="text-lg font-bold text-white">
              Assigned to My Area
            </h2>
            <p className="text-xs text-slate-400">
              Dispatched by Head Admin within my territorial radius.
            </p>
          </div>

          <div className="text-right pl-4">
            <span className="text-3xl font-black text-cyan-400 font-mono">
              {myAssignedDefects.length}
            </span>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
              Active Orders
            </div>
          </div>
        </button>

        {/* TAB 2: MY SUBMITTED & VERIFIED */}
        <button
          type="button"
          onClick={() => setActiveTab('submitted')}
          className={`p-5 rounded-2xl border text-left transition-all duration-300 relative overflow-hidden flex items-center justify-between shadow-xl cursor-pointer ${
            activeTab === 'submitted'
              ? 'bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-950 border-emerald-500/60 shadow-emerald-500/10 ring-1 ring-emerald-500/40'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 opacity-80 hover:opacity-100'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold">
                2. Submitted to Head Admin
              </span>
            </div>
            <h2 className="text-lg font-bold text-white">
              Completed Repairs
            </h2>
            <p className="text-xs text-slate-400">
              Awaiting Head Admin inspection or officially approved.
            </p>
          </div>

          <div className="text-right pl-4">
            <span className="text-3xl font-black text-emerald-400 font-mono">
              {mySubmittedDefects.length}
            </span>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
              Finished Works
            </div>
          </div>
        </button>

      </div>

      {/* =====================================================================
          TAB 1: ASSIGNED WORK ORDERS (DISPATCH WORKERS & UPLOAD AFTER PHOTO)
          ===================================================================== */}
      {activeTab === 'active' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                <HardHat className="w-5 h-5 text-cyan-400" />
                <span>Work Orders in {userZone} Zone Jurisdiction</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Dispatch paving gangs to execute road repairs. After completion, capture & upload an After photo for Head Admin verification.
              </p>
            </div>

            <div className="text-xs font-mono text-cyan-300 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
              Stack Order: Newest Assigned on Top
            </div>
          </div>

          {myAssignedDefects.length === 0 ? (
            <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-12 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-cyan-400 mx-auto opacity-70" />
              <h3 className="text-base font-bold text-white">No Active Defect Work Orders in this Zone</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                All assigned road repairs in your radius have been executed or are currently awaiting Head Admin sign-off.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {myAssignedDefects.map((defect) => {
                const isInProgress = defect.status === 'In Progress';

                return (
                  <div
                    key={defect.id || defect.ticket_code}
                    className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4 hover:border-cyan-500/40 transition"
                  >
                    {/* Header Strip */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs pb-3 border-b border-slate-800">
                      <div className="flex items-center space-x-3">
                        <span className="font-mono font-bold text-cyan-300 text-sm">
                          #{defect.ticket_code}
                        </span>
                        <span className="text-slate-500">•</span>
                        <span className="font-medium text-slate-200">
                          {defect.category_label || defect.type?.toUpperCase()}
                        </span>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold font-mono ${
                          defect.severity === 'CRITICAL'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}>
                          {defect.severity}
                        </span>

                        <span className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-bold ${
                          isInProgress
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                        }`}>
                          {isInProgress ? 'WORKERS DISPATCHED (IN PROGRESS)' : 'ASSIGNED (PENDING CREW)'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                      
                      {/* Original Citizen Photo Thumbnail */}
                      <div className="md:col-span-3">
                        <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-700 bg-black">
                          <img
                            src={defect.image_url}
                            alt="Damage report"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2 left-2 bg-rose-950/80 px-2 py-0.5 rounded text-[10px] font-mono text-rose-300 border border-rose-500/30">
                            BEFORE PHOTO
                          </div>
                        </div>
                      </div>

                      {/* Defect Details */}
                      <div className="md:col-span-5 space-y-1.5">
                        <h4 className="text-base font-bold text-white">
                          {defect.title}
                        </h4>
                        <p className="text-xs text-slate-400 flex items-center space-x-1.5">
                          <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{defect.location?.address} • Ward {defect.location?.ward_no}</span>
                        </p>
                        <div className="text-[11px] text-slate-300 font-mono pt-1">
                          Dimensions: <strong className="text-white">Depth {defect.dimensions?.depth_cm || 10} cm</strong> • Width {defect.dimensions?.width_cm || 45} cm
                        </div>
                        {defect.assigned_area_head?.distribution_notes && (
                          <div className="text-[11px] text-amber-300/90 bg-amber-950/30 p-2 rounded-lg border border-amber-500/20">
                            <strong>Head Admin Notes:</strong> "{defect.assigned_area_head.distribution_notes}"
                          </div>
                        )}
                      </div>

                      {/* Execution Actions */}
                      <div className="md:col-span-4 bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                        <div className="text-[11px] font-mono text-slate-400 space-y-1">
                          <div className="text-slate-300">
                            Assigned At: <strong className="text-white">{formatCivicDate(defect.assigned_area_head?.assigned_at || defect.created_at)}</strong>
                          </div>
                          <div>
                            Target SLA: <strong className="text-cyan-400">{defect.assigned_area_head?.target_sla_hours || 24} hours</strong>
                          </div>
                        </div>

                        {!isInProgress ? (
                          <button
                            type="button"
                            onClick={() => handleStartRepair(defect)}
                            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition flex items-center justify-center space-x-2 cursor-pointer"
                          >
                            <HardHat className="w-4 h-4" />
                            <span>Dispatch Workers & Start Repair</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setCompletionModalDefect(defect);
                              setWorkerCrew(`${userZone} Zone Rapid Asphalt Paving Gang #1`);
                            }}
                            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition flex items-center justify-center space-x-2 cursor-pointer"
                          >
                            <Camera className="w-4 h-4" />
                            <span>Upload After Photo & Submit to Head</span>
                          </button>
                        )}
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 2: MY SUBMITTED & VERIFIED REPAIRS
          ===================================================================== */}
      {activeTab === 'submitted' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>Repairs Submitted from {userZone} Zone</span>
            </h2>
            <div className="text-xs font-mono text-emerald-300 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
              Stack Order: Newest Submitted on Top
            </div>
          </div>

          {mySubmittedDefects.length === 0 ? (
            <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-12 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No Submitted Repairs in this Zone</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Once you complete a road repair and submit an After photo, it will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {mySubmittedDefects.map((defect) => {
                const isApproved = defect.head_admin_approved;

                return (
                  <div
                    key={defect.id || defect.ticket_code}
                    className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs pb-3 border-b border-slate-800">
                      <div className="flex items-center space-x-3">
                        <span className="font-mono font-bold text-cyan-300 text-sm">
                          #{defect.ticket_code}
                        </span>
                        <span className="text-slate-500">•</span>
                        <span className="font-bold text-white">
                          {defect.title}
                        </span>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold flex items-center space-x-1.5 ${
                          isApproved
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}>
                          {isApproved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                          <span>{isApproved ? 'VERIFIED & RELEASED TO PUBLIC' : 'AWAITING HEAD ADMIN SIGN-OFF'}</span>
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-[11px] font-mono text-slate-400 mb-1">BEFORE (REPORTED)</div>
                        <img
                          src={defect.image_url}
                          alt="Before"
                          className="w-full aspect-video object-cover rounded-xl border border-slate-800"
                        />
                      </div>
                      <div>
                        <div className="text-[11px] font-mono text-emerald-400 mb-1">AFTER (COMPLETED REPAIR)</div>
                        <img
                          src={defect.completion_details?.after_image_url || 'https://images.unsplash.com/photo-1545459720-aac8509eb02c?auto=format&fit=crop&w=800&q=80'}
                          alt="After"
                          className="w-full aspect-video object-cover rounded-xl border border-slate-800"
                        />
                      </div>
                    </div>

                    {isApproved && (
                      <div className="bg-slate-950 p-3 rounded-xl border border-emerald-500/30 text-xs font-mono text-emerald-300 space-y-1">
                        <div className="font-bold flex items-center space-x-1.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          <span>Approved by Dr. B. K. Shivakumar (Head Admin)</span>
                        </div>
                        <div className="text-slate-400 text-[11px]">
                          Remarks: "{defect.approved_by?.remarks || 'Dual-photo verified. Cleared for traffic.'}"
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL: SUBMIT COMPLETED REPAIR WITH AFTER PHOTO */}
      {completionModalDefect && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-cyan-500/40 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 my-8">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Camera className="w-5 h-5 text-cyan-400" />
                <span>Submit Repaired Work for Head Admin Approval: #{completionModalDefect.ticket_code}</span>
              </h3>
              <button
                type="button"
                onClick={() => setCompletionModalDefect(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {/* Before Photo Preview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-rose-300 font-bold block">
                  1. ORIGINAL BEFORE PHOTO:
                </label>
                <div className="aspect-video rounded-xl overflow-hidden border border-rose-500/40 bg-black">
                  <img
                    src={completionModalDefect.image_url}
                    alt="Before repair"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-emerald-400 font-bold block">
                  2. COMPLETED AFTER PHOTO PREVIEW:
                </label>
                <div className="aspect-video rounded-xl overflow-hidden border border-emerald-500/50 bg-black">
                  <img
                    src={afterImageUrl}
                    alt="After repair"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>

            {/* Select from Pre-Loaded Realistic Repaired Road Photos for Instant Testing */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block flex items-center justify-between">
                <span>Select Repaired Asphalt Evidence (or Enter Image URL):</span>
                <span className="text-[11px] text-cyan-400 font-mono">1-Click Selection</span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {REPAIR_PHOTO_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAfterImageUrl(preset.url)}
                    className={`p-2 rounded-xl border text-left space-y-1 transition text-[11px] font-mono ${
                      afterImageUrl === preset.url
                        ? 'bg-cyan-950/60 border-cyan-400 text-cyan-200 ring-1 ring-cyan-400'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <img src={preset.url} alt={preset.name} className="h-14 w-full object-cover rounded-lg" />
                    <div className="truncate font-semibold">{preset.name.split(' (')[0]}</div>
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={afterImageUrl}
                onChange={(e) => setAfterImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500 mt-2"
              />
            </div>

            {/* Worker Crew Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                Field Workers Crew Name:
              </label>
              <input
                type="text"
                value={workerCrew}
                onChange={(e) => setWorkerCrew(e.target.value)}
                placeholder="e.g. South Zone Rapid Asphalt Paving Gang #1"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Materials and Repair Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                Repair Materials & Technique Applied:
              </label>
              <textarea
                value={repairNotes}
                onChange={(e) => setRepairNotes(e.target.value)}
                rows={2}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Submit to Head Admin */}
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setCompletionModalDefect(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSubmitCompletion}
                disabled={isSubmittingCompletion}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 disabled:opacity-50 flex items-center space-x-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmittingCompletion ? 'Submitting to Head Admin...' : 'Transmit to Head Admin for Verification'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
