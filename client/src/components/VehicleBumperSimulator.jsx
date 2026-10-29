import React, { useState } from 'react';
import { Car, Radio, ShieldCheck, CheckCircle2, Terminal, MapPin, Send, Zap, AlertTriangle, Layers, Database } from 'lucide-react';

const HARDWARE_SENSOR_SCENARIOS = [
  {
    id: 'scen_silkboard',
    label: 'Scenario A: Patrol Car passing Silk Board (Duplicate Pothole Test)',
    vehicle_id: 'KA-01-PATROL-102',
    lat: 12.9177,
    lng: 77.6238,
    road_name: 'Outer Ring Road (Silk Board Flyover Ramp)',
    ward_no: 174,
    lidar_distance_ft: 5.3,
    depth_cm: 14,
    width_cm: 60,
    expected_action: 'DUPLICATE_SUPPRESSED',
    description: 'Car drives over existing P1 Pothole #BBMP-RD-1001. Demonstrates automated duplicate suppression.'
  },
  {
    id: 'scen_bellandur_new',
    label: 'Scenario B: Patrol Car scanning Bellandur Bypass (NEW Pothole Detected)',
    vehicle_id: 'KA-01-PATROL-102',
    lat: 12.9348,
    lng: 77.6912,
    road_name: 'Outer Ring Road (Bellandur Lake Bypass)',
    ward_no: 150,
    lidar_distance_ft: 5.4,
    depth_cm: 12,
    width_cm: 55,
    expected_action: 'NEW_DEFECT_DISPATCHED',
    description: 'Car identifies a new 12cm crater. Automatically uploads to Government Portal with live GPS.'
  },
  {
    id: 'scen_hebbal_new',
    label: 'Scenario C: Patrol Car scanning Hebbal Airport Corridor (Bridge Crack)',
    vehicle_id: 'KA-01-PATROL-304',
    lat: 13.0450,
    lng: 77.5980,
    road_name: 'Hebbal Flyover Approach & Bellary Road',
    ward_no: 7,
    lidar_distance_ft: 5.5,
    depth_cm: 8,
    width_cm: 25,
    expected_action: 'NEW_DEFECT_DISPATCHED',
    description: 'Car identifies an expansion joint gap. Auto-uploaded to Government Portal triage queue.'
  }
];

