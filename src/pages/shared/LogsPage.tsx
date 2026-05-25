import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentUser } from '../../store/authStore';
import { useDataStore } from '../../store/dataStore';
import { EmptyState, RoleChip } from '../../components/ui/Primitives';
import { formatDateTime, groupByDay } from '../../lib/utils';
import type { IndividualUser } from '../../types';

const ACTION_LABELS: Record<string, string> = {
  UPLOAD: 'Yükləndi',
  AI_RUN: 'AI Qiymətləndirməsi',
  ASSIGNED: 'Təyin edildi',
  STATUS_CHANGE: 'Status dəyişikliyi',
  COMMENT: 'Şərh',
  CORRECTION_REQUESTED: 'Düzəliş tələbi',
  RESUBMITTED: 'Yenidən təqdim',
  DECISION: 'Qərar',
  AUTO_COMPLETED: 'Avtomatik tamamlanma',
  REASSIGNED: 'Müfəttiş dəyişikliyi',
  VIEWED_BY_PCA: 'PCA baxışı',
};

export function LogsPage() {
  const user = useCurrentUser()!;
  const navigate = useNavigate();
  const logs = useDataStore((s) => s.logs);
  const declarations = useDataStore((s) => s.declarations);

  // dept-head: filter to logs of declarations in their dept
  const visibleLogs = React.useMemo(() => {
    if (user.role === 'boss') return logs;
    if (user.role === 'departmentHead') {
      const dept = (user as IndividualUser).department;
      const declIds = new Set(declarations.filter((d) => d.department === dept).map((d) => d.id));
      return logs.filter((l) => declIds.has(l.declarationId));
    }
    return logs;
  }, [logs, declarations, user]);

  const [actionFilter, setActionFilter] = React.useState('');
  const [search, setSearch] = React.useState('');

  const filtered = visibleLogs.filter((l) => {
    if (actionFilter && l.action !== actionFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!l.declarationId.toLowerCase().includes(q) && !l.actorDisplayName.toLowerCase().includes(q) && !l.description.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div>
      <h1>Sistem jurnalı</h1>
      <p className="text-muted">{user.role === 'boss' ? 'Bütün hadisələr' : 'Şöbə hadisələri'} · {filtered.length} giriş</p>

      <div className="card">
        <div className="card-body">
          <div className="filter-bar">
            <input className="input search" placeholder="ID, ad və ya təsvir ilə axtar..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="select" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
              <option value="">Bütün hadisələr</option>
              {Object.entries(ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            {(actionFilter || search) && (
              <button className="btn btn-secondary btn-sm" onClick={() => { setActionFilter(''); setSearch(''); }}>Sıfırla</button>
            )}
          </div>

          {filtered.length === 0 ? (
            <EmptyState title="Heç bir giriş tapılmadı" />
          ) : (
            <div className="timeline">
              {groupByDay(filtered).map((g) => (
                <div key={g.label} className="timeline-group">
                  <div className="tg-label">{g.label}</div>
                  {g.items.map((l) => (
                    <div key={l.id} className="timeline-item" style={{ cursor: 'pointer' }} onClick={() => navigate(`/declaration/${l.declarationId}`)}>
                      <div className="ti-title">
                        <b>{l.actorDisplayName}</b> <RoleChip role={l.actorRole} /> · {l.description}
                      </div>
                      <div className="ti-meta">
                        {formatDateTime(l.at)} · ID: <span className="mono">{l.declarationId.slice(-12)}</span> · {ACTION_LABELS[l.action] ?? l.action}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
