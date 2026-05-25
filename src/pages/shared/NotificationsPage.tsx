import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { useCurrentUser } from '../../store/authStore';
import { useDataStore } from '../../store/dataStore';
import { EmptyState } from '../../components/ui/Primitives';
import { relativeTime, formatDateTime, cn } from '../../lib/utils';

export function NotificationsPage() {
  const user = useCurrentUser()!;
  const navigate = useNavigate();
  const notifications = useDataStore((s) => s.notifications.filter((n) => n.userId === user.id));
  const markRead = useDataStore((s) => s.markNotificationRead);
  const markAllRead = useDataStore((s) => s.markAllNotificationsRead);

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div>
      <div className="section-header">
        <div>
          <h1>Bildirişlər</h1>
          <p className="text-muted">{notifications.length} bildiriş ({unread} oxunmamış)</p>
        </div>
        {unread > 0 && (
          <button className="btn btn-secondary" onClick={() => markAllRead(user.id)}>
            <CheckCheck size={14} /> Hamısını oxunmuş et
          </button>
        )}
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {notifications.length === 0 ? (
            <EmptyState icon={<Bell size={24} />} title="Bildiriş yoxdur" hint="Sizə yeni bildiriş gəldikdə burada görünəcək" />
          ) : (
            <div>
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn('flex gap-3', !n.read && 'unread')}
                  style={{
                    padding: '14px 18px',
                    borderBottom: '1px solid var(--n-100)',
                    cursor: 'pointer',
                    background: !n.read ? 'var(--brand-50)' : undefined,
                  }}
                  onClick={() => { markRead(n.id); if (n.link) navigate(n.link); }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: typeColor(n.type), color: 'white',
                    display: 'grid', placeItems: 'center', flexShrink: 0,
                  }}>
                    <Bell size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: 'var(--n-900)' }}>{n.title}</div>
                    <div className="text-sm text-muted" style={{ marginTop: 2 }}>{n.body}</div>
                    <div className="text-sm text-muted" style={{ marginTop: 4 }}>
                      {formatDateTime(n.at)} · {relativeTime(n.at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function typeColor(type?: string) {
  switch (type) {
    case 'success': return '#16a34a';
    case 'error': return '#dc2626';
    case 'warning': return '#ea580c';
    default: return '#3b82f6';
  }
}
