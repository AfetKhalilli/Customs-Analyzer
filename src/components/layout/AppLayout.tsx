import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard, FilePlus, FileText, User, Settings, LogOut, Bell, RefreshCw,
  Users, Building2, BarChart3, ShieldCheck, AlertTriangle, BookOpen, Bookmark,
  Activity, Lock, Briefcase, Eye, FileSearch, ClipboardList, UserCog, Database,
} from 'lucide-react';
import { useCurrentUser, useAuthStore } from '../../store/authStore';
import { useDataStore } from '../../store/dataStore';
import { useToastStore } from '../../store/toastStore';
import { Avatar, ConfirmDialog } from '../ui/Primitives';
import { LogoMark } from '../ui/LogoMark';
import { relativeTime, cn } from '../../lib/utils';
import type { Role } from '../../types';

const NAV_BY_ROLE: Record<Role, { section?: string; label: string; to: string; icon: React.ReactNode }[]> = {
  user: [
    { label: 'İdarə paneli', to: '/dashboard', icon: <LayoutDashboard size={18} /> },
    { label: 'Yeni bəyannamə', to: '/declaration/new', icon: <FilePlus size={18} /> },
    { label: 'Bəyannamələrim', to: '/declarations', icon: <FileText size={18} /> },
    { label: 'Bildirişlər', to: '/notifications', icon: <Bell size={18} /> },
    { label: 'Profil', to: '/profile', icon: <User size={18} /> },
    { label: 'Tənzimləmələr', to: '/settings', icon: <Settings size={18} /> },
  ],
  inspector: [
    { label: 'İdarə paneli', to: '/dashboard', icon: <LayoutDashboard size={18} /> },
    { label: 'Bəyannamələr', to: '/declarations', icon: <FileText size={18} /> },
    { label: 'Bildirişlər', to: '/notifications', icon: <Bell size={18} /> },
    { label: 'Profil', to: '/profile', icon: <User size={18} /> },
    { label: 'Tənzimləmələr', to: '/settings', icon: <Settings size={18} /> },
  ],
  departmentHead: [
    { label: 'İdarə paneli', to: '/dashboard', icon: <LayoutDashboard size={18} /> },
    { label: 'Bəyannamələr', to: '/declarations', icon: <FileText size={18} /> },
    { label: 'Müfəttişlər', to: '/inspectors', icon: <Users size={18} /> },
    { label: 'Əməkdaş idarəetməsi', to: '/admin/staff', icon: <UserCog size={18} /> },
    { label: 'Jurnal', to: '/logs', icon: <Activity size={18} /> },
    { label: 'Bildirişlər', to: '/notifications', icon: <Bell size={18} /> },
    { label: 'Profil', to: '/profile', icon: <User size={18} /> },
    { label: 'Tənzimləmələr', to: '/settings', icon: <Settings size={18} /> },
  ],
  boss: [
    { label: 'İdarə paneli', to: '/dashboard', icon: <LayoutDashboard size={18} /> },
    { label: 'Bəyannamələr', to: '/declarations', icon: <FileText size={18} /> },
    { label: 'Şöbələr', to: '/departments', icon: <Building2 size={18} /> },
    { label: 'Müfəttişlər', to: '/inspectors', icon: <Users size={18} /> },
    { section: 'ADMİN', label: 'Əməkdaşlar və Şöbələr', to: '/admin/staff', icon: <UserCog size={18} /> },
    { label: 'Risk və Qayda Reyestri', to: '/admin/reference', icon: <Database size={18} /> },
    { section: 'SİSTEM', label: 'Jurnal', to: '/logs', icon: <Activity size={18} /> },
    { label: 'Bildirişlər', to: '/notifications', icon: <Bell size={18} /> },
    { label: 'Profil', to: '/profile', icon: <User size={18} /> },
    { label: 'Tənzimləmələr', to: '/settings', icon: <Settings size={18} /> },
  ],
  pca: [
    { section: 'AUDIT', label: 'İdarə paneli', to: '/dashboard', icon: <LayoutDashboard size={18} /> },
    { label: 'Şirkətlər', to: '/pca/companies', icon: <Building2 size={18} /> },
    { label: 'Anomaliyalar', to: '/pca/anomalies', icon: <AlertTriangle size={18} /> },
    { label: 'Tapıntılar', to: '/pca/findings', icon: <FileSearch size={18} /> },
    { label: 'İzləmə Siyahısı', to: '/pca/watchlist', icon: <Bookmark size={18} /> },
    { label: 'Audit Tarixçəsi', to: '/pca/timeline', icon: <Activity size={18} /> },
    { section: 'HESAB', label: 'Profil', to: '/profile', icon: <User size={18} /> },
    { label: 'Tənzimləmələr', to: '/settings', icon: <Settings size={18} /> },
  ],
};

