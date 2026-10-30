import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Send, 
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
  FileText
} from 'lucide-react';
import GISMapView from './GISMapView';
import DefectDetailModal from './DefectDetailModal';

export default function HeadAdminDashboard({ govUser, onLogout, defects = [], roads = [], onDefectUpdated }) {
  // Sub-tabs: 'distribute' (Assign to Area Heads), 'verify' (Check Completed Jobs), 'master' (All 198 Wards)
  const [activeTab, setActiveTab] = useState('distribute');

  // Distribution Modal State
  const [distributeModalDefect, setDistributeModalDefect] = useState(null);
  const [selectedAreaHeadId, setSelectedAreaHeadId] = useState('AREA-HEAD-01');
  const [distributionNotes, setDistributionNotes] = useState('');
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);

  // Approval Modal State
  const [approvalModalDefect, setApprovalModalDefect] = useState(null);
  const [approvalRemarks, setApprovalRemarks] = useState('Quality and road smoothness verified via dual-camera inspection. Approved for commuter transit.');
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

  // Re-work Modal State
  const [reworkModalDefect, setReworkModalDefect] = useState(null);
  const [reworkRemarks, setReworkRemarks] = useState('Surface uneven; additional asphalt compaction required.');
  const [isSubmittingRework, setIsSubmittingRework] = useState(false);

  // Area Heads directory
  const [areaHeads, setAreaHeads] = useState([]);

  // Detail Modal for Master Table
  const [selectedDefect, setSelectedDefect] = useState(null);

  // Patrol Fleet Simulation
  const [isSimulatingSweep, setIsSimulatingSweep] = useState(false);

  // Fetch Area Heads
  useEffect(() => {
    fetch('/api/area-heads')
      .then(r => r.json())
      .then(d => {
        if (d.success) setAreaHeads(d.area_heads || []);
      })
      .catch(e => console.warn('Area heads fetch error:', e));
  }, []);

  // Filter queues
  // 1. Awaiting distribution to Area Heads (Reported or unassigned)
  const incomingDefects = defects.filter(d => 
    (!d.assigned_area_head || d.workflow_stage === 'AWAITING_HEAD_ASSIGNMENT' || d.status.includes('Reported')) && 
    d.status !== 'Resolved'
  );

  // 2. Pending Head Admin verification (Area Head has uploaded After photo)
  const pendingVerificationDefects = defects.filter(d => 
    d.workflow_stage === 'PENDING_HEAD_APPROVAL' || 
    (d.status === 'Pending Head Approval' && !d.head_admin_approved)
  );

  // 3. Approved & Resolved defects
  const resolvedDefects = defects.filter(d => d.status === 'Resolved' && d.head_admin_approved);

  // Handle Distribute Defect to Area Head
  const handleConfirmDistribution = async () => {
    if (!distributeModalDefect) return;
    setIsSubmittingAssign(true);

    const chosenHead = areaHeads.find(ah => ah.id === selectedAreaHeadId);

    try {
      const res = await fetch(`/api/defects/${distributeModalDefect.id}/assign-area-head`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          area_head_id: selectedAreaHeadId,
          area_head_name: chosenHead?.name || 'Area Head',
          zone: chosenHead?.zone || distributeModalDefect.location?.zone,
          notes: distributionNotes
        })
      });

      const data = await res.json();
      setIsSubmittingAssign(false);

      if (data.success) {
        if (onDefectUpdated) onDefectUpdated(data.defect);
        setDistributeModalDefect(null);
        setDistributionNotes('');
      }
    } catch (err) {
      setIsSubmittingAssign(false);
      alert('Failed to distribute defect: ' + err.message);
    }
  };

  // Handle Approve Completed Repair
  const handleApproveRepair = async () => {
    if (!approvalModalDefect) return;
    setIsSubmittingApproval(true);

    try {
      const res = await fetch(`/api/defects/${approvalModalDefect.id}/approve-completion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remarks: approvalRemarks })
      });

      const data = await res.json();
      setIsSubmittingApproval(false);

      if (data.success) {
        if (onDefectUpdated) onDefectUpdated(data.defect);
        setApprovalModalDefect(null);
      }
    } catch (err) {
      setIsSubmittingApproval(false);
      alert('Failed to approve repair: ' + err.message);
    }
  };

  // Handle Request Rework
  const handleRejectRepair = async () => {
    if (!reworkModalDefect) return;
    setIsSubmittingRework(true);

    try {
      const res = await fetch(`/api/defects/${reworkModalDefect.id}/reject-completion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remarks: reworkRemarks })
      });

      const data = await res.json();
      setIsSubmittingRework(false);

      if (data.success) {
        if (onDefectUpdated) onDefectUpdated(data.defect);
        setReworkModalDefect(null);
      }
    } catch (err) {
      setIsSubmittingRework(false);
      alert('Failed to request rework: ' + err.message);
    }
  };

  // Trigger Patrol Car Sweep
  const triggerCarSweep = async () => {
    setIsSimulatingSweep(true);
    try {
      const res = await fetch('/api/fleet/simulate-sweep', { method: 'POST' });
      const data = await res.json();
      setIsSimulatingSweep(false);
      if (data.success && data.defect && onDefectUpdated) {
        onDefectUpdated(data.defect);
      }
    } catch (err) {
      setIsSimulatingSweep(false);
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
      
      {/* Top Header Card: Chief Authority Profile */}
      <div className="bg-gradient-to-r from-purple-950/60 via-slate-900 to-indigo-950/60 p-6 sm:p-7 rounded-3xl border border-purple-500/30 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 text-white flex items-center justify-center shadow-xl shadow-purple-500/20 ring-2 ring-purple-400/30">
            <span className="text-3xl">👑</span>
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/40 uppercase font-mono tracking-wider">
                MUNICIPAL TOP HEAD
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                198 Wards Jurisdiction
              </span>
            </div>

            <h1 className="text-2xl font-black text-white mt-1">
              {govUser?.name || 'Dr. B. K. Shivakumar'}
            </h1>
            <p className="text-xs text-slate-400">
              {govUser?.title || 'Chief Municipal Infrastructure Commissioner'} • BBMP Central Command HQ
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          <button
            type="button"
            onClick={triggerCarSweep}
            disabled={isSimulatingSweep}
            className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 font-bold text-xs border border-cyan-500/40 shadow-lg transition flex items-center justify-center space-x-2"
          >
            <Car className={`w-4 h-4 ${isSimulatingSweep ? 'animate-bounce' : ''}`} />
            <span>{isSimulatingSweep ? 'Scanning Corridors...' : 'Simulate Patrol Sweep'}</span>
          </button>

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

      {/* Main Task Triage Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* TAB 1: DISTRIBUTE INCOMING PROBLEMS */}
        <button
          type="button"
          onClick={() => setActiveTab('distribute')}
          className={`p-5 rounded-2xl border text-left transition-all duration-300 relative overflow-hidden flex items-center justify-between shadow-xl cursor-pointer ${
            activeTab === 'distribute'
              ? 'bg-gradient-to-r from-blue-950/80 via-slate-900 to-slate-950 border-blue-500/60 shadow-blue-500/10 ring-1 ring-blue-500/40'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 opacity-80 hover:opacity-100'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse"></span>
              <span className="text-xs font-mono uppercase tracking-wider text-blue-400 font-bold">
                1. Distribute to Area Heads
              </span>
            </div>
            <h2 className="text-lg font-bold text-white">
              Incoming Defect Queue
            </h2>
            <p className="text-xs text-slate-400">
              Directly forwarded from citizen cameras & vehicle sensors.
            </p>
          </div>

          <div className="text-right pl-4">
            <span className="text-3xl font-black text-blue-400 font-mono">
              {incomingDefects.length}
            </span>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
              To Distribute
            </div>
          </div>
        </button>

        {/* TAB 2: VERIFY COMPLETED REPAIRS */}
        <button
          type="button"
          onClick={() => setActiveTab('verify')}
          className={`p-5 rounded-2xl border text-left transition-all duration-300 relative overflow-hidden flex items-center justify-between shadow-xl cursor-pointer ${
            activeTab === 'verify'
              ? 'bg-gradient-to-r from-amber-950/80 via-slate-900 to-slate-950 border-amber-500/60 shadow-amber-500/10 ring-1 ring-amber-500/40'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 opacity-80 hover:opacity-100'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
              <span className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold">
                2. Verify Repaired Works
              </span>
            </div>
            <h2 className="text-lg font-bold text-white">
              Awaiting Head Approval
            </h2>
            <p className="text-xs text-slate-400">
              Check After-Repair photos and authorize public release.
            </p>
          </div>

          <div className="text-right pl-4">
            <span className="text-3xl font-black text-amber-400 font-mono">
              {pendingVerificationDefects.length}
            </span>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
              Needs Sign-Off
            </div>
          </div>
        </button>

        {/* TAB 3: MASTER OVERVIEW & APPROVED */}
        <button
          type="button"
          onClick={() => setActiveTab('master')}
          className={`p-5 rounded-2xl border text-left transition-all duration-300 relative overflow-hidden flex items-center justify-between shadow-xl cursor-pointer ${
            activeTab === 'master'
              ? 'bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-950 border-emerald-500/60 shadow-emerald-500/10 ring-1 ring-emerald-500/40'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 opacity-80 hover:opacity-100'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold">
                3. Citywide Directory
              </span>
            </div>
            <h2 className="text-lg font-bold text-white">
              Master Triage & Map
            </h2>
            <p className="text-xs text-slate-400">
              Overview of all 198 wards, verified completed, and patrol units.
            </p>
          </div>

          <div className="text-right pl-4">
            <span className="text-3xl font-black text-emerald-400 font-mono">
              {resolvedDefects.length}
            </span>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
              Publicly Released
            </div>
          </div>
        </button>

      </div>

      {/* =====================================================================
          TAB 1: DISTRIBUTE INCOMING PROBLEMS TO AREA HEADS (BY RADIUS)
          ===================================================================== */}
      {activeTab === 'distribute' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                <Send className="w-5 h-5 text-blue-400" />
                <span>Forwarded Defects Awaiting Zonal Distribution</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Assign each reported road problem to the designated Area Head based on territorial radius and ward boundaries.
              </p>
            </div>

            <div className="text-xs font-mono text-cyan-300 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
              Stack Order: Newest Forwarded on Top
            </div>
          </div>

          {incomingDefects.length === 0 ? (
            <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-12 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-blue-400 mx-auto opacity-70" />
              <h3 className="text-base font-bold text-white">All Incoming Defects Distributed!</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No new unassigned defects in the central inbox. All reported issues have been routed to their respective Area Heads.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {incomingDefects.map((defect, idx) => {
                // Auto-suggest closest Area Head
                const matchingZone = defect.location?.zone || 'South';
                const suggestedHead = areaHeads.find(ah => ah.zone.toLowerCase() === matchingZone.toLowerCase()) || areaHeads[0];

                return (
                  <div
                    key={defect.id || defect.ticket_code}
                    className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4 hover:border-blue-500/40 transition"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs pb-3 border-b border-slate-800">
                      <div className="flex items-center space-x-3">
                        <span className="font-mono font-bold text-cyan-300 text-sm">
                          #{defect.ticket_code}
                        </span>
                        <span className="text-slate-500">•</span>
                        <span className="font-medium text-slate-200">
                          {defect.category_label || defect.type?.toUpperCase()}
                        </span>
                        {idx === 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono">
                            LATEST FORWARDED
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-3">
                        <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold font-mono ${
                          defect.severity === 'CRITICAL'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}>
                          {defect.severity}
                        </span>
                        <span className="text-slate-400 text-[11px] font-mono">
                          Reported: {formatCivicDate(defect.created_at)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                      
                      {/* Photo Thumbnail */}
                      <div className="md:col-span-3">
                        <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-700 bg-black">
                          <img
                            src={defect.image_url}
                            alt="Damage report"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>

                      {/* Defect Details */}
                      <div className="md:col-span-5 space-y-1.5">
                        <h4 className="text-base font-bold text-white">
                          {defect.title}
                        </h4>
                        <p className="text-xs text-slate-400 flex items-center space-x-1.5">
                          <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{defect.location?.address} • Ward {defect.location?.ward_no} ({defect.location?.zone})</span>
                        </p>
                        <div className="text-[11px] text-slate-300 font-mono pt-1">
                          Dimensions: <strong className="text-white">Depth {defect.dimensions?.depth_cm || 10} cm</strong> • Width {defect.dimensions?.width_cm || 45} cm
                        </div>
                      </div>

                      {/* Territorial Radius Match & Distribute Button */}
                      <div className="md:col-span-4 bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                        <div className="text-[11px] font-mono space-y-1">
                          <div className="text-cyan-400 font-bold flex items-center space-x-1">
                            <span>📍 RADIUS MATCH:</span>
                          </div>
                          <div className="text-slate-300">
                            Suggested: <strong className="text-white">{suggestedHead?.name}</strong> ({suggestedHead?.zone} Zone)
                          </div>
                          <div className="text-slate-500 text-[10px]">
                            Jurisdiction Radius: {suggestedHead?.radius_km || 8.5} km • Active Crews: {suggestedHead?.field_crews?.length || 2}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setDistributeModalDefect(defect);
                            setSelectedAreaHeadId(suggestedHead?.id || 'AREA-HEAD-01');
                          }}
                          className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition flex items-center justify-center space-x-2 cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Assign to Area Head</span>
                        </button>
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
          TAB 2: VERIFY COMPLETED REPAIRS (BEFORE/AFTER QUALITY CHECK)
          ===================================================================== */}
      {activeTab === 'verify' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <span>Completed Repairs Awaiting Head Admin Inspection</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Area Heads have finished repairs and submitted After photos. Verify workmanship before authorizing public display.
              </p>
            </div>

            <div className="text-xs font-mono text-amber-300 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
              Stack Order: Newest Finished on Top
            </div>
          </div>

          {pendingVerificationDefects.length === 0 ? (
            <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-12 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-amber-400 mx-auto opacity-70" />
              <h3 className="text-base font-bold text-white">All Completed Repairs Verified!</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No completed jobs pending inspection. When an Area Head uploads a repair photo, it will appear here for your sign-off.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {pendingVerificationDefects.map((defect) => {
                const beforeImg = defect.image_url;
                const afterImg = defect.completion_details?.after_image_url || 'https://images.unsplash.com/photo-1545459720-aac8509eb02c?auto=format&fit=crop&w=800&q=80';

                return (
                  <div
                    key={defect.id || defect.ticket_code}
                    className="bg-slate-900 rounded-3xl border border-amber-500/40 p-6 shadow-2xl space-y-6 relative overflow-hidden"
                  >
                    
                    {/* Header Strip */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800 text-xs">
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
                        <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 font-mono">
                          STATUS: AWAITING YOUR APPROVAL
                        </span>
                      </div>
                    </div>

                    {/* DUAL BEFORE / AFTER PHOTO VERIFICATION COMPARISON */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* 1. BEFORE (Original Damage) */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-rose-400 font-bold flex items-center space-x-1">
                            <span>1. BEFORE (REPORTED DAMAGE)</span>
                          </span>
                          <span className="text-slate-400 text-[11px]">
                            {formatCivicDate(defect.created_at)}
                          </span>
                        </div>
                        <div className="relative aspect-video rounded-2xl overflow-hidden border border-rose-500/40 bg-black">
                          <img
                            src={beforeImg}
                            alt="Before repair"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute bottom-2 left-2 bg-slate-950/80 px-2 py-0.5 rounded text-[10px] font-mono text-rose-300 border border-rose-500/30">
                            Citizen / Patrol Capture
                          </div>
                        </div>
                      </div>

                      {/* 2. AFTER (Area Head Submission) */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-emerald-400 font-bold flex items-center space-x-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>2. AFTER (REPAIRED BY AREA HEAD)</span>
                          </span>
                          <span className="text-slate-400 text-[11px]">
                            {formatCivicDate(defect.completion_details?.completed_at)}
                          </span>
                        </div>
                        <div className="relative aspect-video rounded-2xl overflow-hidden border border-emerald-500/50 bg-black">
                          <img
                            src={afterImg}
                            alt="After repair"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute bottom-2 left-2 bg-slate-950/80 px-2 py-0.5 rounded text-[10px] font-mono text-emerald-300 border border-emerald-500/30">
                            Paved Road Photo Submission
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Area Head & Field Crew Inspection Details */}
                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                      <div>
                        <span className="text-slate-500 block text-[10px]">SUPERVISING AREA HEAD</span>
                        <span className="text-white font-bold">{defect.assigned_area_head?.name || 'Er. Suresh Gowda'}</span>
                        <span className="text-slate-400 block text-[11px]">{defect.assigned_area_head?.zone} Zone</span>
                      </div>

                      <div>
                        <span className="text-slate-500 block text-[10px]">EXECUTED BY WORKERS</span>
                        <span className="text-cyan-300 font-bold">{defect.completion_details?.completed_by_workers || defect.field_crew || 'Zonal Rapid Gang'}</span>
                        <span className="text-slate-400 block text-[11px]">Turnaround: {defect.completion_details?.duration_str || '22 hours'}</span>
                      </div>

                      <div>
                        <span className="text-slate-500 block text-[10px]">WORK NOTES & MATERIALS</span>
                        <span className="text-slate-300 text-[11px] leading-relaxed block">{defect.completion_details?.repair_notes || 'Hot-mix bituminous asphalt filled, compacted, and leveled.'}</span>
                      </div>
                    </div>

                    {/* Action Bar: Approve vs Re-work */}
                    <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setReworkModalDefect(defect);
                        }}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs border border-amber-500/40 transition flex items-center justify-center space-x-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Request Re-Work / Reject</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setApprovalModalDefect(defect);
                        }}
                        className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition flex items-center justify-center space-x-2 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Approve & Release to Public Tracker</span>
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 3: MASTER OVERVIEW & GIS MAP
          ===================================================================== */}
      {activeTab === 'master' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <Layers className="w-5 h-5 text-emerald-400" />
              <span>Full City Infrastructure Master Directory (198 Wards)</span>
            </h2>
            <span className="text-xs font-mono text-emerald-400 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
              Total Managed Defects: {defects.length}
            </span>
          </div>

          {/* GIS Satellite Map */}
          <div className="bg-slate-900 rounded-3xl border border-slate-800 p-4 shadow-xl">
            <div className="h-96 rounded-2xl overflow-hidden">
              <GISMapView
                defects={defects}
                roads={roads}
                onSelectDefect={setSelectedDefect}
              />
            </div>
          </div>

          {/* Master Defects Table */}
          <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
            <div className="p-4 bg-slate-950 border-b border-slate-800 text-xs font-bold text-slate-300">
              ALL REGISTERED DEFECT TICKETS
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Ticket</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Location / Ward</th>
                    <th className="p-3.5">Assigned Area Head</th>
                    <th className="p-3.5">Severity</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {defects.map(d => (
                    <tr key={d.id || d.ticket_code} className="hover:bg-slate-800/40 transition">
                      <td className="p-3.5 font-bold text-cyan-300">#{d.ticket_code}</td>
                      <td className="p-3.5 text-slate-300">{d.category_label || d.type}</td>
                      <td className="p-3.5 text-slate-400">{d.location?.address} (Ward {d.location?.ward_no})</td>
                      <td className="p-3.5 text-slate-300">{d.assigned_area_head?.name || '— (Awaiting Head)'}</td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          d.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {d.severity}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          d.status === 'Resolved' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-blue-500/20 text-blue-300'
                        }`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <button
                          type="button"
                          onClick={() => setSelectedDefect(d)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px]"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: DISTRIBUTE DEFECT TO AREA HEAD */}
      {distributeModalDefect && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Send className="w-4 h-4 text-blue-400" />
                <span>Distribute Ticket #{distributeModalDefect.ticket_code}</span>
              </h3>
              <button
                type="button"
                onClick={() => setDistributeModalDefect(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="text-slate-400">Defect Title:</div>
              <div className="text-white font-bold">{distributeModalDefect.title}</div>
              <div className="text-slate-400 text-[11px]">
                Location: {distributeModalDefect.location?.address} (Ward {distributeModalDefect.location?.ward_no})
              </div>
            </div>

            {/* Select Area Head */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                Assign to Zonal Area Head:
              </label>
              <select
                value={selectedAreaHeadId}
                onChange={(e) => setSelectedAreaHeadId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                {areaHeads.map(ah => (
                  <option key={ah.id} value={ah.id} className="bg-slate-900 text-white">
                    {ah.name} ({ah.zone} Zone • {ah.radius_km} km radius)
                  </option>
                ))}
              </select>
            </div>

            {/* Instructions */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                Distribution Instructions & Target SLA:
              </label>
              <textarea
                value={distributionNotes}
                onChange={(e) => setDistributionNotes(e.target.value)}
                placeholder="e.g. Expedited repair required due to high-speed bus corridor. Dispatch vibratory roller crew within 12 hours."
                rows={3}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDistributeModalDefect(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmDistribution}
                disabled={isSubmittingAssign}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer"
              >
                <span>{isSubmittingAssign ? 'Distributing...' : 'Confirm Distribution'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 2: APPROVE REPAIR & RELEASE TO PUBLIC */}
      {approvalModalDefect && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/50 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Authorize Public Release: #{approvalModalDefect.ticket_code}</span>
              </h3>
              <button
                type="button"
                onClick={() => setApprovalModalDefect(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-200 leading-relaxed">
              By authorizing this repair, you confirm that the dual Before/After photos demonstrate proper road restoration. This defect will be stamped as officially resolved and immediately visible on the Public Civic Issues Tracker for all citizens.
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                Chief Commissioner Remarks & Seal:
              </label>
              <textarea
                value={approvalRemarks}
                onChange={(e) => setApprovalRemarks(e.target.value)}
                rows={3}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setApprovalModalDefect(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleApproveRepair}
                disabled={isSubmittingApproval}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer"
              >
                <span>{isSubmittingApproval ? 'Signing & Publishing...' : 'Authorize & Publish to Public'}</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 3: REQUEST RE-WORK */}
      {reworkModalDefect && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/50 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <RotateCcw className="w-4 h-4 text-amber-400" />
                <span>Return Ticket #{reworkModalDefect.ticket_code} for Re-Work</span>
              </h3>
              <button
                type="button"
                onClick={() => setReworkModalDefect(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                Explain Quality Deficiencies to Area Head:
              </label>
              <textarea
                value={reworkRemarks}
                onChange={(e) => setReworkRemarks(e.target.value)}
                rows={3}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setReworkModalDefect(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleRejectRepair}
                disabled={isSubmittingRework}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg shadow-amber-600/30 disabled:opacity-50 cursor-pointer"
              >
                {isSubmittingRework ? 'Returning Ticket...' : 'Return to Area Head'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedDefect && (
        <DefectDetailModal
          defect={selectedDefect}
          onClose={() => setSelectedDefect(null)}
          onUpdateStatus={(updated) => {
            if (onDefectUpdated) onDefectUpdated(updated);
            setSelectedDefect(null);
          }}
        />
      )}

    </div>
  );
}
