import React from 'react';
import { useCurrentUser } from '../store/authStore';
import { UserDashboard } from './user/UserDashboard';
import { InspectorDashboard } from './inspector/InspectorDashboard';
import { DeptHeadDashboard } from './deptHead/DeptHeadDashboard';
import { BossDashboard } from './boss/BossDashboard';
import { PCADashboard } from './pca/PCADashboard';

export function DashboardSwitch() {
  const user = useCurrentUser();
  if (!user) return null;
  switch (user.role) {
    case 'user': return <UserDashboard />;
    case 'inspector': return <InspectorDashboard />;
    case 'departmentHead': return <DeptHeadDashboard />;
    case 'boss': return <BossDashboard />;
    case 'pca': return <PCADashboard />;
  }
}
