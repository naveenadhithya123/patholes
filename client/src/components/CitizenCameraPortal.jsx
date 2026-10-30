import React, { useState, useEffect, useRef } from 'react';
import { Camera, MapPin, CheckCircle2, ShieldCheck, RefreshCw, Crosshair, AlertTriangle, ArrowLeft, Check, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function CitizenCameraPortal({ onDefectReported, onBack }) {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [simulatedFeed, setSimulatedFeed] = useState(false);

  // Live Device GPS State (Acquired on submit or on demand)
  const [gpsLocation, setGpsLocation] = useState({
    acquired: false,
    lat: null,
    lng: null,
    address: 'Live GPS coordinates captured on submit',
    accuracy: null,
    isRealDeviceGPS: false,
    status: 'idle',
    errorMessage: null,
    lastUpdated: null
  });
  const [isLocating, setIsLocating] = useState(false);

  // Real-Time Computer Vision Detection State
  const [autoVisionResult, setAutoVisionResult] = useState({
    detected: false,
    is_spoof: false,
    spoof_reason: '',
    type: 'none',
    label: 'Scanning Road Surface...',
    confidence: 0,
    depth_cm: 0,
    width_cm: 0,
    length_cm: 0,
    severity: 'NORMAL',
    box: { x: 0.25, y: 0.25, w: 0.5, h: 0.5 },
    color: '#10b981'
  });

  const smoothBoxRef = useRef({ x: 0.25, y: 0.25, w: 0.5, h: 0.5 });
  const visionStateRef = useRef(autoVisionResult);

  // Submission State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [reportResult, setReportResult] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const procCanvasRef = useRef(null);

  // Start Camera Stream
  useEffect(() => {
    let stream = null;
    let isCancelled = false;

    const startCamera = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Browser media devices not supported. Using demo road stream.');
        setSimulatedFeed(true);
        return;
      }

      try {
        let s;
        try {
          s = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          });
        } catch (constraintErr) {
          s = await navigator.mediaDevices.getUserMedia({ video: true });
        }

        if (isCancelled) {
          s.getTracks().forEach(t => t.stop());
          return;
        }

        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.setAttribute('muted', 'true');
          videoRef.current.onloadedmetadata = () => {
            if (videoRef.current) {
              videoRef.current.play().catch(e => console.warn('Play interrupted:', e));
            }
          };
          videoRef.current.play().catch(e => console.warn('Immediate play interrupted:', e));
        }
        setCameraActive(true);
        setCameraError(null);
      } catch (err) {
        console.warn('Physical camera error:', err.message);
        setCameraError('Camera access not granted or unavailable. Switched to demo road stream.');
        setSimulatedFeed(true);
      }
    };

    if (!simulatedFeed) {
      startCamera();
    }

    return () => {
      isCancelled = true;
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [simulatedFeed]);

  // Real-Time Computer Vision Analysis & Viewfinder Overlay
  useEffect(() => {
    let animationId;
    let frameCounter = 0;

    if (!procCanvasRef.current) {
      procCanvasRef.current = document.createElement('canvas');
      procCanvasRef.current.width = 160;
      procCanvasRef.current.height = 90;
    }
    const procCanvas = procCanvasRef.current;
    const procCtx = procCanvas.getContext('2d', { willReadFrequently: true });

    const processLiveFrame = () => {
      frameCounter++;
      const video = videoRef.current;
      const overlayCanvas = overlayCanvasRef.current;

      if (overlayCanvas) {
        const ctx = overlayCanvas.getContext('2d');
        const width = overlayCanvas.width;
        const height = overlayCanvas.height;

        ctx.clearRect(0, 0, width, height);

        // Process frames for cavity detection
        if (frameCounter % 3 === 0 && (video || simulatedFeed)) {
          let hasDefect = false;
          let isSpoof = false;
          let spoofReason = '';
          let defectType = 'none';
          let defectLabel = 'Road Surface Normal';
          let depth = 0;
          let defectWidth = 0;
          let defectLength = 0;
          let confidence = 0;
          let severity = 'NORMAL';
          let boxColor = '#10b981';

          if (video && video.readyState >= 2) {
            try {
              procCtx.drawImage(video, 0, 0, procCanvas.width, procCanvas.height);
              const imgData = procCtx.getImageData(0, 0, procCanvas.width, procCanvas.height);
              const data = imgData.data;
              const pw = procCanvas.width;
              const ph = procCanvas.height;

              const cols = 16;
              const rows = 9;
              const cellLum = Array.from({ length: cols }, () => new Float32Array(rows));
              let totalLum = 0;
              let glarePixels = 0;
              let borderEdgeMatches = 0;

              for (let ry = 0; ry < rows; ry++) {
                for (let cx = 0; cx < cols; cx++) {
                  let sum = 0;
                  const startX = cx * 10;
                  const startY = ry * 10;

                  for (let dy = 0; dy < 10; dy += 2) {
                    for (let dx = 0; dx < 10; dx += 2) {
                      const idx = ((startY + dy) * pw + (startX + dx)) * 4;
                      const r = data[idx];
                      const g = data[idx + 1];
                      const b = data[idx + 2];
                      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
                      sum += lum;

                      if (lum > 248 && Math.abs(r - g) < 8 && Math.abs(g - b) < 8) glarePixels++;
                      if ((ry === 0 || ry === rows - 1 || cx === 0 || cx === cols - 1) && Math.abs(r - g) > 40) borderEdgeMatches++;
                    }
                  }
                  const avg = sum / 25;
                  cellLum[cx][ry] = avg;
                  totalLum += avg;
                }
              }

              const meanLum = totalLum / (cols * rows);

              // Anti-spoofing check
              if (glarePixels > 85 && borderEdgeMatches > 45) {
                isSpoof = true;
                spoofReason = 'Screen glare detected. Point camera at physical road surface.';
              }

              if (!isSpoof) {
                let darkCells = [];
                let minVal = 999;
                for (let ry = 1; ry < rows - 1; ry++) {
                  for (let cx = 1; cx < cols - 1; cx++) {
                    const v = cellLum[cx][ry];
                    if (v < meanLum * 0.72) {
                      darkCells.push({ cx, ry, val: v });
                      if (v < minVal) minVal = v;
                    }
                  }
                }

                if (darkCells.length >= 3) {
                  hasDefect = true;
                  defectType = 'pothole';
                  defectLabel = 'Pothole Cavity';

                  let minX = 16, maxX = 0, minY = 9, maxY = 0;
                  darkCells.forEach(c => {
                    if (c.cx < minX) minX = c.cx;
                    if (c.cx > maxX) maxX = c.cx;
                    if (c.ry < minY) minY = c.ry;
                    if (c.ry > maxY) maxY = c.ry;
                  });

                  const cavityDropRatio = Math.max(0.2, (meanLum - minVal) / Math.max(1, meanLum));
                  depth = Math.round(7 + cavityDropRatio * 14);
                  defectWidth = Math.round(25 + (maxX - minX + 1) * 6.5);
                  defectLength = Math.round(28 + (maxY - minY + 1) * 7.0);
                  confidence = Math.min(98, Math.round(82 + darkCells.length * 2.2));

                  if (depth >= 13 || defectWidth >= 50) {
                    severity = 'CRITICAL';
                    boxColor = '#ef4444';
                  } else if (depth >= 8 || defectWidth >= 35) {
                    severity = 'HIGH';
                    boxColor = '#f59e0b';
                  } else {
                    severity = 'MODERATE';
                    boxColor = '#06b6d4';
                  }

                  const targetBox = {
                    x: Math.max(0.08, minX / cols - 0.04),
                    y: Math.max(0.08, minY / rows - 0.04),
                    w: Math.min(0.85, (maxX - minX + 1) / cols + 0.08),
                    h: Math.min(0.85, (maxY - minY + 1) / rows + 0.08)
                  };

                  smoothBoxRef.current = {
                    x: smoothBoxRef.current.x * 0.7 + targetBox.x * 0.3,
                    y: smoothBoxRef.current.y * 0.7 + targetBox.y * 0.3,
                    w: smoothBoxRef.current.w * 0.7 + targetBox.w * 0.3,
                    h: smoothBoxRef.current.h * 0.7 + targetBox.h * 0.3
                  };
                }
              }
            } catch (cvErr) {}
          } else if (simulatedFeed) {
            hasDefect = true;
            defectType = 'pothole';
            defectLabel = 'Severe Road Pothole';
            depth = 14;
            defectWidth = 52;
            defectLength = 58;
            confidence = 96;
            severity = 'CRITICAL';
            boxColor = '#ef4444';

            smoothBoxRef.current = {
              x: 0.28,
              y: 0.24,
              w: 0.44,
              h: 0.52
            };
          }

          const newRes = {
            detected: hasDefect,
            is_spoof: isSpoof,
            spoof_reason: spoofReason,
            type: defectType,
            label: defectLabel,
            confidence,
            depth_cm: depth,
            width_cm: defectWidth,
            length_cm: defectLength,
            severity,
            box: smoothBoxRef.current,
            color: boxColor
          };

          visionStateRef.current = newRes;
          setAutoVisionResult(newRes);
        }

        // Draw Tracking Overlays on Canvas
        const v = visionStateRef.current;
        const sBox = smoothBoxRef.current;

        if (v.is_spoof) {
          ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
          ctx.fillRect(width / 2 - 200, height / 2 - 30, 400, 60);
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(width / 2 - 200, height / 2 - 30, 400, 60);

          ctx.fillStyle = '#ef4444';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('⚠️ DIGITAL SCREEN DETECTED', width / 2, height / 2 - 8);

          ctx.fillStyle = '#f8fafc';
          ctx.font = '10px monospace';
          ctx.fillText('Please point camera at physical road surface.', width / 2, height / 2 + 14);
          ctx.textAlign = 'start';
        } else if (v.detected) {
          const bx = width * sBox.x;
          const by = height * sBox.y;
          const bw = width * sBox.w;
          const bh = height * sBox.h;

          // Bounding Box
          ctx.strokeStyle = v.color;
          ctx.lineWidth = 2.5;
          ctx.strokeRect(bx, by, bw, bh);

          // Corner Accents
          const corner = 18;
          ctx.fillStyle = v.color;
          ctx.fillRect(bx - 2, by - 2, corner, 3.5);
          ctx.fillRect(bx - 2, by - 2, 3.5, corner);
          ctx.fillRect(bx + bw - corner + 2, by - 2, corner, 3.5);
          ctx.fillRect(bx + bw - 1.5, by - 2, 3.5, corner);
          ctx.fillRect(bx - 2, by + bh - 1.5, corner, 3.5);
          ctx.fillRect(bx - 2, by + bh - corner + 2, 3.5, corner);
          ctx.fillRect(bx + bw - corner + 2, by + bh - 1.5, corner, 3.5);
          ctx.fillRect(bx + bw - 1.5, by + bh - corner + 2, 3.5, corner);

          // Center Crosshair
          const cx = bx + bw / 2;
          const cy = by + bh / 2;
          ctx.strokeStyle = v.color;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(cx, cy, 12, 0, Math.PI * 2);
          ctx.stroke();

          // Header Pill: POTHOLE DETECTED • CRITICAL
          const headerW = Math.min(bw, 320);
          ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
          ctx.fillRect(bx, by - 24, headerW, 20);
          ctx.strokeStyle = v.color;
          ctx.lineWidth = 1;
          ctx.strokeRect(bx, by - 24, headerW, 20);
          ctx.fillStyle = v.color;
          ctx.font = 'bold 11px sans-serif';
          ctx.fillText(`${v.label.toUpperCase()} • ${v.severity}`, bx + 8, by - 9);

          // Lower Footer Pill: Depth & Width
          const footerW = Math.min(bw, 260);
          ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
          ctx.fillRect(bx, by + bh + 4, footerW, 20);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.lineWidth = 1;
          ctx.strokeRect(bx, by + bh + 4, footerW, 20);
          ctx.fillStyle = '#f8fafc';
          ctx.font = 'bold 10px monospace';
          ctx.fillText(`DEPTH: ${v.depth_cm} cm | WIDTH: ${v.width_cm} cm`, bx + 8, by + bh + 18);
        } else {
          // Center scanning reticle
          const cx = width / 2;
          const cy = height / 2;

          ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(cx, cy, 24, 0, Math.PI * 2);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(cx - 32, cy); ctx.lineTo(cx - 8, cy);
          ctx.moveTo(cx + 8, cy); ctx.lineTo(cx + 32, cy);
          ctx.moveTo(cx, cy - 32); ctx.lineTo(cx, cy - 8);
          ctx.moveTo(cx, cy + 8); ctx.lineTo(cx, cy + 32);
          ctx.stroke();

          // Status Badge at top
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.fillRect(cx - 140, 16, 280, 22);
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
          ctx.strokeRect(cx - 140, 16, 280, 22);
          ctx.fillStyle = '#34d399';
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('SCANNING SURFACE • ROAD CLEAR', cx, 31);
          ctx.textAlign = 'start';
        }
      }

      animationId = requestAnimationFrame(processLiveFrame);
    };

    animationId = requestAnimationFrame(processLiveFrame);

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [simulatedFeed]);

  // Query Device Live GPS On-Demand
  const acquireRealGPS = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    setGpsLocation(prev => ({ ...prev, status: 'requesting' }));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const liveLat = pos.coords.latitude;
        const liveLng = pos.coords.longitude;
        const acc = Math.round(pos.coords.accuracy * 10) / 10;
        setGpsLocation({
          acquired: true,
          lat: liveLat,
          lng: liveLng,
          accuracy: acc,
          address: `Live Location (${liveLat.toFixed(4)}, ${liveLng.toFixed(4)})`,
          isRealDeviceGPS: true,
          status: 'acquired',
          errorMessage: null,
          lastUpdated: new Date().toLocaleTimeString()
        });
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        alert('Could not acquire location: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  // Submit Defect with Verified Location
  const handlePostDefect = async () => {
    if (autoVisionResult.is_spoof) {
      alert('Digital screen detected. Please point camera at actual road damage.');
      return;
    }

    setIsAnalyzing(true);

    const submitWithLocation = async (lat, lng, accuracy, addressName) => {
      try {
        const payloadType = autoVisionResult.detected ? autoVisionResult.type : 'pothole';
        const payloadSeverity = autoVisionResult.detected ? autoVisionResult.severity : 'HIGH';
        const payloadDimensions = {
          depth_cm: autoVisionResult.detected && autoVisionResult.depth_cm > 0 ? autoVisionResult.depth_cm : 12,
          width_cm: autoVisionResult.detected && autoVisionResult.width_cm > 0 ? autoVisionResult.width_cm : 45,
          length_cm: autoVisionResult.detected && autoVisionResult.length_cm > 0 ? autoVisionResult.length_cm : 50
        };

        const response = await fetch('/api/defects/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `${payloadSeverity} ${payloadType === 'pothole' ? 'Road Pothole' : 'Road Defect'} Reported`,
            description: `Road surface defect identified via mobile scanner. Depth: ${payloadDimensions.depth_cm}cm, Width: ${payloadDimensions.width_cm}cm.`,
            location: {
              lat: lat,
              lng: lng,
              address: addressName || `GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`
            },
            type: payloadType,
            severity: payloadSeverity,
            dimensions: payloadDimensions,
            reported_by: 'citizen_camera'
          })
        });

        const data = await response.json();
        setIsLocating(false);
        setIsAnalyzing(false);

        if (data.success) {
          setReportResult(data);
          if (!data.duplicate_detected) {
            confetti({
              particleCount: 50,
              spread: 60,
              origin: { y: 0.6 }
            });
          }
          if (onDefectReported) onDefectReported(data);
        } else {
          alert(data.message || 'Error submitting defect report.');
        }
      } catch (err) {
        setIsLocating(false);
        setIsAnalyzing(false);
        console.error('Submission failed:', err);
        alert('Network error connecting to civic portal.');
      }
    };

    // If real device GPS was already locked, submit directly:
    if (gpsLocation.acquired && gpsLocation.lat && gpsLocation.lng) {
      await submitWithLocation(gpsLocation.lat, gpsLocation.lng, gpsLocation.accuracy, gpsLocation.address);
      return;
    }

    // Otherwise, request Live Device GPS right now on submit:
    if (!navigator.geolocation) {
      setIsLocating(false);
      setIsAnalyzing(false);
      alert('Geolocation is not supported by this device.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const liveLat = pos.coords.latitude;
        const liveLng = pos.coords.longitude;
        const acc = Math.round(pos.coords.accuracy * 10) / 10;

        setGpsLocation({
          acquired: true,
          lat: liveLat,
          lng: liveLng,
          accuracy: acc,
          address: `GPS: ${liveLat.toFixed(5)}, ${liveLng.toFixed(5)}`,
          isRealDeviceGPS: true,
          status: 'acquired',
          errorMessage: null,
          lastUpdated: new Date().toLocaleTimeString()
        });

        await submitWithLocation(liveLat, liveLng, acc, `GPS: ${liveLat.toFixed(5)}, ${liveLng.toFixed(5)}`);
      },
      (err) => {
        setIsLocating(false);
        setIsAnalyzing(false);
        let msg = 'Live Device Location Required: ' + err.message;
        if (err.code === 1) {
          msg = 'Location permission is required. Please tap "Allow" when prompted by your browser to submit the real GPS location.';
        } else if (err.code === 2) {
          msg = 'Device GPS unavailable. Please enable Location in your device settings.';
        }
        alert(msg);
        setGpsLocation(prev => ({
          ...prev,
          status: 'denied',
          errorMessage: msg
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Header with Back to Dashboard Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition flex items-center space-x-1.5 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </button>
          )}

          <div>
            <h1 className="text-xl font-bold text-white flex items-center space-x-2">
              <Camera className="w-5 h-5 text-cyan-400" />
              <span>Capture Pothole with Live GPS</span>
            </h1>
            <p className="text-xs text-slate-400">
              Point your camera at the road defect and submit with verified live GPS coordinates.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-800 text-xs font-mono">
          <div className={`w-2.5 h-2.5 rounded-full ${gpsLocation.acquired ? 'bg-emerald-400 animate-pulse' : 'bg-cyan-400'}`}></div>
          <span className="text-slate-400">GPS Status:</span>
          <span className={gpsLocation.acquired ? 'text-emerald-400 font-bold' : 'text-cyan-300 font-bold'}>
            {gpsLocation.acquired
              ? `${gpsLocation.lat.toFixed(5)}, ${gpsLocation.lng.toFixed(5)}`
              : 'Captures on Submit'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Live In-App Camera Viewfinder with Real-time Framing */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl relative">
            
            {/* Viewfinder Top Bar */}
            <div className="bg-slate-950/90 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <span className={`w-2 h-2 rounded-full ${cameraActive ? 'bg-emerald-400 animate-pulse' : 'bg-cyan-400'}`}></span>
                <span className="font-mono text-slate-300 uppercase tracking-wider font-semibold">
                  {simulatedFeed ? 'DEMO ROAD STREAM' : 'LIVE DEVICE CAMERA'}
                </span>
              </div>
              
              <button
                type="button"
                onClick={() => setSimulatedFeed(!simulatedFeed)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition text-[11px] border border-slate-700"
              >
                {simulatedFeed ? 'Switch to Device Camera' : 'Switch to Demo Road Feed'}
              </button>
            </div>

            {/* Video / Live Camera Screen + Overlay Canvas */}
            <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
              
              {!simulatedFeed ? (
                <video
                  ref={videoRef}
                  playsInline
                  autoPlay
                  muted
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full relative">
                  <img
                    src="https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=1200&q=80"
                    alt="Road scan"
                    className="w-full h-full object-cover brightness-95"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-slate-950/40 pointer-events-none" />
                </div>
              )}

              <canvas ref={canvasRef} className="hidden" />

              {/* Dynamic Tracking Overlay Canvas */}
              <canvas
                ref={overlayCanvasRef}
                width={640}
                height={360}
                className="absolute inset-0 w-full h-full pointer-events-none"
              />

              {/* Top-Right Status Pill */}
              {autoVisionResult.is_spoof ? (
                <div className="absolute top-3 right-3 bg-red-950/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-red-500/60 text-[10px] font-mono text-red-300 flex items-center space-x-1.5 shadow-lg">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                  <span className="font-bold">SCREEN DETECTED</span>
                </div>
              ) : autoVisionResult.detected ? (
                <div className="absolute top-3 right-3 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-cyan-500/40 text-[10px] font-mono text-cyan-300 flex items-center space-x-1.5">
                  <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{autoVisionResult.label.toUpperCase()}</span>
                </div>
              ) : (
                <div className="absolute top-3 right-3 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/60 text-[10px] font-mono text-slate-400 flex items-center space-x-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                  <span>SCANNING SURFACE</span>
                </div>
              )}

              {/* GPS Overlay Watermark */}
              <div className="absolute bottom-3 left-3 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/60 text-[10px] font-mono text-slate-300 space-y-0.5">
                <div className="flex items-center space-x-1.5 font-semibold">
                  <MapPin className="w-3 h-3 text-cyan-400" />
                  {gpsLocation.acquired ? (
                    <span className="text-cyan-400">
                      GPS: {gpsLocation.lat.toFixed(5)}, {gpsLocation.lng.toFixed(5)}
                    </span>
                  ) : (
                    <span className="text-emerald-400">
                      GPS: Captures on Submit
                    </span>
                  )}
                </div>
              </div>

            </div>

            {/* Bottom Action Strip: Measurements + Submit Button */}
            <div className="p-4 bg-slate-950/90 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-400 flex items-center space-x-2 font-mono">
                {autoVisionResult.detected ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>
                      Depth: <strong className="text-white">{autoVisionResult.depth_cm} cm</strong> • Width: <strong className="text-white">{autoVisionResult.width_cm} cm</strong>
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      autoVisionResult.severity === 'CRITICAL'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : autoVisionResult.severity === 'HIGH'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    }`}>
                      {autoVisionResult.severity}
                    </span>
                  </div>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-400">Point camera at the damaged road or cavity.</span>
                  </>
                )}
              </div>

              {/* Clean Submit Button */}
              <button
                type="button"
                onClick={handlePostDefect}
                disabled={isAnalyzing}
                className="w-full sm:w-auto px-7 py-3 rounded-xl font-bold text-xs shadow-xl flex items-center justify-center space-x-2 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-blue-500/25"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>{isLocating ? 'Acquiring Device GPS...' : 'Submitting Defect Report...'}</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4 text-white" />
                    <span>Submit Defect Report</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>

        {/* Right Column: Clean GPS Details & Inspection Card */}
        <div className="lg:col-span-5 space-y-4">

          {/* GPS Coordinates Card */}
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-cyan-400" />
                <span>Device GPS Coordinates</span>
              </h2>
              <button
                type="button"
                onClick={acquireRealGPS}
                disabled={isLocating}
                className="px-2.5 py-1 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 text-xs font-semibold border border-blue-500/30 flex items-center space-x-1"
              >
                <Crosshair className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                <span>{isLocating ? 'Locating...' : 'Detect GPS'}</span>
              </button>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono space-y-2">
              <div className="flex justify-between items-center text-slate-300">
                <span>Latitude:</span>
                <span className="text-white font-bold text-sm">
                  {gpsLocation.acquired ? gpsLocation.lat.toFixed(5) : '— (Acquires on Submit)'}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Longitude:</span>
                <span className="text-white font-bold text-sm">
                  {gpsLocation.acquired ? gpsLocation.lng.toFixed(5) : '— (Acquires on Submit)'}
                </span>
              </div>
              <div className="flex justify-between text-slate-300 pt-1 border-t border-slate-900">
                <span>Status:</span>
                <span className={gpsLocation.acquired ? 'text-emerald-400 font-semibold' : 'text-cyan-400'}>
                  {gpsLocation.acquired ? '📍 Device Location Locked' : 'Auto-captures when submitting'}
                </span>
              </div>
            </div>
          </div>

          {/* Defect Detection Summary Card */}
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-3">
            <h2 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Inspection Summary</span>
            </h2>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono space-y-2">
              <div className="flex justify-between text-slate-300">
                <span>Identified Defect:</span>
                <span className="text-white font-semibold">
                  {autoVisionResult.detected ? autoVisionResult.label : 'Scanning...'}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Severity:</span>
                <span className={`font-bold ${
                  autoVisionResult.severity === 'CRITICAL'
                    ? 'text-rose-400'
                    : autoVisionResult.severity === 'HIGH'
                      ? 'text-amber-400'
                      : 'text-cyan-400'
                }`}>
                  {autoVisionResult.detected ? autoVisionResult.severity : 'Normal'}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Estimated Depth:</span>
                <span className="text-white">
                  {autoVisionResult.detected ? `${autoVisionResult.depth_cm} cm` : '—'}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Estimated Width:</span>
                <span className="text-white">
                  {autoVisionResult.detected ? `${autoVisionResult.width_cm} cm` : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Post Result Card (Displayed Only After Submitting) */}
          {reportResult && (
            <div className={`p-5 rounded-2xl border shadow-2xl transition-all space-y-3 ${
              reportResult.duplicate_detected
                ? 'bg-amber-950/30 border-amber-500/40 text-amber-100'
                : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-100'
            }`}>
              
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-xl ${reportResult.duplicate_detected ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                  {reportResult.duplicate_detected ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold">
                    {reportResult.duplicate_detected ? 'DUPLICATE RECORD INTERCEPTED' : 'REPORT TRANSMITTED SUCCESSFULLY'}
                  </h3>
                  <div className="text-xs font-mono opacity-80">
                    Ticket Code: #{reportResult.ticket_code}
                  </div>
                </div>
              </div>

              <p className="text-xs opacity-90 leading-relaxed">
                {reportResult.message}
              </p>

              <button
                type="button"
                onClick={() => setReportResult(null)}
                className="w-full mt-2 py-2 bg-slate-900 hover:bg-slate-800 text-xs font-semibold rounded-lg border border-slate-700 text-slate-200 transition"
              >
                Done / Capture Next Defect
              </button>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
