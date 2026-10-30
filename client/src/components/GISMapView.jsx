import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Layers, Compass } from 'lucide-react';

export default function GISMapView({
  defects = [],
  roads = [],
  userLocation = null,
  destination = null,
  activeRoute = 'safe',
  routes = null,
  onMapClick,
  onSelectDefect,
  onSelectRoute
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const baseTileLayerRef = useRef(null);
  const markersRef = useRef([]);
  const routeLayersRef = useRef([]);
  const userMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);

  // Map layer toggle: 'satellite' (Google Hybrid Aerial with buildings) vs 'streets'
  const [mapLayer, setMapLayer] = useState('satellite');

  // 1. Initialize Map Instance
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialLat = userLocation?.lat || 12.9450;
      const initialLng = userLocation?.lng || 77.6500;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 14,
        zoomControl: false // Custom placement below
      });

      // Zoom control in top-right
      L.control.zoom({ position: 'topright' }).addTo(map);

      // Default to Google Maps Satellite Hybrid (Real buildings, rooftops, roads, street names)
      const baseLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        attribution: '&copy; Google Satellite | Infra AI GIS',
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
      }).addTo(map);

      baseTileLayerRef.current = baseLayer;

      // Click on map to set custom destination
      map.on('click', (e) => {
        if (onMapClick) {
          onMapClick({
            name: `Pinned Satellite Point (${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)})`,
            lat: e.latlng.lat,
            lng: e.latlng.lng
          });
        }
      });

      mapInstanceRef.current = map;
    }

    return () => {
      // Cleanup on unmount
    };
  }, []);

  const map = mapInstanceRef.current;

  // 2. Switch Base Tile Layer (Google Satellite vs Street Map)
  useEffect(() => {
    if (!map) return;

    if (baseTileLayerRef.current) {
      map.removeLayer(baseTileLayerRef.current);
    }

    let newLayer;
    if (mapLayer === 'satellite') {
      // Google Hybrid: High-res satellite imagery + physical buildings + road overlays + street labels
      newLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        attribution: '&copy; Google Satellite | Infra AI GIS',
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
      });
    } else {
      // Esri World Street Map (Clean GIS vector roads)
      newLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
        attribution: '&copy; Esri World Street Map | Infra AI GIS',
        maxZoom: 19
      });
    }

    newLayer.addTo(map);
    baseTileLayerRef.current = newLayer;
  }, [mapLayer, map]);

  // 3. Render Defect Markers (Animated Pulsing Movie Radar on Critical Potholes)
  useEffect(() => {
    if (!map) return;

    // Clear previous defect markers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    defects.forEach(defect => {
      if (!defect.location || typeof defect.location.lat !== 'number' || typeof defect.location.lng !== 'number') return;

      const priority = defect.ai_calculated_priority;
      const isCritical = defect.severity === 'CRITICAL' || priority === 'P1_IMMEDIATE' || defect.severity === 'Severe';
      const isHigh = defect.severity === 'HIGH' || priority === 'P2_HIGH';
      const isResolved = defect.status === 'Resolved' || defect.status === 'Fixed';

      let markerColor = '#3b82f6';
      if (isResolved) markerColor = '#10b981';
      else if (isCritical) markerColor = '#f43f5e';
      else if (isHigh) markerColor = '#f59e0b';

      // Movie Radar Pulsing Effect for Critical Hazards
      const markerHtml = isCritical ? `
        <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
          <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: rgba(239, 68, 68, 0.4); animation: ping 1.3s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: absolute; width: 26px; height: 26px; border-radius: 50%; background: rgba(239, 68, 68, 0.6); animation: pulse 1.6s ease-in-out infinite;"></div>
          <div style="position: relative; width: 22px; height: 22px; border-radius: 50%; background: #dc2626; border: 2.5px solid #ffffff; box-shadow: 0 0 16px #ef4444; display: flex; align-items: center; justify-content: center; color: #ffffff; font-size: 11px; font-weight: 900; font-family: monospace;">
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
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
        ">
          ${isResolved ? '✓' : isHigh ? '▲' : '●'}
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'civic-defect-marker',
        html: markerHtml,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });

      const marker = L.marker([defect.location.lat, defect.location.lng], { icon: customIcon }).addTo(map);

      // Popup with inspection telemetry & delay calculation
      marker.bindPopup(`
        <div style="min-width: 240px; font-family: system-ui, sans-serif; padding: 4px; color: #0f172a;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-weight: 800; font-size: 11px; font-family: monospace; color: #0284c7;">
              #${defect.ticket_code || 'INFRA-CRIT'}
            </span>
            <span style="font-size: 9px; font-weight: 800; padding: 2px 7px; border-radius: 9999px; background: ${isCritical ? '#ffe4e6' : '#fef3c7'}; color: ${isCritical ? '#dc2626' : '#b45309'}; text-transform: uppercase;">
              ${defect.severity || 'CRITICAL'}
            </span>
          </div>

          <div style="font-weight: 700; font-size: 13px; color: #0f172a; margin-bottom: 4px;">
            ${defect.category_label || defect.title || 'Severe Road Pothole'}
          </div>

          <div style="font-size: 11px; color: #475569; margin-bottom: 6px;">
            📍 ${defect.location.address || 'Smart City Arterial Corridor'}
          </div>

          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 6px; font-size: 11px; font-family: monospace; margin-bottom: 6px;">
            <div style="color: #b91c1c; font-weight: bold;">⚠️ Traffic Slowdown: +60s / pothole</div>
            <div style="color: #475569; margin-top: 2px;">Depth: <strong style="color: #dc2626;">${defect.dimensions?.depth_cm || 14} cm</strong> • Width: <strong>${defect.dimensions?.width_cm || 52} cm</strong></div>
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

  // 4. Render User Live Location (Google Maps-Style Pulsing Blue Beacon)
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
          <div style="position: relative; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 38px; height: 38px; border-radius: 50%; background: rgba(37, 99, 235, 0.35); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: absolute; width: 26px; height: 26px; border-radius: 50%; background: rgba(37, 99, 235, 0.45); animation: pulse 2s ease-in-out infinite;"></div>
            <div style="position: relative; width: 14px; height: 14px; border-radius: 50%; background: #2563eb; border: 3px solid #ffffff; box-shadow: 0 0 12px #3b82f6;"></div>
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 19]
      });

      const userMarker = L.marker([userLocation.lat, userLocation.lng], { icon: liveUserIcon }).addTo(map);
      userMarker.bindPopup(`
        <div style="font-family: sans-serif; padding: 4px; font-size: 12px; font-weight: 700; color: #1e3a8a;">
          📍 Origin: Your Live GPS Location
          <div style="font-size: 11px; font-weight: normal; color: #334155; margin-top: 2px;">
            ${userLocation.name || 'Device Location'}
          </div>
          <div style="font-size: 10px; font-weight: normal; color: #64748b; font-family: monospace; margin-top: 2px;">
            ${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}
          </div>
        </div>
      `);

      userMarkerRef.current = userMarker;
    }
  }, [userLocation, map]);

  // 5. Render Destination Pin
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
          <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
            <div style="width: 30px; height: 30px; border-radius: 50%; background: #06b6d4; border: 2.5px solid #ffffff; box-shadow: 0 0 14px #06b6d4; display: flex; align-items: center; justify-content: center; color: #ffffff; font-size: 14px;">
              🏁
            </div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      const destMarker = L.marker([destination.lat, destination.lng], { icon: destIcon }).addTo(map);
      destMarker.bindPopup(`
        <div style="font-family: system-ui, sans-serif; padding: 4px; font-size: 12px; font-weight: 700; color: #0e7490;">
          🏁 Destination:
          <div style="font-size: 12px; font-weight: 800; color: #0f172a; margin-top: 2px;">
            ${destination.name || 'Selected Waypoint'}
          </div>
          ${destination.fullName ? `<div style="font-size: 10px; color: #475569; margin-top: 2px;">${destination.fullName}</div>` : ''}
          <div style="font-size: 10px; font-family: monospace; color: #64748b; margin-top: 2px;">
            ${destination.lat.toFixed(5)}, ${destination.lng.toFixed(5)}
          </div>
        </div>
      `);

      destMarkerRef.current = destMarker;
    }
  }, [destination, map]);

  // 6. Render Navigation Routes (Google Maps-Style: Active Route + Inactive Route in background)
  useEffect(() => {
    if (!map) return;

    // Clear previous route polylines
    routeLayersRef.current.forEach(layer => map.removeLayer(layer));
    routeLayersRef.current = [];

    if (!routes) return;

    const boundsPoints = [];

    // Draw Inactive / Background Route first (like Google Maps alternative route)
    if (activeRoute === 'safe' && routes.direct && routes.direct.path.length > 0) {
      // Inactive Direct route shown in muted reddish-slate with dashes
      const directBg = L.polyline(routes.direct.path, {
        color: '#f87171',
        weight: 4,
        opacity: 0.55,
        dashArray: '6, 8',
        lineCap: 'round'
      }).addTo(map);

      directBg.on('click', () => {
        if (onSelectRoute) onSelectRoute('direct');
      });

      routeLayersRef.current.push(directBg);
      boundsPoints.push(...routes.direct.path);
    } else if (activeRoute === 'direct' && routes.safe && routes.safe.path.length > 0) {
      // Inactive Safe detour route shown in muted emerald-slate
      const safeBg = L.polyline(routes.safe.path, {
        color: '#34d399',
        weight: 4,
        opacity: 0.55,
        dashArray: '6, 8',
        lineCap: 'round'
      }).addTo(map);

      safeBg.on('click', () => {
        if (onSelectRoute) onSelectRoute('safe');
      });

      routeLayersRef.current.push(safeBg);
      boundsPoints.push(...routes.safe.path);
    }

    // Draw Active Selected Route (High contrast, glowing, bold)
    if (activeRoute === 'safe' && routes.safe && routes.safe.path.length > 0) {
      // Outer glow for Safe Route
      const glow = L.polyline(routes.safe.path, {
        color: '#059669',
        weight: 10,
        opacity: 0.45,
        lineCap: 'round'
      }).addTo(map);

      // Core polyline
      const line = L.polyline(routes.safe.path, {
        color: '#10b981',
        weight: 5.5,
        opacity: 1.0,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      routeLayersRef.current.push(glow, line);
      boundsPoints.push(...routes.safe.path);
    } else if (activeRoute === 'direct' && routes.direct && routes.direct.path.length > 0) {
      // Outer glow for Direct Route
      const glow = L.polyline(routes.direct.path, {
        color: '#dc2626',
        weight: 10,
        opacity: 0.4,
        lineCap: 'round'
      }).addTo(map);

      // Core polyline
      const line = L.polyline(routes.direct.path, {
        color: '#ef4444',
        weight: 5.5,
        opacity: 1.0,
        dashArray: '8, 9',
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      routeLayersRef.current.push(glow, line);
      boundsPoints.push(...routes.direct.path);
    }

    // Fit map bounds to view both Origin, Destination, and complete route
    if (boundsPoints.length > 0) {
      map.fitBounds(boundsPoints, { padding: [50, 50], maxZoom: 16 });
    }
  }, [routes, activeRoute, map]);

  return (
    <div className="w-full h-full min-h-[560px] rounded-2xl overflow-hidden relative shadow-2xl border border-slate-800">
      <div ref={mapContainerRef} className="w-full h-full min-h-[560px]" />

      {/* Map Control: Google Satellite View vs Street Map Toggle */}
      <div className="absolute top-3 left-3 z-[1000] flex items-center bg-slate-950/90 backdrop-blur-md p-1 rounded-xl border border-slate-800 shadow-xl space-x-1">
        <button
          type="button"
          onClick={() => setMapLayer('satellite')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
            mapLayer === 'satellite'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
          title="Authentic Google Maps Satellite Hybrid (Real Buildings, Rooftops & Roads)"
        >
          <span>🛰️ Satellite View</span>
          <span className="text-[10px] font-mono px-1 py-0.2 bg-blue-500/30 rounded text-blue-200">Google</span>
        </button>

        <button
          type="button"
          onClick={() => setMapLayer('streets')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
            mapLayer === 'streets'
              ? 'bg-slate-800 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>🗺️ Street Map</span>
        </button>
      </div>

      {/* Map Interactive Hint / Click-to-Pin Badge */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 shadow-lg flex items-center space-x-2 pointer-events-none">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
        <span>Click any building or road on the satellite map to set destination</span>
      </div>
    </div>
  );
}
