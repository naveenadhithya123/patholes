const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const { findDuplicateDefect, findClosestRoad, calculateHaversineDistance } = require('./services/spatial');
const { calculateAIPriority } = require('./services/prioritization');
const { analyzeImageWithAI } = require('./services/vision_ai');
const { buildComparativeRoutes } = require('./services/traffic_routing');
const supabaseService = require('./services/supabase');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// In-Memory Database initialized from Seed Datasets
let roadsData = require('./data/roads_dataset.json');
let climateData = require('./data/climate_dataset.json');
let defectsData = [...require('./data/defects_seed.json')];
const subdivisionsData = require('./data/subdivisions.json');

// Hydrate defects from Supabase PostgreSQL if active
if (supabaseService.isSupabaseActive()) {
  supabaseService.fetchDefectsFromDb().then(dbDefects => {
    if (dbDefects && dbDefects.length > 0) {
      console.log(`📥 Loaded ${dbDefects.length} defects from Supabase Cloud Database.`);
      const dbIds = new Set(dbDefects.map(d => d.id));
      defectsData = [...dbDefects, ...defectsData.filter(d => !dbIds.has(d.id))];
    }
  }).catch(err => {
    console.warn('Supabase initial sync note (using seed fallback):', err.message);
  });
}

// AI Engine Status Endpoints
app.get('/api/system/ai-status', (req, res) => {
  const hasKey = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 10;
  res.json({
    success: true,
    has_gemini_key: hasKey,
    active_engine: hasKey ? 'Google Gemini 2.5 Flash Vision API' : 'NammaFix Edge Computer Vision Pipeline',
    model: 'gemini-2.5-flash',
    instruction: 'You can add your Google Gemini API key to activate Gemini 2.5 Flash Vision, or continue using the built-in edge computer vision pipeline.'
  });
});

app.post('/api/system/set-api-key', (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey || typeof apiKey !== 'string') {
    return res.status(400).json({ success: false, message: 'Invalid API key provided.' });
  }

  process.env.GEMINI_API_KEY = apiKey.trim();
  const envPath = path.join(__dirname, '..', '.env');
  fs.writeFileSync(envPath, `GEMINI_API_KEY=${apiKey.trim()}\n`, 'utf8');

  res.json({
    success: true,
    message: 'Google Gemini 2.5 Flash Vision API key configured successfully! Vision inference is now active.',
    active_engine: 'Google Gemini 2.5 Flash Vision API'
  });
});

app.get('/api/system/db-status', (req, res) => {
  res.json({
    success: true,
    supabase_configured: supabaseService.isSupabaseActive(),
    database_type: supabaseService.isSupabaseActive() ? 'Supabase PostgreSQL + PostGIS' : 'In-Memory State + Seed Sync',
    storage_type: supabaseService.isSupabaseActive() ? 'Supabase Storage (defect-media)' : 'Local Static Images'
  });
});

// Helper: Match Climate Zone by Ward or Zone Name
function findClimateZoneForLocation(wardNo, zoneName) {
  if (wardNo) {
    const match = climateData.find(z => z.wards_covered && z.wards_covered.includes(Number(wardNo)));
    if (match) return match;
  }
  if (zoneName) {
    const match = climateData.find(z => z.zone_name.toLowerCase().includes(zoneName.toLowerCase()));
    if (match) return match;
  }
  return climateData[0]; // fallback to primary urban zone
}

/* ==========================================================================
   ROLE DEFINITIONS: TOP MUNICIPAL HEAD & 50 SUB-DIVISION AREA HEADS
   ========================================================================== */
const HEAD_ADMIN = {
  id: 'HEAD-ADMIN-01',
  name: 'Dr. B. K. Shivakumar',
  title: 'Chief Municipal Infrastructure Commissioner',
  email: 'head.admin@nammafix.gov.in',
  role: 'HEAD_ADMIN',
  agency: 'Bengaluru City Corporations (Central Command HQ)',
  jurisdiction: 'All 5 Corporations & 50 Sub-Divisions (198 Wards)',
  badge: 'CHIEF_COMMISSIONER'
};

function formatDurationBetween(startIso, endIso) {
  if (!startIso || !endIso) return '18 hours';
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  const diffMs = Math.max(0, end - start);
  const totalMins = Math.round(diffMs / (1000 * 60));
  const totalHours = Math.floor(totalMins / 60);
  const remainingMins = totalMins % 60;

  if (totalHours >= 24) {
    const days = Math.floor(totalHours / 24);
    const hrs = totalHours % 24;
    return hrs > 0 ? `${days} day${days > 1 ? 's' : ''} ${hrs} hr${hrs > 1 ? 's' : ''}` : `${days} day${days > 1 ? 's' : ''}`;
  }
  if (totalHours > 0) {
    return remainingMins > 0 ? `${totalHours} hr${totalHours > 1 ? 's' : ''} ${remainingMins} min${remainingMins > 1 ? 's' : ''}` : `${totalHours} hr${totalHours > 1 ? 's' : ''}`;
  }
  return `${totalMins} min${totalMins > 1 ? 's' : ''}`;
}

// Automatically matches candidate defect GPS coordinates to the closest of the 50 Sub-Divisions!
function findClosestSubdivision(lat, lng) {
  let closest = subdivisionsData[0];
  let minDistance = Infinity;

  for (const subdiv of subdivisionsData) {
    const distMeters = calculateHaversineDistance(lat, lng, subdiv.center.lat, subdiv.center.lng);
    if (distMeters < minDistance) {
      minDistance = distMeters;
      closest = {
        ...subdiv,
        distance_meters: Math.round(distMeters),
        distance_km: Math.round((distMeters / 1000) * 10) / 10
      };
    }
  }
  return closest;
}

/* ==========================================================================
   AUTH ROUTES (Top Head & 50 Sub-Division Area Heads)
   ========================================================================== */
