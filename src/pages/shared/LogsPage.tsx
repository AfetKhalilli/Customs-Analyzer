import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentUser } from '../../store/authStore';
import { useDataStore } from '../../store/dataStore';
import { EmptyState, RoleChip } from '../../components/ui/Primitives';
import { formatDateTime, groupByDay } from '../../lib/utils';
import { LOG_ACTION_LABEL } from '../../lib/i18n';
import type { IndividualUser, LogAction } from '../../types';

const ACTION_LABELS = LOG_ACTION_LABEL;

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
      return logs.filter((l) => l.declarationId && declIds.has(l.declarationId));
    }
    return logs;
  }, [logs, declarations, user]);

  const [actionFilter, setActionFilter] = React.useState('');
  const [search, setSearch] = React.useState('');

  const filtered = visibleLogs.filter((l) => {
    if (actionFilter && l.action !== actionFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const idMatch = (l.declarationId ?? '').toLowerCase().includes(q);
      if (!idMatch && !l.actorDisplayName.toLowerCase().includes(q) && !l.description.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div>
      <h1>Sistem Jurnalı</h1>
      <p className="text-muted">{user.role === 'boss' ? 'Bütün sistem hadisələri' : 'Şöbə üzrə hadisələr'} · {filtered.length} qeyd</p>

      <div className="card">
        <div className="card-body">
          <div className="filter-bar">
            <input className="input search" placeholder="ID, istifadəçi adı və ya təsvir ilə axtarın..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="select" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
              <option value="">Bütün hadisələr</option>
              {(Object.entries(ACTION_LABELS) as [LogAction, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            {(actionFilter || search) && (
              <button className="btn btn-secondary btn-sm" onClick={() => { setActionFilter(''); setSearch(''); }}>Sıfırla</button>
            )}
          </div>

          {filtered.length === 0 ? (
            <EmptyState title="Jurnal qeydi tapılmadı" />
          ) : (
            <div className="timeline">
              {groupByDay(filtered).map((g) => (
                <div key={g.label} className="timeline-group">
                  <div className="tg-label">{g.label}</div>
                  {g.items.map((l) => (
                    <div key={l.id} className="timeline-item" style={{ cursor: l.declarationId ? 'pointer' : 'default' }}
                      onClick={() => { if (l.declarationId) navigate(`/declaration/${l.declarationId}`); }}>
                      <div className="ti-title">
                        <b>{l.actorDisplayName}</b> <RoleChip role={l.actorRole} /> · {l.description}
                      </div>
                      <div className="ti-meta">
                        {formatDateTime(l.at)}
                        {l.declarationId && <> · ID: <span className="mono">{l.declarationId.slice(-12)}</span></>}
                        {' · '}{ACTION_LABELS[l.action] ?? l.action}
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
