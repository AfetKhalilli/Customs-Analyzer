import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentUser } from '../../store/authStore';
import { useDataStore } from '../../store/dataStore';
import { StatusBadge, RiskBadge, ChannelPill, EmptyState } from '../../components/ui/Primitives';
import { formatDate, formatDateTime, relativeTime } from '../../lib/utils';
import type { IndividualUser } from '../../types';

export function InspectorDashboard() {
  const user = useCurrentUser()! as IndividualUser;
  const navigate = useNavigate();
  const decls = useDataStore((s) => s.declarations).filter((d) => d.assignedInspectorId === user.id);

  const now = Date.now();
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(); startOfWeek.setDate(startOfWeek.getDate() - 7);

  const active = decls.filter((d) => !['Tamamlanmış', 'Rədd'].includes(d.status));
  const pendingPickup = decls.filter((d) => d.status === 'Yüklənib');
  const awaiting = decls.filter((d) => d.status === 'Düzəliş Tələb Olunur');
  const completedToday = decls.filter((d) => d.status === 'Tamamlanmış' && d.completedAt && new Date(d.completedAt) >= startOfToday);

  const thisWeekCompleted = decls.filter((d) => d.status === 'Tamamlanmış' && d.completedAt && new Date(d.completedAt) >= startOfWeek);
  const thisWeekDecided = decls.filter((d) => (d.status === 'Tamamlanmış' || d.status === 'Təsdiq' || d.status === 'Rədd') && d.completedAt && new Date(d.completedAt) >= startOfWeek);
  const approvedThisWeek = thisWeekDecided.filter((d) => d.status === 'Təsdiq' || (d.status === 'Tamamlanmış' && !d.rejectReason));
  const approvalRate = thisWeekDecided.length === 0 ? 0 : Math.round((approvedThisWeek.length / thisWeekDecided.length) * 100);
  const avgCycleHours = thisWeekCompleted.length === 0 ? 0 :
    Math.round(thisWeekCompleted.reduce((acc, d) => acc + (new Date(d.completedAt!).getTime() - new Date(d.uploadedAt).getTime()) / 3600_000, 0) / thisWeekCompleted.length * 10) / 10;

  const sorted = [...active].sort((a, b) => {
    if (a.ai.score !== b.ai.score) return b.ai.score - a.ai.score;
    return new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
  });

  return (
    <div>
      <h1>Müfəttiş İdarə Paneli</h1>
      <p className="text-muted">{user.firstName} {user.lastName} · {user.department} şöbəsi</p>

      <div className="kpi-grid">
        <div className="kpi-card blue clickable" onClick={() => navigate('/declarations')}>
          <div className="kpi-label">Aktiv işlər</div>
          <div className="kpi-value">{active.length}</div>
          <div className="kpi-hint">Davam edən bəyannamələr</div>
        </div>
        <div className="kpi-card amber clickable" onClick={() => navigate('/declarations?status=Yüklənib')}>
          <div className="kpi-label">Götürmə gözləyir</div>
          <div className="kpi-value">{pendingPickup.length}</div>
          <div className="kpi-hint">Yoxlamağa başlanmayıb</div>
        </div>
        <div className="kpi-card orange clickable" onClick={() => navigate('/declarations?status=Düzəliş Tələb Olunur')}>
          <div className="kpi-label">Düzəliş gözləyir</div>
          <div className="kpi-value">{awaiting.length}</div>
          <div className="kpi-hint">İstifadəçidən cavab</div>
        </div>
        <div className="kpi-card green clickable" onClick={() => navigate('/declarations?status=Tamamlanmış')}>
          <div className="kpi-label">Bu gün tamamlanıb</div>
          <div className="kpi-value">{completedToday.length}</div>
          <div className="kpi-hint">Son 24 saat</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-header"><h3>Mənə təyin olunmuş bəyannamələr</h3></div>
          <div className="card-body" style={{ padding: 0 }}>
            {sorted.length === 0 ? <EmptyState title="Aktiv iş yoxdur" hint="Hal-hazırda sizə təyin olunmuş aktiv bəyannamə yoxdur" /> : (
              <div className="table-wrap" style={{ border: 'none' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Sahib</th>
                      <th>Növ</th>
                      <th>Status</th>
                      <th>Risk</th>
                      <th>Kanal</th>
                      <th>Tarix</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((d) => (
                      <tr key={d.id} onClick={() => navigate(`/declaration/${d.id}`)}>
                        <td className="cell-id">{d.id.slice(-10)}</td>
                        <td>{d.ownerDisplayName}</td>
                        <td>{d.kind}</td>
                        <td><StatusBadge status={d.status} /></td>
                        <td><RiskBadge level={d.ai.riskLevel} score={d.ai.score} /></td>
                        <td><ChannelPill channel={d.ai.selectivityChannel} /></td>
                        <td>{relativeTime(d.uploadedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>Bu həftə statistika</h3></div>
          <div className="card-body">
            <div style={{ marginBottom: 14 }}>
              <small className="text-muted">Tamamlanan</small>
              <div className="font-bold text-lg">{thisWeekCompleted.length}</div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <small className="text-muted">Təsdiq nisbəti</small>
              <div className="font-bold text-lg">{approvalRate}%</div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <small className="text-muted">Orta dövr</small>
              <div className="font-bold text-lg">{avgCycleHours} saat</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
