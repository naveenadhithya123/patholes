import React, { useState } from 'react';
import { X, CheckCircle, Clock, MapPin, AlertTriangle, ShieldCheck, Printer, UserCheck, HardHat, FileText, Activity } from 'lucide-react';

export default function DefectDetailModal({ defect, onClose, onUpdateStatus, onGenerateWorkOrder }) {
  if (!defect) return null;

  const [status, setStatus] = useState(defect.status || 'Reported');
  const [contractor, setContractor] = useState(defect.assigned_to?.contractor || 'Apex Road Repair Wing');
  const [engineer, setEngineer] = useState(defect.assigned_to?.engineer || 'Er. Rajesh Patil (Ward AE)');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/defects/${defect.id || defect.ticket_code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          assigned_to: {
            contractor,
            engineer,
            dispatched_at: new Date().toISOString(),
            target_sla_hours: defect.target_sla_hours || 24
          }
        })
      });
      const data = await response.json();
      setIsSaving(false);
      if (data.success && onUpdateStatus) {
        onUpdateStatus(data.defect);
      }
    } catch (err) {
      setIsSaving(false);
      console.error('Status update failed:', err);
    }
  };

  const priorityColor =
    defect.ai_calculated_priority === 'P1_IMMEDIATE'
      ? 'text-rose-400 bg-rose-500/10 border-rose-500/30'
      : defect.ai_calculated_priority === 'P2_HIGH'
      ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
      : 'text-blue-400 bg-blue-500/10 border-blue-500/30';

  return (
    <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl relative my-8">
        
        {/* Header */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${priorityColor}`}>
              {defect.ai_calculated_priority} • SCORE {defect.ai_priority_score}/100
            </span>
            <span className="font-mono text-sm text-slate-400">
              Ticket #{defect.ticket_code}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Top Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Defect Photo */}
            <div className="relative rounded-xl overflow-hidden border border-slate-800 aspect-video bg-black">
              <img
                src={defect.image_url}
                alt="Defect Inspection"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 left-2 bg-slate-950/80 px-2.5 py-1 rounded text-[11px] font-mono text-cyan-400 border border-slate-700">
                In-App Camera Capture
              </div>
              <div className="absolute bottom-2 right-2 bg-slate-950/80 px-2.5 py-1 rounded text-[10px] font-mono text-amber-400 border border-slate-700">
                {defect.dimensions ? `${defect.dimensions.depth_cm}cm depth • ${defect.dimensions.width_cm}cm width` : 'Measured by Sensor'}
              </div>
            </div>

            {/* AI Prioritization Summary */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">{defect.title}</h3>
                <p className="text-xs text-slate-400 mt-1">{defect.description}</p>
              </div>

              {/* AI Reasoning Rationale */}
              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-blue-500/20 text-xs space-y-1.5">
                <div className="flex items-center space-x-1.5 text-blue-400 font-bold">
                  <Activity className="w-3.5 h-3.5" />
                  <span>AI Prioritization Rationale</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  {defect.ai_reasoning}
                </p>
              </div>

              {/* Deduplication & Crowd Stats */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-slate-500 text-[10px] uppercase">Crowd Verifications</div>
                  <div className="text-emerald-400 font-bold text-sm">
                    {defect.verification_count || 1} Confirmations
                  </div>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-slate-500 text-[10px] uppercase">Duplicates Suppressed</div>
                  <div className="text-cyan-400 font-bold text-sm">
                    {defect.duplicates_prevented || 0} Prevented
                  </div>
                </div>
              </div>

            </div>

          </div>

          {/* Location & Road Asset Metadata */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center space-x-1.5 text-slate-300 font-semibold">
              <MapPin className="w-4 h-4 text-cyan-400" />
              <span>Location: {defect.location?.address}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] font-mono text-slate-400 pt-1">
              <div>Ward: <strong className="text-slate-200">{defect.location?.ward_no} ({defect.location?.ward_name})</strong></div>
              <div>Zone: <strong className="text-slate-200">{defect.location?.zone || 'Mahadevapura'}</strong></div>
              <div>Traffic PCU: <strong className="text-amber-400">{defect.traffic_congestion_tier}</strong></div>
              <div>Road Age: <strong className={defect.is_road_overdue ? 'text-rose-400' : 'text-emerald-400'}>{defect.road_age_years || 8} yrs {defect.is_road_overdue ? '(Overdue!)' : ''}</strong></div>
            </div>
          </div>

          {/* Municipal Action & Dispatch Controls */}
          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-4">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
              <HardHat className="w-4 h-4 text-amber-400" />
              <span>Municipal Dispatch & Contractor Assignment</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Status Workflow</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="Reported">Reported (Pending Triage)</option>
                  <option value="Work Order Issued">Work Order Issued</option>
                  <option value="In Progress">In Progress (Crews Dispatched)</option>
                  <option value="Resolved">Resolved (Pavement Restored)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Assigned Contractor</label>
                <input
                  type="text"
                  value={contractor}
                  onChange={(e) => setContractor(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Supervising Ward Engineer</label>
                <input
                  type="text"
                  value={engineer}
                  onChange={(e) => setEngineer(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => onGenerateWorkOrder(defect)}
                className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-600 flex items-center space-x-1.5 transition"
              >
                <Printer className="w-3.5 h-3.5 text-cyan-400" />
                <span>Generate Official BBMP Work Order</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-md shadow-blue-600/30 flex items-center space-x-1.5 transition"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Updating...' : 'Save & Update Ticket'}</span>
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
