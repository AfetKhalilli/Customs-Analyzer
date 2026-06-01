import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard, FilePlus, FileText, User, Settings, LogOut, Bell, RefreshCw,
  Users, Building2, BarChart3, ShieldCheck, AlertTriangle, BookOpen, Bookmark,
  Activity, Lock, Briefcase, Eye, FileSearch, ClipboardList, UserCog, Database,
  Menu, X,
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
    { label: 'İdarə Paneli', to: '/dashboard', icon: <LayoutDashboard size={18} /> },
    { label: 'Sənəd Əlavə Et', to: '/declaration/new', icon: <FilePlus size={18} /> },
    { label: 'Sənədlərim', to: '/declarations', icon: <FileText size={18} /> },
    { label: 'Bildirişlər', to: '/notifications', icon: <Bell size={18} /> },
    { label: 'Profil', to: '/profile', icon: <User size={18} /> },
    { label: 'Sistem Tənzimləmələri', to: '/settings', icon: <Settings size={18} /> },
  ],
  inspector: [
    { label: 'İdarə Paneli', to: '/dashboard', icon: <LayoutDashboard size={18} /> },
    { label: 'Sənədlər', to: '/declarations', icon: <FileText size={18} /> },
    { label: 'Bildirişlər', to: '/notifications', icon: <Bell size={18} /> },
    { label: 'Profil', to: '/profile', icon: <User size={18} /> },
    { label: 'Sistem Tənzimləmələri', to: '/settings', icon: <Settings size={18} /> },
  ],
  departmentHead: [
    { label: 'İdarə Paneli', to: '/dashboard', icon: <LayoutDashboard size={18} /> },
    { label: 'Sənədlər', to: '/declarations', icon: <FileText size={18} /> },
    { label: 'İnspektorlar', to: '/inspectors', icon: <Users size={18} /> },
    { label: 'Əməkdaş İdarəetməsi', to: '/admin/staff', icon: <UserCog size={18} /> },
    { label: 'Jurnal', to: '/logs', icon: <Activity size={18} /> },
    { label: 'Bildirişlər', to: '/notifications', icon: <Bell size={18} /> },
    { label: 'Profil', to: '/profile', icon: <User size={18} /> },
    { label: 'Sistem Tənzimləmələri', to: '/settings', icon: <Settings size={18} /> },
  ],
  boss: [
    { label: 'İdarə Paneli', to: '/dashboard', icon: <LayoutDashboard size={18} /> },
    { label: 'Sənədlər', to: '/declarations', icon: <FileText size={18} /> },
    { label: 'Şöbələr', to: '/departments', icon: <Building2 size={18} /> },
    { label: 'İnspektorlar', to: '/inspectors', icon: <Users size={18} /> },
    { section: 'ADMİNİSTRASİYA', label: 'Əməkdaşlar və Şöbələr', to: '/admin/staff', icon: <UserCog size={18} /> },
    { label: 'Risk və Uyğunluq Reyestri', to: '/admin/reference', icon: <Database size={18} /> },
    { section: 'SİSTEM', label: 'Jurnal', to: '/logs', icon: <Activity size={18} /> },
    { label: 'Bildirişlər', to: '/notifications', icon: <Bell size={18} /> },
    { label: 'Profil', to: '/profile', icon: <User size={18} /> },
    { label: 'Sistem Tənzimləmələri', to: '/settings', icon: <Settings size={18} /> },
  ],
  pca: [
    { section: 'AUDİT', label: 'İdarə Paneli', to: '/dashboard', icon: <LayoutDashboard size={18} /> },
    { label: 'Şirkətlər', to: '/pca/companies', icon: <Building2 size={18} /> },
    { label: 'Anomaliyalar', to: '/pca/anomalies', icon: <AlertTriangle size={18} /> },
    { label: 'Tapıntılar', to: '/pca/findings', icon: <FileSearch size={18} /> },
    { label: 'İzləmə Siyahısı', to: '/pca/watchlist', icon: <Bookmark size={18} /> },
    { label: 'Audit Tarixçəsi', to: '/pca/timeline', icon: <Activity size={18} /> },
    { section: 'HESAB', label: 'Profil', to: '/profile', icon: <User size={18} /> },
    { label: 'Sistem Tənzimləmələri', to: '/settings', icon: <Settings size={18} /> },
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  // Close the mobile drawer on Escape, and prevent body scroll while it's open
  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSidebarOpen(false); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

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
    <div className={cn('app-shell', sidebarOpen && 'sidebar-open')}>
      <button
        type="button"
        className="sidebar-backdrop"
        aria-hidden={!sidebarOpen}
        aria-label="Yan menyunu bağla"
        onClick={() => setSidebarOpen(false)}
      />
      <aside className={cn('sidebar', sidebarOpen && 'open')}>
        <div className="brand">
          <div className="brand-mark"><LogoMark size={42} /></div>
          <div className="brand-text">
            <strong>Customs Analyzer</strong>
            <small>{role === 'pca' ? 'PCA Audit Mühiti' : 'Gömrük Sistemi'}</small>
          </div>
          <button
            type="button"
            className="sidebar-close"
            aria-label="Yan menyunu bağla"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>
        <nav>
          {nav.map((item, i) => (
            <React.Fragment key={item.to + i}>
              {item.section && <div className="nav-section">{item.section}</div>}
              <NavLink
                to={item.to}
                className={({ isActive }) => (isActive ? 'active' : '')}
                onClick={() => setSidebarOpen(false)}
              >
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
            © {new Date().getFullYear()} Customs Analyzer<br />Bütün hüquqlar qorunur
          </div>
        </div>
      </aside>

      <header className="header">
        <button
          type="button"
          className="sidebar-toggle"
          aria-label="Yan menyunu aç"
          aria-expanded={sidebarOpen}
          onClick={() => setSidebarOpen((v) => !v)}
        >
          <Menu size={20} />
        </button>
        <div className="spacer" />

        {role === 'pca' && (
          <div className="readonly-pill" title="Bu istifadəçi yalnız oxuma rejimindədir">
            <Eye size={14} /> Yalnız oxuma
          </div>
        )}

        <button className="btn btn-secondary btn-sm" onClick={() => setResetConfirmOpen(true)} title="Demo məlumatları ilkin vəziyyətə qaytar">
          <RefreshCw size={14} /> Demoyu Sıfırla
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
