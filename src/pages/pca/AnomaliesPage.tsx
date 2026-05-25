import React from 'react';
import { useDataStore } from '../../store/dataStore';
import { EmptyState } from '../../components/ui/Primitives';
import { formatDateTime, relativeTime } from '../../lib/utils';
import { AlertTriangle, X } from 'lucide-react';
import { toast } from '../../store/toastStore';

export function AnomaliesPage() {
  const anomalies = useDataStore((s) => s.pcaAnomalies);
  const dismiss = useDataStore((s) => s.dismissAnomaly);
  const [showDismissed, setShowDismissed] = React.useState(false);
  const [sevFilter, setSevFilter] = React.useState('');
  const [patternFilter, setPatternFilter] = React.useState('');

  const filtered = anomalies.filter((a) => {
    if (!showDismissed && a.dismissed) return false;
    if (sevFilter && a.severity !== sevFilter) return false;
    if (patternFilter && a.patternCode !== patternFilter) return false;
    return true;
  });

  const patterns = Array.from(new Set(anomalies.map((a) => a.patternCode)));

  const handleDismiss = (id: string) => {
    dismiss(id);
    toast.info('Anomaliya gizlədildi');
  };

  return (
    <div>
      <div className="section-header">
        <div>
          <h1>Anomaliyalar</h1>
          <p className="text-muted">AI tərəfindən aşkarlanan davranış nümunələri</p>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="filter-bar">
            <select className="select" value={sevFilter} onChange={(e) => setSevFilter(e.target.value)}>
              <option value="">Bütün şiddətlər</option>
              <option value="Kritik">Kritik</option>
              <option value="Yüksək">Yüksək</option>
              <option value="Orta">Orta</option>
              <option value="Aşağı">Aşağı</option>
            </select>
            <select className="select" value={patternFilter} onChange={(e) => setPatternFilter(e.target.value)}>
              <option value="">Bütün nümunələr</option>
              {patterns.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <label className="checkbox-row" style={{ alignItems: 'center', margin: 0 }}>
              <input type="checkbox" checked={showDismissed} onChange={(e) => setShowDismissed(e.target.checked)} />
              <span>İmtina edilmişləri göstər</span>
            </label>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<AlertTriangle size={24} />}
              title="Anomaliya yoxdur"
              hint="Hazırda göstərilən filtrlər üçün anomaliya tapılmadı"
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filtered.map((a) => {
                const sev = a.severity === 'Kritik' || a.severity === 'Yüksək' ? 'critical' : a.severity === 'Orta' ? 'warning' : 'info';
                return (
                  <div key={a.id} className={`ai-flag ${sev}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <strong>{a.patternLabel}</strong>
                        <span className="badge" style={{ background: 'rgba(255,255,255,.5)', fontSize: 11 }}>{a.severity}</span>
                        {a.dismissed && <span className="badge" style={{ background: 'var(--n-200)', color: 'var(--n-600)' }}>İmtina</span>}
                      </div>
                      <div style={{ fontSize: 13 }}>{a.description}</div>
                      <div style={{ fontSize: 11, marginTop: 6, opacity: 0.7 }}>
                        {formatDateTime(a.detectedAt)} ({relativeTime(a.detectedAt)})
                        {a.affectedDeclarationIds.length > 0 && ` · ${a.affectedDeclarationIds.length} bəyannamə təsirlənir`}
                      </div>
                    </div>
                    {!a.dismissed && (
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDismiss(a.id)}>
                        <X size={14} /> İmtina
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
