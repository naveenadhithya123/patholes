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
        attribution: '&copy; Google Satellite | NammaFix GIS',
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

  // Invalidate map size on tab switch / mount so tiles render completely without clipping
  useEffect(() => {
    if (!map) return;
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [map]);

  // 2. Render Defect Markers (Animated Pulsing Movie Radar on Critical Road Potholes)
  useEffect(() => {
    if (!map) return;

    // Clear previous defect markers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    defects.forEach(defect => {
      if (!defect.location || typeof defect.location.lat !== 'number' || typeof defect.location.lng !== 'number') return;

      const sev = (defect.severity || 'CRITICAL').toUpperCase();
      const isCritical = sev === 'CRITICAL' || sev === 'SEVERE';
      const isMedium = sev === 'MEDIUM' || sev === 'MODERATE' || sev === 'HIGH';
      const isLow = sev === 'LOW' || sev === 'MINOR';

      // 3 Distinct Visual Markers for Critical, Medium, and Low
      let markerHtml = '';
      let badgeBg = '#ffe4e6';
      let badgeColor = '#dc2626';
      let badgeLabel = 'CRITICAL HAZARD';
      let delayText = '⚠️ Axle Strike Risk: +60s Crawl Delay';
      let alertBoxBg = '#fef2f2';
      let alertBoxBorder = '#fecaca';
      let alertBoxText = '#b91c1c';

      if (isCritical) {
        markerHtml = `
          <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            <div style="position: absolute; width: 38px; height: 38px; border-radius: 50%; background: rgba(239, 68, 68, 0.45); animation: ping 1.3s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background: rgba(239, 68, 68, 0.65); animation: pulse 1.6s ease-in-out infinite;"></div>
            <div style="position: relative; width: 22px; height: 22px; border-radius: 50%; background: #dc2626; border: 2.5px solid #ffffff; box-shadow: 0 0 16px #ef4444; display: flex; align-items: center; justify-content: center; color: #ffffff; font-size: 12px; font-weight: 900; font-family: monospace;">
              !
            </div>
          </div>
        `;
        badgeBg = '#ffe4e6';
        badgeColor = '#dc2626';
        badgeLabel = 'CRITICAL HAZARD';
        delayText = '⚠️ Axle Strike Risk: +60s Crawl Delay';
        alertBoxBg = '#fef2f2';
        alertBoxBorder = '#fecaca';
        alertBoxText = '#b91c1c';
      } else if (isMedium) {
        markerHtml = `
          <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            <div style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background: rgba(245, 158, 11, 0.35); animation: pulse 1.8s ease-in-out infinite;"></div>
            <div style="position: relative; width: 20px; height: 20px; border-radius: 50%; background: #f59e0b; border: 2px solid #ffffff; box-shadow: 0 0 10px rgba(245, 158, 11, 0.7); display: flex; align-items: center; justify-content: center; color: #ffffff; font-size: 10px; font-weight: 900;">
              ▲
            </div>
          </div>
        `;
        badgeBg = '#fef3c7';
        badgeColor = '#d97706';
        badgeLabel = 'MEDIUM SEVERITY';
        delayText = '⚠️ Road Bumps / Cracks: +25s Caution';
        alertBoxBg = '#fffbeb';
        alertBoxBorder = '#fde68a';
        alertBoxText = '#b45309';
      } else {
        // LOW SEVERITY
        markerHtml = `
          <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            <div style="position: absolute; width: 26px; height: 26px; border-radius: 50%; background: rgba(16, 185, 129, 0.3); animation: pulse 2.2s ease-in-out infinite;"></div>
            <div style="position: relative; width: 18px; height: 18px; border-radius: 50%; background: #059669; border: 2px solid #ffffff; box-shadow: 0 0 8px rgba(16, 185, 129, 0.6); display: flex; align-items: center; justify-content: center; color: #ffffff; font-size: 9px; font-weight: 900;">
              ●
            </div>
          </div>
        `;
        badgeBg = '#d1fae5';
        badgeColor = '#059669';
        badgeLabel = 'LOW SEVERITY';
        delayText = 'ℹ️ Surface Roughness: Minor Caution (+5s)';
        alertBoxBg = '#ecfdf5';
        alertBoxBorder = '#a7f3d0';
        alertBoxText = '#047857';
      }

      const customIcon = L.divIcon({
        className: 'road-pothole-marker',
        html: markerHtml,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      const marker = L.marker([defect.location.lat, defect.location.lng], { icon: customIcon }).addTo(map);

      const thumbImg = defect.image_url ? `
        <div style="height: 85px; border-radius: 8px; overflow: hidden; margin-bottom: 6px; background: #0f172a;">
          <img src="${defect.image_url}" style="width: 100%; height: 100%; object-fit: cover;" alt="Defect Photo" />
        </div>
      ` : '';

      // Detailed Telemetry Popup
      marker.bindPopup(`
        <div style="min-width: 240px; font-family: system-ui, sans-serif; padding: 4px; color: #0f172a;">
          ${thumbImg}
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-weight: 800; font-size: 11px; font-family: monospace; color: #0284c7;">
              #${defect.ticket_code || 'ROAD-DEFECT'}
            </span>
            <span style="font-size: 9px; font-weight: 800; padding: 2px 7px; border-radius: 9999px; background: ${badgeBg}; color: ${badgeColor}; text-transform: uppercase;">
              ${badgeLabel}
            </span>
          </div>

          <div style="font-weight: 700; font-size: 13px; color: #0f172a; margin-bottom: 4px;">
            ${defect.title || defect.category_label || 'Road Defect'}
          </div>

          <div style="font-size: 11px; color: #475569; margin-bottom: 6px;">
            📍 ${defect.location.address || 'Bengaluru Road Corridor'}
          </div>

          <div style="background: ${alertBoxBg}; border: 1px solid ${alertBoxBorder}; border-radius: 8px; padding: 6px; font-size: 11px; font-family: monospace; margin-bottom: 6px;">
            <div style="color: ${alertBoxText}; font-weight: bold;">${delayText}</div>
            <div style="color: #475569; margin-top: 2px;">
              Depth: <strong style="color: ${badgeColor};">${defect.dimensions?.depth_cm || 10} cm</strong> • Width: <strong>${defect.dimensions?.width_cm || 45} cm</strong>
            </div>
          </div>

          <div style="font-size: 10px; color: #64748b; display: flex; justify-content: space-between;">
            <span>Ward ${defect.location.ward_no || 150}</span>
            <span>GPS: ${defect.location.lat.toFixed(4)}, ${defect.location.lng.toFixed(4)}</span>
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

    if (userLocation && typeof userLocation.lat === 'number' && typeof userLocation.lng === 'number') {
      boundsPoints.push([userLocation.lat, userLocation.lng]);
    }
    if (destination && typeof destination.lat === 'number' && typeof destination.lng === 'number') {
      boundsPoints.push([destination.lat, destination.lng]);
    }

    // Smoothly zoom and fit map bounds so user sees full origin, destination, road curves, and potholes
    // (Works seamlessly for local 5km city routes up to 350km Chennai inter-city corridors!)
    if (boundsPoints.length > 0) {
      try {
        const bounds = L.latLngBounds(boundsPoints);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      } catch (e) {
        console.warn('Map fitBounds error:', e);
      }
    }
  }, [routes, activeRoute, destination, userLocation, map]);

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
