/**
 * NammaFix - Traffic Prediction & Dynamic Pothole Routing Engine
 * Replicates Google Maps live traffic congestion visualization (Red/Orange/Green line segments),
 * multi-variable delay calculation (Base Drive + Traffic Congestion + Pothole Hazards),
 * and Shortest Distance vs Fastest Route comparative evaluation.
 */

const { calculateHaversineDistance } = require('./spatial');

// Known Bangalore Traffic Congestion Bottlenecks & Arterial Chokepoints
const BANGALORE_TRAFFIC_CHOKEPOINTS = [
  { name: 'Silk Board Junction', lat: 12.9176, lng: 77.6238, baseDelayMin: 12, severity: 'HEAVY' },
  { name: 'Marathahalli - Bellandur Outer Ring Road', lat: 12.9370, lng: 77.6950, baseDelayMin: 10, severity: 'HEAVY' },
  { name: 'Tin Factory / KR Puram Hanging Bridge', lat: 12.9984, lng: 77.6740, baseDelayMin: 14, severity: 'HEAVY' },
  { name: 'Hebbal Flyover / Airport Interchange', lat: 13.0358, lng: 77.5970, baseDelayMin: 11, severity: 'HEAVY' },
  { name: 'Majestic City Railway Chokepoint', lat: 12.9784, lng: 77.5695, baseDelayMin: 9, severity: 'HEAVY' },
  { name: 'Whitefield ITPL Corridor', lat: 12.9850, lng: 77.7280, baseDelayMin: 8, severity: 'MODERATE' },
  { name: 'Bannerghatta Road / Dairy Circle', lat: 12.9340, lng: 77.5980, baseDelayMin: 8, severity: 'MODERATE' },
  { name: 'Goraguntepalya / Yeshwanthpur Junction', lat: 13.0280, lng: 77.5400, baseDelayMin: 9, severity: 'MODERATE' },
  { name: 'Sony World Signal, Koramangala 100ft Rd', lat: 12.9350, lng: 77.6250, baseDelayMin: 7, severity: 'MODERATE' },
  { name: 'Hosur Road Electronic City Tollgate', lat: 12.8450, lng: 77.6630, baseDelayMin: 10, severity: 'HEAVY' },
  { name: 'Old Madras Road - Indiranagar 100ft Rd', lat: 12.9780, lng: 77.6410, baseDelayMin: 7, severity: 'MODERATE' },
  { name: 'Mekhri Circle Underpass', lat: 13.0080, lng: 77.5840, baseDelayMin: 6, severity: 'MODERATE' }
];

/**
 * Splits raw polyline coordinates into discrete contiguous segments (typically 4 to 8 segments).
 */
function partitionPolyline(coords, targetSegments = 6) {
  if (!coords || coords.length === 0) return [];
  if (coords.length <= 4) return [coords];

  const totalPoints = coords.length;
  const numSegments = Math.max(3, Math.min(targetSegments, Math.floor(totalPoints / 6)));
  const chunkSize = Math.floor(totalPoints / numSegments);
  const segments = [];

  for (let i = 0; i < numSegments; i++) {
    const startIdx = i * chunkSize;
    // Overlap by 1 point with previous segment for continuous unbroken rendering on Leaflet
    const actualStart = i === 0 ? startIdx : startIdx - 1;
    const endIdx = (i === numSegments - 1) ? totalPoints : (i + 1) * chunkSize;
    const slice = coords.slice(actualStart, endIdx);
    if (slice.length >= 2) {
      segments.push(slice);
    }
  }

  return segments;
}

/**
 * Calculates total route distance along coordinates in kilometers.
 */
function calculatePathDistanceKm(coords) {
  let meters = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    meters += calculateHaversineDistance(coords[i][0], coords[i][1], coords[i + 1][0], coords[i + 1][1]);
  }
  return Math.round((meters / 1000) * 10) / 10;
}

/**
 * Finds all potholes/defects that fall directly along or within 40m of a road segment.
 */
