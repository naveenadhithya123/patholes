import React, { useState, useMemo } from 'react';
import { ArrowLeft, Search, MapPin, AlertTriangle, ShieldCheck, Activity, Filter, Eye, ChevronRight } from 'lucide-react';

const PRESET_AREAS = [
  { name: 'All Wards', ward_no: null },
  { name: 'Bellandur (Ward 150)', ward_no: 150 },
  { name: 'HSR Layout (Ward 174)', ward_no: 174 },
  { name: 'KR Puram (Ward 52)', ward_no: 52 },
  { name: 'Whitefield (Ward 84)', ward_no: 84 },
  { name: 'Indiranagar (Ward 80)', ward_no: 80 },
  { name: 'Koramangala (Ward 151)', ward_no: 151 },
  { name: 'Doddanekkundi (Ward 85)', ward_no: 85 }
];

export default function FindByAreaView({ onBack, defects = [], onSelectDefect }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWard, setSelectedWard] = useState(null);

  // Filter defects by selected ward and search term
  const filteredDefects = useMemo(() => {
    return defects.filter(d => {
      const wardMatch = selectedWard === null || d.location?.ward_no === selectedWard;
      if (!wardMatch) return false;

      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      const address = (d.location?.address || '').toLowerCase();
      const wardName = (d.location?.ward_name || '').toLowerCase();
      const zone = (d.location?.zone || '').toLowerCase();
      const ticket = (d.ticket_code || '').toLowerCase();
      const type = (d.type || '').toLowerCase();

      return (
        address.includes(term) ||
        wardName.includes(term) ||
        zone.includes(term) ||
        ticket.includes(term) ||
        type.includes(term)
      );
    });
  }, [defects, selectedWard, searchTerm]);

  const criticalCount = filteredDefects.filter(d => d.severity === 'CRITICAL').length;
  const highCount = filteredDefects.filter(d => d.severity === 'HIGH').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Navigation Bar with Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition flex items-center space-x-1.5 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>

          <div>
            <h1 className="text-xl font-bold text-white flex items-center space-x-2">
              <Search className="w-5 h-5 text-emerald-400" />
              <span>Find Road Defects By Area</span>
            </h1>
            <p className="text-xs text-slate-400">
              Browse localized road condition registry, citizen submissions, and critical maintenance zones.
            </p>
          </div>
        </div>
      </div>

      {/* Search Input & Quick Ward Selector */}
      <div className="bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by street name, ward name (e.g. Bellandur, Silk Board), zone, or Ticket #..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition"
          />
        </div>

        {/* Quick Area Filter Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-thin">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1 flex-shrink-0">
            <Filter className="w-3 h-3 text-slate-500" />
            <span>Wards:</span>
          </span>
          {PRESET_AREAS.map((area, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedWard(area.ward_no)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0 transition-all ${
                selectedWard === area.ward_no
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'
              }`}
            >
              {area.name}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Metrics Bar for the Selected Area */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
        <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
          <span className="text-slate-400">Total in Area:</span>
          <span className="text-white font-bold text-sm">{filteredDefects.length}</span>
        </div>
        <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
          <span className="text-slate-400">Critical Hazards:</span>
          <span className="text-rose-400 font-bold text-sm">{criticalCount}</span>
        </div>
        <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
          <span className="text-slate-400">High Urgency:</span>
          <span className="text-amber-400 font-bold text-sm">{highCount}</span>
        </div>
        <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
          <span className="text-slate-400">Filter Status:</span>
          <span className="text-cyan-400 font-bold">
            {selectedWard ? `Ward ${selectedWard}` : 'All Wards'}
          </span>
        </div>
      </div>

      {/* List of Defects in the Selected Area */}
      <div className="space-y-3">
        {filteredDefects.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400 space-y-2">
            <Search className="w-8 h-8 mx-auto text-slate-600" />
            <p className="font-semibold text-sm">No defects found for the selected area or search criteria.</p>
            <p className="text-xs text-slate-500">Try choosing a different ward or clearing your search term.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDefects.map((defect) => (
              <div
                key={defect.id || defect.ticket_code}
                className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition shadow-lg space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-cyan-400">
                        #{defect.ticket_code}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        defect.severity === 'CRITICAL'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : defect.severity === 'HIGH'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}>
                        {defect.severity}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-white pt-1">
                      {defect.category_label || defect.type?.replace('_', ' ').toUpperCase()}
                    </h3>
                  </div>

                  <span className="text-[10px] font-mono text-slate-500">
                    {defect.status || 'Reported'}
                  </span>
                </div>

                <div className="text-xs text-slate-400 flex items-start space-x-1.5 font-sans">
                  <MapPin className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <span className="truncate">{defect.location?.address || 'Municipal Road'}</span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 grid grid-cols-2 gap-2">
                  <div>
                    Depth: <strong className="text-amber-400">{defect.dimensions?.depth_cm || 12} cm</strong>
                  </div>
                  <div>
                    Width: <strong className="text-white">{defect.dimensions?.width_cm || 45} cm</strong>
                  </div>
                  <div className="col-span-2 text-slate-400 text-[10px] truncate">
                    GPS: {defect.location?.lat?.toFixed(5)}, {defect.location?.lng?.toFixed(5)} (Ward {defect.location?.ward_no || 150})
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
