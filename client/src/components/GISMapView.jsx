import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

export default function GISMapView({
  defects = [],
  roads = [],
  userLocation = null,
  destination = null,
  activeRoute = 'safe',
  routes = null,
  onMapClick,
  onSelectDefect
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const routeLayersRef = useRef([]);
  const userMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [12.9450, 77.6500],
        zoom: 13,
        zoomControl: true
      });

      // High-resolution Esri World Street Map (Google Maps-style street view, 100% Free, ZERO API KEY REQUIRED!)
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
        attribution: '&copy; Esri, DeLorme, NAVTEQ, TomTom | Smart City GIS',
        maxZoom: 19
      }).addTo(map);

      // Click on map to set custom destination
      map.on('click', (e) => {
        if (onMapClick) {
          onMapClick({
            name: `Pinned Location (${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)})`,
            lat: e.latlng.lat,
            lng: e.latlng.lng
          });
        }
      });

      mapInstanceRef.current = map;
    }

    return () => {
      // Cleanup on unmount handled gracefully
    };
  }, []);

  const map = mapInstanceRef.current;

  // Render Defect Markers (with Animated Pulsing for Critical Hazards)
  useEffect(() => {
    if (!map) return;

    // Clear previous defect markers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    defects.forEach(defect => {
      if (!defect.location || typeof defect.location.lat !== 'number' || typeof defect.location.lng !== 'number') return;

      const priority = defect.ai_calculated_priority;
      const isCritical = defect.severity === 'CRITICAL' || priority === 'P1_IMMEDIATE';
      const isHigh = defect.severity === 'HIGH' || priority === 'P2_HIGH';
      const isResolved = defect.status === 'Resolved' || defect.status === 'Fixed';

      let markerColor = '#3b82f6'; // Blue for normal
      if (isResolved) markerColor = '#10b981'; // Green
      else if (isCritical) markerColor = '#f43f5e'; // Rose / Red
      else if (isHigh) markerColor = '#f59e0b'; // Amber

      // Create Animated Marker for Critical Hazards (Movie Radar Pulsing Effect)
      const markerHtml = isCritical ? `
        <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: rgba(244, 63, 94, 0.45); animation: ping 1.4s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: absolute; width: 26px; height: 26px; border-radius: 50%; background: rgba(244, 63, 94, 0.6); animation: pulse 1.8s ease-in-out infinite;"></div>
          <div style="position: relative; width: 22px; height: 22px; border-radius: 50%; background: #e11d48; border: 2.5px solid #ffffff; box-shadow: 0 0 14px #f43f5e; display: flex; align-items: center; justify-content: center; color: #ffffff; font-size: 11px; font-weight: 900; font-family: monospace;">
            !
          </div>
        </div>
      ` : `
        <div style="
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: ${markerColor};
          border: 2px solid #ffffff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-size: 10px;
          font-weight: 800;
          font-family: sans-serif;
        ">
          ${isResolved ? '✓' : isHigh ? '▲' : '●'}
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'civic-defect-marker',
        html: markerHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([defect.location.lat, defect.location.lng], { icon: customIcon }).addTo(map);

      // Popup with inspection telemetry
      marker.bindPopup(`
        <div style="min-width: 230px; font-family: system-ui, sans-serif; padding: 2px; color: #0f172a;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-weight: 800; font-size: 11px; font-family: monospace; color: #0284c7;">
              #${defect.ticket_code || 'BBMP-DEF'}
            </span>
            <span style="font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 9999px; background: ${isCritical ? '#ffe4e6' : '#fef3c7'}; color: ${isCritical ? '#e11d48' : '#b45309'}; text-transform: uppercase;">
              ${defect.severity || 'HIGH'}
            </span>
          </div>

          <div style="font-weight: 700; font-size: 13px; color: #0f172a; margin-bottom: 4px;">
            ${defect.category_label || defect.title || 'Road Surface Defect'}
          </div>

          <div style="font-size: 11px; color: #475569; margin-bottom: 6px;">
            📍 ${defect.location.address || 'Smart City Road Corridor'}
          </div>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px; font-size: 11px; font-family: monospace; margin-bottom: 6px;">
            <div>Depth: <strong style="color: #dc2626;">${defect.dimensions?.depth_cm || 12} cm</strong> • Width: <strong>${defect.dimensions?.width_cm || 48} cm</strong></div>
            <div>Hazard: <span style="color: #ea580c;">${isCritical ? 'Severe Vehicle Hazard' : 'Pavement Distress'}</span></div>
          </div>

          <div style="font-size: 10px; color: #64748b;">
            GPS: ${defect.location.lat.toFixed(5)}, ${defect.location.lng.toFixed(5)}
          </div>
        </div>
      `);

      marker.on('click', () => {
        if (onSelectDefect) onSelectDefect(defect);
      });

      markersRef.current.push(marker);
    });
  }, [defects, map]);

  // Render User Live Location (Google Maps-Style Pulsing Blue Pin)
  useEffect(() => {
    if (!map) return;

    if (userMarkerRef.current) {
      map.removeLayer(userMarkerRef.current);
      userMarkerRef.current = null;
    }

    if (userLocation && typeof userLocation.lat === 'number' && typeof userLocation.lng === 'number') {
      const liveUserIcon = L.divIcon({
        className: 'user-live-gps-beacon',
        html: `
          <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: rgba(59, 130, 246, 0.35); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: absolute; width: 24px; height: 24px; border-radius: 50%; background: rgba(59, 130, 246, 0.5); animation: pulse 2s ease-in-out infinite;"></div>
            <div style="position: relative; width: 14px; height: 14px; border-radius: 50%; background: #2563eb; border: 3px solid #ffffff; box-shadow: 0 0 10px #3b82f6;"></div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      const userMarker = L.marker([userLocation.lat, userLocation.lng], { icon: liveUserIcon }).addTo(map);
      userMarker.bindPopup(`
        <div style="font-family: sans-serif; padding: 4px; font-size: 12px; font-weight: 700; color: #1e3a8a;">
          📍 Your Current Live Location
          <div style="font-size: 10px; font-weight: normal; color: #64748b; font-family: monospace; margin-top: 2px;">
            ${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}
          </div>
        </div>
      `);

      userMarkerRef.current = userMarker;
    }
  }, [userLocation, map]);

  // Render Destination Pin
  useEffect(() => {
    if (!map) return;

    if (destMarkerRef.current) {
      map.removeLayer(destMarkerRef.current);
      destMarkerRef.current = null;
    }

    if (destination && typeof destination.lat === 'number' && typeof destination.lng === 'number') {
      const destIcon = L.divIcon({
        className: 'destination-marker-icon',
        html: `
          <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
            <div style="width: 28px; height: 28px; border-radius: 50%; background: #06b6d4; border: 2.5px solid #ffffff; box-shadow: 0 0 12px #06b6d4; display: flex; align-items: center; justify-content: center; color: #ffffff; font-size: 13px;">
              🏁
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const destMarker = L.marker([destination.lat, destination.lng], { icon: destIcon }).addTo(map);
      destMarker.bindPopup(`
        <div style="font-family: sans-serif; padding: 4px; font-size: 12px; font-weight: 700; color: #0e7490;">
          🏁 Destination Infrastructure:
          <div style="font-size: 11px; color: #0f172a; margin-top: 2px;">
            ${destination.name || 'Selected Waypoint'}
          </div>
        </div>
      `);

      destMarkerRef.current = destMarker;
    }
  }, [destination, map]);

  // Render Navigation Routes (Polylines for Safe Route vs. Direct Route)
  useEffect(() => {
    if (!map) return;

    // Clear previous route polylines
    routeLayersRef.current.forEach(layer => map.removeLayer(layer));
    routeLayersRef.current = [];

    if (!routes) return;

    const boundsPoints = [];

    if (activeRoute === 'safe' && routes.safe && routes.safe.path.length > 0) {
      // Background glow for AI Safe Route (Emerald Green)
      const glowLayer = L.polyline(routes.safe.path, {
        color: '#059669',
        weight: 9,
        opacity: 0.35,
        lineCap: 'round'
      }).addTo(map);

      // Main Safe Route Polyline
      const safeLine = L.polyline(routes.safe.path, {
        color: '#10b981',
        weight: 5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      routeLayersRef.current.push(glowLayer, safeLine);
      boundsPoints.push(...routes.safe.path);
    } else if (activeRoute === 'direct' && routes.direct && routes.direct.path.length > 0) {
      // Direct Route through Potholes (Red / Amber with hazard dashed line)
      const glowLayer = L.polyline(routes.direct.path, {
        color: '#dc2626',
        weight: 8,
        opacity: 0.3,
        lineCap: 'round'
      }).addTo(map);

      const directLine = L.polyline(routes.direct.path, {
        color: '#ef4444',
        weight: 5,
        opacity: 0.9,
        dashArray: '7, 9',
        lineCap: 'round'
      }).addTo(map);

      routeLayersRef.current.push(glowLayer, directLine);
      boundsPoints.push(...routes.direct.path);
    }

    if (boundsPoints.length > 0) {
      map.fitBounds(boundsPoints, { padding: [60, 60], maxZoom: 15 });
    }
  }, [routes, activeRoute, map]);

  return (
    <div className="w-full h-full min-h-[520px] rounded-2xl overflow-hidden relative shadow-2xl">
      <div ref={mapContainerRef} className="w-full h-full min-h-[520px]" />
      
      {/* Map Interactive Hint */}
      <div className="absolute top-3 right-3 z-[1000] bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 shadow-lg flex items-center space-x-1.5 pointer-events-none">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
        <span>Click anywhere on map to set Destination</span>
      </div>
    </div>
  );
}
