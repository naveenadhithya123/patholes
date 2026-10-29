import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import CitizenCameraPortal from './components/CitizenCameraPortal';
import VehicleBumperSimulator from './components/VehicleBumperSimulator';
import GovernmentPortal from './components/GovernmentPortal';

export default function App() {
  // Routing based on URL pathname
  // Government Portal is ONLY reachable by typing "/login" in the browser URL!
  const [currentPath, setCurrentPath] = useState(window.location.pathname || '/');

  const [activeTab, setActiveTab] = useState(() => {
    if (window.location.pathname === '/sensor-gateway') return 'vehicle';
    return 'citizen';
  });

  const [govUser, setGovUser] = useState(() => {
    const saved = localStorage.getItem('infra_ai_gov_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [defects, setDefects] = useState([]);
  const [roads, setRoads] = useState([]);
  const [climateZones, setClimateZones] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  // Sync with browser navigation
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
      if (window.location.pathname === '/sensor-gateway') {
        setActiveTab('vehicle');
      } else if (window.location.pathname === '/') {
        setActiveTab('citizen');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    if (path === '/sensor-gateway') {
      setActiveTab('vehicle');
    } else if (path === '/') {
      setActiveTab('citizen');
    }
  };

  // Fetch initial system data
  const fetchAllData = async () => {
    try {
      const [defRes, roadsRes, climRes, anaRes] = await Promise.all([
        fetch('/api/defects'),
        fetch('/api/roads'),
        fetch('/api/climate'),
        fetch('/api/analytics')
      ]);

      const [defData, roadsData, climData, anaData] = await Promise.all([
        defRes.json(),
        roadsRes.json(),
        climRes.json(),
        anaRes.json()
      ]);

      if (defData.success) setDefects(defData.defects || []);
      if (roadsData.success) setRoads(roadsData.roads || []);
      if (climData.success) setClimateZones(climData.zones || []);
      if (anaData.success) setAnalytics(anaData);
    } catch (err) {
      console.warn('API sync warning:', err);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleLogin = (user, token) => {
    setGovUser(user);
    localStorage.setItem('infra_ai_gov_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setGovUser(null);
    localStorage.removeItem('infra_ai_gov_user');
    navigateTo('/');
  };

  const handleDefectReported = () => {
    fetchAllData();
  };

  const handleTelemetryEvent = (telemetryData) => {
    if (telemetryData.action === 'NEW_DEFECT_DISPATCHED') {
      fetchAllData();
    }
  };

  const handleDefectUpdated = (updatedDefect) => {
    setDefects(prev => prev.map(d => (d.id === updatedDefect.id ? updatedDefect : d)));
    fetchAllData();
  };

  const isLoginPage = currentPath === '/login';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      
      {/* Top Navbar: Brand Infra AI */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        govUser={govUser}
        onLogout={handleLogout}
        isLoginPage={isLoginPage}
        onNavigate={navigateTo}
      />

      {/* Main View:
          - If URL is "/login", render Government Portal (BBMP Login / Command Center).
          - Otherwise, render Citizen Live Cam or Vehicle Hardware Gateway.
      */}
      <main className="flex-1 pb-16">
        {isLoginPage ? (
          <GovernmentPortal
            govUser={govUser}
            onLogin={handleLogin}
            onLogout={handleLogout}
            defects={defects}
            roads={roads}
            climateZones={climateZones}
            analytics={analytics}
            onDefectUpdated={handleDefectUpdated}
          />
        ) : activeTab === 'citizen' ? (
          <CitizenCameraPortal
            onDefectReported={handleDefectReported}
          />
        ) : (
          <VehicleBumperSimulator
            onTelemetryEvent={handleTelemetryEvent}
          />
        )}
      </main>

      {/* Global Civic Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Infra AI Platform • Urban Infrastructure Monitoring & Road Safety System</span>
          </div>
          <div className="flex items-center space-x-4">
            <span>SDG 9: Resilient Infrastructure</span>
            <span>•</span>
            <span>SDG 11: Sustainable Smart Cities</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
