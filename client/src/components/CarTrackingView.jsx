import React, { useState, useEffect } from 'react';
import { 
  Car, 
  Sparkles, 
  ArrowLeft, 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  Camera, 
  RefreshCw, 
  Eye, 
  Layers, 
  Activity, 
  HardHat, 
  Sliders, 
  ArrowRight,
  Maximize2
} from 'lucide-react';
import DefectDetailModal from './DefectDetailModal';

export default function CarTrackingView({ onBack, defects = [], onDefectUpdated }) {
  // Progression Sub-Tabs: 'all' | 'pending' | 'in_progress' | 'completed'
  const [progressionTab, setProgressionTab] = useState('all');

  // Severity Filter: 'ALL' | 'CRITICAL' | 'MEDIUM' | 'LOW'
  const [severityFilter, setSeverityFilter] = useState('ALL');

  // Fleet state from API
  const [fleetCars, setFleetCars] = useState([]);
  const [isSimulatingSweep, setIsSimulatingSweep] = useState(false);
  const [sweepResult, setSweepResult] = useState(null);

  // Modal inspection state
  const [selectedDefect, setSelectedDefect] = useState(null);
  const [beforeAfterModalDefect, setBeforeAfterModalDefect] = useState(null);

  // Fetch Fleet Units status
  const fetchFleetStatus = async () => {
    try {
      const res = await fetch('/api/fleet/status');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.fleet) {
          setFleetCars(data.fleet);
        }
      }
    } catch (e) {
      console.warn('Fleet status fetch failed:', e);
    }
  };

  useEffect(() => {
    fetchFleetStatus();
  }, []);

  // Filter defects reported by patrol vehicles (or include fallback sample vehicle defects)
  const carDefects = defects.filter(d => 
    d.reported_by === 'patrol_vehicle_bumper_cam' || 
    (d.ticket_code && (d.ticket_code.startsWith('NF-VEH') || d.ticket_code.startsWith('NF-RD-1001') || d.ticket_code.startsWith('NF-RD-1004') || d.ticket_code.startsWith('NF-RD-1007') || d.ticket_code.startsWith('NF-RD-1012') || d.ticket_code.startsWith('NF-RD-1014') || d.ticket_code.startsWith('NF-RD-1017') || d.ticket_code.startsWith('NF-RD-1020') || d.ticket_code.startsWith('NF-RD-1025') || d.ticket_code.startsWith('NF-RD-1029') || d.ticket_code.startsWith('NF-VEH-1031') || d.ticket_code.startsWith('NF-VEH-1032')))
  );

  // Breakdown Counts
  const totalCarScanned = carDefects.length;
  const pendingCount = carDefects.filter(d => d.status !== 'Resolved' && d.status !== 'In Progress').length;
  const inProgressCount = carDefects.filter(d => d.status === 'In Progress').length;
  const resolvedCount = carDefects.filter(d => d.status === 'Resolved').length;

  const criticalCount = carDefects.filter(d => ['CRITICAL', 'SEVERE'].includes((d.severity || '').toUpperCase())).length;
  const mediumCount = carDefects.filter(d => ['MEDIUM', 'MODERATE', 'HIGH'].includes((d.severity || '').toUpperCase())).length;
  const lowCount = carDefects.filter(d => ['LOW', 'MINOR'].includes((d.severity || '').toUpperCase())).length;

  // Filtered List based on Progression and Severity
  const displayedDefects = carDefects.filter(d => {
    // 1. Progression Tab Filter
    if (progressionTab === 'pending' && (d.status === 'Resolved' || d.status === 'In Progress')) return false;
    if (progressionTab === 'in_progress' && d.status !== 'In Progress') return false;
    if (progressionTab === 'completed' && d.status !== 'Resolved') return false;

    // 2. Severity Filter
    const sev = (d.severity || '').toUpperCase();
    if (severityFilter === 'CRITICAL' && !['CRITICAL', 'SEVERE'].includes(sev)) return false;
    if (severityFilter === 'MEDIUM' && !['MEDIUM', 'MODERATE', 'HIGH'].includes(sev)) return false;
    if (severityFilter === 'LOW' && !['LOW', 'MINOR'].includes(sev)) return false;

    return true;
  });

  // Action: Trigger Live Vehicle AI Sweep Simulation
  const handleSimulateSweep = async () => {
    setIsSimulatingSweep(true);
    setSweepResult(null);

    try {
      const res = await fetch('/api/fleet/simulate-sweep', { method: 'POST' });
      const data = await res.json();
      setIsSimulatingSweep(false);

      if (data.success) {
        setSweepResult(data);
        if (data.defect && onDefectUpdated) {
          onDefectUpdated(data.defect);
        }
        fetchFleetStatus();
      } else {
        alert(data.message || 'Simulation could not be completed.');
      }
    } catch (err) {
      setIsSimulatingSweep(false);
      alert('Sweep failed: ' + err.message);
    }
  };

  const formatCivicDate = (isoStr) => {
    if (!isoStr) return 'Just now';
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
      
      {/* Top Header Card: Car Tracking & Automated Fleet Telemetry */}
      <div className="bg-gradient-to-r from-blue-950/80 via-slate-900 to-indigo-950/80 p-6 sm:p-7 rounded-3xl border border-blue-500/30 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        
        <div className="flex items-center space-x-4">
          <button
            type="button"
            onClick={onBack}
            className="p-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
            title="Return to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase tracking-wider flex items-center space-x-1">
                <Car className="w-3 h-3 text-cyan-400" />
                <span>Automated Mobile Road AI</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                YOLOv26 Computer Vision Scanner
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              Car Tracking & Vehicle Fleet AI
            </h1>

            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
              10 active patrol vehicles equipped with high-frequency bumper LiDAR & dashcams continuously scan Bengaluru road corridors. Detected road defects are automatically geolocated and dispatched to the nearest of the 50 Sub-Divisions.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
          <button
            type="button"
            disabled={isSimulatingSweep}
            onClick={handleSimulateSweep}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-bold shadow-lg shadow-cyan-600/30 transition flex items-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isSimulatingSweep ? 'Car Scanning Corridor...' : 'Simulate Live Car Patrol Scan'}</span>
          </button>
        </div>
      </div>

      {/* Sweep Simulation Notification Banner */}
      {sweepResult && (
        <div className={`p-4 rounded-2xl border text-xs flex items-center justify-between gap-4 animate-in fade-in duration-300 ${
          sweepResult.action === 'DUPLICATE_SUPPRESSED'
            ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
            : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
        }`}>
          <div className="flex items-center space-x-3">
            <span className="text-xl">{sweepResult.action === 'DUPLICATE_SUPPRESSED' ? '🛡️' : '🚨'}</span>
            <div>
              <div className="font-extrabold">{sweepResult.message}</div>
              <div className="text-[11px] opacity-80 mt-0.5">
                Patrol Car: <strong>{sweepResult.car?.name}</strong> • Corridor: {sweepResult.car?.corridor} ({sweepResult.car?.speed_kmh} km/h)
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSweepResult(null)}
            className="text-xs font-bold underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Fleet Patrol Units Status Row */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Active Municipal Vehicle Fleet (10 Patrol Units Live)
            </span>
          </div>
          <span className="text-[11px] font-mono text-cyan-400">
            Real-time Sub-Bumper LiDAR & YOLOv26 Camera Active
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {(fleetCars.length > 0 ? fleetCars : [
            { name: 'Patrol Car 01', corridor: 'Silk Board Hub', speed_kmh: 62 },
            { name: 'Patrol Car 02', corridor: 'Bellandur Eco-Space', speed_kmh: 58 },
            { name: 'Patrol Car 03', corridor: 'Indiranagar 100ft Rd', speed_kmh: 44 },
            { name: 'Patrol Car 04', corridor: 'Whitefield Corridor', speed_kmh: 52 },
            { name: 'Patrol Car 05', corridor: 'KR Puram Flyover', speed_kmh: 68 },
            { name: 'Patrol Car 06', corridor: 'Hebbal Expressway', speed_kmh: 88 },
            { name: 'Patrol Car 07', corridor: 'MG Road Central', speed_kmh: 40 },
            { name: 'Patrol Car 08', corridor: 'Koramangala 80ft Rd', speed_kmh: 48 },
            { name: 'Patrol Car 09', corridor: 'Bannerghatta Rd', speed_kmh: 55 },
            { name: 'Patrol Car 10', corridor: 'Old Airport Road', speed_kmh: 60 }
          ]).map((car, idx) => (
            <div key={idx} className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 text-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-[11px]">{car.name}</span>
                <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
                  {car.speed_kmh} km/h
                </span>
              </div>
              <div className="text-[10px] text-slate-400 truncate mt-1">
                {car.corridor}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* KPI Metrics Breakdown Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl text-center">
          <div className="text-xl font-black text-white">{totalCarScanned}</div>
          <div className="text-[10px] uppercase font-bold text-slate-400 mt-1">Total Car Detections</div>
        </div>

        <div className="bg-slate-900/90 border border-rose-900/40 p-4 rounded-2xl text-center">
          <div className="text-xl font-black text-rose-400">{criticalCount}</div>
          <div className="text-[10px] uppercase font-bold text-rose-400 mt-1">Critical Stages</div>
        </div>

        <div className="bg-slate-900/90 border border-amber-900/40 p-4 rounded-2xl text-center">
          <div className="text-xl font-black text-amber-400">{mediumCount}</div>
          <div className="text-[10px] uppercase font-bold text-amber-400 mt-1">Medium Stages</div>
        </div>

        <div className="bg-slate-900/90 border border-emerald-900/40 p-4 rounded-2xl text-center">
          <div className="text-xl font-black text-emerald-400">{lowCount}</div>
          <div className="text-[10px] uppercase font-bold text-emerald-400 mt-1">Low Stages</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl text-center">
          <div className="text-xl font-black text-amber-400">{pendingCount}</div>
          <div className="text-[10px] uppercase font-bold text-slate-400 mt-1">Pending Action</div>
        </div>

        <div className="bg-slate-900/90 border border-blue-900/40 p-4 rounded-2xl text-center">
          <div className="text-xl font-black text-blue-400">{inProgressCount}</div>
          <div className="text-[10px] uppercase font-bold text-blue-400 mt-1">In-Progress Repairs</div>
        </div>

        <div className="bg-slate-900/90 border border-emerald-900/40 p-4 rounded-2xl text-center">
          <div className="text-xl font-black text-emerald-400">{resolvedCount}</div>
          <div className="text-[10px] uppercase font-bold text-emerald-400 mt-1">Resolved & Verified</div>
        </div>
      </div>

      {/* Progression Status Tabs & Severity Filter Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        
        {/* Progression Tabs (Pending | In Progress | Completed) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setProgressionTab('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer border ${
                progressionTab === 'all'
                  ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-600/30'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              All Detections ({totalCarScanned})
            </button>

            <button
              type="button"
              onClick={() => setProgressionTab('pending')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center space-x-1.5 border ${
                progressionTab === 'pending'
                  ? 'bg-amber-600 text-white border-amber-400 shadow-md shadow-amber-600/30'
                  : 'bg-slate-950 text-amber-400 border-amber-900/60 hover:bg-amber-950/40'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pending Action ({pendingCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setProgressionTab('in_progress')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center space-x-1.5 border ${
                progressionTab === 'in_progress'
                  ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-600/30'
                  : 'bg-slate-950 text-blue-400 border-blue-900/60 hover:bg-blue-950/40'
              }`}
            >
              <HardHat className="w-3.5 h-3.5" />
              <span>Current Progression / In Progress ({inProgressCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setProgressionTab('completed')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center space-x-1.5 border ${
                progressionTab === 'completed'
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-600/30'
                  : 'bg-slate-950 text-emerald-400 border-emerald-900/60 hover:bg-emerald-950/40'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Completed & Solved ({resolvedCount})</span>
            </button>
          </div>

          <div className="text-xs text-slate-400 font-mono">
            Showing <strong className="text-white">{displayedDefects.length}</strong> detections
          </div>
        </div>

        {/* Severity Sub-Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-mono text-slate-400 mr-1">Severity:</span>
          {['ALL', 'CRITICAL', 'MEDIUM', 'LOW'].map(sev => (
            <button
              key={sev}
              type="button"
              onClick={() => setSeverityFilter(sev)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                severityFilter === sev
                  ? 'bg-slate-800 text-white border-cyan-500 shadow-sm'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              {sev === 'ALL' ? 'All Severities' : `${sev === 'CRITICAL' ? '🔴 Critical' : sev === 'MEDIUM' ? '🟡 Medium' : '🟢 Low'}`}
            </button>
          ))}
        </div>
      </div>

      {/* Defect Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedDefects.map(d => {
          const isResolved = d.status === 'Resolved';
          const isInProgress = d.status === 'In Progress';
          const isCritical = ['CRITICAL', 'SEVERE'].includes((d.severity || '').toUpperCase());
          const isMedium = ['MEDIUM', 'MODERATE', 'HIGH'].includes((d.severity || '').toUpperCase());

          return (
            <div
              key={d.id}
              className="bg-slate-900/90 rounded-3xl border border-slate-800 hover:border-slate-700 p-5 shadow-xl transition flex flex-col justify-between group space-y-4"
            >
              <div className="space-y-3">
                
                {/* Photo Preview Container (With YOLOv26 Bounding Box badge) */}
                <div className="relative h-44 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800">
                  <img
                    src={d.image_url || '/images/pothole_before.jpg'}
                    alt="Defect"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* AI Detection Badge */}
                  <div className="absolute top-2.5 left-2.5 bg-black/85 backdrop-blur-md px-2.5 py-1 rounded-lg border border-cyan-500/40 text-[10px] font-mono text-cyan-300 font-bold flex items-center space-x-1.5 shadow-lg">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                    <span>YOLOv26 Detection • {d.confidence_pct || 96.8}% Confidence</span>
                  </div>

                  {/* Severity Badge */}
                  <div className="absolute top-2.5 right-2.5">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-lg ${
                      isCritical
                        ? 'bg-rose-600 text-white border border-rose-400'
                        : isMedium
                        ? 'bg-amber-600 text-white border border-amber-400'
                        : 'bg-emerald-600 text-white border border-emerald-400'
                    }`}>
                      {isCritical ? '🔴 CRITICAL' : isMedium ? '🟡 MEDIUM' : '🟢 LOW'}
                    </span>
                  </div>

                  {/* Vehicle Tag at bottom of photo */}
                  <div className="absolute bottom-2 left-2 right-2 bg-slate-950/80 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-slate-800/80 text-[10px] font-mono text-slate-300 flex items-center justify-between">
                    <span className="flex items-center space-x-1">
                      <Car className="w-3 h-3 text-cyan-400" />
                      <span>{d.title?.split('@')[0] || 'Patrol Unit Scanned'}</span>
                    </span>
                    <span className="text-cyan-400 font-bold">~{d.dimensions?.depth_cm || 12}cm depth</span>
                  </div>
                </div>

                {/* Ticket Details */}
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-blue-400">
                      #{d.ticket_code}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isResolved
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : isInProgress
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                      {isResolved ? '✅ Solved & Verified' : isInProgress ? '🔨 In Progress' : '⏳ Pending Sub-Division'}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-white text-sm mt-1 line-clamp-1">
                    {d.category_label || d.title}
                  </h3>

                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {d.description}
                  </p>
                </div>

                {/* Auto-Assignment Details to 50 Sub-Divisions */}
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-[11px] text-slate-400">Assigned Sub-Division:</span>
                    <strong className="text-cyan-300 font-semibold truncate max-w-[180px]">
                      {d.assigned_subdivision?.name || 'Local Sub-Division'}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Officer:</span>
                    <span className="text-slate-200">{d.assigned_subdivision?.engineer || 'Executive Engineer'}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-0.5 border-t border-slate-900">
                    <span>GPS: {d.location?.lat?.toFixed(4)}, {d.location?.lng?.toFixed(4)}</span>
                    <span>{formatCivicDate(d.created_at)}</span>
                  </div>
                </div>

                {/* If Resolved: Showcase Before vs After Image */}
                {isResolved && (
                  <div className="bg-emerald-950/30 border border-emerald-500/40 p-3 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-emerald-300 flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Quality Verified Repair</span>
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400">
                        {d.duration_took_str || '18 hours'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative h-20 rounded-lg overflow-hidden border border-slate-700 bg-black">
                        <img 
                          src={d.image_url || '/images/pothole_before.jpg'} 
                          alt="Before" 
                          className="w-full h-full object-cover" 
                        />
                        <span className="absolute bottom-1 left-1 bg-black/80 px-1 py-0.5 rounded text-[9px] font-mono text-rose-400">
                          BEFORE
                        </span>
                      </div>
                      <div className="relative h-20 rounded-lg overflow-hidden border border-emerald-500/50 bg-black">
                        <img 
                          src={d.after_image_url || '/images/pothole_after.jpg'} 
                          alt="After" 
                          className="w-full h-full object-cover" 
                        />
                        <span className="absolute bottom-1 left-1 bg-black/80 px-1 py-0.5 rounded text-[9px] font-mono text-emerald-400">
                          AFTER
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setBeforeAfterModalDefect(d)}
                      className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition flex items-center justify-center space-x-1 cursor-pointer"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Inspect Before & After Comparison</span>
                    </button>
                  </div>
                )}

              </div>

              {/* Action Bar */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setSelectedDefect(d)}
                  className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center space-x-1 transition cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Telemetry & Work Order</span>
                </button>

                <span className="text-[10px] font-mono text-slate-500">
                  Ward {d.location?.ward_no || 150}
                </span>
              </div>

            </div>
          );
        })}
      </div>

      {displayedDefects.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
          <Car className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No detections found in this filter</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Try switching the progression tab or click "Simulate Live Car Patrol Scan" above to dispatch a vehicle detection.
          </p>
        </div>
      )}

      {/* Modal: Defect Details */}
      {selectedDefect && (
        <DefectDetailModal
          defect={selectedDefect}
          onClose={() => setSelectedDefect(null)}
        />
      )}

      {/* Modal: Fullscreen Before vs After Comparison */}
      {beforeAfterModalDefect && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 space-y-6 shadow-2xl relative my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  #{beforeAfterModalDefect.ticket_code} • Car AI Detection & Resolution
                </span>
                <h3 className="text-lg font-black text-white mt-0.5">
                  {beforeAfterModalDefect.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setBeforeAfterModalDefect(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                  Before (Vehicle AI Bumper Cam Scan)
                </div>
                <div className="h-60 rounded-2xl overflow-hidden bg-black border border-rose-900/50">
                  <img 
                    src={beforeAfterModalDefect.image_url || '/images/pothole_before.jpg'} 
                    alt="Before" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  After (Repaired & Compacted Hot-Mix)
                </div>
                <div className="h-60 rounded-2xl overflow-hidden bg-black border border-emerald-900/50">
                  <img 
                    src={beforeAfterModalDefect.after_image_url || '/images/pothole_after.jpg'} 
                    alt="After" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs space-y-1">
              <div className="text-slate-300">
                Assigned Sub-Division: <strong className="text-white">{beforeAfterModalDefect.assigned_subdivision?.name}</strong> • Engineer: {beforeAfterModalDefect.assigned_subdivision?.engineer}
              </div>
              <div className="text-slate-400">
                Notes: {beforeAfterModalDefect.repair_notes || 'Excavated cavity, applied emulsion tack-coat, compacted 50mm dense bituminous asphalt flush with road surface.'}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
