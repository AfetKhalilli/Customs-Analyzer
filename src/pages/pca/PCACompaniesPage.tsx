import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataStore } from '../../store/dataStore';
import { useCurrentUser } from '../../store/authStore';
import { EmptyState, Pagination } from '../../components/ui/Primitives';
import { formatCurrency } from '../../lib/utils';
import { Bookmark } from 'lucide-react';

export function PCACompaniesPage() {
  const navigate = useNavigate();
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
          <p className="text-muted">Bütün PCA tərkibinə daxil olan şirkətlər</p>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="filter-bar">
            <input className="input search" placeholder="Şirkət adı..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            <label className="checkbox-row" style={{ alignItems: 'center', margin: 0 }}>
              <input type="checkbox" checked={onlyWatched} onChange={(e) => setOnlyWatched(e.target.checked)} />
              <span>Yalnız izləmə siyahısı</span>
            </label>
          </div>

          {rows.length === 0 ? (
            <EmptyState title="Şirkət yoxdur" />
          ) : (
            <>
              <div className="table-wrap">
                <table className="table table-dense">
                  <thead>
                    <tr>
                      <th></th>
                      <th>Şirkət</th>
                      <th className="cell-num">İşlərin sayı</th>
                      <th>Ən yüksək risk</th>
                      <th className="cell-num">Ort. skor</th>
                      <th className="cell-num">Ümumi rüsum risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slice.map((c) => (
                      <tr key={c.id} onClick={() => navigate(`/pca/company/${c.id}`)}>
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