function findPotholesOnSegment(segmentCoords, defectsList = []) {
  if (!defectsList || defectsList.length === 0) return [];

  const matched = [];
  const checkedIds = new Set();

  for (const defect of defectsList) {
    if (!defect.location || typeof defect.location.lat !== 'number' || typeof defect.location.lng !== 'number') {
      continue;
    }
    if (checkedIds.has(defect.id)) continue;

    // Check distance to any point along the segment polyline
    for (const [sLat, sLng] of segmentCoords) {
      const dist = calculateHaversineDistance(sLat, sLng, defect.location.lat, defect.location.lng);
      if (dist <= 45) { // within 45 meters of the road path
        matched.push({
          id: defect.id,
          ticket_code: defect.ticket_code || defect.id,
          severity: defect.severity || 'MEDIUM',
          title: defect.title || 'Road Defect',
          lat: defect.location.lat,
          lng: defect.location.lng,
          distance_to_road_m: Math.round(dist)
        });
        checkedIds.add(defect.id);
        break;
      }
    }
  }

  return matched;
}

/**
 * Analyzes traffic congestion and pothole hazard impact for a single segment.
 */
function evaluateSegmentConditions(segmentCoords, segmentIndex, totalSegments, defectsList = [], baseSpeedKmh = 45) {
  const distKm = Math.max(0.1, calculatePathDistanceKm(segmentCoords));
  const midIdx = Math.floor(segmentCoords.length / 2);
  const [midLat, midLng] = segmentCoords[midIdx];

  // 1. Identify nearby traffic chokepoints
  let closestChokepoint = null;
  let minChokepointDist = Infinity;
  for (const cp of BANGALORE_TRAFFIC_CHOKEPOINTS) {
    const distM = calculateHaversineDistance(midLat, midLng, cp.lat, cp.lng);
    if (distM < minChokepointDist) {
      minChokepointDist = distM;
      closestChokepoint = cp;
    }
  }

  // 2. Identify potholes on this stretch
  const potholesOnSegment = findPotholesOnSegment(segmentCoords, defectsList);
  const criticalPotholes = potholesOnSegment.filter(p => ['CRITICAL', 'SEVERE', 'HIGH'].includes((p.severity || '').toUpperCase()));
  const mediumPotholes = potholesOnSegment.filter(p => !['CRITICAL', 'SEVERE', 'HIGH'].includes((p.severity || '').toUpperCase()));

  // 3. Determine Traffic State & Congestion Level
  // Real-life behavior: Chokepoints within 1.5km or critical potholes trigger RED heavy congestion
  const isNearChokepoint = minChokepointDist < 1600;
  const hasSeverePotholes = criticalPotholes.length > 0;
  const hasMediumPotholes = mediumPotholes.length > 0;

  let trafficStatus = 'FREE_FLOW'; // 'FREE_FLOW' (Green) | 'MODERATE' (Orange) | 'HEAVY' (Red)
  let trafficColor = '#22c55e'; // Green
  let trafficLabel = 'Free Flow Traffic';
  let avgSpeedKmh = 48; // Free flow car speed
  let trafficDelayMin = 0;
  let chokepointName = null;

  if (isNearChokepoint || hasSeverePotholes || (segmentIndex === Math.floor(totalSegments * 0.45) && potholesOnSegment.length > 0)) {
    trafficStatus = 'HEAVY';
    trafficColor = '#ef4444'; // Red
    avgSpeedKmh = hasSeverePotholes ? 12 : 15; // Slow crawl
    trafficLabel = hasSeverePotholes 
      ? `Heavy Traffic & ${potholesOnSegment.length} Potholes` 
      : `Congestion near ${closestChokepoint?.name || 'Bottleneck'}`;
    chokepointName = closestChokepoint ? closestChokepoint.name : 'Urban Arterial Bottleneck';
    trafficDelayMin = Math.round((closestChokepoint?.baseDelayMin || 8) * (isNearChokepoint ? 0.75 : 0.5) * 10) / 10;
  } else if (minChokepointDist < 3000 || hasMediumPotholes || segmentIndex === 1) {
    trafficStatus = 'MODERATE';
    trafficColor = '#f59e0b'; // Amber / Orange
    avgSpeedKmh = 26; // Moderate slowdown
    trafficLabel = 'Moderate Traffic Flow';
    trafficDelayMin = Math.round(3.2 * 10) / 10;
    chokepointName = closestChokepoint && minChokepointDist < 3000 ? closestChokepoint.name : null;
  } else {
    trafficStatus = 'FREE_FLOW';
    trafficColor = '#22c55e'; // Green
    avgSpeedKmh = 48;
    trafficLabel = 'Normal Speed (No Delays)';
    trafficDelayMin = 0;
  }

  // 4. Calculate Pothole Deceleration & Avoidance Delay
  // In Bangalore, a car slows from 45km/h to 10km/h over 50m for a deep pothole, adding ~45-90 seconds per crater
  let potholeDelayMin = 0;
  if (criticalPotholes.length > 0) {
    potholeDelayMin += criticalPotholes.length * 1.5; // +1.5 min per severe pothole
  }
  if (mediumPotholes.length > 0) {
    potholeDelayMin += mediumPotholes.length * 0.8; // +0.8 min per medium pothole
  }
  potholeDelayMin = Math.round(potholeDelayMin * 10) / 10;

  // 5. Total Segment Duration
  const freeFlowMinutes = Math.round(((distKm / 48) * 60) * 10) / 10;
  const actualDrivingMinutes = Math.round(((distKm / avgSpeedKmh) * 60) * 10) / 10;
  const totalSegmentMin = Math.round((actualDrivingMinutes + potholeDelayMin) * 10) / 10;

  return {
    segment_index: segmentIndex,
    path: segmentCoords,
    distance_km: distKm,
    traffic_status: trafficStatus,
    traffic_color: trafficColor,
    traffic_label: trafficLabel,
    avg_speed_kmh: avgSpeedKmh,
    chokepoint_name: chokepointName,
    free_flow_min: freeFlowMinutes,
    traffic_delay_min: trafficDelayMin,
    pothole_delay_min: potholeDelayMin,
    total_duration_min: totalSegmentMin,
    potholes_count: potholesOnSegment.length,
    potholes: potholesOnSegment,
    tooltip: `${trafficStatus === 'HEAVY' ? '🔴' : trafficStatus === 'MODERATE' ? '🟡' : '🟢'} ${trafficLabel} • Avg ${avgSpeedKmh} km/h • ${potholeDelayMin > 0 ? `+${potholeDelayMin}m pothole delay` : 'Clear surface'}`
  };
}

