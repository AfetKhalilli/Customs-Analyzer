import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataStore } from '../../store/dataStore';
import { useCurrentUser } from '../../store/authStore';
import { PCAStatusBadge, PCARiskBadge, EmptyState, Pagination } from '../../components/ui/Primitives';
import { formatDate, formatCurrency, relativeTime } from '../../lib/utils';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { PCA_STATUS_LABEL, ANOMALY_PATTERN_LABEL } from '../../lib/i18n';
import type { PCAStatus, PCARiskBand } from '../../types';

export function PCADashboard() {
  const navigate = useNavigate();
  const user = useCurrentUser()!;
  const cases = useDataStore((s) => s.pcaCases);
  const anomalies = useDataStore((s) => s.pcaAnomalies);
  const logPCAView = useDataStore((s) => s.logPCAView);

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

  const riskDistribution = React.useMemo<Record<PCARiskBand, number>>(() => {
    const dist: Record<PCARiskBand, number> = { 'Aşağı': 0, 'Orta': 0, 'Yüksək': 0, 'Kritik': 0 };
    for (const c of cases) dist[c.riskBand]++;
    return dist;
  }, [cases]);
  const maxRisk = Math.max(1, ...Object.values(riskDistribution));

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase();
    return cases
      .filter((c) => {
        if (riskFilter && c.riskBand !== riskFilter) return false;
        if (statusFilter && c.status !== statusFilter) return false;
        if (q && !c.companyName.toLowerCase().includes(q)
              && !c.id.toLowerCase().includes(q)
              && !c.declarationId.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => b.riskScore - a.riskScore);
  }, [cases, riskFilter, statusFilter, search]);

  const slice = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Top 10 high-risk companies — single pass over cases.
  const topCompanies = React.useMemo(() => {
    const byCompany = new Map<string, { name: string; count: number; sumScore: number; totalDuty: number }>();
    for (const c of cases) {
      const cur = byCompany.get(c.companyId) ?? { name: c.companyName, count: 0, sumScore: 0, totalDuty: 0 };
      cur.count++;
      cur.sumScore += c.riskScore;
      cur.totalDuty += c.dutyAtRisk;
      byCompany.set(c.companyId, cur);
    }
    return Array.from(byCompany.entries())
      .map(([id, v]) => ({ id, name: v.name, count: v.count, avgScore: Math.round(v.sumScore / v.count), totalDuty: v.totalDuty }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 10);
  }, [cases]);

  const openCase = (declarationId: string) => {
    logPCAView(declarationId, user);
    navigate(`/declaration/${declarationId}`);
  };

  return (
    <div>
      <div className="section-header">
        <div>
          <h1>PCA — Buraxılış Sonrası Audit Sistemi</h1>
          <p className="text-muted">Təsdiqlənmiş gömrük bəyannamələrinin audit və risk idarəetmə sistemi</p>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card blue clickable" onClick={() => navigate('/pca/companies')}>
          <div className="kpi-label">Ümumi Audit İşləri</div>
          <div className="kpi-value">{k.total}</div>
          <div className="kpi-hint">Bütün audit işləri</div>
        </div>
        <div className="kpi-card red clickable" onClick={() => setRiskFilter('Kritik')}>
          <div className="kpi-label">Kritik Risk</div>
          <div className="kpi-value">{k.critical}</div>
          <div className="kpi-hint">Təcili nəzərdən keçirilməlidir</div>
        </div>
        <div className="kpi-card orange clickable" onClick={() => setRiskFilter('Yüksək')}>
          <div className="kpi-label">Yüksək Risk</div>
          <div className="kpi-value">{k.high}</div>
          <div className="kpi-hint">Diqqət tələb edir</div>
        </div>
        <div className="kpi-card amber">
          <div className="kpi-label">Risk Altında Rüsum</div>
          <div className="kpi-value" style={{ fontSize: 18 }}>{formatCurrency(k.dutyAtRisk)}</div>
          <div className="kpi-hint">Potensial büdcə itkisi</div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-label">Orta Risk Skoru</div>
          <div className="kpi-value">{k.avgScore}</div>
          <div className="kpi-hint">/ 100</div>
        </div>
        <div className="kpi-card green clickable" onClick={() => setStatusFilter('Closed')}>
          <div className="kpi-label">Bağlanmış İşlər</div>
          <div className="kpi-value">{k.closed}</div>
          <div className="kpi-hint">Audit prosesi tamamlanıb</div>
        </div>
      </div>

      <div className="form-row cols-2 mb-3">
        <div className="card">
          <div className="card-header"><h3>Risk Səviyyəsi üzrə Paylanma</h3></div>
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
          <div className="card-header"><h3>Yüksək Riskli İlk 10 Şirkət</h3></div>
          <div className="card-body" style={{ padding: 0 }}>
            {topCompanies.length === 0 ? (
              <EmptyState title="Hələ məlumat yoxdur" />
            ) : (
              <table className="table table-dense">
                <thead>
                  <tr>
                    <th>Şirkət</th>
                    <th className="cell-num">İşlərin Sayı</th>
                    <th className="cell-num">Orta Skor</th>
                    <th className="cell-num">Rüsum Riski</th>
                  </tr>
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
            <h3><AlertTriangle size={16} style={{ verticalAlign: 'middle', color: '#f97316' }} /> Aşkarlanmış Anomaliyalar</h3>
            <a href="#" onClick={(e) => { e.preventDefault(); navigate('/pca/anomalies'); }} style={{ marginLeft: 'auto', fontSize: 13 }}>Hamısı →</a>
          </div>
          <div className="card-body">
            {anomalies.filter((a) => !a.dismissed).slice(0, 5).map((a) => (
              <div key={a.id} className="ai-flag warning mb-2">
                <strong>{ANOMALY_PATTERN_LABEL[a.patternCode] ?? a.patternLabel}</strong> — {a.description}
                <div style={{ fontSize: 11, color: 'var(--n-500)', marginTop: 4 }}>{relativeTime(a.detectedAt)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header"><h3>Audit İşlərinin Reyestri</h3></div>
        <div className="card-body">
          <div className="filter-bar">
            <input className="input search" placeholder="Şirkət, iş nömrəsi və ya bəyannamə nömrəsi..."
              value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            <select className="select" value={riskFilter} onChange={(e) => { setRiskFilter(e.target.value); setPage(1); }}>
              <option value="">Bütün risk səviyyələri</option>
              <option value="Aşağı">Aşağı Risk</option>
              <option value="Orta">Orta Risk</option>
              <option value="Yüksək">Yüksək Risk</option>
              <option value="Kritik">Kritik Risk</option>
            </select>
            <select className="select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">Bütün statuslar</option>
              {(['Pending', 'In Review', 'Approved', 'Penalty Applied', 'Escalated', 'Closed'] as PCAStatus[]).map((s) => (
                <option key={s} value={s}>{PCA_STATUS_LABEL[s]}</option>
              ))}
            </select>
            {(search || riskFilter || statusFilter) && (
              <button className="btn btn-secondary btn-sm" onClick={() => { setSearch(''); setRiskFilter(''); setStatusFilter(''); setPage(1); }}>
                Filtirləri Sıfırla
              </button>
            )}
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<ShieldAlert size={24} />}
              title={cases.length === 0 ? 'Hazırda audit üçün uyğun bəyannamə yoxdur' : 'Filtirlərə uyğun audit işi tapılmadı'}
              hint={cases.length === 0 ? 'Bəyannamələr təsdiqləndikdən sonra audit işləri burada görünəcək' : 'Filtirləri dəyişdirib yenidən cəhd edin'}
            />
          ) : (
            <>
              <div className="table-wrap">
                <table className="table table-dense">
                  <thead>
                    <tr>
                      <th>İş Nömrəsi</th>
                      <th>Şirkət</th>
                      <th>Risk Səviyyəsi</th>
                      <th className="cell-num">Skor</th>
                      <th>Audit Statusu</th>
                      <th className="cell-num">Rüsum Riski (₼)</th>
                      <th>HS Kodu</th>
                      <th>Qeydiyyat Tarixi</th>
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
    </div>
  );
}
