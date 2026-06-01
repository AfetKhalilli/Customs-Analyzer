import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentUser } from '../../store/authStore';
import { useDataStore } from '../../store/dataStore';
import { Tabs, StatusBadge, RiskBadge, Avatar, RoleChip, EmptyState } from '../../components/ui/Primitives';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import { formatDate, relativeTime, groupByDay } from '../../lib/utils';
import { usePortalPath } from '../../lib/routes';
import type { IndividualUser } from '../../types';

export function DeptHeadDashboard() {
  const user = useCurrentUser()! as IndividualUser;
  const navigate = useNavigate();
  const pp = usePortalPath();
  const allDecls = useDataStore((s) => s.declarations);
  const users = useDataStore((s) => s.users);
  const logs = useDataStore((s) => s.logs);

  const dept = user.department;
  const decls = allDecls.filter((d) => d.department === dept);
  const inspectors = users.filter((u) => u.role === 'inspector' && u.entityType === 'individual' && (u as IndividualUser).department === dept) as IndividualUser[];

  const total = decls.length;
  const pending = decls.filter((d) => d.status === 'Yüklənib').length;
  const inReview = decls.filter((d) => d.status === 'Yoxlanılır').length;
  const now = Date.now();
  const slaRisk = decls.filter((d) => d.status === 'Yoxlanılır' && (now - new Date(d.uploadedAt).getTime()) > 48 * 3600_000).length;
  const startOfWeek = Date.now() - 7 * 86400_000;
  const completedThisWeek = decls.filter((d) => d.status === 'Tamamlanmış' && d.completedAt && new Date(d.completedAt).getTime() >= startOfWeek).length;

  const chartData = inspectors.map((i) => ({
    name: i.firstName,
    Aktiv: allDecls.filter((d) => d.assignedInspectorId === i.id && !['Tamamlanmış', 'Rədd'].includes(d.status)).length,
    Tamamlanmış: allDecls.filter((d) => d.assignedInspectorId === i.id && d.status === 'Tamamlanmış').length,
  }));

  const [tab, setTab] = React.useState('active');

  const activeDecls = decls.filter((d) => !['Tamamlanmış', 'Rədd'].includes(d.status)).sort((a, b) => b.ai.score - a.ai.score);
  const deptDeclIds = new Set(decls.map((d) => d.id));
  const deptLogs = logs.filter((l) => deptDeclIds.has(l.declarationId)).slice(0, 20);

  return (
    <div>
      <h1>{dept} — Şöbə İdarə Paneli</h1>
      <p className="text-muted">Şöbə rəisi: {user.firstName} {user.lastName}</p>

      <div className="kpi-grid">
        <div className="kpi-card blue clickable"   onClick={() => navigate(pp(`/declarations?dept=${dept}`))}>
          <div className="kpi-label">Şöbə üzrə cəmi</div><div className="kpi-value">{total}</div>
        </div>
        <div className="kpi-card amber clickable"  onClick={() => navigate(pp(`/declarations?dept=${dept}&status=Yüklənib`))}>
          <div className="kpi-label">Yüklənib</div><div className="kpi-value">{pending}</div>
        </div>
        <div className="kpi-card purple clickable" onClick={() => navigate(pp(`/declarations?dept=${dept}&status=Yoxlanılır`))}>
          <div className="kpi-label">Yoxlanılır</div><div className="kpi-value">{inReview}</div>
        </div>
        <div className="kpi-card red clickable"    onClick={() => navigate(pp(`/declarations?dept=${dept}&status=Yoxlanılır`))}>
          <div className="kpi-label">SLA Riski</div><div className="kpi-value">{slaRisk}</div><div className="kpi-hint">48 saatdan çox</div>
        </div>
        <div className="kpi-card green clickable"  onClick={() => navigate(pp(`/declarations?dept=${dept}&status=Tamamlanmış`))}>
          <div className="kpi-label">Bu həftə tamam</div><div className="kpi-value">{completedThisWeek}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card">
          <div className="card-header"><h3>İnspektor yükü</h3></div>
          <div className="card-body" style={{ height: 280 }}>
            {chartData.length === 0 ? <EmptyState title="İnspektor yoxdur" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--n-200)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="Aktiv" fill="#3b82f6" />
                  <Bar dataKey="Tamamlanmış" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>Şöbə fəaliyyəti</h3></div>
          <div className="card-body" style={{ maxHeight: 280, overflowY: 'auto' }}>
            {deptLogs.length === 0 ? <p className="text-muted">Fəaliyyət yoxdur</p> : (
              <div className="activity-feed">
                {deptLogs.map((l) => (
                  <div key={l.id} className="activity-item" onClick={() => navigate(pp(`/declaration/${l.declarationId}`))} style={{ cursor: 'pointer' }}>
                    <Avatar name={l.actorDisplayName} size="sm" />
                    <div className="a-body">
                      <div className="a-text"><b>{l.actorDisplayName}</b> · {l.description}</div>
                      <div className="a-time">{relativeTime(l.at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <Tabs value={tab} onChange={setTab} items={[
            { value: 'active', label: 'Aktiv işlər', count: activeDecls.length },
            { value: 'inspectors', label: 'İnspektorlar', count: inspectors.length },
          ]} />

          {tab === 'active' && (
            activeDecls.length === 0 ? <EmptyState title="Aktiv iş yoxdur" /> : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr><th>Qeydiyyat №</th><th>Sahib</th><th>Cari Vəziyyət</th><th>Risk Göstəricisi</th><th>Təyin edilmiş İnspektor</th><th>Qəbul Tarixi</th></tr>
                  </thead>
                  <tbody>
                    {activeDecls.map((d) => {
                      const insp = users.find((u) => u.id === d.assignedInspectorId);
                      const inspName = insp?.entityType === 'individual' ? `${insp.firstName} ${insp.lastName}` : '—';
                      return (
                        <tr key={d.id} onClick={() => navigate(pp(`/declaration/${d.id}`))}>
                          <td className="cell-id">{d.id.slice(-10)}</td>
                          <td>{d.ownerDisplayName}</td>
                          <td><StatusBadge status={d.status} /></td>
                          <td><RiskBadge level={d.ai.riskLevel} score={d.ai.score} /></td>
                          <td>{inspName}</td>
                          <td>{formatDate(d.uploadedAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}

          {tab === 'inspectors' && (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Ad</th><th>FIN</th><th>Aktiv</th><th>Tamam</th></tr>
                </thead>
                <tbody>
                  {inspectors.map((i) => {
                    const a = allDecls.filter((d) => d.assignedInspectorId === i.id && !['Tamamlanmış', 'Rədd'].includes(d.status)).length;
                    const c = allDecls.filter((d) => d.assignedInspectorId === i.id && d.status === 'Tamamlanmış').length;
                    return (
                      <tr key={i.id} onClick={() => navigate(pp('/inspectors'))}>
                        <td><Avatar name={`${i.firstName} ${i.lastName}`} size="sm" /> {i.firstName} {i.lastName}</td>
                        <td className="mono">{i.fin}</td>
                        <td>{a}</td>
                        <td>{c}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
