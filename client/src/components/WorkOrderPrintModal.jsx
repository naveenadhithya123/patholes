import React from 'react';
import { X, Printer, ShieldCheck, MapPin, Award } from 'lucide-react';

export default function WorkOrderPrintModal({ defect, onClose }) {
  if (!defect) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[2500] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white text-slate-900 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl relative my-8 p-8 border border-slate-300">
        
        {/* Modal Controls (Not printed) */}
        <div className="flex justify-between items-center mb-6 pb-3 border-b border-slate-200 print:hidden">
          <div className="text-xs text-slate-500 font-mono">
            MUNICIPAL WORK ORDER PRINT PREVIEW
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 flex items-center space-x-1.5 shadow"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Work Order</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Official Document */}
        <div className="space-y-6">
          
          {/* Header */}
          <div className="text-center border-b-2 border-slate-900 pb-4">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-600">
              Government of Karnataka • Urban Development Department
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 mt-1 uppercase">
              Bengaluru Municipal Corporation
            </h1>
            <div className="text-xs font-semibold text-slate-700 mt-0.5">
              Road Infrastructure & Maintenance Wing • Smart City Command Center
            </div>
            <div className="text-[11px] font-mono text-slate-500 mt-1">
              Urban Road Defect Resolution & Paving Network
            </div>
          </div>

          {/* Work Order Metadata */}
          <div className="grid grid-cols-2 gap-4 text-xs font-mono bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div>
              <div><strong>WORK ORDER NO:</strong> WO-{defect.ticket_code}</div>
              <div><strong>DATE ISSUED:</strong> {new Date().toLocaleDateString()}</div>
              <div><strong>DEFECT CATEGORY:</strong> {defect.category_label || defect.type}</div>
              <div><strong>AI PRIORITY TIER:</strong> <span className="font-bold text-rose-700">{defect.ai_calculated_priority}</span></div>
            </div>
            <div>
              <div><strong>WARD NO & NAME:</strong> Ward {defect.location?.ward_no} - {defect.location?.ward_name}</div>
              <div><strong>ZONE:</strong> {defect.location?.zone || 'Mahadevapura'}</div>
              <div><strong>ROAD CORRIDOR:</strong> {defect.location?.address}</div>
              <div><strong>TARGET SLA:</strong> {defect.target_sla_hours || 12} Hours Response</div>
            </div>
          </div>

          {/* Defect Description & Dimensions */}
          <div className="space-y-2 text-xs">
            <div className="font-bold text-slate-900 uppercase">Defect Specifications & Sensor Readings:</div>
            <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded border border-slate-200 font-sans">
              {defect.description}
            </p>
            <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-mono">
              <div className="bg-slate-100 p-2 rounded">
                <span className="text-slate-500 block">DEPTH</span>
                <strong className="text-slate-900">{defect.dimensions?.depth_cm || 12} cm</strong>
              </div>
              <div className="bg-slate-100 p-2 rounded">
                <span className="text-slate-500 block">SURFACE WIDTH</span>
                <strong className="text-slate-900">{defect.dimensions?.width_cm || 55} cm</strong>
              </div>
              <div className="bg-slate-100 p-2 rounded">
                <span className="text-slate-500 block">ROAD ASSET AGE</span>
                <strong className="text-slate-900">{defect.road_age_years || 11} Years ({defect.is_road_overdue ? 'Overdue Lifespan' : 'Active'})</strong>
              </div>
            </div>
          </div>

          {/* AI Prioritization Rationale */}
          <div className="text-xs space-y-1">
            <strong className="text-slate-900">Automated AI Prioritization Rationale:</strong>
            <p className="text-slate-600 italic bg-amber-50 p-2.5 rounded border border-amber-200">
              {defect.ai_reasoning}
            </p>
          </div>

          {/* Assignment & Sign-off Box */}
          <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-300 text-xs">
            <div>
              <div className="text-slate-500">ASSIGNED CONTRACTOR / AGENCY:</div>
              <div className="font-bold text-slate-900 mt-1">{defect.assigned_to?.contractor || 'Apex Highway Rapid Repair Wing'}</div>
              <div className="mt-8 border-t border-slate-400 pt-1 text-[11px] text-slate-600">
                Authorized Contractor Signature
              </div>
            </div>
            <div>
              <div className="text-slate-500">SUPERVISING WARD ENGINEER:</div>
              <div className="font-bold text-slate-900 mt-1">{defect.assigned_to?.engineer || 'Er. Rajesh Patil (Executive Engineer)'}</div>
              <div className="mt-8 border-t border-slate-400 pt-1 text-[11px] text-slate-600">
                Municipal Executive Engineer Seal & Stamp
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