export default function VehicleBumperSimulator({ onTelemetryEvent }) {
  // Form Inputs
  const [vehicleId, setVehicleId] = useState('KA-01-PATROL-102');
  const [latitude, setLatitude] = useState(12.9177);
  const [longitude, setLongitude] = useState(77.6238);
  const [roadLocation, setRoadLocation] = useState('Outer Ring Road (Silk Board Junction)');
  const [wardNo, setWardNo] = useState(174);
  const [lidarDistanceFt, setLidarDistanceFt] = useState(5.4);
  const [detectedDepthCm, setDetectedDepthCm] = useState(12);
  const [detectedWidthCm, setDetectedWidthCm] = useState(55);

  const [isTransmitting, setIsTransmitting] = useState(false);
  const [latestResponse, setLatestResponse] = useState(null);
  const [telemetryLogs, setTelemetryLogs] = useState([]);

  // Load a scenario into the form
  const loadScenario = (scenario) => {
    setVehicleId(scenario.vehicle_id);
    setLatitude(scenario.lat);
    setLongitude(scenario.lng);
    setRoadLocation(scenario.road_name);
    setWardNo(scenario.ward_no);
    setLidarDistanceFt(scenario.lidar_distance_ft);
    setDetectedDepthCm(scenario.depth_cm);
    setDetectedWidthCm(scenario.width_cm);
  };

  // Transmit hardware telemetry payload to government backend
  const handleTransmitTelemetry = async (e) => {
    if (e) e.preventDefault();
    setIsTransmitting(true);
    setLatestResponse(null);

    const payload = {
      vehicle_id: vehicleId,
      speed_kmh: 65, // Standard arterial patrol cruise speed
      lidar_distance_ft: Number(lidarDistanceFt),
      location: {
        lat: Number(latitude),
        lng: Number(longitude),
        address: `${roadLocation}, Ward ${wardNo}`,
        ward_no: Number(wardNo)
      },
      defect_detected: true,
      defect_details: {
        type: 'pothole',
        severity: detectedDepthCm >= 10 ? 'CRITICAL' : 'HIGH',
        dimensions: {
          depth_cm: Number(detectedDepthCm),
          width_cm: Number(detectedWidthCm),
          length_cm: Number(detectedWidthCm) + 5
        }
      }
    };

    try {
      const response = await fetch('/api/vehicle/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      setIsTransmitting(false);

      if (data.success) {
        setLatestResponse(data);
        const logEntry = {
          time: new Date().toLocaleTimeString(),
          action: data.action,
          ticket: data.ticket_code,
          message: data.message,
          coords: `${Number(latitude).toFixed(4)}, ${Number(longitude).toFixed(4)}`,
          vehicle: vehicleId
        };
        setTelemetryLogs(prev => [logEntry, ...prev.slice(0, 15)]);

        if (onTelemetryEvent) onTelemetryEvent(data);
      }
    } catch (err) {
      setIsTransmitting(false);
      console.error('Sensor transmission failed:', err);
      alert('Error communicating with municipal server.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Banner Explaining the Hardware Form for Hackathon Evaluators */}
      <div className="bg-gradient-to-r from-cyan-950/80 via-slate-900 to-blue-950/70 p-5 rounded-2xl border border-cyan-500/30 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-400/30 text-cyan-400">
              <Car className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  Vehicle LiDAR Sensor • Hardware Telemetry Ingestion Form
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                  Hardware Emulation Form
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Sub-Number Plate Sensor (5-6 ft)
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-3xl">
                <strong>Why this form?</strong> In actual deployment, a front-bumper camera & LiDAR sensor is physically mounted below the vehicle's front number plate (1.2 ft off the ground) scanning 5–6 ft ahead. Since live vehicle hardware cannot be brought onto the hackathon stage, this form acts as the hardware telemetry emulator to demonstrate sensor ingestion and automatic duplicate prevention.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 bg-slate-950/90 px-4 py-2.5 rounded-xl border border-slate-800 text-xs">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-mono">Bumper LiDAR Mount</div>
              <div className="text-white font-mono font-semibold">1.2 ft Height • 5.4 ft Range</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Hardware Input Form */}
        <div className="lg:col-span-7 space-y-6">

          {/* Quick 1-Click Scenario Buttons */}
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-3">
            <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span>1-Click Hardware Test Scenarios for Judges:</span>
            </h2>

            <div className="space-y-2">
              {HARDWARE_SENSOR_SCENARIOS.map((scen) => (
                <button
                  key={scen.id}
                  type="button"
                  onClick={() => loadScenario(scen)}
                  className="w-full text-left p-3 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-800/60 hover:border-cyan-500/40 text-xs transition space-y-1"
                >
                  <div className="flex items-center justify-between font-bold text-slate-200">
                    <span>{scen.label}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                      scen.expected_action === 'DUPLICATE_SUPPRESSED'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {scen.expected_action === 'DUPLICATE_SUPPRESSED' ? 'Suppresses Duplicate' : 'Uploads to Gov'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans">{scen.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Hardware Sensor Telemetry Form */}
          <form onSubmit={handleTransmitTelemetry} className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center space-x-2 border-b border-slate-800 pb-3">
              <Radio className="w-4 h-4 text-cyan-400" />
              <span>Patrol Car Sensor Array Output Fields</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              
              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Patrol Vehicle Identifier</label>
                <input
                  type="text"
                  required
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Forward LiDAR Scan Distance (Feet)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={lidarDistanceFt}
                  onChange={(e) => setLidarDistanceFt(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Sensor Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  required
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Sensor Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  required
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Corridor / Road Name</label>
                <input
                  type="text"
                  required
                  value={roadLocation}
                  onChange={(e) => setRoadLocation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Municipal Ward Number</label>
                <input
                  type="number"
                  required
                  value={wardNo}
                  onChange={(e) => setWardNo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Measured Crater Depth (cm)</label>
                <input
                  type="number"
                  required
                  value={detectedDepthCm}
                  onChange={(e) => setDetectedDepthCm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Measured Crater Width (cm)</label>
                <input
                  type="number"
                  required
                  value={detectedWidthCm}
                  onChange={(e) => setDetectedWidthCm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

            </div>

            <button
              type="submit"
              disabled={isTransmitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/30 flex items-center justify-center space-x-2 transition disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isTransmitting ? 'Transmitting Sensor Packet...' : 'Transmit Hardware Sensor Data to Government'}</span>
            </button>
          </form>

        </div>

        {/* Right Column: Ingestion Status & Telemetry Logs */}
        <div className="lg:col-span-5 space-y-6">

          {/* Response Alert */}
          {latestResponse && (
            <div className={`p-5 rounded-2xl border shadow-xl space-y-2 ${
              latestResponse.action === 'DUPLICATE_SUPPRESSED'
                ? 'bg-amber-950/40 border-amber-500/40 text-amber-100'
                : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-100'
            }`}>
              <div className="flex items-center space-x-2.5">
                {latestResponse.action === 'DUPLICATE_SUPPRESSED' ? (
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                )}
                <div className="text-xs font-bold uppercase font-mono">
                  {latestResponse.action === 'DUPLICATE_SUPPRESSED'
                    ? 'DUPLICATE SUPPRESSED BY GEOSPATIAL FILTER'
                    : 'NEW DEFECT UPLOADED TO GOVERNMENT PORTAL'}
                </div>
              </div>
              <p className="text-xs opacity-90 leading-relaxed">
                {latestResponse.message}
              </p>
              {latestResponse.action === 'NEW_DEFECT_DISPATCHED' && (
                <div className="text-[11px] font-mono text-cyan-300 pt-1">
                  ✓ Ticket #{latestResponse.ticket_code} is now visible in the Government Portal GIS Map & Queue!
                </div>
              )}
            </div>
          )}

          {/* Telemetry Stream Console Log */}
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-3 font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-200">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span>Live Municipal Ingestion Log</span>
              </div>
              <span className="text-[10px] text-slate-500">{telemetryLogs.length} events logged</span>
            </div>

            <div className="h-64 overflow-y-auto space-y-2 text-[11px] pr-1">
              {telemetryLogs.length === 0 ? (
                <div className="text-slate-600 italic text-center py-10">
                  Transmit hardware telemetry or click one of the 1-click test scenarios above...
                </div>
              ) : (
                telemetryLogs.map((log, i) => (
                  <div
                    key={i}
                    className={`p-2.5 rounded-lg border text-[10px] space-y-1 ${
                      log.action === 'DUPLICATE_SUPPRESSED'
                        ? 'bg-amber-950/20 border-amber-500/20 text-amber-200'
                        : 'bg-emerald-950/20 border-emerald-500/20 text-emerald-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-slate-400">
                      <span>[{log.time}] Unit: {log.vehicle}</span>
                      <span className="font-bold">
                        {log.action === 'DUPLICATE_SUPPRESSED' ? 'DUPLICATE_SUPPRESSED' : 'NEW_DISPATCH'}
                      </span>
                    </div>
                    <div className="font-semibold text-white">Ticket: #{log.ticket}</div>
                    <div className="text-slate-400 truncate">{log.message}</div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
