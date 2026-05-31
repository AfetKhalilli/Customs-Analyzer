import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataStore } from '../../store/dataStore';
import { EmptyState } from '../../components/ui/Primitives';
import { formatDateTime, groupByDay } from '../../lib/utils';
import { Activity } from 'lucide-react';
import { LOG_ACTION_LABEL } from '../../lib/i18n';

export function AuditTimeline() {
  const navigate = useNavigate();
  const logs = useDataStore((s) => s.logs);
  const declarations = useDataStore((s) => s.declarations);

  // Only PCA-relevant logs: VIEWED_BY_PCA + status changes on finalized declarations
  const finalizedIds = new Set(declarations.filter((d) => ['Təsdiq', 'Rədd', 'Tamamlanmış'].includes(d.status)).map((d) => d.id));
  const relevant = logs.filter((l) =>
    l.action === 'VIEWED_BY_PCA' ||
    (l.declarationId && finalizedIds.has(l.declarationId))
  );

  const [actionFilter, setActionFilter] = React.useState('');
  const filtered = relevant.filter((l) => !actionFilter || l.action === actionFilter);
  const actions = Array.from(new Set(relevant.map((l) => l.action)));

  return (
    <div>
      <div className="section-header">
        <div>
          <h1>Audit Tarixçəsi</h1>
          <p className="text-muted">PCA ilə bağlı bütün fəaliyyətlərin xronoloji izi</p>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="filter-bar">
            <select className="select" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
              <option value="">Bütün əməliyyatlar</option>
              {actions.map((a) => <option key={a} value={a}>{LOG_ACTION_LABEL[a] ?? a}</option>)}
            </select>
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon={<Activity size={24} />} title="Tarixçə qeydi yoxdur" />
          ) : (
            <div className="timeline">
              {groupByDay(filtered.slice(0, 200)).map((g) => (
                <div key={g.label} className="timeline-group">
                  <div className="tg-label">{g.label}</div>
                  {g.items.map((l) => (
                    <div key={l.id} className="timeline-item">
                      <div className="ti-title">
                        <b>{l.actorDisplayName}</b> · {l.description}
                      </div>
                      <div className="ti-meta">
                        {formatDateTime(l.at)} · {LOG_ACTION_LABEL[l.action] ?? l.action}
                        {l.declarationId && (
                          <>
                            {' · '}
                            <a href="#" onClick={(e) => { e.preventDefault(); navigate(`/declaration/${l.declarationId}`); }}>
                              {l.declarationId.slice(-8)}
                            </a>
                          </>
                        )}
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