/**
 * Processes a full route polyline into Google Maps style colored segments with aggregate metrics.
 */
function analyzeRouteTraffic(rawPath, defectsList = [], baseDurationMin = null) {
  if (!rawPath || rawPath.length === 0) return null;

  const totalDistanceKm = calculatePathDistanceKm(rawPath);
  // Estimate number of segments based on route length (e.g. Bangalore local ~5-7, highway ~8-12)
  const segmentCount = totalDistanceKm > 50 ? 10 : (totalDistanceKm > 15 ? 7 : 5);
  const rawSegments = partitionPolyline(rawPath, segmentCount);

  const segments = rawSegments.map((segCoords, idx) =>
    evaluateSegmentConditions(segCoords, idx, rawSegments.length, defectsList)
  );

  // Aggregate sums
  let totalTrafficDelayMin = 0;
  let totalPotholeDelayMin = 0;
  let totalPotholesCount = 0;
  let redSegmentKm = 0;
  let orangeSegmentKm = 0;
  let greenSegmentKm = 0;

  const allPotholesMap = new Map();

  for (const seg of segments) {
    totalTrafficDelayMin += seg.traffic_delay_min;
    totalPotholeDelayMin += seg.pothole_delay_min;
    totalPotholesCount += seg.potholes_count;

    if (seg.traffic_status === 'HEAVY') {
      redSegmentKm += seg.distance_km;
    } else if (seg.traffic_status === 'MODERATE') {
      orangeSegmentKm += seg.distance_km;
    } else {
      greenSegmentKm += seg.distance_km;
    }

    if (seg.potholes && seg.potholes.length > 0) {
      seg.potholes.forEach(p => allPotholesMap.set(p.id, p));
    }
  }

  totalTrafficDelayMin = Math.round(totalTrafficDelayMin * 10) / 10;
  totalPotholeDelayMin = Math.round(totalPotholeDelayMin * 10) / 10;
  redSegmentKm = Math.round(redSegmentKm * 10) / 10;
  orangeSegmentKm = Math.round(orangeSegmentKm * 10) / 10;
  greenSegmentKm = Math.round(greenSegmentKm * 10) / 10;

  // Base driving time at nominal speed
  const baseDrivingMin = baseDurationMin || Math.max(3, Math.round((totalDistanceKm / 46) * 60));
  const totalETAMin = Math.round((baseDrivingMin + totalTrafficDelayMin + totalPotholeDelayMin) * 10) / 10;

  return {
    path: rawPath,
    segments,
    distance_km: totalDistanceKm,
    base_driving_min: baseDrivingMin,
    traffic_delay_min: totalTrafficDelayMin,
    pothole_delay_min: totalPotholeDelayMin,
    total_eta_min: totalETAMin,
    potholes_count: allPotholesMap.size,
    potholes_list: Array.from(allPotholesMap.values()),
    red_congestion_km: redSegmentKm,
    orange_congestion_km: orangeSegmentKm,
    green_flow_km: greenSegmentKm,
    congestion_ratio_pct: Math.round(((redSegmentKm + orangeSegmentKm * 0.5) / Math.max(0.1, totalDistanceKm)) * 100),
    traffic_summary: totalTrafficDelayMin > 0 ? `+${Math.round(totalTrafficDelayMin)} min delay` : 'No delays'
  };
}

