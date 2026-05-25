import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useDataStore } from './store/dataStore';
import { useAuthStore, useCurrentUser } from './store/authStore';
import { AppLayout } from './components/layout/AppLayout';
import { ToastContainer } from './components/ui/Primitives';

import { LoginPage } from './pages/auth/LoginPage';
import { EntitySelectorPage } from './pages/auth/EntitySelectorPage';
import { IndividualRegisterPage } from './pages/auth/IndividualRegisterPage';
import { CompanyRegisterPage } from './pages/auth/CompanyRegisterPage';

import { DashboardSwitch } from './pages/DashboardSwitch';
import { DeclarationsList } from './pages/shared/DeclarationsList';
import { DeclarationWizard } from './pages/user/DeclarationWizard';
import { DeclarationDetail } from './pages/shared/DeclarationDetail';
import { ProfilePage } from './pages/shared/ProfilePage';
import { SettingsPage } from './pages/shared/SettingsPage';
import { NotificationsPage } from './pages/shared/NotificationsPage';
import { LogsPage } from './pages/shared/LogsPage';
import { InspectorsPage } from './pages/deptHead/InspectorsPage';
import { DepartmentsPage } from './pages/boss/DepartmentsPage';

import { StaffManagementPage } from './pages/admin/StaffManagementPage';
import { ReferenceDataPage } from './pages/admin/ReferenceDataPage';
import { PCACompaniesPage } from './pages/pca/PCACompaniesPage';
import { Company360 } from './pages/pca/Company360';
import { AnomaliesPage } from './pages/pca/AnomaliesPage';
import { FindingsPage } from './pages/pca/FindingsPage';
import { WatchlistPage } from './pages/pca/WatchlistPage';
import { AuditTimeline } from './pages/pca/AuditTimeline';

import type { Role } from './types';

function RequireAuth({ children, roles }: { children: React.ReactNode; roles?: Role[] }) {
  const user = useCurrentUser();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function PublicOnly({ children }: { children: React.ReactNode }) {
  const user = useCurrentUser();
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  const initSeed = useDataStore((s) => s.initSeed);
  const initAuth = useAuthStore((s) => s.init);

  useEffect(() => {
    initSeed();
    initAuth();
  }, [initSeed, initAuth]);

  return (
    <>
      <Routes>
        <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
        <Route path="/register" element={<PublicOnly><EntitySelectorPage /></PublicOnly>} />
        <Route path="/register/individual" element={<PublicOnly><IndividualRegisterPage /></PublicOnly>} />
        <Route path="/register/company" element={<PublicOnly><CompanyRegisterPage /></PublicOnly>} />

        <Route path="/dashboard" element={<RequireAuth><DashboardSwitch /></RequireAuth>} />
        <Route path="/declaration/new" element={<RequireAuth roles={['user']}><DeclarationWizard /></RequireAuth>} />
        <Route path="/declaration/:id" element={<RequireAuth><DeclarationDetail /></RequireAuth>} />
        <Route path="/declarations" element={<RequireAuth><DeclarationsList /></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
        <Route path="/settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />
        <Route path="/notifications" element={<RequireAuth><NotificationsPage /></RequireAuth>} />
        <Route path="/logs" element={<RequireAuth roles={['departmentHead', 'boss']}><LogsPage /></RequireAuth>} />
        <Route path="/inspectors" element={<RequireAuth roles={['departmentHead', 'boss']}><InspectorsPage /></RequireAuth>} />
        <Route path="/departments" element={<RequireAuth roles={['boss']}><DepartmentsPage /></RequireAuth>} />
        <Route path="/admin/staff" element={<RequireAuth roles={['boss', 'departmentHead']}><StaffManagementPage /></RequireAuth>} />
        <Route path="/admin/reference" element={<RequireAuth roles={['boss']}><ReferenceDataPage /></RequireAuth>} />

        <Route path="/pca/companies" element={<RequireAuth roles={['pca']}><PCACompaniesPage /></RequireAuth>} />
        <Route path="/pca/company/:id" element={<RequireAuth roles={['pca']}><Company360 /></RequireAuth>} />
        <Route path="/pca/anomalies" element={<RequireAuth roles={['pca']}><AnomaliesPage /></RequireAuth>} />
        <Route path="/pca/findings" element={<RequireAuth roles={['pca']}><FindingsPage /></RequireAuth>} />
        <Route path="/pca/watchlist" element={<RequireAuth roles={['pca']}><WatchlistPage /></RequireAuth>} />
        <Route path="/pca/timeline" element={<RequireAuth roles={['pca']}><AuditTimeline /></RequireAuth>} />

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <ToastContainer />
    </>
  );
}
