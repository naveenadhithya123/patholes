import React from 'react';
import OfficerLoginPage from './OfficerLoginPage';
import HeadAdminDashboard from './HeadAdminDashboard';
import AreaHeadDashboard from './AreaHeadDashboard';

export default function GovernmentPortal({ 
  govUser, 
  onLogin, 
  onLogout, 
  defects = [], 
  roads = [], 
  climateZones = [], 
  analytics = null, 
  onDefectUpdated 
}) {
  // 1. If not logged in, render the dual login page (Head Admin vs Area Head)
  if (!govUser) {
    return (
      <OfficerLoginPage
        onLogin={onLogin}
        onCancel={() => {
          if (window.history.pushState) {
            window.history.pushState({}, '', '/');
            window.dispatchEvent(new PopStateEvent('popstate'));
          } else {
            window.location.href = '/';
          }
        }}
      />
    );
  }

  // 2. If logged in as Area Head, render the Area Head Workspace
  if (govUser.role === 'AREA_HEAD') {
    return (
      <AreaHeadDashboard
        govUser={govUser}
        onLogout={onLogout}
        defects={defects}
        onDefectUpdated={onDefectUpdated}
      />
    );
  }

  // 3. Otherwise (Head Admin, Chief Infrastructure Commissioner, Municipal Administrator),
  // render the Head Admin Command Center
  return (
    <HeadAdminDashboard
      govUser={govUser}
      onLogout={onLogout}
      defects={defects}
      roads={roads}
      onDefectUpdated={onDefectUpdated}
    />
  );
}
