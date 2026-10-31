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

      // Google Maps Live Real-Time Traffic Stream (Displays actual real-time traffic jams in red, clears to green when traffic clears)
      L.tileLayer('https://mt1.google.com/vt/lyrs=traffic&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        opacity: 0.92,
        zIndex: 500
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
      const dLat = defect.location?.lat ?? defect.lat;
      const dLng = defect.location?.lng ?? defect.lng;
      if (typeof dLat !== 'number' || typeof dLng !== 'number') return;

      const sev = (defect.severity || 'CRITICAL').toUpperCase();
      const isCritical = sev === 'CRITICAL' || sev === 'SEVERE';
      const isMedium = sev === 'MEDIUM' || sev === 'MODERATE' || sev === 'HIGH';
      const isLow = sev === 'LOW' || sev === 'MINOR';

      const verifCount = defect.verification_count || 1;
      const dupCount = defect.duplicates_prevented || 0;

      // 3 Distinct Visual Markers for Critical, Medium, and Low
      let markerHtml = '';
      let badgeBg = '#ffe4e6';
      let badgeColor = '#dc2626';
      let badgeLabel = 'CRITICAL HAZARD';
      let delayText = '⚠️ Axle Strike Risk: +60s Crawl Delay';
      let alertBoxBg = '#fef2f2';
      let alertBoxBorder = '#fecaca';
      let alertBoxText = '#b91c1c';

      const crowdPill = verifCount > 1 ? `
        <div style="position: absolute; top: -6px; right: -8px; background: #059669; color: #ffffff; font-size: 8px; font-weight: 900; padding: 1px 4px; border-radius: 9999px; border: 1.5px solid #ffffff; box-shadow: 0 1px 4px rgba(0,0,0,0.4); white-space: nowrap;">
          👥${verifCount}
        </div>
      ` : '';

      if (isCritical) {
        markerHtml = `
          <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            <div style="position: absolute; width: 38px; height: 38px; border-radius: 50%; background: rgba(239, 68, 68, 0.45); animation: ping 1.3s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background: rgba(239, 68, 68, 0.65); animation: pulse 1.6s ease-in-out infinite;"></div>
            <div style="position: relative; width: 22px; height: 22px; border-radius: 50%; background: #dc2626; border: 2.5px solid #ffffff; box-shadow: 0 0 16px #ef4444; display: flex; align-items: center; justify-content: center; color: #ffffff; font-size: 12px; font-weight: 900; font-family: monospace;">
              !
            </div>
            ${crowdPill}
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
            ${crowdPill}
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
            ${crowdPill}
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

      const marker = L.marker([dLat, dLng], { icon: customIcon }).addTo(map);

      const thumbImg = defect.image_url ? `
        <div style="height: 85px; border-radius: 8px; overflow: hidden; margin-bottom: 6px; background: #0f172a;">
          <img src="${defect.image_url}" style="width: 100%; height: 100%; object-fit: cover;" alt="Defect Photo" />
        </div>
      ` : '';

      const crowdBadgeHtml = (verifCount > 1 || dupCount > 0) ? `
        <div style="background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 8px; padding: 4px 8px; margin-bottom: 6px; font-size: 10px; font-family: monospace; color: #047857; display: flex; align-items: center; justify-content: space-between;">
          <span>👥 Crowd Confirmed: <strong>${verifCount} Reports</strong></span>
          <span style="font-weight: 800; color: #059669;">🛡️ ${dupCount} Dupes Merged</span>
        </div>
      ` : '';

      const dAddress = defect.location?.address || defect.address || 'Bengaluru Road Corridor';
      const dWard = defect.location?.ward_no || defect.ward_no || 150;
      const dDepth = defect.dimensions?.depth_cm || defect.depth_cm || 10;
      const dWidth = defect.dimensions?.width_cm || defect.width_cm || 45;

      // Detailed Telemetry Popup
      marker.bindPopup(`
        <div style="min-width: 240px; font-family: system-ui, sans-serif; padding: 4px; color: #0f172a;">
          ${thumbImg}
          ${crowdBadgeHtml}
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
            📍 ${dAddress}
          </div>

          <div style="background: ${alertBoxBg}; border: 1px solid ${alertBoxBorder}; border-radius: 8px; padding: 6px; font-size: 11px; font-family: monospace; margin-bottom: 6px;">
            <div style="color: ${alertBoxText}; font-weight: bold;">${delayText}</div>
            <div style="color: #475569; margin-top: 2px;">
              Depth: <strong style="color: ${badgeColor};">${dDepth} cm</strong> • Width: <strong>${dWidth} cm</strong>
            </div>
          </div>

          <div style="font-size: 10px; color: #64748b; display: flex; justify-content: space-between;">
            <span>Ward ${dWard}</span>
            <span>GPS: ${dLat.toFixed(4)}, ${dLng.toFixed(4)}</span>
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

    // 1. Draw Inactive / Alternate Route in Background (Translucent Grey/Muted Line)
    const currentRoute = (activeRoute === 'safe' ? routes.safe : (activeRoute === 'shortest' ? routes.shortest : routes.direct)) || routes.direct || routes.safe;
    const alternateRoute = (activeRoute === 'safe' ? routes.direct : routes.safe);

    if (alternateRoute && alternateRoute.path && alternateRoute.path.length > 0) {
      const altBg = L.polyline(alternateRoute.path, {
        color: '#64748b',
        weight: 5,
        opacity: 0.5,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      altBg.bindTooltip('<span style="font-size: 11px; font-weight: 700;">Click to select alternate route</span>', { sticky: true });
      altBg.on('click', () => {
        if (onSelectRoute) onSelectRoute(activeRoute === 'safe' ? 'direct' : 'safe');
      });

      routeLayersRef.current.push(altBg);
      boundsPoints.push(...alternateRoute.path);
    }

    // 2. Draw Active Route with Google Maps Live Traffic Coloring (Green / Orange / Red Segments)
    if (currentRoute && currentRoute.path && currentRoute.path.length > 0) {
      // Step A: Draw high-contrast road casing (dark border under the colored route, just like Google Maps)
      const casing = L.polyline(currentRoute.path, {
        color: '#0f172a',
        weight: 9,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);
      routeLayersRef.current.push(casing);
      boundsPoints.push(...currentRoute.path);

      // Step B: Draw Segmented Traffic Polylines (or solid fallback if no segments)
      if (currentRoute.segments && currentRoute.segments.length > 0) {
        currentRoute.segments.forEach(seg => {
          const segLine = L.polyline(seg.path, {
            color: seg.traffic_color || '#22c55e',
            weight: 6,
            opacity: 1.0,
            lineCap: 'round',
            lineJoin: 'round'
          }).addTo(map);

          // Interactive Tooltip showing Traffic Delay & Pothole Hazard
          const trafficIcon = seg.traffic_status === 'HEAVY' ? '🔴' : seg.traffic_status === 'MODERATE' ? '🟡' : '🟢';
          const tooltipHtml = `
            <div style="font-family: system-ui, sans-serif; padding: 4px 6px; min-width: 170px;">
              <div style="font-weight: 800; font-size: 12px; color: ${seg.traffic_color}; display: flex; align-items: center; gap: 4px;">
                <span>${trafficIcon}</span>
                <span>${seg.traffic_label || 'Traffic Segment'}</span>
              </div>
              <div style="font-size: 11px; color: #cbd5e1; margin-top: 2px;">
                Distance: <strong>${seg.distance_km} km</strong> • Avg Speed: <strong>${seg.avg_speed_kmh} km/h</strong>
              </div>
              ${seg.traffic_delay_min > 0 ? `
                <div style="font-size: 11px; color: #f87171; font-weight: 700; margin-top: 2px;">
                  ⏱️ Congestion Delay: +${seg.traffic_delay_min} min
                </div>` : ''}
              ${seg.potholes_count > 0 ? `
                <div style="font-size: 11px; color: #fbbf24; font-weight: 700; margin-top: 2px;">
                  ⚠️ ${seg.potholes_count} Potholes (+${seg.pothole_delay_min}m crawl)
                </div>` : ''}
            </div>
          `;
          segLine.bindTooltip(tooltipHtml, { sticky: true, opacity: 0.96 });
          routeLayersRef.current.push(segLine);

          // Step C: Place Google Maps style Traffic Delay pill marker at midpoint of heavy delay segments
          if (seg.traffic_status === 'HEAVY' && seg.traffic_delay_min >= 2.5 && seg.path && seg.path.length > 0) {
            const midCoord = seg.path[Math.floor(seg.path.length / 2)];
            const delayIcon = L.divIcon({
              className: 'custom-traffic-delay-badge',
              html: `
                <div style="
                  background: #ef4444;
                  color: #ffffff;
                  font-size: 10px;
                  font-weight: 800;
                  padding: 2px 7px;
                  border-radius: 9999px;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.6);
                  border: 1.5px solid #ffffff;
                  white-space: nowrap;
                  display: flex;
                  align-items: center;
                  gap: 3px;
                ">
                  <span>⏱️ +${Math.round(seg.traffic_delay_min)}m</span>
                </div>
              `,
              iconSize: [52, 22],
              iconAnchor: [26, 11]
            });
            const delayMarker = L.marker(midCoord, { icon: delayIcon, interactive: false }).addTo(map);
            routeLayersRef.current.push(delayMarker);
          }
        });
      } else {
        // Fallback solid polyline
        const defaultColor = activeRoute === 'safe' ? '#10b981' : '#ef4444';
        const line = L.polyline(currentRoute.path, {
          color: defaultColor,
          weight: 6,
          opacity: 1.0,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(map);
        routeLayersRef.current.push(line);
      }
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

      {/* Map Interactive Hint / Real-Time Satellite & Google Live Traffic Badge */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-slate-950/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 shadow-xl flex flex-wrap items-center gap-2 pointer-events-none">
        <div className="flex items-center space-x-1.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-emerald-300 font-bold font-sans">Google Maps Live Traffic Active</span>
        </div>
        <span className="text-slate-600">|</span>
        <span className="text-slate-400 font-sans">Live Congestion (Red = Heavy Traffic, Clears to Green)</span>
      </div>
    </div>
  );
}
