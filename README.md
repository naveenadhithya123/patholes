# Infra AI — AI-Based Urban Infrastructure & Road Asset Monitoring System
> **Aligned with UN SDG 9 (Industry, Innovation & Infrastructure) & SDG 11 (Sustainable Cities and Communities)**  
> **Built for Urban Infrastructure Authorities & Municipal Corporations**

---

## 🌟 Executive Summary & Problem Solved
Urban infrastructure authorities face two critical operational hurdles:
1. **Redundant Duplicate Complaints**: When a pothole or structural defect appears on a busy road, dozens of citizens and patrol vehicles report the exact same defect. Without automated spatial intelligence, municipalities waste time and funds dispatching multiple inspection teams. Additionally, allowing gallery uploads invites fake or AI-generated images.
2. **Reactive Rather Than Predictive Maintenance**: Municipalities only fix road craters after severe damage or accidents occur, ignoring key predictive indicators:
   - **Road Asset Aging**: Roads older than their designed lifespan (e.g. 10 years).
   - **Microclimate Weather Shocks**: Rapid rainfall surges and sudden thermal swings that strip asphalt binders.

**Infra AI** solves this through a dual-ingestion architecture (Frictionless Citizen In-App Camera + Vehicle LiDAR Telemetry Gateway) with an automated **Haversine Geospatial De-duplication Engine** and a **Multi-Factor AI Prioritization Algorithm**.

---

## 🚀 Key System Features

### 1. 📱 Frictionless Citizen In-App Live Defect Scanner (Zero Login Required)
- **Zero Barrier**: Accessible immediately on root URL (`http://localhost:5173/`) with **no login or personal details**.
- **100% Automated AI Classification**: Citizens do **NOT** need to choose whether it is a pothole, crack, or fracture, or guess severity. The citizen simply aims their camera and clicks **"Take Picture & Auto-Detect"**.
  - The AI vision engine automatically inspects the image pixels and classifies the hazard (e.g. *Severe Road Pothole*, *Structural Wall Crack*, *Bridge Joint Fracture*).
  - Automatically measures crater depth and dimensions.
  - Automatically calculates priority based on road traffic congestion (e.g. Outer Ring Road with 145,000 vehicles/day is prioritized immediately to prevent traffic gridlock).
- **Strict In-App Camera Only**: Gallery uploads are blocked to eliminate AI-generated synthetic images.
- **Geospatial De-duplication Feedback**: When capturing near an existing unresolved ticket (<22 meters), the system notifies the citizen:
  > *"🎯 Geospatial Match Detected! Defect is already registered under Ticket #BBMP-RD-1002 (12m away). Your capture has been recorded as high-value crowd verification (+1 Confirmation) without generating duplicate municipal work orders."*

### 2. 🚗 Vehicle LiDAR Sensor • Hardware Telemetry Ingestion Form
- **Why this form?** In actual deployment, a front-bumper LiDAR and camera array is physically mounted below the vehicle's front number plate (1.2 ft height, scanning 5–6 ft ahead). Since physical patrol car hardware cannot be brought onto the hackathon stage, this form acts as the hardware telemetry emulator.
- **Automated Duplicate Suppression**: Transmitting telemetry from a location where a defect is already known triggers the geospatial filter:  
  `[DUPLICATE SUPPRESSED] Pothole at coordinates matches active Ticket #BBMP-RD-1001. Telemetry verified; duplicate ticket suppressed.`
- **Instant Government Upload**: When a unique defect is transmitted, it is automatically cataloged and dispatched to the Government Portal with GPS coordinates, depth, and live road assignment.

### 3. 🏛️ Government / Municipal Command Center (Access via `/login`)
- **Exclusive URL Access**: Per municipal security protocol, there is **no public "Government Portal" button on the home page**. Government officials access the portal exclusively by navigating to `/login` (`http://localhost:5173/login`).
- **Interactive GIS Map**: Real-time Leaflet map with custom priority markers (Red: P1 Immediate, Amber: P2 High, Blue: P3 Medium, Green: Resolved).
- **Automated AI Multi-Factor Prioritization Engine**:
  - Automatically segments defects into **P1 Immediate (<12h SLA)**, **P2 High (<24h SLA)**, and **P3 Scheduled Maintenance** using:
    $$\text{Priority Score} = \text{Damage Severity (35 pts)} + \text{Traffic Density (25 pts)} + \text{Road Age Expiry (20 pts)} + \text{Climate Volatility (15 pts)} + \text{Crowd Confirmations (5 pts)}$$
  - Busiest arterial roads carrying heavy passenger car traffic automatically receive the highest priority.
- **Contractor Dispatch & Printable Work Order**: Generates official BBMP work orders complete with SLA, contractor assignments, GPS coordinates, and ward engineer sign-offs.
- **Kaggle Datasets Integrated**:
  - **Road Asset Lifecycles**: Identifies roads that have exceeded their designed 10-year lifespans.
  - **Climate Volatility Radar**: Identifies microclimate wards experiencing rapid thermal drops and heavy rainfall surges.

---

## 💻 How to Access the Live Application

* **Citizen Live Scanner**: `http://localhost:5173/` (No login, 100% automated AI detection)
* **Vehicle Sensor Ingestion Gateway**: `http://localhost:5173/sensor-gateway`
* **Government Authority Portal**: **`http://localhost:5173/login`** (Type `/login` in the URL)

---

## 🔐 Demo Credentials for Hackathon Judges
On `http://localhost:5173/login`:
* **Chief Municipal Officer**: `admin@bbmp.gov.in` / `admin123`
* **Ward Executive Engineer**: `engineer@bbmp.gov.in` / `admin123`