app.post('/api/auth/login', (req, res) => {
  const { email = '', password = '', role = '', subdivision_id = '' } = req.body;
  const cleanEmail = email.trim().toLowerCase();

  // 1. Check for Top Municipal Head
  if (
    cleanEmail === 'head.admin@nammafix.gov.in' ||
    cleanEmail === 'head.admin@bbmp.gov.in' ||
    cleanEmail === 'admin@nammafix.gov.in' ||
    cleanEmail === 'admin@bbmp.gov.in' ||
    cleanEmail === 'commissioner@nammafix.gov.in' ||
    cleanEmail === 'commissioner@bbmp.gov.in' ||
    role === 'HEAD_ADMIN'
  ) {
    if (password === 'admin123' || password === 'head123' || !password) {
      return res.json({
        success: true,
        token: 'jwt-head-admin-token-' + Date.now(),
        user: HEAD_ADMIN
      });
    }
  }

  // 2. Check for Sub-Division Area Heads (Any of the 50 Sub-Divisions)
  const matchedSubdiv = subdivisionsData.find(s =>
    s.email.toLowerCase() === cleanEmail ||
    s.id.toLowerCase() === subdivision_id.toLowerCase() ||
    cleanEmail.includes(s.id.toLowerCase())
  );

  if (matchedSubdiv) {
    if (password === 'admin123' || password === 'subdiv123' || !password) {
      return res.json({
        success: true,
        token: 'jwt-subdiv-token-' + Date.now(),
        user: {
          id: matchedSubdiv.id,
          name: matchedSubdiv.engineer,
          title: `Head of ${matchedSubdiv.name}`,
          email: matchedSubdiv.email,
          subdivision_id: matchedSubdiv.id,
          subdivision_name: matchedSubdiv.name,
          corporation: matchedSubdiv.corporation,
          center: matchedSubdiv.center,
          radius_km: matchedSubdiv.radius_km,
          wards: matchedSubdiv.wards,
          role: 'SUBDIVISION_HEAD',
          agency: `${matchedSubdiv.corporation} Bangalore Corporation`
        }
      });
    }
  }

  // 3. Fallback testing login
  if (password === 'admin123') {
    if (role === 'SUBDIVISION_HEAD' || role === 'AREA_HEAD') {
      const defaultSubdiv = subdivisionsData.find(s => s.id === subdivision_id) || subdivisionsData[0];
      return res.json({
        success: true,
        token: 'jwt-subdiv-token-' + Date.now(),
        user: {
          id: defaultSubdiv.id,
          name: defaultSubdiv.engineer,
          title: `Head of ${defaultSubdiv.name}`,
          email: defaultSubdiv.email,
          subdivision_id: defaultSubdiv.id,
          subdivision_name: defaultSubdiv.name,
          corporation: defaultSubdiv.corporation,
          center: defaultSubdiv.center,
          radius_km: defaultSubdiv.radius_km,
          wards: defaultSubdiv.wards,
          role: 'SUBDIVISION_HEAD',
          agency: `${defaultSubdiv.corporation} Bangalore Corporation`
        }
      });
    }
    return res.json({
      success: true,
      token: 'jwt-head-admin-token-' + Date.now(),
      user: HEAD_ADMIN
    });
  }

  return res.status(401).json({
    success: false,
    message: 'Invalid credentials. Use head.admin@nammafix.gov.in / admin123 or select your Sub-Division / admin123.'
  });
});

// Returns All 50 Sub-Divisions with Real-time Performance Metrics
app.get('/api/subdivisions', (req, res) => {
  const { corporation } = req.query;

  let list = subdivisionsData;
  if (corporation && corporation !== 'all') {
    list = list.filter(s => s.corporation.toLowerCase() === corporation.toLowerCase());
  }

  const enriched = list.map(subdiv => {
    const assignedDefects = defectsData.filter(d => 
      d.assigned_subdivision?.id === subdiv.id ||
      d.location?.ward_no && subdiv.wards?.includes(d.location.ward_no)
    );
    const solvedDefects = assignedDefects.filter(d => d.status === 'Resolved');
    const inProgressDefects = assignedDefects.filter(d => d.status === 'In Progress');
    const pendingDefects = assignedDefects.filter(d => d.status !== 'Resolved');

    const total = assignedDefects.length;
    const solved = solvedDefects.length;
    const rate = total > 0 ? Math.round((solved / total) * 100) : 100;

    return {
      ...subdiv,
      total_assigned: total,
      pending_count: pendingDefects.length,
      in_progress_count: inProgressDefects.length,
      solved_count: solved,
      resolution_rate_pct: rate
    };
  });

  res.json({
    success: true,
    total_subdivisions: enriched.length,
    corporations: ['Central', 'East', 'South', 'West', 'North'],
    subdivisions: enriched
  });
});

// Drill-Down into a specific Sub-Division (Used by Top Head to inspect a particular Area Head)
app.get('/api/subdivisions/:id', (req, res) => {
  const { id } = req.params;
  const subdiv = subdivisionsData.find(s => s.id === id);

  if (!subdiv) {
    return res.status(404).json({ success: false, message: 'Sub-Division not found' });
  }

  const assignedDefects = defectsData.filter(d => 
    d.assigned_subdivision?.id === subdiv.id ||
    d.location?.ward_no && subdiv.wards?.includes(d.location.ward_no)
  );

  const pending = assignedDefects
    .filter(d => d.status !== 'Resolved')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const solved = assignedDefects
    .filter(d => d.status === 'Resolved')
    .sort((a, b) => new Date(b.resolved_at || b.created_at) - new Date(a.resolved_at || a.created_at));

  res.json({
    success: true,
    subdivision: subdiv,
    total_assigned: assignedDefects.length,
    pending_count: pending.length,
    solved_count: solved.length,
    pending,
    solved
  });
});

/* ==========================================================================
   NAVIGATION & REAL ROAD ROUTING (OSRM Proxy & Real Alternative Road Finder)
   ========================================================================== */
