import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataStore } from '../../store/dataStore';
import { useCurrentUser } from '../../store/authStore';
import { PCAStatusBadge, PCARiskBadge, EmptyState, Pagination, Modal } from '../../components/ui/Primitives';
import { formatDate, formatCurrency, relativeTime } from '../../lib/utils';
import { AlertTriangle, ShieldAlert, MoreVertical } from 'lucide-react';
import { toast } from '../../store/toastStore';
import type { PCAStatus, PCARiskBand, PCACase } from '../../types';

export function PCADashboard() {
  const navigate = useNavigate();
  const user = useCurrentUser()!;
  const cases = useDataStore((s) => s.pcaCases);
  const anomalies = useDataStore((s) => s.pcaAnomalies);
  const logPCAView = useDataStore((s) => s.logPCAView);
  const setPCACaseStatus = useDataStore((s) => s.setPCACaseStatus);
  const declarations = useDataStore((s) => s.declarations);
  const [caseInWorkflow, setCaseInWorkflow] = React.useState<PCACase | null>(null);

  const [search, setSearch] = React.useState('');
  const [riskFilter, setRiskFilter] = React.useState<string>('');
  const [statusFilter, setStatusFilter] = React.useState<string>('');
  const [page, setPage] = React.useState(1);
  const pageSize = 15;

  const k = {
    total: cases.length,
    critical: cases.filter((c) => c.riskBand === 'Kritik').length,
    high: cases.filter((c) => c.riskBand === 'Yüksək').length,
    dutyAtRisk: cases.reduce((a, c) => a + c.dutyAtRisk, 0),
    avgScore: cases.length > 0 ? Math.round(cases.reduce((a, c) => a + c.riskScore, 0) / cases.length) : 0,
    closed: cases.filter((c) => c.status === 'Closed').length,
  };

  const riskDistribution: Record<PCARiskBand, number> = {
    'Aşağı': cases.filter((c) => c.riskBand === 'Aşağı').length,
    'Orta':  cases.filter((c) => c.riskBand === 'Orta').length,
    'Yüksək':cases.filter((c) => c.riskBand === 'Yüksək').length,
    'Kritik':cases.filter((c) => c.riskBand === 'Kritik').length,
  };
  const maxRisk = Math.max(1, ...Object.values(riskDistribution));

  const filtered = cases.filter((c) => {
    if (riskFilter && c.riskBand !== riskFilter) return false;
    if (statusFilter && c.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!c.companyName.toLowerCase().includes(q) && !c.id.toLowerCase().includes(q) && !c.declarationId.toLowerCase().includes(q)) return false;
    }
    return true;
  }).sort((a, b) => b.riskScore - a.riskScore);

  const slice = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Top 10 high-risk companies
  const byCompany = new Map<string, { name: string; count: number; avgScore: number; totalDuty: number }>();
  for (const c of cases) {
    const cur = byCompany.get(c.companyId) ?? { name: c.companyName, count: 0, avgScore: 0, totalDuty: 0 };
    cur.count++;
    cur.avgScore += c.riskScore;
    cur.totalDuty += c.dutyAtRisk;
    byCompany.set(c.companyId, cur);
  }
  const topCompanies = Array.from(byCompany.entries()).map(([id, v]) => ({
    id, name: v.name, count: v.count,
    avgScore: Math.round(v.avgScore / v.count),
    totalDuty: v.totalDuty,
  })).sort((a, b) => b.avgScore - a.avgScore).slice(0, 10);

  const openCase = (declarationId: string) => {
    logPCAView(declarationId, user);
    navigate(`/declaration/${declarationId}`);
  };

  return (
    <div>
      <div className="section-header">
        <div>
          <h1>PCA — Buraxılış Sonrası Yoxlama Sistemi</h1>
          <p className="text-muted">Təsdiqlənmiş sənədlərin audit və risk idarəetmə sistemi</p>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card blue clickable" onClick={() => navigate('/pca/companies')}>
          <div className="kpi-label">Ümumi iş</div>
          <div className="kpi-value">{k.total}</div>
          <div className="kpi-hint">Bütün PCA işləri</div>
        </div>
        <div className="kpi-card red clickable" onClick={() => setRiskFilter('Kritik')}>
          <div className="kpi-label">Kritik risk</div>
          <div className="kpi-value">{k.critical}</div>
          <div className="kpi-hint">Təcili nəzərdən keçirilməli</div>
        </div>
        <div className="kpi-card orange clickable" onClick={() => setRiskFilter('Yüksək')}>
          <div className="kpi-label">Yüksək risk</div>
          <div className="kpi-value">{k.high}</div>
          <div className="kpi-hint">Diqqət tələb edir</div>
        </div>
        <div className="kpi-card amber">
          <div className="kpi-label">Risk altında rüsum</div>
          <div className="kpi-value" style={{ fontSize: 18 }}>{formatCurrency(k.dutyAtRisk)}</div>
          <div className="kpi-hint">Potensial itki</div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-label">Ort. risk skoru</div>
          <div className="kpi-value">{k.avgScore}</div>
          <div className="kpi-hint">/ 100</div>
        </div>
        <div className="kpi-card green clickable" onClick={() => setStatusFilter('Closed')}>
          <div className="kpi-label">Bağlı iş</div>
          <div className="kpi-value">{k.closed}</div>
          <div className="kpi-hint">Tamamlanmış</div>
        </div>
      </div>

      <div className="form-row cols-2 mb-3">
        <div className="card">
          <div className="card-header"><h3>Risk paylanması</h3></div>
          <div className="card-body">
            <div className="risk-bars">
              {(['Aşağı', 'Orta', 'Yüksək', 'Kritik'] as PCARiskBand[]).map((band) => {
                const v = riskDistribution[band];
                const cls = band === 'Aşağı' ? 'low' : band === 'Orta' ? 'medium' : band === 'Yüksək' ? 'high' : 'critical';
                return (
                  <div key={band} className={`risk-bar ${cls}`}>
                    <div className="rb-label">{band}</div>
                    <div className="rb-track">
                      <div className="rb-fill" style={{ width: `${(v / maxRisk) * 100}%` }} />
                    </div>
                    <div className="rb-count">{v}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>Top 10 yüksək riskli şirkət</h3></div>
          <div className="card-body" style={{ padding: 0 }}>
            {topCompanies.length === 0 ? (
              <EmptyState title="Hələ məlumat yoxdur" />
            ) : (
              <table className="table table-dense">
                <thead>
                  <tr><th>Şirkət</th><th>İşlər</th><th>Ort. skor</th><th>Rüsum risk</th></tr>
                </thead>
                <tbody>
                  {topCompanies.map((c) => (
                    <tr key={c.id} onClick={() => navigate(`/pca/company/${c.id}`)}>
                      <td><b>{c.name}</b></td>
                      <td className="cell-num">{c.count}</td>
                      <td className="cell-num">{c.avgScore}</td>
                      <td className="cell-num">{formatCurrency(c.totalDuty)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {anomalies.filter((a) => !a.dismissed).length > 0 && (
        <div className="card mb-3">
          <div className="card-header">
            <h3><AlertTriangle size={16} style={{ verticalAlign: 'middle', color: '#f97316' }} /> Son anomaliyalar</h3>
            <a href="#" onClick={(e) => { e.preventDefault(); navigate('/pca/anomalies'); }} style={{ marginLeft: 'auto', fontSize: 13 }}>Hamısı →</a>
          </div>
          <div className="card-body">
            {anomalies.filter((a) => !a.dismissed).slice(0, 5).map((a) => (
              <div key={a.id} className="ai-flag warning mb-2">
                <strong>{a.patternLabel}</strong> — {a.description}
                <div style={{ fontSize: 11, color: 'var(--n-500)', marginTop: 4 }}>{relativeTime(a.detectedAt)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header"><h3>PCA İş Reyestri</h3></div>
        <div className="card-body">
          <div className="filter-bar">
            <input className="input search" placeholder="Şirkət, ID və ya bəyannamə №..."
              value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            <select className="select" value={riskFilter} onChange={(e) => { setRiskFilter(e.target.value); setPage(1); }}>
              <option value="">Bütün risklər</option>
              <option value="Aşağı">Aşağı</option>
              <option value="Orta">Orta</option>
              <option value="Yüksək">Yüksək</option>
              <option value="Kritik">Kritik</option>
            </select>
            <select className="select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">Bütün statuslar</option>
              {(['Pending', 'In Review', 'Approved', 'Penalty Applied', 'Escalated', 'Closed'] as PCAStatus[]).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {(search || riskFilter || statusFilter) && (
              <button className="btn btn-secondary btn-sm" onClick={() => { setSearch(''); setRiskFilter(''); setStatusFilter(''); setPage(1); }}>
                Filtirləri sıfırla
              </button>
            )}
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<ShieldAlert size={24} />}
              title={cases.length === 0 ? 'Hazırda PCA üçün uyğun təsdiqlənmiş sənəd yoxdur' : 'Filtrə uyğun nəticə yoxdur'}
              hint={cases.length === 0 ? 'PCA bəyannamələr təsdiqləndikdən sonra burada görünəcək' : 'Filtrləri dəyişdirib yenidən cəhd edin'}
            />
          ) : (
            <>
              <div className="table-wrap">
                <table className="table table-dense">
                  <thead>
                    <tr>
                      <th>İş №</th>
                      <th>Şirkət</th>
                      <th>Risk dərəcəsi</th>
                      <th>Skor</th>
                      <th>Status</th>
                      <th>Rüsum risk ₼</th>
                      <th>HS kodu</th>
                      <th>Tarix</th>
                      <th className="cell-actions">Əməllər</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slice.map((c) => (
                      <tr key={c.id} onClick={() => openCase(c.declarationId)}>
                        <td className="cell-id">{c.id}</td>
                        <td>{c.companyName}</td>
                        <td><PCARiskBadge band={c.riskBand} /></td>
                        <td className="cell-num">{c.riskScore}</td>
                        <td><PCAStatusBadge status={c.status} /></td>
                        <td className="cell-num">{formatCurrency(c.dutyAtRisk)}</td>
                        <td className="mono">{c.hsCode}</td>
                        <td>{formatDate(c.createdAt)}</td>
                        <td className="cell-actions">
                          <button className="btn btn-ghost btn-sm"
                                  onClick={(e) => { e.stopPropagation(); setCaseInWorkflow(c); }}
                                  title="İş statusunu dəyişdir">
                            <MoreVertical size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination total={filtered.length} page={page} pageSize={pageSize} onChange={setPage} />
            </>
          )}
        </div>
      </div>

      {caseInWorkflow && (
        <CaseStatusModal
          caseRow={caseInWorkflow}
          onClose={() => setCaseInWorkflow(null)}
          onSave={(status, note) => {
            setPCACaseStatus(caseInWorkflow.id, status, user.id, note);
            toast.success('İş statusu yeniləndi');
            setCaseInWorkflow(null);
          }}
        />
      )}
    </div>
  );
}

function CaseStatusModal({ caseRow, onClose, onSave }: {
  caseRow: PCACase;
  onClose: () => void;
  onSave: (s: PCAStatus, note?: string) => void;
}) {
  const [status, setStatus] = React.useState<PCAStatus>(caseRow.status);
  const [note, setNote] = React.useState('');
  const options: PCAStatus[] = ['Pending', 'In Review', 'Approved', 'Penalty Applied', 'Escalated', 'Closed'];
  return (
    <Modal open={true} onClose={onClose} title={`İş statusu: ${caseRow.id}`}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Ləğv et</button>
          <button className="btn" onClick={() => onSave(status, note.trim() || undefined)}>Yadda saxla</button>
        </>
      }>
      <p className="text-muted">{caseRow.companyName} · skor: {caseRow.riskScore}</p>
      <div className="form-group">
        <label className="label">Yeni status</label>
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value as PCAStatus)}>
          {options.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="label">Qeyd (ixtiyari)</label>
        <textarea className="textarea" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Qərarın səbəbi, izaha bağlanan tapıntılar..." />
      </div>
    </Modal>
  );
}