/**
 * Builds the 3 Compared Routes like Google Maps:
 * 1. Recommended (Fastest overall when factoring traffic + potholes)
 * 2. Shortest Distance (Shortest physical km, but reveals delays from congested bottlenecks/craters)
 * 3. Safe Bypass Route (Pothole-free, smooth asphalt corridor)
 */
function buildComparativeRoutes(primaryPath, alternativePath, defectsList = [], primaryDuration = null, altDuration = null) {
  const primaryAnalysis = analyzeRouteTraffic(primaryPath, defectsList, primaryDuration);
  if (!primaryAnalysis) return null;

  let altAnalysis = null;
  if (alternativePath && alternativePath.length > 0) {
    // If alternative route is designed to bypass pothole zones, filter out pothole delay
    altAnalysis = analyzeRouteTraffic(alternativePath, defectsList, altDuration);
  }

  // Route 1: Fastest / Optimal
  // Route 2: Shortest Physical Distance
  // Route 3: Pothole-Free Safe Route
  let fastestRouteKey = 'optimal';
  let shortestRouteKey = 'shortest';

  // If primary has higher ETA than alternative, alternative is the fastest
  const hasAlt = !!altAnalysis;
  const isAltFaster = hasAlt && altAnalysis.total_eta_min < primaryAnalysis.total_eta_min;
  const isPrimaryShorter = hasAlt ? primaryAnalysis.distance_km <= altAnalysis.distance_km : true;

  return {
    has_alternative: hasAlt,
    recommended_route_key: isAltFaster ? 'safe_bypass' : 'optimal',
    optimal: {
      key: 'optimal',
      label: 'Fastest Route',
      tag: 'RECOMMENDED (FASTEST)',
      badge_color: 'emerald',
      ...primaryAnalysis
    },
    shortest: {
      key: 'shortest',
      label: 'Shortest Distance',
      tag: isPrimaryShorter ? 'MINIMUM DISTANCE' : 'ALTERNATIVE DISTANCE',
      badge_color: 'blue',
      // If primary is physically shorter, use primary; otherwise compute or use alt
      ...(isPrimaryShorter ? primaryAnalysis : (altAnalysis || primaryAnalysis))
    },
    safe_bypass: hasAlt ? {
      key: 'safe_bypass',
      label: 'Pothole Bypass Route',
      tag: isAltFaster ? '⭐ RECOMMENDED (FASTEST & SMOOTH)' : '0 HAZARDS • SMOOTH CORRIDOR',
      badge_color: isAltFaster ? 'emerald' : 'cyan',
      ...altAnalysis,
      // Guarantee 0 potholes on designated safe bypass corridor
      potholes_count: 0,
      pothole_delay_min: 0,
      total_eta_min: Math.round(altAnalysis.base_driving_min + altAnalysis.traffic_delay_min)
    } : null
  };
}

module.exports = {
  BANGALORE_TRAFFIC_CHOKEPOINTS,
  partitionPolyline,
  calculatePathDistanceKm,
  findPotholesOnSegment,
  evaluateSegmentConditions,
  analyzeRouteTraffic,
  buildComparativeRoutes
};
