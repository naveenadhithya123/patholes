import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import LandingDashboard from './components/LandingDashboard';
import MapViewPage from './components/MapViewPage';
import CitizenCameraPortal from './components/CitizenCameraPortal';
import FindByAreaView from './components/FindByAreaView';
import PublicCivicTracker from './components/PublicCivicTracker';
import GovernmentPortal from './components/GovernmentPortal';

export default function App() {
  // Routing based on URL pathname
  // Government Portal is reachable by typing "/login" in the browser URL
  const [currentPath, setCurrentPath] = useState(window.location.pathname || '/');

  // Active subview on the main platform:
  // 'home' | 'map' | 'capture' | 'tracker' | 'area'
  const [currentView, setCurrentView] = useState('home');

  const [govUser, setGovUser] = useState(() => {
    try {
      const saved = localStorage.getItem('infra_ai_gov_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [defects, setDefects] = useState([]);
  const [roads, setRoads] = useState([]);
  const [climateZones, setClimateZones] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  // Sync with browser navigation
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
      if (window.location.pathname === '/') {
        setCurrentView('home');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    if (path === '/') {
      setCurrentView('home');
    }
  };

  const handleSelectView = (view) => {
    setCurrentView(view);
    if (currentPath !== '/') {
      window.history.pushState({}, '', '/');
      setCurrentPath('/');
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

  const handleDefectUpdated = (updatedDefect) => {
    setDefects(prev => prev.map(d => (d.id === updatedDefect.id ? updatedDefect : d)));
    fetchAllData();
  };

  const isLoginPage = currentPath === '/login';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      
      {/* Top Navbar: Brand Infra AI */}
      <Navbar
        currentView={currentView}
        onSelectView={handleSelectView}
        govUser={govUser}
        onLogout={handleLogout}
        isLoginPage={isLoginPage}
        onNavigate={navigateTo}
      />

      {/* Main View:
          - If URL is "/login", render Government Portal (BBMP Login / Command Center).
          - Otherwise:
            1. 'home': Clean 3-Button Dashboard (Map View, Capture Potholes, Find By Area)
            2. 'map': City Road Defect Map View
            3. 'capture': Real-Time Camera Pothole Capture with Live GPS
            4. 'area': Find Defects By Area / Ward Directory
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
        ) : currentView === 'map' ? (
          <MapViewPage
            onBack={() => setCurrentView('home')}
            defects={defects}
            roads={roads}
          />
        ) : currentView === 'capture' ? (
          <CitizenCameraPortal
            onBack={() => setCurrentView('home')}
            onDefectReported={handleDefectReported}
          />
        ) : currentView === 'tracker' ? (
          <PublicCivicTracker
            onBack={() => setCurrentView('home')}
            onSelectView={setCurrentView}
          />
        ) : currentView === 'area' ? (
          <FindByAreaView
            onBack={() => setCurrentView('home')}
            defects={defects}
          />
        ) : (
          <LandingDashboard
            onSelectView={handleSelectView}
            defects={defects}
          />
        )}
      </main>

      {/* Global Civic Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Infra AI Platform • Greater Bengaluru Road Defect Resolution & Safety System</span>
          </div>
          <div className="flex items-center space-x-4 text-slate-400">
            <span>5 Corporations</span>
            <span>•</span>
            <span>50 Sub-Divisions</span>
            <span>•</span>
            <span>198 Wards</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