export function AppLayout({ children }: { children: React.ReactNode }) {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const resetDemo = useDataStore((s) => s.resetDemo);
  const notifications = useDataStore((s) => s.notifications);
  const markNotificationRead = useDataStore((s) => s.markNotificationRead);
  const markAllRead = useDataStore((s) => s.markAllNotificationsRead);
  const toast = useToastStore((s) => s.push);

  const [notifOpen, setNotifOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (!user) return null;
  const role = user.role;
  const nav = NAV_BY_ROLE[role];
  const userNotifs = notifications.filter((n) => n.userId === user.id);
  const unreadCount = userNotifs.filter((n) => !n.read).length;
  const dispName = user.entityType === 'individual' ? `${user.firstName} ${user.lastName}` : user.companyName;

  const handleResetDemo = () => {
    resetDemo();
    toast('Demo məlumatlar sıfırlandı', 'success');
    setTimeout(() => window.location.reload(), 600);
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell">
      <aside className={cn('sidebar', role === 'pca' && 'pca-mode')}>
        <div className="brand">
          <div className="brand-mark"><LogoMark size={42} /></div>
          <div className="brand-text">
            <strong>Customs Analyzer</strong>
            <small>{role === 'pca' ? 'PCA Workspace' : 'Gömrük Sistemi'}</small>
          </div>
        </div>
        <nav>
          {nav.map((item, i) => (
            <React.Fragment key={item.to + i}>
              {item.section && <div className="nav-section">{item.section}</div>}
              <NavLink to={item.to} className={({ isActive }) => (isActive ? 'active' : '')}>
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            </React.Fragment>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={16} /> Çıxış
          </button>
          <div className="copyright">
            © {new Date().getFullYear()} Customs Analyzer<br />All Rights Reserved
          </div>
        </div>
      </aside>

      <header className="header">
        <div className="spacer" />

        {role === 'pca' && (
          <div className="readonly-pill" title="Bu istifadəçi yalnız oxuma rejimindədir">
            <Eye size={14} /> Yalnız oxuma
          </div>
        )}

        <button className="btn btn-secondary btn-sm" onClick={() => setResetConfirmOpen(true)} title="Demo məlumatları ilkin vəziyyətə qaytar">
          <RefreshCw size={14} /> Demo Reset
        </button>

        <div style={{ position: 'relative' }} ref={notifRef}>
          <button className="header-action" onClick={() => setNotifOpen(!notifOpen)} aria-label="Bildirişlər">
            <Bell size={18} />
            {unreadCount > 0 && <span className="badge-dot">{unreadCount}</span>}
          </button>
          {notifOpen && (
            <div className="notification-popover">
              <div className="np-header">
                <strong>Bildirişlər</strong>
                {unreadCount > 0 && (
                  <button className="btn btn-ghost btn-sm" onClick={() => markAllRead(user.id)}>
                    Hamısını oxunmuş et
                  </button>
                )}
              </div>
              <div className="np-list">
                {userNotifs.length === 0 && (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--n-500)' }}>
                    Bildiriş yoxdur
                  </div>
                )}
                {userNotifs.slice(0, 20).map((n) => (
                  <div
                    key={n.id}
                    className={cn('np-item', !n.read && 'unread')}
                    onClick={() => {
                      markNotificationRead(n.id);
                      setNotifOpen(false);
                      if (n.link) navigate(n.link);
                    }}
                  >
                    <div className="np-dot" />
                    <div className="np-body">
                      <div className="np-title">{n.title}</div>
                      <div className="np-text">{n.body}</div>
                      <div className="np-time">{relativeTime(n.at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ position: 'relative' }} ref={menuRef}>
          <button className="user-trigger" onClick={() => setMenuOpen(!menuOpen)}>
            <Avatar name={dispName} size="sm" />
            <div>
              <div className="name">{dispName}</div>
              <small>{user.staffTitle ?? (user.entityType === 'individual' ? 'Fiziki şəxs' : 'Hüquqi şəxs')}</small>
            </div>
          </button>
          {menuOpen && (
            <div className="dropdown-menu">
              <button className="dm-item" onClick={() => { setMenuOpen(false); navigate('/profile'); }}>
                <User size={14} /> Profil
              </button>
              <button className="dm-item" onClick={() => { setMenuOpen(false); navigate('/settings'); }}>
                <Settings size={14} /> Tənzimləmələr
              </button>
              <div className="dm-divider" />
              <button className="dm-item" onClick={handleLogout}>
                <LogOut size={14} /> Çıxış
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="main">{children}</main>

      <ConfirmDialog
        open={resetConfirmOpen}
        onClose={() => setResetConfirmOpen(false)}
        onConfirm={handleResetDemo}
        title="Demo məlumatları sıfırla"
        message="Bütün dəyişiklikləriniz silinəcək və ilkin demo məlumatları geri yüklənəcək. Davam edək?"
        confirmText="Sıfırla"
        danger
      />
    </div>
  );
}
