import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

export default function GISMapView({ defects = [], roads = [], selectedDefect, onSelectDefect }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize Leaflet Map centered on Bangalore Central Hub
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [12.9550, 77.6400],
        zoom: 12,
        zoomControl: true
      });

      // Dark civic CartoDB basemap tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a> | BBMP GIS',
        maxZoom: 19
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear previous markers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    // Custom Marker Icons depending on AI Priority
    defects.forEach(defect => {
      if (!defect.location || typeof defect.location.lat !== 'number') return;

      const priority = defect.ai_calculated_priority;
      const isP1 = priority === 'P1_IMMEDIATE';
      const isP2 = priority === 'P2_HIGH';
      const isResolved = defect.status === 'Resolved';

      const color = isResolved
        ? '#10b981' // Green
        : isP1
        ? '#ef4444' // Red
        : isP2
        ? '#f59e0b' // Amber
        : '#3b82f6'; // Blue

      const customIcon = L.divIcon({
        className: 'custom-civic-marker',
        html: `
          <div style="
            background-color: ${color};
            width: 28px;
            height: 28px;
            border-radius: 50%;
            border: 2px solid #ffffff;
            box-shadow: 0 0 12px ${color};
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-size: 11px;
            font-weight: 800;
          ">
            ${isResolved ? '✓' : isP1 ? '!' : defect.type === 'pothole' ? 'P' : 'C'}
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = L.marker([defect.location.lat, defect.location.lng], { icon: customIcon }).addTo(map);

      marker.bindPopup(`
        <div style="min-width: 220px; font-family: sans-serif; color: #1e293b;">
          <div style="font-weight: 800; font-size: 13px; color: ${color}; margin-bottom: 4px;">
            ${defect.category_label || defect.title}
          </div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">
            Ticket #${defect.ticket_code} • Ward ${defect.location.ward_no}
          </div>
          <div style="font-size: 12px; margin-bottom: 6px; font-weight: 600;">
            Priority: <span style="color: ${color}; font-weight: 700;">${defect.ai_calculated_priority}</span> (Score ${defect.ai_priority_score}/100)
          </div>
          <div style="font-size: 11px; color: #334155; margin-bottom: 6px;">
            Status: <strong>${defect.status}</strong> | Confirmations: <strong>${defect.verification_count || 1}</strong>
          </div>
          <div style="font-size: 10px; color: #64748b; background: #f1f5f9; padding: 4px 6px; border-radius: 4px;">
            ${defect.location.address || 'Smart City Route'}
          </div>
        </div>
      `);

      marker.on('click', () => {
        if (onSelectDefect) onSelectDefect(defect);
      });

      markersRef.current.push(marker);
    });

  }, [defects]);

  return (
    <div className="w-full h-full min-h-[420px] rounded-2xl overflow-hidden border border-slate-800 relative shadow-2xl">
      <div ref={mapContainerRef} className="w-full h-full min-h-[420px]" />
      
      {/* Map Legend Overlay */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-slate-950/90 backdrop-blur-md p-3 rounded-xl border border-slate-800 text-xs space-y-1.5 shadow-xl">
        <div className="font-bold text-slate-200 text-[11px] uppercase tracking-wider mb-1 font-mono">
          Priority GIS Layer
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e]"></span>
          <span className="text-slate-300">P1: Immediate Action (&lt;12h)</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-amber-500"></span>
          <span className="text-slate-300">P2: High Priority (&lt;24h)</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-blue-500"></span>
          <span className="text-slate-300">P3: Scheduled Maintenance</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
          <span className="text-slate-300">Resolved / Restored</span>
        </div>
      </div>
    </div>
  );
}
