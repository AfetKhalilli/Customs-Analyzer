import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataStore } from '../../store/dataStore';
import { useCurrentUser } from '../../store/authStore';
import { EmptyState, Pagination } from '../../components/ui/Primitives';
import { formatCurrency } from '../../lib/utils';
import { usePortalPath } from '../../lib/routes';
import { Bookmark } from 'lucide-react';

export function PCACompaniesPage() {
  const navigate = useNavigate();
  const pp = usePortalPath();
  const user = useCurrentUser()!;
  const cases = useDataStore((s) => s.pcaCases);
  const watchlists = useDataStore((s) => s.watchlists);
  const watch = watchlists.find((w) => w.auditorId === user.id);
  const isWatched = (id: string) => watch?.companyIds.includes(id) ?? false;

  const [search, setSearch] = React.useState('');
  const [onlyWatched, setOnlyWatched] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const pageSize = 20;

  const byCompany = new Map<string, { id: string; name: string; count: number; avgScore: number; totalDuty: number; maxBand: string }>();
  for (const c of cases) {
    const cur = byCompany.get(c.companyId) ?? { id: c.companyId, name: c.companyName, count: 0, avgScore: 0, totalDuty: 0, maxBand: 'Aşağı' };
    cur.count++;
    cur.avgScore += c.riskScore;
    cur.totalDuty += c.dutyAtRisk;
    const order = ['Aşağı', 'Orta', 'Yüksək', 'Kritik'];
    if (order.indexOf(c.riskBand) > order.indexOf(cur.maxBand)) cur.maxBand = c.riskBand;
    byCompany.set(c.companyId, cur);
  }
  const rows = Array.from(byCompany.values()).map((c) => ({ ...c, avgScore: Math.round(c.avgScore / c.count) }))
    .filter((c) => !onlyWatched || isWatched(c.id))
    .filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.avgScore - a.avgScore);

  const slice = rows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div>
      <div className="section-header">
        <div>
          <h1>Şirkətlər</h1>
          <p className="text-muted">Audit reyestrindəki bütün şirkətlər</p>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="filter-bar">
            <input className="input search" placeholder="Şirkət adı ilə axtarın..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            <label className="checkbox-row" style={{ alignItems: 'center', margin: 0 }}>
              <input type="checkbox" checked={onlyWatched} onChange={(e) => setOnlyWatched(e.target.checked)} />
              <span>Yalnız izləmə siyahısındakılar</span>
            </label>
          </div>

          {rows.length === 0 ? (
            <EmptyState title="Şirkət tapılmadı" />
          ) : (
            <>
              <div className="table-wrap">
                <table className="table table-dense">
                  <thead>
                    <tr>
                      <th></th>
                      <th>Şirkət</th>
                      <th className="cell-num">Audit İşləri</th>
                      <th>Ən Yüksək Risk</th>
                      <th className="cell-num">Orta Risk Skoru</th>
                      <th className="cell-num">Ümumi Rüsum Riski</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slice.map((c) => (
                      <tr key={c.id} onClick={() => navigate(pp(`/pca/company/${c.id}`))}>
                        <td>{isWatched(c.id) && <Bookmark size={14} fill="currentColor" style={{ color: '#f59e0b' }} />}</td>
                        <td><b>{c.name}</b></td>
                        <td className="cell-num">{c.count}</td>
                        <td>{c.maxBand}</td>
                        <td className="cell-num">{c.avgScore}</td>
                        <td className="cell-num">{formatCurrency(c.totalDuty)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination total={rows.length} page={page} pageSize={pageSize} onChange={setPage} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
