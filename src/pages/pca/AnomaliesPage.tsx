import React from 'react';
import { useDataStore } from '../../store/dataStore';
import { EmptyState } from '../../components/ui/Primitives';
import { formatDateTime, relativeTime } from '../../lib/utils';
import { AlertTriangle, X, RotateCcw } from 'lucide-react';
import { toast } from '../../store/toastStore';
import { ANOMALY_PATTERN_LABEL } from '../../lib/i18n';

export function AnomaliesPage() {
  const anomalies = useDataStore((s) => s.pcaAnomalies);
  const dismiss = useDataStore((s) => s.dismissAnomaly);
  const restore = useDataStore((s) => s.restoreAnomaly);
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
  const dismissedCount = anomalies.filter((a) => a.dismissed).length;

  const handleDismiss = (id: string) => {
    dismiss(id);
    toast.info('Anomaliya gizlədildi — «Gizlədilmişləri göstər» ilə bərpa edə bilərsiniz');
  };
  const handleRestore = (id: string) => {
    restore(id);
    toast.success('Anomaliya bərpa edildi');
  };

  return (
    <div>
      <div className="section-header">
        <div>
          <h1>Anomaliya Aşkarlama</h1>
          <p className="text-muted">Süni intellekt tərəfindən aşkarlanan şübhəli davranış nümunələri</p>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="banner info" style={{ marginBottom: 12 }}>
            <AlertTriangle size={18} />
            <div className="b-body">
              <div className="b-title">«Gizlət» nə üçündür?</div>
              <div>Yanlış-müsbət və ya artıq araşdırılmış anomaliyanı siyahıdan müvəqqəti gizlədir — qeyd silinmir. İstənilən vaxt «Gizlədilmişləri göstər» seçimi ilə baxıb «Bərpa et» düyməsi ilə geri qaytara bilərsiniz.</div>
            </div>
          </div>
          <div className="filter-bar">
            <select className="select" value={sevFilter} onChange={(e) => setSevFilter(e.target.value)}>
              <option value="">Bütün şiddət səviyyələri</option>
              <option value="Kritik">Kritik</option>
              <option value="Yüksək">Yüksək</option>
              <option value="Orta">Orta</option>
              <option value="Aşağı">Aşağı</option>
            </select>
            <select className="select" value={patternFilter} onChange={(e) => setPatternFilter(e.target.value)}>
              <option value="">Bütün nümunələr</option>
              {patterns.map((p) => <option key={p} value={p}>{ANOMALY_PATTERN_LABEL[p] ?? p}</option>)}
            </select>
            <label className="checkbox-row" style={{ alignItems: 'center', margin: 0 }}>
              <input type="checkbox" checked={showDismissed} onChange={(e) => setShowDismissed(e.target.checked)} />
              <span>Gizlədilmişləri göstər{dismissedCount > 0 ? ` (${dismissedCount})` : ''}</span>
            </label>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<AlertTriangle size={24} />}
              title="Anomaliya aşkarlanmayıb"
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
                        <strong>{ANOMALY_PATTERN_LABEL[a.patternCode] ?? a.patternLabel}</strong>
                        <span className="badge" style={{ background: 'rgba(255,255,255,.5)', fontSize: 11 }}>{a.severity}</span>
                        {a.dismissed && <span className="badge" style={{ background: 'var(--n-200)', color: 'var(--n-600)' }}>Gizlədilib</span>}
                      </div>
                      <div style={{ fontSize: 13 }}>{a.description}</div>
                      <div style={{ fontSize: 11, marginTop: 6, opacity: 0.7 }}>
                        {formatDateTime(a.detectedAt)} ({relativeTime(a.detectedAt)})
                        {a.affectedDeclarationIds.length > 0 && ` · ${a.affectedDeclarationIds.length} sənəd təsirlənib`}
                      </div>
                    </div>
                    {a.dismissed ? (
                      <button className="btn btn-secondary btn-sm" onClick={() => handleRestore(a.id)}>
                        <RotateCcw size={14} /> Bərpa et
                      </button>
                    ) : (
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDismiss(a.id)} title="Anomaliyanı siyahıdan müvəqqəti gizlət (silmir)">
                        <X size={14} /> Gizlət
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