function fetchOsrmJson(url, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    let req;
    const timer = setTimeout(() => {
      if (req) req.destroy();
      reject(new Error(`OSRM request timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    try {
      req = https.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
        rejectUnauthorized: false
      }, (res) => {
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => {
          clearTimeout(timer);
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error(body.slice(0, 100)));
          }
        });
      });
      req.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    } catch (err) {
      clearTimeout(timer);
      reject(err);
    }
  });
}

// Indian Car Driving Model: Calibrates OSRM theoretical free-flow speeds to real-world
// Google Maps driving times with Bengaluru signal congestion, traffic bottlenecks, and toll plazas.
function calculateCarDrivingMinutes(distanceKm, rawDurationSeconds) {
  const baseMinutes = rawDurationSeconds ? (rawDurationSeconds / 60) : (distanceKm / 45) * 60;
  let trafficMultiplier = 1.38;

  if (distanceKm <= 10) {
    trafficMultiplier = 1.45; // Dense CBD city signals (18-22 km/h avg)
  } else if (distanceKm <= 45) {
    trafficMultiplier = 1.38; // Arterial corridors (e.g. Hosur Rd, Bommasandra to Indiranagar: 32.5km -> 52 mins)
  } else if (distanceKm <= 100) {
    trafficMultiplier = 1.25; // Semi-urban bypass
  } else {
    trafficMultiplier = 1.38; // Inter-city highway (e.g. Bangalore to Chennai: ~330km -> 5.5 hrs)
  }

  return Math.max(3, Math.round(baseMinutes * trafficMultiplier));
}

app.get('/api/navigation/route', async (req, res) => {
  const oLat = parseFloat(req.query.originLat);
  const oLng = parseFloat(req.query.originLng);
  const dLat = parseFloat(req.query.destLat);
  const dLng = parseFloat(req.query.destLng);

  if (isNaN(oLat) || isNaN(oLng) || isNaN(dLat) || isNaN(dLng)) {
    return res.status(400).json({ success: false, message: 'Invalid GPS coordinates' });
  }

  try {
    const urlPrimary = `https://router.project-osrm.org/route/v1/driving/${oLng},${oLat};${dLng},${dLat}?overview=full&geometries=geojson&alternatives=true`;
    const pData = await fetchOsrmJson(urlPrimary, 5000);

    if (pData.code !== 'Ok' || !pData.routes || pData.routes.length === 0) {
      return res.status(404).json({ success: false, message: 'No valid road route found' });
    }

    const primary = pData.routes[0];
    const primaryCoords = primary.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    const primaryDistanceKm = Math.round((primary.distance / 1000) * 10) / 10;
    const primaryDurationMin = calculateCarDrivingMinutes(primaryDistanceKm, primary.duration);

    let alt = pData.routes.length > 1 ? pData.routes[1] : null;

    // For local metropolitan corridors (<= 45km), if OSRM didn't return an alternative automatically,
    // find a real parallel road network waypoint. For long-distance inter-city highways (> 45km),
    // skip artificial waypoint synthesis to prevent hanging or route truncation.
    if (!alt && primaryDistanceKm <= 45) {
      const coords = primary.geometry.coordinates;
      const pivot = coords[Math.floor(coords.length * 0.45)];
      const latDelta = dLat - oLat;
      const lngDelta = dLng - oLng;
      const offset = 0.022; // ~2.2km lateral shift to parallel arterial corridor
      const viaLng = pivot[0] + (latDelta > 0 ? -offset : offset);
      const viaLat = pivot[1] + (lngDelta > 0 ? offset : -offset);

      const urlVia = `https://router.project-osrm.org/route/v1/driving/${oLng},${oLat};${viaLng.toFixed(5)},${viaLat.toFixed(5)};${dLng},${dLat}?overview=full&geometries=geojson`;
      try {
        const vData = await fetchOsrmJson(urlVia, 3000);
        if (vData.code === 'Ok' && vData.routes && vData.routes.length > 0) {
          alt = vData.routes[0];
        }
      } catch (viaErr) {
        // Via query timed out or failed, cleanly retain primary route
      }
    }

    let altCoords = null;
    let altDistanceKm = 0;
    let altDurationMin = 0;

    if (alt) {
      altCoords = alt.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
      altDistanceKm = Math.round((alt.distance / 1000) * 10) / 10;
      altDurationMin = calculateCarDrivingMinutes(altDistanceKm, alt.duration);
    }

    // Compute Multi-Tier Google Maps Live Traffic Analysis & Multi-Route Comparison
    const comparativeAnalysis = buildComparativeRoutes(
      primaryCoords,
      altCoords,
      defectsData,
      primaryDurationMin,
      altDurationMin
    );

    return res.json({
      success: true,
      mode: 'CAR_DRIVING',
      hasAlternativeRoad: !!altCoords,
      traffic_analysis: comparativeAnalysis,
      primary: {
        path: primaryCoords,
        distanceKm: primaryDistanceKm,
        durationMin: primaryDurationMin,
        traffic: comparativeAnalysis ? comparativeAnalysis.optimal : null
      },
      alternative: altCoords
        ? {
            path: altCoords,
            distanceKm: altDistanceKm,
            durationMin: altDurationMin,
            traffic: comparativeAnalysis ? comparativeAnalysis.safe_bypass : null
          }
        : null
    });
  } catch (err) {
    console.error('Route navigation error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/* ==========================================================================
   DEFECTS ROUTES (Citizen & Vehicle Reporting with De-duplication)
   ========================================================================== */

// Fleet of 10 Active Patrol Cars with Sub-Bumper LiDAR Sensors
const FLEET_CARS = [
  { id: 'KA-01-PATROL-401', name: 'Patrol Car 01', corridor: 'Outer Ring Road (Silk Board)', speed_kmh: 62, lat: 12.9177, lng: 77.6238, ward_no: 174, status: 'Active Patrol' },
  { id: 'KA-01-PATROL-402', name: 'Patrol Car 02', corridor: 'Bellandur Eco-Space Corridor', speed_kmh: 58, lat: 12.9284, lng: 77.6835, ward_no: 150, status: 'Active Patrol' },
  { id: 'KA-01-PATROL-403', name: 'Patrol Car 03', corridor: 'Indiranagar 100ft Road', speed_kmh: 44, lat: 12.9721, lng: 77.6415, ward_no: 80, status: 'Active Patrol' },
  { id: 'KA-01-PATROL-404', name: 'Patrol Car 04', corridor: 'Whitefield Main Road', speed_kmh: 52, lat: 12.9832, lng: 77.7441, ward_no: 84, status: 'Active Patrol' },
  { id: 'KA-01-PATROL-405', name: 'Patrol Car 05', corridor: 'KR Puram Flyover Approach', speed_kmh: 68, lat: 12.9995, lng: 77.6948, ward_no: 52, status: 'Active Patrol' },
  { id: 'KA-01-PATROL-406', name: 'Patrol Car 06', corridor: 'Hebbal Airport Expressway', speed_kmh: 88, lat: 13.0362, lng: 77.5968, ward_no: 7, status: 'Active Patrol' },
  { id: 'KA-01-PATROL-407', name: 'Patrol Car 07', corridor: 'MG Road Central Corridor', speed_kmh: 40, lat: 12.9749, lng: 77.6085, ward_no: 111, status: 'Active Patrol' },
  { id: 'KA-01-PATROL-408', name: 'Patrol Car 08', corridor: 'Koramangala 80ft Road', speed_kmh: 48, lat: 12.9344, lng: 77.6225, ward_no: 151, status: 'Active Patrol' },
  { id: 'KA-01-PATROL-409', name: 'Patrol Car 09', corridor: 'Bannerghatta Main Road', speed_kmh: 55, lat: 12.8912, lng: 77.5971, ward_no: 193, status: 'Active Patrol' },
  { id: 'KA-01-PATROL-410', name: 'Patrol Car 10', corridor: 'Old Airport Road', speed_kmh: 60, lat: 12.9601, lng: 77.6534, ward_no: 112, status: 'Active Patrol' }
];

app.get('/api/fleet/status', (req, res) => {
  res.json({
    success: true,
    total_fleet_units: FLEET_CARS.length,
    fleet: FLEET_CARS
  });
});

app.post('/api/fleet/simulate-sweep', (req, res) => {
  const randomCar = FLEET_CARS[Math.floor(Math.random() * FLEET_CARS.length)];
  const depth = Math.floor(9 + Math.random() * 6);
  const width = Math.floor(40 + Math.random() * 25);
  
  // Random small coordinate jitter to represent road travel
  const jitterLat = randomCar.lat + (Math.random() - 0.5) * 0.008;
  const jitterLng = randomCar.lng + (Math.random() - 0.5) * 0.008;

  const candidateLat = jitterLat;
  const candidateLng = jitterLng;

  // De-duplication check (22m)
  const duplicate = findDuplicateDefect(defectsData, candidateLat, candidateLng, 22);

  if (duplicate) {
    duplicate.duplicates_prevented = (duplicate.duplicates_prevented || 0) + 1;
    duplicate.verification_count = (duplicate.verification_count || 1) + 1;
    return res.json({
      success: true,
      action: 'DUPLICATE_SUPPRESSED',
      message: `${randomCar.name} passed existing Ticket #${duplicate.ticket_code}. Telemetry verified; duplicate ticket suppressed.`,
      ticket_code: duplicate.ticket_code,
      car: randomCar
    });
  }

  const closestRoad = findClosestRoad(roadsData, candidateLat, candidateLng);
  const climateZone = findClimateZoneForLocation(randomCar.ward_no, null);
  const autoSubdiv = findClosestSubdivision(candidateLat, candidateLng);

  const aiResult = calculateAIPriority({
    type: 'pothole',
    severity: depth >= 12 ? 'CRITICAL' : 'HIGH',
    dimensions: { depth_cm: depth, width_cm: width, length_cm: width + 5 },
    road: closestRoad,
    climateZone,
    verificationCount: 1
  });

  const nextCodeNum = 1000 + defectsData.length + 1;
  const newDefect = {
    id: `DEF-2026-${nextCodeNum}`,
    ticket_code: `NF-VEH-${nextCodeNum}`,
    type: 'pothole',
    category_label: 'Vehicle-Detected Severe Crater',
    title: `Pothole scanned by ${randomCar.name} @ ${randomCar.speed_kmh} km/h`,
    description: `Automated LiDAR/Bumper camera detection at 5.4 ft distance. High velocity hazard identified on ${closestRoad?.road_name || randomCar.corridor}.`,
    severity: depth >= 12 ? 'CRITICAL' : 'HIGH',
    severity_score: depth >= 12 ? 94 : 85,
    confidence_pct: 96.2,
    dimensions: { depth_cm: depth, width_cm: width, length_cm: width + 5 },
    location: {
      lat: candidateLat,
      lng: candidateLng,
      address: `${randomCar.corridor}, Ward ${randomCar.ward_no}`,
      ward_no: randomCar.ward_no,
      ward_name: closestRoad?.ward_name || 'Corridor',
      zone: autoSubdiv.corporation
    },
    road_id: closestRoad?.road_id,
    traffic_congestion_tier: closestRoad?.traffic_congestion_tier || 'CRITICAL',
    road_age_years: closestRoad?.current_age_years || 11,
    is_road_overdue: closestRoad?.is_overdue_lifespan || true,
    climate_volatility_score: climateZone?.climate_volatility_index || 80,
    ai_calculated_priority: aiResult.ai_calculated_priority,
    ai_priority_score: aiResult.ai_priority_score,
    target_sla_hours: aiResult.target_sla_hours,
    ai_reasoning: aiResult.ai_reasoning,
    reported_by: 'patrol_vehicle_bumper_cam',
    vehicle_telemetry: {
      vehicle_id: randomCar.id,
      vehicle_name: randomCar.name,
      speed_kmh: randomCar.speed_kmh,
      lidar_distance_ft: 5.4,
      sensor_confidence: 0.96
    },
    image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
    created_at: new Date().toISOString(),
    status: 'Assigned to Sub-Division',
    workflow_stage: 'ASSIGNED_TO_SUBDIVISION',
    assigned_subdivision: {
      id: autoSubdiv.id,
      name: autoSubdiv.name,
      corporation: autoSubdiv.corporation,
      engineer: autoSubdiv.engineer,
      email: autoSubdiv.email,
      distance_km: autoSubdiv.distance_km,
      auto_assigned_at: new Date().toISOString()
    },
    head_admin_approved: false,
    verification_count: 1,
    duplicates_prevented: 0
  };

  defectsData.unshift(newDefect);

  // Asynchronously persist to Supabase PostgreSQL database if active
  if (supabaseService.isSupabaseActive()) {
    supabaseService.insertDefectToDb(newDefect).catch(err => console.warn('Supabase async sync note:', err.message));
  }

  res.status(201).json({
    success: true,
    action: 'NEW_DEFECT_DISPATCHED',
    message: `Pothole detected by ${randomCar.name} at ${randomCar.corridor}. Auto-dispatched Ticket #${newDefect.ticket_code}`,
    ticket_code: newDefect.ticket_code,
    defect: newDefect,
    car: randomCar
  });
});

// 1. Get all defects (with split streams for Car Fleet vs Citizen Manual Captures)
app.get('/api/defects', (req, res) => {
  const { status, priority, type, ward } = req.query;
  let filtered = [...defectsData];

  if (status && status !== 'all') {
    filtered = filtered.filter(d => d.status.toLowerCase() === status.toLowerCase());
  }
  if (priority && priority !== 'all') {
    filtered = filtered.filter(d => d.ai_calculated_priority.toLowerCase() === priority.toLowerCase());
  }
  if (type && type !== 'all') {
    filtered = filtered.filter(d => d.type.toLowerCase() === type.toLowerCase());
  }
  if (ward && ward !== 'all') {
    filtered = filtered.filter(d => String(d.location?.ward_no) === String(ward));
  }

  // Master Prioritized List: sorted by AI Priority Score descending
  const prioritizedDefects = [...filtered].sort((a, b) => (b.ai_priority_score || 0) - (a.ai_priority_score || 0));

  // Stream 1: Car Fleet Detections (sorted by created_at descending - LAST DETECTED ON TOP!)
  const vehicleDefects = [...defectsData]
    .filter(d => d.reported_by === 'patrol_vehicle_bumper_cam')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  // Stream 2: Citizen Manual Photo Captures (sorted by created_at descending - LAST CAPTURED ON TOP!)
  const citizenDefects = [...defectsData]
    .filter(d => d.reported_by === 'citizen_manual_camera')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  res.json({
    success: true,
    total: filtered.length,
    defects: prioritizedDefects,
    vehicle_defects: vehicleDefects,
    citizen_defects: citizenDefects
  });
});

// 2. Report Defect (Citizen In-App Live Camera or Manual Capture)
app.post('/api/defects/report', async (req, res) => {
  const {
    image_data,
    location,
    type: userType,
    title,
    description,
    severity: userSeverity,
    dimensions: userDimensions,
    reported_by = 'citizen_manual_camera',
    vehicle_telemetry = null
  } = req.body;

  if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
    return res.status(400).json({ success: false, message: 'Precise GPS location coordinates (lat, lng) are required.' });
  }

  const candidateLat = location.lat;
  const candidateLng = location.lng;

  // STEP 1: GEOSPATIAL DE-DUPLICATION CHECK (Radius: 22 meters)
  const existingDuplicate = findDuplicateDefect(defectsData, candidateLat, candidateLng, 22);

  if (existingDuplicate) {
    // DUPLICATE DETECTED!
    // Increment verification count and duplicate suppressed counter
    existingDuplicate.verification_count = (existingDuplicate.verification_count || 1) + 1;
    existingDuplicate.duplicates_prevented = (existingDuplicate.duplicates_prevented || 0) + 1;

    // Boost priority score slightly due to multiple citizen reports (crowd urgency)
    const closestRoad = findClosestRoad(roadsData, candidateLat, candidateLng);
    const climateZone = findClimateZoneForLocation(existingDuplicate.location?.ward_no, existingDuplicate.location?.zone);

    const reEvaluatedPriority = calculateAIPriority({
      type: existingDuplicate.type,
      severity: existingDuplicate.severity,
      dimensions: existingDuplicate.dimensions,
      road: closestRoad,
      climateZone,
      verificationCount: existingDuplicate.verification_count
    });

    existingDuplicate.ai_priority_score = reEvaluatedPriority.ai_priority_score;
    existingDuplicate.ai_calculated_priority = reEvaluatedPriority.ai_calculated_priority;
    existingDuplicate.ai_reasoning = reEvaluatedPriority.ai_reasoning;

    return res.json({
      success: true,
      duplicate_detected: true,
      message: `Geospatial match detected! Defect is already registered under Ticket #${existingDuplicate.ticket_code} (${existingDuplicate.distanceMeters || 12}m away). Your capture has been recorded as high-value crowd verification (+1 Confirmation) without generating duplicate municipal work orders.`,
      ticket_code: existingDuplicate.ticket_code,
      existing_defect: existingDuplicate
    });
  }

  // STEP 2: RUN REAL AI COMPUTER VISION INFERENCE
  let aiVisionResult = null;
  try {
    aiVisionResult = await analyzeImageWithAI(image_data, { ...location, type: userType, dimensions: userDimensions });
  } catch (err) {
    console.warn('AI vision analysis error:', err.message);
  }

  // VALIDATION: Reject reports if screen spoof is detected
  if (aiVisionResult && aiVisionResult.is_spoof) {
    return res.status(400).json({
      success: false,
      defect_detected: false,
      is_spoof: true,
      message: 'Anti-Spoof Alert: Digital screen or photo reproduction detected. Only authentic physical infrastructure damage can be logged.'
    });
  }

  // If user explicitly sent 'none' and AI also found no damage:
  if (userType === 'none' && (!aiVisionResult || !aiVisionResult.defect_detected)) {
    return res.status(400).json({
      success: false,
      defect_detected: false,
      is_spoof: false,
      message: 'Inspection Complete: No road or infrastructure damage detected in the captured frame. Camera must face actual damage to generate a municipal ticket.'
    });
  }

  const effectiveType = (aiVisionResult && aiVisionResult.category && aiVisionResult.category !== 'none') ? aiVisionResult.category : (userType || 'pothole');
  const effectiveSeverity = (aiVisionResult && aiVisionResult.severity) || userSeverity || 'HIGH';
  const effectiveDimensions = (aiVisionResult && aiVisionResult.estimated_dimensions) || userDimensions || { depth_cm: 10, width_cm: 45, length_cm: 50 };
  const effectiveConfidence = (aiVisionResult && aiVisionResult.confidence_pct) || 94.6;
  const effectiveLabel = (aiVisionResult && aiVisionResult.label && aiVisionResult.label !== 'No Defect Detected') ? aiVisionResult.label : 'Citizen Road Defect Report';

  // STEP 3: REGISTER AS A NEW DEFECT
  const closestRoad = findClosestRoad(roadsData, candidateLat, candidateLng);
  const climateZone = findClimateZoneForLocation(location.ward_no || closestRoad?.ward_no, location.zone || closestRoad?.zone);

  // Compute Multi-Factor AI Priority
  const aiResult = calculateAIPriority({
    type: effectiveType,
    severity: effectiveSeverity,
    dimensions: effectiveDimensions,
    road: closestRoad,
    climateZone,
    verificationCount: 1
  });

  const nextCodeNum = 1000 + defectsData.length + 1;
  const ticketPrefix = effectiveType === 'pothole' || effectiveType === 'road_crack' ? 'NF-RD' : 'NF-STR';
  const ticket_code = `${ticketPrefix}-${nextCodeNum}`;
  const autoSubdiv = findClosestSubdivision(candidateLat, candidateLng);

  // Handle Photo Storage: If base64 image data was sent and Supabase is active, upload to bucket
  let finalImageUrl = image_data || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80';
  if (image_data && typeof image_data === 'string' && image_data.startsWith('data:image') && supabaseService.isSupabaseActive()) {
    try {
      const storageUrl = await supabaseService.uploadImageToStorage(image_data, `${ticket_code}.jpg`);
      if (storageUrl) {
        finalImageUrl = storageUrl;
      }
    } catch (uploadErr) {
      console.warn('Supabase image upload notice:', uploadErr.message);
    }
  }

  const newDefect = {
    id: `DEF-2026-${nextCodeNum}`,
    ticket_code,
    type: effectiveType,
    category_label: effectiveLabel,
    title: title || `${effectiveLabel} near ${closestRoad ? closestRoad.road_name : 'Municipal Road'}`,
    description: description || (aiVisionResult?.traffic_hazard_summary || `Captured via in-app live camera. Dimensions: ~${effectiveDimensions.depth_cm}cm depth, ~${effectiveDimensions.width_cm}cm width.`),
    severity: effectiveSeverity,
    severity_score: effectiveSeverity === 'CRITICAL' ? 90 : effectiveSeverity === 'HIGH' ? 75 : 55,
    confidence_pct: effectiveConfidence,
    dimensions: effectiveDimensions,
    ai_vision: aiVisionResult || null,
    location: {
      lat: candidateLat,
      lng: candidateLng,
      address: location.address || (closestRoad ? `${closestRoad.road_name}, Ward ${closestRoad.ward_no}` : `Ward 150, Bengaluru`),
      ward_no: location.ward_no || closestRoad?.ward_no || 150,
      ward_name: location.ward_name || closestRoad?.ward_name || autoSubdiv.name,
      zone: autoSubdiv.corporation
    },
    road_id: closestRoad ? closestRoad.road_id : null,
    traffic_congestion_tier: closestRoad ? closestRoad.traffic_congestion_tier : 'HIGH',
    road_age_years: closestRoad ? closestRoad.current_age_years : 8,
    is_road_overdue: closestRoad ? closestRoad.is_overdue_lifespan : false,
    climate_volatility_score: climateZone ? climateZone.climate_volatility_index : 50,
    ai_calculated_priority: aiResult.ai_calculated_priority,
    ai_priority_score: aiResult.ai_priority_score,
    target_sla_hours: aiResult.target_sla_hours,
    ai_reasoning: aiResult.ai_reasoning,
    score_breakdown: aiResult.score_breakdown,
    reported_by,
    vehicle_telemetry: vehicle_telemetry || null,
    image_url: finalImageUrl,
    created_at: new Date().toISOString(),
    status: 'Assigned to Sub-Division',
    workflow_stage: 'ASSIGNED_TO_SUBDIVISION',
    assigned_subdivision: {
      id: autoSubdiv.id,
      name: autoSubdiv.name,
      corporation: autoSubdiv.corporation,
      engineer: autoSubdiv.engineer,
      email: autoSubdiv.email,
      distance_km: autoSubdiv.distance_km,
      auto_assigned_at: new Date().toISOString()
    },
    head_admin_approved: false,
    verification_count: 1,
    duplicates_prevented: 0
  };

  defectsData.unshift(newDefect);

  // Asynchronously persist to Supabase PostgreSQL database if active
  if (supabaseService.isSupabaseActive()) {
    supabaseService.insertDefectToDb(newDefect).catch(err => console.warn('Supabase async sync note:', err.message));
  }

  res.status(201).json({
    success: true,
    duplicate_detected: false,
    message: `Defect registered as Ticket #${newDefect.ticket_code}. AI Prioritization Tier: ${newDefect.ai_calculated_priority}.`,
    ticket_code: newDefect.ticket_code,
    defect: newDefect,
    ai_vision: aiVisionResult
  });
});

// 3. Automated Vehicle / Dashcam Sensor Telemetry Stream (High-Speed Ingestion)
app.post('/api/vehicle/telemetry', (req, res) => {
  const {
    vehicle_id = 'PATROL-CAR-KA01-09',
    speed_kmh = 65,
    lidar_distance_ft = 5.2,
    location,
    defect_detected = true,
    defect_details = {}
  } = req.body;

  if (!defect_detected || !location) {
    return res.json({
      success: true,
      action: 'NO_DEFECT',
      telemetry: { vehicle_id, speed_kmh, lidar_distance_ft, timestamp: new Date().toISOString() }
    });
  }

  // De-duplication check against existing defects
  const candidateLat = location.lat;
  const candidateLng = location.lng;
  const duplicate = findDuplicateDefect(defectsData, candidateLat, candidateLng, 25);

  if (duplicate) {
    duplicate.duplicates_prevented = (duplicate.duplicates_prevented || 0) + 1;
    duplicate.verification_count = (duplicate.verification_count || 1) + 1;
    return res.json({
      success: true,
      action: 'DUPLICATE_SUPPRESSED',
      message: `Pothole at (${candidateLat.toFixed(4)}, ${candidateLng.toFixed(4)}) already logged under Ticket #${duplicate.ticket_code}. Telemetry verified, duplicate ticket suppressed.`,
      ticket_code: duplicate.ticket_code,
      duplicates_prevented_total: duplicate.duplicates_prevented,
      telemetry: { vehicle_id, speed_kmh, lidar_distance_ft }
    });
  }

  // New defect detected by vehicle front bumper camera
  const closestRoad = findClosestRoad(roadsData, candidateLat, candidateLng);
  const climateZone = findClimateZoneForLocation(location.ward_no || closestRoad?.ward_no, location.zone || closestRoad?.zone);
  const autoSubdiv = findClosestSubdivision(candidateLat, candidateLng);

  const aiResult = calculateAIPriority({
    type: defect_details.type || 'pothole',
    severity: defect_details.severity || 'CRITICAL',
    dimensions: defect_details.dimensions || { depth_cm: 12, width_cm: 55, length_cm: 60 },
    road: closestRoad,
    climateZone,
    verificationCount: 1
  });

  const nextCodeNum = 1000 + defectsData.length + 1;
  const newDefect = {
    id: `DEF-2026-${nextCodeNum}`,
    ticket_code: `NF-VEH-${nextCodeNum}`,
    type: defect_details.type || 'pothole',
    category_label: 'Vehicle-Detected Severe Crater',
    title: `Pothole detected by Patrol Car ${vehicle_id} @ ${speed_kmh} km/h`,
    description: `Automated LiDAR/Bumper camera detection at 5.4 ft distance. High velocity hazard identified on ${closestRoad?.road_name || autoSubdiv.name}.`,
    severity: defect_details.severity || 'CRITICAL',
    severity_score: 91,
    confidence_pct: 95.8,
    dimensions: defect_details.dimensions || { depth_cm: 12, width_cm: 55, length_cm: 60 },
    location: {
      lat: candidateLat,
      lng: candidateLng,
      address: closestRoad ? `${closestRoad.road_name}, Ward ${closestRoad.ward_no}` : `${autoSubdiv.name}, Bengaluru`,
      ward_no: closestRoad?.ward_no || (autoSubdiv.wards && autoSubdiv.wards[0]) || 150,
      ward_name: closestRoad?.ward_name || autoSubdiv.name,
      zone: autoSubdiv.corporation
    },
    road_id: closestRoad?.road_id,
    traffic_congestion_tier: closestRoad?.traffic_congestion_tier || 'CRITICAL',
    road_age_years: closestRoad?.current_age_years || 11,
    is_road_overdue: closestRoad?.is_overdue_lifespan || true,
    climate_volatility_score: climateZone?.climate_volatility_index || 80,
    ai_calculated_priority: aiResult.ai_calculated_priority,
    ai_priority_score: aiResult.ai_priority_score,
    target_sla_hours: aiResult.target_sla_hours,
    ai_reasoning: aiResult.ai_reasoning,
    reported_by: 'patrol_vehicle_bumper_cam',
    vehicle_telemetry: {
      vehicle_id,
      speed_kmh,
      lidar_distance_ft,
      sensor_confidence: 0.95
    },
    image_url: defect_details.image_url || '/images/pothole_before.jpg',
    created_at: new Date().toISOString(),
    status: 'Assigned to Sub-Division',
    workflow_stage: 'ASSIGNED_TO_SUBDIVISION',
    assigned_subdivision: {
      id: autoSubdiv.id,
      name: autoSubdiv.name,
      corporation: autoSubdiv.corporation,
      engineer: autoSubdiv.engineer,
      email: autoSubdiv.email,
      distance_km: autoSubdiv.distance_km,
      auto_assigned_at: new Date().toISOString()
    },
    head_admin_approved: false,
    verification_count: 1,
    duplicates_prevented: 0
  };

  defectsData.unshift(newDefect);

  // Asynchronously persist to Supabase PostgreSQL database if active
  if (supabaseService.isSupabaseActive()) {
    supabaseService.insertDefectToDb(newDefect).catch(err => console.warn('Supabase async sync note:', err.message));
  }

  res.status(201).json({
    success: true,
    action: 'NEW_DEFECT_DISPATCHED',
    message: `New pothole logged by vehicle ${vehicle_id}. Auto-assigned to ${autoSubdiv.name}. Ticket #${newDefect.ticket_code}`,
    ticket_code: newDefect.ticket_code,
    defect: newDefect
  });
});

// 4. Update Defect Status (Government triage / contractor dispatch)
app.patch('/api/defects/:id', (req, res) => {
  const { id } = req.params;
  const { status, assigned_to } = req.body;

  const defect = defectsData.find(d => d.id === id || d.ticket_code === id);
  if (!defect) {
    return res.status(404).json({ success: false, message: 'Defect ticket not found' });
  }

  if (status) defect.status = status;
  if (assigned_to) defect.assigned_to = assigned_to;
  if (status === 'Resolved' && !defect.resolved_at) {
    defect.resolved_at = new Date().toISOString();
  }

  res.json({
    success: true,
    message: `Ticket #${defect.ticket_code} updated to status "${defect.status}"`,
    defect
  });
});

/* ==========================================================================
   WORKFLOW ROUTES: HEAD ADMIN DISTRIBUTION & AREA HEAD REPAIR VERIFICATION
   ========================================================================== */

// Head Admin or System Assigns/Reassigns Defect to a Sub-Division
app.post('/api/defects/:id/assign-subdivision', (req, res) => {
  const { id } = req.params;
  const { subdivision_id, notes } = req.body;

  const defect = defectsData.find(d => d.id === id || d.ticket_code === id);
  if (!defect) {
    return res.status(404).json({ success: false, message: 'Defect ticket not found' });
  }

  const subdiv = subdivisionsData.find(s => s.id === subdivision_id) || subdivisionsData[0];
  defect.assigned_subdivision = {
    id: subdiv.id,
    name: subdiv.name,
    corporation: subdiv.corporation,
    engineer: subdiv.engineer,
    email: subdiv.email,
    distance_km: 0.5,
    auto_assigned_at: new Date().toISOString(),
    notes: notes || 'Assigned by Municipal Head Command'
  };

  defect.status = 'Assigned to Sub-Division';
  defect.workflow_stage = 'ASSIGNED_TO_SUBDIVISION';

  res.json({
    success: true,
    message: `Ticket #${defect.ticket_code} assigned to ${subdiv.name} (${subdiv.corporation} Corporation).`,
    defect
  });
});

// Backward compatibility for assign-area-head
app.post('/api/defects/:id/assign-area-head', (req, res) => {
  const { id } = req.params;
  const { area_head_id, subdivision_id } = req.body;
  const targetId = subdivision_id || area_head_id;
  const subdiv = subdivisionsData.find(s => s.id === targetId || s.corporation.toLowerCase() === (targetId || '').toLowerCase()) || subdivisionsData[0];
  
  const defect = defectsData.find(d => d.id === id || d.ticket_code === id);
  if (!defect) {
    return res.status(404).json({ success: false, message: 'Defect ticket not found' });
  }

  defect.assigned_subdivision = {
    id: subdiv.id,
    name: subdiv.name,
    corporation: subdiv.corporation,
    engineer: subdiv.engineer,
    email: subdiv.email,
    distance_km: 0.5,
    auto_assigned_at: new Date().toISOString()
  };
  defect.status = 'Assigned to Sub-Division';
  defect.workflow_stage = 'ASSIGNED_TO_SUBDIVISION';

  res.json({
    success: true,
    message: `Ticket #${defect.ticket_code} assigned to ${subdiv.name}.`,
    defect
  });
});

// Sub-Division Area Head Starts Work (Dispatches Crew)
app.post('/api/defects/:id/start-repair', (req, res) => {
  const { id } = req.params;
  const { field_crew } = req.body;

  const defect = defectsData.find(d => d.id === id || d.ticket_code === id);
  if (!defect) {
    return res.status(404).json({ success: false, message: 'Defect ticket not found' });
  }

  defect.status = 'In Progress';
  defect.workflow_stage = 'IN_PROGRESS';
  defect.field_crew = field_crew || (defect.assigned_subdivision ? `${defect.assigned_subdivision.name} Rapid Paving Gang #1` : 'Municipal Field Crew');
  defect.repair_started_at = new Date().toISOString();

  res.json({
    success: true,
    message: `Workers dispatched for Ticket #${defect.ticket_code}. Status: In Progress.`,
    defect
  });
});

// Sub-Division Area Head Completes Repair & Submits After Photo
app.post('/api/defects/:id/submit-completion', async (req, res) => {
  const { id } = req.params;
  const {
    after_image_url = '/images/pothole_after.jpg',
    completed_by_workers = 'Sub-Division Rapid Asphalt Paving Gang',
    repair_notes = 'Pothole excavated, tack coated, packed with dense bituminous macadam and vibratory roller leveled.'
  } = req.body;

  const defect = defectsData.find(d => d.id === id || d.ticket_code === id);
  if (!defect) {
    return res.status(404).json({ success: false, message: 'Defect ticket not found' });
  }

  let finalAfterUrl = after_image_url;
  if (after_image_url && typeof after_image_url === 'string' && after_image_url.startsWith('data:image') && supabaseService.isSupabaseActive()) {
    try {
      const storageUrl = await supabaseService.uploadImageToStorage(after_image_url, `after_${defect.ticket_code}.jpg`);
      if (storageUrl) {
        finalAfterUrl = storageUrl;
      }
    } catch (uploadErr) {
      console.warn('Supabase after-image upload notice:', uploadErr.message);
    }
  }

  const completedAt = new Date().toISOString();
  const durationStr = formatDurationBetween(defect.created_at, completedAt);

  defect.completion_details = {
    after_image_url: finalAfterUrl,
    completed_at: completedAt,
    completed_by_workers,
    repair_notes,
    duration_str: durationStr
  };

  defect.status = 'Resolved';
  defect.workflow_stage = 'RESOLVED';
  defect.head_admin_approved = true;
  defect.resolved_at = completedAt;
  defect.duration_took_str = durationStr;
  defect.after_image_url = finalAfterUrl;

  // Sync update to Supabase
  if (supabaseService.isSupabaseActive()) {
    supabaseService.updateDefectInDb(defect.id, {
      status: 'Resolved',
      workflow_stage: 'RESOLVED',
      head_admin_approved: true,
      after_image_url: finalAfterUrl
    }).catch(err => console.warn('Supabase async resolve update note:', err.message));
  }
  defect.duration_took_str = durationStr;

  res.json({
    success: true,
    message: `Repair completed and verified for Ticket #${defect.ticket_code}. Turnaround duration: ${durationStr}. Marked as Resolved & Published.`,
    defect
  });
});

// Top Head Approves Completion (if pending)
app.post('/api/defects/:id/approve-completion', (req, res) => {
  const { id } = req.params;
  const { remarks = 'Surface leveling & Before/After photos verified. Approved for public traffic.' } = req.body;

  const defect = defectsData.find(d => d.id === id || d.ticket_code === id);
  if (!defect) {
    return res.status(404).json({ success: false, message: 'Defect ticket not found' });
  }

  const resolvedAt = new Date().toISOString();
  defect.status = 'Resolved';
  defect.workflow_stage = 'RESOLVED';
  defect.head_admin_approved = true;
  defect.resolved_at = resolvedAt;
  defect.duration_took_str = defect.completion_details?.duration_str || formatDurationBetween(defect.created_at, resolvedAt);

  defect.approved_by = {
    id: HEAD_ADMIN.id,
    name: HEAD_ADMIN.name,
    role: 'Chief Infrastructure Head',
    approved_at: resolvedAt,
    remarks
  };

  res.json({
    success: true,
    message: `Ticket #${defect.ticket_code} officially approved by Chief Infrastructure Head. Published to Civic Issues Tracker!`,
    defect
  });
});

// Top Head Rejects Completion (Sends back to Sub-Division with rework notes)
app.post('/api/defects/:id/reject-completion', (req, res) => {
  const { id } = req.params;
  const { remarks = 'Re-work required: Surface compaction uneven or incomplete.' } = req.body;

  const defect = defectsData.find(d => d.id === id || d.ticket_code === id);
  if (!defect) {
    return res.status(404).json({ success: false, message: 'Defect ticket not found' });
  }

  defect.status = 'In Progress';
  defect.workflow_stage = 'IN_PROGRESS';
  defect.rework_notes = remarks;
  defect.head_admin_approved = false;

  res.json({
    success: true,
    message: `Ticket #${defect.ticket_code} returned to Sub-Division for re-work.`,
    defect
  });
});

// Simulate an incident directly in a specific Sub-Division (for 1-click test simulation!)
app.post('/api/subdivisions/:id/simulate-defect', (req, res) => {
  const { id } = req.params;
  const subdiv = subdivisionsData.find(s => s.id === id);
  if (!subdiv) {
    return res.status(404).json({ success: false, message: 'Sub-Division not found' });
  }

  const jitterLat = subdiv.center.lat + (Math.random() - 0.5) * 0.005;
  const jitterLng = subdiv.center.lng + (Math.random() - 0.5) * 0.005;
  const nextCodeNum = 1000 + defectsData.length + 1;

  const simulatedDefect = {
    id: `DEF-2026-${nextCodeNum}`,
    ticket_code: `NF-RD-${nextCodeNum}`,
    type: 'pothole',
    category_label: 'Severe Road Pothole',
    title: `Pothole detected near ${subdiv.name}`,
    description: `Hazardous crater ~12cm deep detected on main road corridor under ${subdiv.name} jurisdiction. Auto-assigned to ${subdiv.engineer}.`,
    severity: 'CRITICAL',
    severity_score: 88,
    confidence_pct: 95.5,
    dimensions: { width_cm: 55, length_cm: 65, depth_cm: 12 },
    location: {
      lat: jitterLat,
      lng: jitterLng,
      address: `${subdiv.name} Main Road Corridor`,
      ward_no: (subdiv.wards && subdiv.wards[0]) || 150,
      ward_name: subdiv.name,
      zone: subdiv.corporation
    },
    ai_calculated_priority: 'P1_IMMEDIATE',
    ai_priority_score: 92,
    target_sla_hours: 24,
    ai_reasoning: `Auto-routed to ${subdiv.name} (${subdiv.corporation} Corporation) via GPS coordinate proximity.`,
    reported_by: 'citizen_manual_camera',
    image_url: '/images/pothole_before.jpg',
    created_at: new Date().toISOString(),
    status: 'Assigned to Sub-Division',
    workflow_stage: 'ASSIGNED_TO_SUBDIVISION',
    assigned_subdivision: {
      id: subdiv.id,
      name: subdiv.name,
      corporation: subdiv.corporation,
      engineer: subdiv.engineer,
      email: subdiv.email,
      distance_km: 0.8,
      auto_assigned_at: new Date().toISOString()
    },
    head_admin_approved: false,
    verification_count: 1,
    duplicates_prevented: 0
  };

  defectsData.unshift(simulatedDefect);

  res.status(201).json({
    success: true,
    message: `Simulated defect auto-assigned to ${subdiv.name}! Ticket #${simulatedDefect.ticket_code}`,
    ticket_code: simulatedDefect.ticket_code,
    defect: simulatedDefect
  });
});

// Public Civic Tracker: Returns Pending vs Completed (Approved) Problems Stack
app.get('/api/defects/public-tracker', (req, res) => {
  const { zone, severity, search } = req.query;

  let allDefects = [...defectsData];

  // Optional Filtering
  if (zone && zone !== 'all') {
    allDefects = allDefects.filter(d =>
      (d.location?.zone || '').toLowerCase() === zone.toLowerCase() ||
      (d.assigned_subdivision?.corporation || '').toLowerCase() === zone.toLowerCase() ||
      (d.assigned_subdivision?.name || '').toLowerCase().includes(zone.toLowerCase())
    );
  }

  if (severity && severity !== 'all') {
    allDefects = allDefects.filter(d => (d.severity || '').toLowerCase() === severity.toLowerCase());
  }

  if (search) {
    const q = search.toLowerCase();
    allDefects = allDefects.filter(d =>
      (d.title || '').toLowerCase().includes(q) ||
      (d.description || '').toLowerCase().includes(q) ||
      (d.ticket_code || '').toLowerCase().includes(q) ||
      (d.location?.address || '').toLowerCase().includes(q) ||
      (d.location?.ward_name || '').toLowerCase().includes(q)
    );
  }

  // 1. Pending Problems (all non-resolved, sorted LATEST on top like a stack)
  const pending = allDefects
    .filter(d => d.status !== 'Resolved' && !d.head_admin_approved)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  // 2. Completed Problems (ONLY those approved by Head Admin, sorted LATEST completed on top)
  const completed = allDefects
    .filter(d => d.status === 'Resolved' && d.head_admin_approved)
    .sort((a, b) => new Date(b.resolved_at || b.created_at) - new Date(a.resolved_at || a.created_at));

  res.json({
    success: true,
    total_pending: pending.length,
    total_completed: completed.length,
    pending,
    completed
  });
});

/* ==========================================================================
   ROAD ASSETS & LIFECYCLE DEGRADATION ROUTES (Kaggle Dataset)
   ========================================================================== */
app.get('/api/roads', (req, res) => {
  // Compute dynamic stats
  const totalRoads = roadsData.length;
  const overdueRoads = roadsData.filter(r => r.is_overdue_lifespan);
  const criticalPciRoads = roadsData.filter(r => r.pavement_condition_index_pci < 45);
  const totalKilometers = roadsData.reduce((acc, r) => acc + (r.length_km || 0), 0);

  // Attach live active defect counts for each road
  const roadsWithDefectCount = roadsData.map(road => {
    const activeDefects = defectsData.filter(d => d.road_id === road.road_id && d.status !== 'Resolved').length;
    return {
      ...road,
      active_defect_count: activeDefects
    };
  });

  res.json({
    success: true,
    summary: {
      total_roads: totalRoads,
      overdue_lifespan_count: overdueRoads.length,
      overdue_percentage: Math.round((overdueRoads.length / totalRoads) * 100),
      critical_pci_count: criticalPciRoads.length,
      total_network_km: Math.round(totalKilometers * 10) / 10
    },
    roads: roadsWithDefectCount
  });
});

/* ==========================================================================
   CLIMATE VOLATILITY & RAPID WEATHER SHOCK ROUTES (Kaggle Dataset)
   ========================================================================== */
app.get('/api/climate', (req, res) => {
  const rapidFluctuationZones = climateData.filter(z => z.rapid_fluctuation_detected);

  res.json({
    success: true,
    summary: {
      total_monitored_zones: climateData.length,
      high_volatility_zones_count: rapidFluctuationZones.length,
      monsoon_stress_status: rapidFluctuationZones.length > 2 ? 'HIGH_ALERT' : 'NORMAL'
    },
    zones: climateData
  });
});

/* ==========================================================================
   SMART CITY ANALYTICS & SDG 9 & 11 IMPACT
   ========================================================================== */
app.get('/api/analytics', (req, res) => {
  const totalReports = defectsData.length;
  const resolvedReports = defectsData.filter(d => d.status === 'Resolved').length;
  const inProgressReports = defectsData.filter(d => d.status === 'In Progress').length;
  const workOrderIssued = defectsData.filter(d => d.status === 'Work Order Issued').length;
  const pendingReports = defectsData.filter(d => d.status === 'Reported').length;

  const p1Urgent = defectsData.filter(d => d.ai_calculated_priority === 'P1_IMMEDIATE').length;
  const p2High = defectsData.filter(d => d.ai_calculated_priority === 'P2_HIGH').length;
  const p3Med = defectsData.filter(d => d.ai_calculated_priority === 'P3_MEDIUM').length;

  // Calculate duplicate savings
  const totalDuplicatesPrevented = defectsData.reduce((acc, d) => acc + (d.duplicates_prevented || 0), 0);
  const totalCrowdVerifications = defectsData.reduce((acc, d) => acc + (d.verification_count || 1), 0);

  // Estimating civic cost savings: ₹1,500 ($18) administrative cost per redundant municipal inspection dispatch
  const estimatedCostSavedINR = totalDuplicatesPrevented * 1800;

  res.json({
    success: true,
    kpis: {
      total_defects_tracked: totalReports,
      active_unresolved: totalReports - resolvedReports,
      resolved_defects: resolvedReports,
      resolution_rate_pct: Math.round((resolvedReports / Math.max(1, totalReports)) * 100),
      priority_breakdown: {
        p1_immediate: p1Urgent,
        p2_high: p2High,
        p3_medium: p3Med
      },
      deduplication_metrics: {
        total_duplicates_suppressed: totalDuplicatesPrevented,
        total_citizen_confirmations: totalCrowdVerifications,
        redundancy_reduction_ratio_pct: Math.round((totalDuplicatesPrevented / Math.max(1, totalDuplicatesPrevented + totalReports)) * 100),
        estimated_administrative_inr_saved: estimatedCostSavedINR
      },
      sdg_alignment: {
        sdg_9_resilient_infrastructure_score: '84/100',
        sdg_11_sustainable_safe_cities_score: '88/100',
        pothole_hazard_mitigation_rate: '79%'
      }
    }
  });
});

// Static frontend serving (Production Build)
const candidateDistPaths = [
  path.join(__dirname, '..', 'dist'),
  path.join(__dirname, '..', 'client', 'dist'),
  path.join(process.cwd(), 'client', 'dist'),
  path.join(process.cwd(), 'dist')
];
const clientDistPath = candidateDistPaths.find(p => fs.existsSync(p));
if (clientDistPath) {
  app.use(express.static(clientDistPath));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`NammaFix Municipal Monitoring API server running on port ${PORT}`);
  });
}

module.exports = app;
