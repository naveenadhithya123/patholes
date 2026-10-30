import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

export default function GISMapView({
  defects = [],
  userLocation = null,
  destination = null,
  activeRoute = 'direct',
  routes = null,
  onMapClick,
  onSelectDefect,
  onSelectRoute
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const routeLayersRef = useRef([]);
  const userMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);

  // 1. Initialize Map Instance with Permanent Google Maps Satellite View
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialLat = userLocation?.lat || 12.9450;
      const initialLng = userLocation?.lng || 77.6500;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 13,
        zoomControl: false
      });

      // Zoom control in top-right
      L.control.zoom({ position: 'topright' }).addTo(map);

      // Authentic Google Maps Satellite Hybrid (Real Buildings, Rooftops, Real Roads, Street Names)
      L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        attribution: '&copy; Google Satellite | Infra AI GIS',
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
      }).addTo(map);

      // Click on map to set custom destination
      map.on('click', (e) => {
        if (onMapClick) {
          onMapClick({
            name: `Satellite Location (${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)})`,
            lat: e.latlng.lat,
            lng: e.latlng.lng
          });
        }
      });

      mapInstanceRef.current = map;
    }

    return () => {
      // Map instance preserved
    };
  }, []);

  const map = mapInstanceRef.current;

  // 2. Render Defect Markers (Animated Pulsing Movie Radar on Critical Road Potholes)
  useEffect(() => {
    if (!map) return;

    // Clear previous defect markers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    defects.forEach(defect => {
      if (!defect.location || typeof defect.location.lat !== 'number' || typeof defect.location.lng !== 'number') return;

      const isCritical = defect.severity === 'CRITICAL' || defect.severity === 'Severe';
      const isHigh = defect.severity === 'HIGH';

      // Movie Radar Pulsing Effect for Critical Road Potholes
      const markerHtml = isCritical ? `
        <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
          <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: rgba(239, 68, 68, 0.45); animation: ping 1.3s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: absolute; width: 26px; height: 26px; border-radius: 50%; background: rgba(239, 68, 68, 0.65); animation: pulse 1.6s ease-in-out infinite;"></div>
          <div style="position: relative; width: 22px; height: 22px; border-radius: 50%; background: #dc2626; border: 2.5px solid #ffffff; box-shadow: 0 0 16px #ef4444; display: flex; align-items: center; justify-content: center; color: #ffffff; font-size: 12px; font-weight: 900; font-family: monospace;">
            !
          </div>
        </div>
      ` : `
        <div style="
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #f59e0b;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
        ">
          ▲
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'road-pothole-marker',
        html: markerHtml,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });

      const marker = L.marker([defect.location.lat, defect.location.lng], { icon: customIcon }).addTo(map);

      // Popup with inspection telemetry & delay calculation
      marker.bindPopup(`
        <div style="min-width: 230px; font-family: system-ui, sans-serif; padding: 4px; color: #0f172a;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-weight: 800; font-size: 11px; font-family: monospace; color: #0284c7;">
              #${defect.ticket_code || 'ROAD-HAZARD'}
            </span>
            <span style="font-size: 9px; font-weight: 800; padding: 2px 7px; border-radius: 9999px; background: #ffe4e6; color: #dc2626; text-transform: uppercase;">
              ${defect.severity || 'CRITICAL'}
            </span>
          </div>

          <div style="font-weight: 700; font-size: 13px; color: #0f172a; margin-bottom: 4px;">
            ${defect.category_label || 'Severe Road Pothole'}
          </div>

          <div style="font-size: 11px; color: #475569; margin-bottom: 6px;">
            📍 ${defect.location.address || 'Real Road Navigation Corridor'}
          </div>

          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 6px; font-size: 11px; font-family: monospace; margin-bottom: 6px;">
            <div style="color: #b91c1c; font-weight: bold;">⚠️ Vehicle Slowdown: +60s Crawl Delay</div>
            <div style="color: #475569; margin-top: 2px;">Depth: <strong style="color: #dc2626;">${defect.dimensions?.depth_cm || 15} cm</strong> • Width: <strong>${defect.dimensions?.width_cm || 55} cm</strong></div>
          </div>

          <div style="font-size: 10px; color: #64748b;">
            Road GPS: ${defect.location.lat.toFixed(5)}, ${defect.location.lng.toFixed(5)}
          </div>
        </div>
      `);

      marker.on('click', () => {
        if (onSelectDefect) onSelectDefect(defect);
      });

      markersRef.current.push(marker);
    });
  }, [defects, map]);

  // 3. Render User Live Location (Blinking Google Maps Blue GPS Beacon)
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
            <div style="position: absolute; width: 38px; height: 38px; border-radius: 50%; background: rgba(37, 99, 235, 0.4); animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: absolute; width: 26px; height: 26px; border-radius: 50%; background: rgba(37, 99, 235, 0.5); animation: pulse 1.8s ease-in-out infinite;"></div>
            <div style="position: relative; width: 14px; height: 14px; border-radius: 50%; background: #2563eb; border: 3px solid #ffffff; box-shadow: 0 0 12px #3b82f6;"></div>
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 19]
      });

      const userMarker = L.marker([userLocation.lat, userLocation.lng], { icon: liveUserIcon }).addTo(map);
      userMarker.bindPopup(`
        <div style="font-family: sans-serif; padding: 4px; font-size: 12px; font-weight: 700; color: #1e3a8a;">
          📍 Origin (Your Live Location)
          <div style="font-size: 11px; font-weight: normal; color: #334155; margin-top: 2px;">
            ${userLocation.name || 'Current GPS'}
          </div>
        </div>
      `);

      userMarkerRef.current = userMarker;
    }
  }, [userLocation, map]);

  // 4. Render Google Maps Iconic Red Destination Teardrop Pin
  useEffect(() => {
    if (!map) return;

    if (destMarkerRef.current) {
      map.removeLayer(destMarkerRef.current);
      destMarkerRef.current = null;
    }

    if (destination && typeof destination.lat === 'number' && typeof destination.lng === 'number') {
      const destIcon = L.divIcon({
        className: 'google-maps-destination-pin',
        html: `
          <div style="position: relative; width: 34px; height: 42px; display: flex; align-items: center; justify-content: center; cursor: pointer; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.55));">
            <svg viewBox="0 0 24 36" width="34" height="42" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 0C5.37258 0 0 5.37258 0 12C0 21.5 12 36 12 36C12 36 24 21.5 24 12C24 5.37258 18.6274 0 12 0Z" fill="#EA4335" stroke="#FFFFFF" stroke-width="1.2"/>
              <circle cx="12" cy="12" r="5" fill="#FFFFFF"/>
              <circle cx="12" cy="12" r="2.8" fill="#B3261E"/>
            </svg>
          </div>
        `,
        iconSize: [34, 42],
        iconAnchor: [17, 39]
      });

      const destMarker = L.marker([destination.lat, destination.lng], { icon: destIcon }).addTo(map);
      destMarker.bindPopup(`
        <div style="font-family: system-ui, sans-serif; padding: 4px; font-size: 12px; font-weight: 700; color: #b91c1c;">
          📍 Destination:
          <div style="font-size: 12px; font-weight: 800; color: #0f172a; margin-top: 2px;">
            ${destination.name || 'Target Location'}
          </div>
          ${destination.fullName ? `<div style="font-size: 10px; color: #475569; margin-top: 2px;">${destination.fullName}</div>` : ''}
        </div>
      `);

      destMarkerRef.current = destMarker;
    }
  }, [destination, map]);

  // 5. Render Navigation Routes (SOLID, CONTINUOUS LINES ALONG REAL ROADS - NO BREAKS / NO DASHES)
  useEffect(() => {
    if (!map) return;

    // Clear previous route polylines
    routeLayersRef.current.forEach(layer => map.removeLayer(layer));
    routeLayersRef.current = [];

    if (!routes) return;

    const boundsPoints = [];

    // Draw Inactive / Alternative Route in Background (Continuous solid line, 50% opacity, no breaks)
    if (activeRoute === 'safe' && routes.direct && routes.direct.path && routes.direct.path.length > 0) {
      const directBg = L.polyline(routes.direct.path, {
        color: '#f87171',
        weight: 5,
        opacity: 0.55,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      directBg.on('click', () => {
        if (onSelectRoute) onSelectRoute('direct');
      });

      routeLayersRef.current.push(directBg);
      boundsPoints.push(...routes.direct.path);
    } else if (activeRoute === 'direct' && routes.safe && routes.safe.path && routes.safe.path.length > 0) {
      const safeBg = L.polyline(routes.safe.path, {
        color: '#34d399',
        weight: 5,
        opacity: 0.55,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      safeBg.on('click', () => {
        if (onSelectRoute) onSelectRoute('safe');
      });

      routeLayersRef.current.push(safeBg);
      boundsPoints.push(...routes.safe.path);
    }

    // Draw Active Selected Route (Solid, Continuous, Glowing High-Contrast Google Maps Polyline)
    if (activeRoute === 'safe' && routes.safe && routes.safe.path && routes.safe.path.length > 0) {
      // Emerald Outer Glow
      const glow = L.polyline(routes.safe.path, {
        color: '#047857',
        weight: 10,
        opacity: 0.45,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      // Core Solid Polyline (NO DASHES)
      const line = L.polyline(routes.safe.path, {
        color: '#10b981',
        weight: 6,
        opacity: 1.0,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      routeLayersRef.current.push(glow, line);
      boundsPoints.push(...routes.safe.path);
    } else if (activeRoute === 'direct' && routes.direct && routes.direct.path && routes.direct.path.length > 0) {
      // Crimson Outer Glow
      const glow = L.polyline(routes.direct.path, {
        color: '#b91c1c',
        weight: 10,
        opacity: 0.45,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      // Core Solid Red Line (NO DASHES - CONTINUOUS RED LINE AS REQUESTED)
      const line = L.polyline(routes.direct.path, {
        color: '#ef4444',
        weight: 6,
        opacity: 1.0,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      routeLayersRef.current.push(glow, line);
      boundsPoints.push(...routes.direct.path);
    }

    // Smoothly zoom and fit map bounds so user sees origin, destination, road curves, and potholes
    if (boundsPoints.length > 0) {
      map.fitBounds(boundsPoints, { padding: [45, 45], maxZoom: 16 });
    }
  }, [routes, activeRoute, map]);

  return (
    <div className="w-full h-full min-h-[580px] rounded-2xl overflow-hidden relative shadow-2xl border border-slate-800">
      <div ref={mapContainerRef} className="w-full h-full min-h-[580px]" />

      {/* Map Interactive Hint / Real-Time Satellite Status Badge */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-slate-950/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 shadow-xl flex items-center space-x-2 pointer-events-none">
        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
        <span>Google Maps Satellite View • Continuous Real Road Navigation</span>
      </div>
    </div>
  );
}
