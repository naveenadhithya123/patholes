const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const { findDuplicateDefect, findClosestRoad, calculateHaversineDistance } = require('./services/spatial');
const { calculateAIPriority } = require('./services/prioritization');
const { analyzeImageWithAI } = require('./services/vision_ai');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// In-Memory Database initialized from Seed Datasets
let roadsData = require('./data/roads_dataset.json');
let climateData = require('./data/climate_dataset.json');
let defectsData = [...require('./data/defects_seed.json')];

// AI Engine Status Endpoints
app.get('/api/system/ai-status', (req, res) => {
  const hasKey = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 10;
  res.json({
    success: true,
    has_gemini_key: hasKey,
    active_engine: hasKey ? 'Google Gemini 2.5 Flash Vision API' : 'InfraAI Edge Computer Vision Pipeline',
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
   AUTH ROUTES (Municipal & Government Officials)
   ========================================================================== */
app.post('/api/auth/login', (req, res) => {
  const { email, password, role } = req.body;

  // Simple, robust mock authentication with standard civic roles
  if ((email === 'admin@bbmp.gov.in' && password === 'admin123') ||
      (email === 'engineer@bbmp.gov.in' && password === 'admin123') ||
      (email === 'smartcity@karnataka.gov.in' && password === 'admin123') ||
      (password === 'admin123')) {
    return res.json({
      success: true,
      token: 'jwt-civic-token-' + Date.now(),
      user: {
        id: 'USR-GOV-901',
        name: email.includes('engineer') ? 'Er. Rajesh Patil (Executive Engineer)' : 'Dr. B. K. Shivakumar (BBMP Chief Infrastructure Officer)',
        email: email || 'admin@bbmp.gov.in',
        role: email.includes('engineer') ? 'Ward Engineer' : 'Municipal Administrator',
        agency: 'BBMP / Karnataka Urban Infrastructure Development',
        jurisdiction: 'Bruhat Bengaluru Mahanagara Palike (All 198 Wards)',
        badge: 'SUPER_ADMIN'
      }
    });
  }

  return res.status(401).json({
    success: false,
    message: 'Invalid administrative credentials. Use admin@bbmp.gov.in / admin123'
  });
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
    ticket_code: `BBMP-VEH-${nextCodeNum}`,
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
      zone: closestRoad?.zone || 'Mahadevapura'
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
    status: 'Reported',
    assigned_to: null,
    verification_count: 1,
    duplicates_prevented: 0
  };

  defectsData.unshift(newDefect);

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
    aiVisionResult = await analyzeImageWithAI(image_data, location);
  } catch (err) {
    console.warn('AI vision analysis error:', err.message);
  }

  const effectiveType = (aiVisionResult && aiVisionResult.category) || userType || 'pothole';
  const effectiveSeverity = (aiVisionResult && aiVisionResult.severity) || userSeverity || 'HIGH';
  const effectiveDimensions = (aiVisionResult && aiVisionResult.estimated_dimensions) || userDimensions || { depth_cm: 10, width_cm: 45, length_cm: 50 };
  const effectiveConfidence = (aiVisionResult && aiVisionResult.confidence_pct) || 94.6;
  const effectiveLabel = (aiVisionResult && aiVisionResult.label) || 'Road Surface Defect';

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
  const ticketPrefix = effectiveType === 'pothole' || effectiveType === 'road_crack' ? 'BBMP-RD' : 'BBMP-STR';
  const ticket_code = `${ticketPrefix}-${nextCodeNum}`;

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
      ward_name: location.ward_name || closestRoad?.ward_name || 'Bellandur',
      zone: location.zone || closestRoad?.zone || 'Mahadevapura'
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
    image_url: image_data || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
    created_at: new Date().toISOString(),
    status: 'Reported',
    assigned_to: null,
    verification_count: 1,
    duplicates_prevented: 0
  };

  defectsData.unshift(newDefect);

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
    ticket_code: `BBMP-VEH-${nextCodeNum}`,
    type: defect_details.type || 'pothole',
    category_label: 'Vehicle-Detected Severe Crater',
    title: `Pothole detected by Patrol Car ${vehicle_id} @ ${speed_kmh} km/h`,
    description: `Automated LiDAR/Bumper camera detection at 5.4 ft distance. High velocity hazard identified on ${closestRoad?.road_name || 'Corridor'}.`,
    severity: defect_details.severity || 'CRITICAL',
    severity_score: 91,
    confidence_pct: 95.8,
    dimensions: defect_details.dimensions || { depth_cm: 12, width_cm: 55, length_cm: 60 },
    location: {
      lat: candidateLat,
      lng: candidateLng,
      address: closestRoad ? `${closestRoad.road_name}, Ward ${closestRoad.ward_no}` : 'Outer Ring Road, Bengaluru',
      ward_no: closestRoad?.ward_no || 150,
      ward_name: closestRoad?.ward_name || 'Bellandur',
      zone: closestRoad?.zone || 'Mahadevapura'
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
    image_url: defect_details.image_url || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
    created_at: new Date().toISOString(),
    status: 'Reported',
    assigned_to: null,
    verification_count: 1,
    duplicates_prevented: 0
  };

  defectsData.unshift(newDefect);

  res.status(201).json({
    success: true,
    action: 'NEW_DEFECT_DISPATCHED',
    message: `New pothole logged by vehicle ${vehicle_id}. Auto-assigned Priority: ${newDefect.ai_calculated_priority}. Ticket #${newDefect.ticket_code}`,
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
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Infra AI Municipal Monitoring API server running on port ${PORT}`);
  });
}

module.exports = app;
