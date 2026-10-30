import React, { useState } from 'react';
import { ArrowLeft, Map, Layers, AlertTriangle, ShieldCheck, MapPin } from 'lucide-react';
import GISMapView from './GISMapView';

export default function MapViewPage({ onBack, defects = [], roads = [] }) {
  const [filterSeverity, setFilterSeverity] = useState('ALL');

  const filteredDefects = filterSeverity === 'ALL'
    ? defects
    : defects.filter(d => d.severity === filterSeverity);

  const criticalCount = defects.filter(d => d.severity === 'CRITICAL').length;
  const highCount = defects.filter(d => d.severity === 'HIGH').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      
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
              <Map className="w-5 h-5 text-blue-400" />
              <span>City Road Defect Map View</span>
            </h1>
            <p className="text-xs text-slate-400">
              Geospatial monitoring of road cavities, structural cracks, and pavement spalls across Bengaluru.
            </p>
          </div>
        </div>

        {/* Severity Filter Pills */}
        <div className="flex items-center space-x-2 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setFilterSeverity('ALL')}
            className={`px-3 py-1 rounded-lg font-medium transition ${
              filterSeverity === 'ALL'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All ({defects.length})
          </button>
          <button
            onClick={() => setFilterSeverity('CRITICAL')}
            className={`px-3 py-1 rounded-lg font-medium transition flex items-center space-x-1 ${
              filterSeverity === 'CRITICAL'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-rose-400 hover:text-rose-300'
            }`}
          >
            <span>Critical ({criticalCount})</span>
          </button>
          <button
            onClick={() => setFilterSeverity('HIGH')}
            className={`px-3 py-1 rounded-lg font-medium transition ${
              filterSeverity === 'HIGH'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-amber-400 hover:text-amber-300'
            }`}
          >
            High ({highCount})
          </button>
        </div>
      </div>

      {/* Main Map Container */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl p-2">
        <GISMapView
          defects={filteredDefects}
          roads={roads}
        />
      </div>

      {/* Map Legend */}
      <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-slate-400">
        <div className="flex items-center space-x-4">
          <span className="text-slate-300 font-bold font-sans">Map Markers:</span>
          <span className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500 inline-block border border-white/50" />
            <span>P1 Immediate / Critical</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block border border-white/50" />
            <span>P2 High Priority</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-500 inline-block border border-white/50" />
            <span>P3 Normal Priority</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block border border-white/50" />
            <span>Resolved / Repaired</span>
          </span>
        </div>
        <div className="text-slate-500">
          Click any marker on the map to inspect defect dimensions & GPS coordinates.
        </div>
      </div>

    </div>
  );
}
