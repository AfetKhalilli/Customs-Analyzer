import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { useDataStore } from '../../store/dataStore';
import { ALL_STATUSES } from '../../types';
import { formatDate, relativeTime } from '../../lib/utils';
import { usePortalPath } from '../../lib/routes';
import { Avatar, EmptyState } from '../../components/ui/Primitives';
import { STATUS_META } from '../../lib/constants';

export function BossDashboard() {
  const navigate = useNavigate();
  const pp = usePortalPath();
  const declarations = useDataStore((s) => s.declarations);
  const logs = useDataStore((s) => s.logs);
  const departments = useDataStore((s) => s.departments);

  // Aggregates are recomputed only when the declaration set changes — cheaper
  // than running these scans on every header/notification re-render.
  const k = React.useMemo(() => ({
    systemTotal: declarations.length,
    activeAll: declarations.filter((d) => !['Tamamlanmış', 'Rədd'].includes(d.status)).length,
    completedAll: declarations.filter((d) => d.status === 'Tamamlanmış' || d.status === 'Təsdiq').length,
    highRisk: declarations.filter((d) => d.ai.riskLevel === 'HIGH' || d.ai.riskLevel === 'CRITICAL').length,
    slaBreaches: declarations.filter((d) => {
      if (d.status !== 'Yoxlanılır') return false;
      const hours = (Date.now() - new Date(d.uploadedAt).getTime()) / 3600000;
      return hours > 48;
    }).length,
  }), [declarations]);

  // Line chart: declarations per day, last 30 days
  const lineData = React.useMemo(() => {
    const days = 30;
    const out: Record<string, any>[] = [];
    const now = new Date();
    // Pre-bucket by ISO date for O(N) instead of O(N*days)
    const byDate = new Map<string, Record<string, number>>();
    for (const decl of declarations) {
      const key = decl.uploadedAt.slice(0, 10);
      const row = byDate.get(key) ?? Object.fromEntries(ALL_STATUSES.map((s) => [s, 0]));
      row[decl.status] = (row[decl.status] || 0) + 1;
      byDate.set(key, row);
    }
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const row: any = { date: `${d.getDate()}.${d.getMonth() + 1}` };
      const bucket = byDate.get(key);
      for (const s of ALL_STATUSES) row[s] = bucket?.[s] ?? 0;
      out.push(row);
    }
    return out;
  }, [declarations]);

  // Department heatmap — single pass over declarations
  const heatmap = React.useMemo(() => {
    const idx = new Map<string, Record<string, number>>();
    for (const dept of departments) {
      idx.set(dept, Object.fromEntries(ALL_STATUSES.map((s) => [s, 0])));
    }
    for (const decl of declarations) {
      const row = idx.get(decl.department);
      if (row) row[decl.status] = (row[decl.status] || 0) + 1;
    }
    return departments.map((dept) => ({ department: dept, ...(idx.get(dept) as any) }));
  }, [departments, declarations]);

  // Top AI flag codes
  const topFlags = React.useMemo(() => {
    const flagCounts: Record<string, number> = {};
    for (const d of declarations) {
      for (const f of d.ai.flags) flagCounts[f.code] = (flagCounts[f.code] || 0) + 1;
    }
    return Object.entries(flagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([code, count]) => ({ code, count }));
  }, [declarations]);

  return (
    <div>
      <div className="section-header">
        <div>
          <h1>Baş Direktor Paneli</h1>
          <p className="text-muted">Sistem geneli görünüş və analitika</p>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card blue clickable" onClick={() => navigate(pp('/declarations'))}>
          <div className="kpi-label">Ümumi sistem</div>
          <div className="kpi-value">{k.systemTotal}</div>
          <div className="kpi-hint">Bütün sənədlər</div>
        </div>
        <div className="kpi-card purple clickable" onClick={() => navigate(pp('/declarations?status=Yoxlanılır'))}>
          <div className="kpi-label">Aktiv</div>
          <div className="kpi-value">{k.activeAll}</div>
          <div className="kpi-hint">İşlənməkdə</div>
        </div>
        <div className="kpi-card green clickable" onClick={() => navigate(pp('/declarations?status=Tamamlanmış'))}>
          <div className="kpi-label">Tamamlanmış</div>
          <div className="kpi-value">{k.completedAll}</div>
          <div className="kpi-hint">Bitmiş</div>
        </div>
        <div className="kpi-card red clickable" onClick={() => navigate(pp('/pca/companies'))}>
          <div className="kpi-label">Yüksək risk</div>
          <div className="kpi-value">{k.highRisk}</div>
          <div className="kpi-hint">HIGH + CRITICAL</div>
        </div>
        <div className="kpi-card orange clickable" onClick={() => navigate(pp('/declarations?status=Yoxlanılır'))}>
          <div className="kpi-label">SLA pozuntusu</div>
          <div className="kpi-value">{k.slaBreaches}</div>
          <div className="kpi-hint">48 saatdan çox</div>
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-header"><h3>30 günlük axın</h3></div>
        <div className="card-body" style={{ height: 320 }}>
          <ResponsiveContainer>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--n-200)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="Yüklənib" stroke="#3b82f6" strokeWidth={2} />
              <Line type="monotone" dataKey="Yoxlanılır" stroke="#8b5cf6" strokeWidth={2} />
              <Line type="monotone" dataKey="Təsdiq" stroke="#10b981" strokeWidth={2} />
              <Line type="monotone" dataKey="Rədd" stroke="#ef4444" strokeWidth={2} />
              <Line type="monotone" dataKey="Tamamlanmış" stroke="#6b7280" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="form-row cols-2">
        <div className="card">
          <div className="card-header"><h3>Şöbə xəritəsi</h3></div>
          <div className="card-body" style={{ overflow: 'auto' }}>
            <table className="table" style={{ minWidth: 600 }}>
              <thead>
                <tr>
                  <th>Şöbə</th>
                  {ALL_STATUSES.map((s) => <th key={s} className="cell-num" style={{ fontSize: 10 }}>{s.slice(0, 8)}</th>)}
                </tr>
              </thead>
              <tbody>
                {heatmap.map((row) => (
                  <tr key={row.department} onClick={() => navigate(pp(`/declarations?dept=${row.department}`))}>
                    <td><b>{row.department}</b></td>
                    {ALL_STATUSES.map((s) => {
                      const v = row[s] as number;
                      const meta = STATUS_META[s];
                      return (
                        <td key={s} className="cell-num"
                            onClick={(e) => { e.stopPropagation(); if (v > 0) navigate(pp(`/declarations?dept=${row.department}&status=${s}`)); }}
                            style={v > 0 ? { background: meta.bg, color: meta.text, fontWeight: 600, cursor: 'pointer' } : undefined}>
                          {v || '—'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>Top 5 AI əlamətləri</h3></div>
          <div className="card-body" style={{ height: 320 }}>
            {topFlags.length === 0 ? (
              <EmptyState title="Hələ AI əlamətləri yoxdur" />
            ) : (
              <ResponsiveContainer>
                <BarChart data={topFlags} layout="vertical"
                          onClick={(e: any) => {
                            const code = e?.activePayload?.[0]?.payload?.code;
                            if (code) navigate(pp(`/declarations?q=${encodeURIComponent(code)}`));
                          }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--n-200)" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="code" type="category" tick={{ fontSize: 10 }} width={160} />
                  <Tooltip />
                  <Bar dataKey="count" fill="var(--brand-500)" style={{ cursor: 'pointer' }} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="card mt-3">
        <div className="card-header"><h3>Sistem aktivlik kanalı</h3></div>
        <div className="card-body">
          {logs.slice(0, 20).length === 0 ? (
            <EmptyState title="Hələ aktivlik yoxdur" />
          ) : (
            <div className="activity-feed">
              {logs.slice(0, 20).map((l) => (
                <div key={l.id} className="activity-item"
                     onClick={() => l.declarationId && navigate(pp(`/declaration/${l.declarationId}`))}
                     style={{ cursor: l.declarationId ? 'pointer' : 'default' }}>
                  <Avatar name={l.actorDisplayName} size="sm" />
                  <div className="a-body">
                    <div className="a-text">
                      <b>{l.actorDisplayName}</b> — {l.description}
                    </div>
                    <div className="a-time">{relativeTime(l.at)}{l.declarationId ? ` · ${l.declarationId.slice(-8)}` : ''}</div>
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
