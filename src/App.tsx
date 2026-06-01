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
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';

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
import { appPath, STAFF_ROLES } from './lib/routes';

// Pick the login entry point for the portal the visitor is trying to reach.
const loginFor = (pathname: string) => (pathname.startsWith('/admin') ? '/admin/login' : '/portal/login');

function RequireAuth({ children, roles }: { children: React.ReactNode; roles?: Role[] }) {
  const user = useCurrentUser();
  const location = useLocation();
  if (!user) return <Navigate to={loginFor(location.pathname)} state={{ from: location }} replace />;
  // Role not permitted here → bounce to the user's own portal dashboard.
  if (roles && !roles.includes(user.role)) return <Navigate to={appPath(user.role, '/dashboard')} replace />;
  return <AppLayout>{children}</AppLayout>;
}

function PublicOnly({ children }: { children: React.ReactNode }) {
  const user = useCurrentUser();
  if (user) return <Navigate to={appPath(user.role, '/dashboard')} replace />;
  return <>{children}</>;
}

// Neutral entrypoint: send a logged-in user to their portal dashboard, else
// to the default (user) login page.
function RoleHome() {
  const user = useCurrentUser();
  if (!user) return <Navigate to="/portal/login" replace />;
  return <Navigate to={appPath(user.role, '/dashboard')} replace />;
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
        {/* Separate login entry points per portal (shared component, role-based redirect). */}
        <Route path="/portal/login" element={<PublicOnly><LoginPage portal="user" /></PublicOnly>} />
        <Route path="/admin/login" element={<PublicOnly><LoginPage portal="staff" /></PublicOnly>} />
        {/* Legacy single login → default to the user portal login. */}
        <Route path="/login" element={<Navigate to="/portal/login" replace />} />
        <Route path="/register" element={<PublicOnly><EntitySelectorPage /></PublicOnly>} />
        <Route path="/register/individual" element={<PublicOnly><IndividualRegisterPage /></PublicOnly>} />
        <Route path="/register/company" element={<PublicOnly><CompanyRegisterPage /></PublicOnly>} />
        <Route path="/forgot-password" element={<PublicOnly><ForgotPasswordPage portal="user" /></PublicOnly>} />
        <Route path="/admin/forgot-password" element={<PublicOnly><ForgotPasswordPage portal="staff" /></PublicOnly>} />

        {/* ── User Portal (/portal/*) — individual & company declarants ── */}
        <Route path="/portal/dashboard" element={<RequireAuth roles={['user']}><DashboardSwitch /></RequireAuth>} />
        <Route path="/portal/declaration/new" element={<RequireAuth roles={['user']}><DeclarationWizard /></RequireAuth>} />
        <Route path="/portal/declaration/:id" element={<RequireAuth roles={['user']}><DeclarationDetail /></RequireAuth>} />
        <Route path="/portal/declarations" element={<RequireAuth roles={['user']}><DeclarationsList /></RequireAuth>} />
        <Route path="/portal/profile" element={<RequireAuth roles={['user']}><ProfilePage /></RequireAuth>} />
        <Route path="/portal/settings" element={<RequireAuth roles={['user']}><SettingsPage /></RequireAuth>} />
        <Route path="/portal/notifications" element={<RequireAuth roles={['user']}><NotificationsPage /></RequireAuth>} />

        {/* ── Staff Portal (/admin/*) — inspector, departmentHead, boss, pca ── */}
        <Route path="/admin/dashboard" element={<RequireAuth roles={STAFF_ROLES}><DashboardSwitch /></RequireAuth>} />
        <Route path="/admin/declaration/:id" element={<RequireAuth roles={STAFF_ROLES}><DeclarationDetail /></RequireAuth>} />
        <Route path="/admin/declarations" element={<RequireAuth roles={STAFF_ROLES}><DeclarationsList /></RequireAuth>} />
        <Route path="/admin/profile" element={<RequireAuth roles={STAFF_ROLES}><ProfilePage /></RequireAuth>} />
        <Route path="/admin/settings" element={<RequireAuth roles={STAFF_ROLES}><SettingsPage /></RequireAuth>} />
        <Route path="/admin/notifications" element={<RequireAuth roles={STAFF_ROLES}><NotificationsPage /></RequireAuth>} />
        <Route path="/admin/logs" element={<RequireAuth roles={['departmentHead', 'boss']}><LogsPage /></RequireAuth>} />
        <Route path="/admin/inspectors" element={<RequireAuth roles={['departmentHead', 'boss']}><InspectorsPage /></RequireAuth>} />
        <Route path="/admin/departments" element={<RequireAuth roles={['boss']}><DepartmentsPage /></RequireAuth>} />
        <Route path="/admin/staff" element={<RequireAuth roles={['boss', 'departmentHead']}><StaffManagementPage /></RequireAuth>} />
        <Route path="/admin/reference" element={<RequireAuth roles={['boss']}><ReferenceDataPage /></RequireAuth>} />

        <Route path="/admin/pca/companies" element={<RequireAuth roles={['pca']}><PCACompaniesPage /></RequireAuth>} />
        <Route path="/admin/pca/company/:id" element={<RequireAuth roles={['pca']}><Company360 /></RequireAuth>} />
        <Route path="/admin/pca/anomalies" element={<RequireAuth roles={['pca']}><AnomaliesPage /></RequireAuth>} />
        <Route path="/admin/pca/findings" element={<RequireAuth roles={['pca']}><FindingsPage /></RequireAuth>} />
        <Route path="/admin/pca/watchlist" element={<RequireAuth roles={['pca']}><WatchlistPage /></RequireAuth>} />
        <Route path="/admin/pca/timeline" element={<RequireAuth roles={['pca']}><AuditTimeline /></RequireAuth>} />

        {/* Neutral entrypoints + legacy redirect (login/registration land on /dashboard). */}
        <Route path="/" element={<RoleHome />} />
        <Route path="/dashboard" element={<RoleHome />} />
        <Route path="*" element={<RoleHome />} />
      </Routes>
      <ToastContainer />
    </>
  );
}
