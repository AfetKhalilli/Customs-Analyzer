import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentUser } from '../../store/authStore';
import { useDataStore } from '../../store/dataStore';
import { StatusBadge, RiskBadge, ChannelPill, EmptyState } from '../../components/ui/Primitives';
import { relativeTime } from '../../lib/utils';
import { formatInspectionDeadline, DECLARATION_KIND_LABEL } from '../../lib/i18n';
import type { IndividualUser } from '../../types';

export function InspectorDashboard() {
  const user = useCurrentUser()! as IndividualUser;
  const navigate = useNavigate();
  const decls = useDataStore((s) => s.declarations).filter((d) => d.assignedInspectorId === user.id);

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

  // Yoxlama son tarixləri: müddəti keçmiş və yaxınlaşan (≤24 saat)
  const overdueCount = active.filter((d) => d.inspectionDeadline && formatInspectionDeadline(d.inspectionDeadline).overdue).length;
  const dueSoonCount = active.filter((d) => {
    if (!d.inspectionDeadline) return false;
    const di = formatInspectionDeadline(d.inspectionDeadline);
    return !di.overdue && di.hours >= 0 && di.hours <= 24;
  }).length;

  return (
    <div>
      <h1>Müfəttiş İdarəetmə Paneli</h1>
      <p className="text-muted">{user.firstName} {user.lastName} · {user.department} şöbəsi</p>

      <div className="kpi-grid">
        <div className="kpi-card blue clickable" onClick={() => navigate('/declarations')}>
          <div className="kpi-label">Aktiv Audit İşləri</div>
          <div className="kpi-value">{active.length}</div>
          <div className="kpi-hint">Davam edən sənədlər</div>
        </div>
        <div className="kpi-card amber clickable" onClick={() => navigate('/declarations?status=Yüklənib')}>
          <div className="kpi-label">Yoxlamaya Götürülməyib</div>
          <div className="kpi-value">{pendingPickup.length}</div>
          <div className="kpi-hint">Audit başlanmalıdır</div>
        </div>
        <div className="kpi-card red">
          <div className="kpi-label">Müddəti Keçmiş</div>
          <div className="kpi-value">{overdueCount}</div>
          <div className="kpi-hint">2 iş günü tamamlanıb</div>
        </div>
        <div className="kpi-card orange">
          <div className="kpi-label">Müddət Bitir (24 saat)</div>
          <div className="kpi-value">{dueSoonCount}</div>
          <div className="kpi-hint">Yaxınlaşan son tarix</div>
        </div>
        <div className="kpi-card orange clickable" onClick={() => navigate('/declarations?status=Düzəliş Tələb Olunur')}>
          <div className="kpi-label">Düzəliş Gözləyir</div>
          <div className="kpi-value">{awaiting.length}</div>
          <div className="kpi-hint">İstifadəçidən cavab</div>
        </div>
        <div className="kpi-card green clickable" onClick={() => navigate('/declarations?status=Tamamlanmış')}>
          <div className="kpi-label">Bu Gün Bağlanıb</div>
          <div className="kpi-value">{completedToday.length}</div>
          <div className="kpi-hint">Son 24 saat</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-header"><h3>Mənə Təyin Olunmuş Sənədlər</h3></div>
          <div className="card-body" style={{ padding: 0 }}>
            {sorted.length === 0 ? <EmptyState title="Aktiv audit işi yoxdur" hint="Hal-hazırda sizə təyin olunmuş aktiv sənəd yoxdur" /> : (
              <div className="table-wrap" style={{ border: 'none' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Qeydiyyat №</th>
                      <th>Sahib</th>
                      <th>Sənəd Növü</th>
                      <th>Cari Vəziyyət</th>
                      <th>Risk Göstəricisi</th>
                      <th>Seçicilik Dəhlizi</th>
                      <th>Yoxlama Müddəti</th>
                      <th>Qəbul Vaxtı</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((d) => {
                      const di = d.inspectionDeadline ? formatInspectionDeadline(d.inspectionDeadline) : null;
                      return (
                        <tr key={d.id} onClick={() => navigate(`/declaration/${d.id}`)}>
                          <td className="cell-id">{d.id.slice(-10)}</td>
                          <td>{d.ownerDisplayName}</td>
                          <td>{DECLARATION_KIND_LABEL[d.kind] ?? d.kind}</td>
                          <td><StatusBadge status={d.status} /></td>
                          <td><RiskBadge level={d.ai.riskLevel} score={d.ai.score} /></td>
                          <td><ChannelPill channel={d.ai.selectivityChannel} /></td>
                          <td>
                            {di ? (
                              <span style={{ color: di.overdue ? '#991b1b' : di.hours <= 24 ? '#9a3412' : 'var(--n-700)', fontWeight: di.overdue ? 600 : 400 }}>
                                {di.label}
                              </span>
                            ) : <span className="text-muted">—</span>}
                          </td>
                          <td>{relativeTime(d.uploadedAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>Bu Həftəki Göstəricilər</h3></div>
          <div className="card-body">
            <div style={{ marginBottom: 14 }}>
              <small className="text-muted">Tamamlanan Audit Sayı</small>
              <div className="font-bold text-lg">{thisWeekCompleted.length}</div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <small className="text-muted">Təsdiq Nisbəti</small>
              <div className="font-bold text-lg">{approvalRate}%</div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <small className="text-muted">Orta Audit Dövrü</small>
              <div className="font-bold text-lg">{avgCycleHours} saat</div>
            </div>
            <div style={{ marginBottom: 14, padding: 8, background: 'var(--n-50)', borderRadius: 6 }}>
              <small className="text-muted">Maksimum Yoxlama Müddəti</small>
              <div className="font-bold text-lg">2 iş günü</div>
              <div className="text-muted text-sm">Audit başlandıqda son tarix avtomatik hesablanır</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
