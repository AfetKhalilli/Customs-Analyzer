import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataStore } from '../../store/dataStore';
import { useCurrentUser } from '../../store/authStore';
import { EmptyState } from '../../components/ui/Primitives';
import { formatCurrency } from '../../lib/utils';
import { Bookmark } from 'lucide-react';
import { toast } from '../../store/toastStore';

export function WatchlistPage() {
  const navigate = useNavigate();
  const user = useCurrentUser()!;
  const watchlists = useDataStore((s) => s.watchlists);
  const cases = useDataStore((s) => s.pcaCases);
  const users = useDataStore((s) => s.users);
  const toggleWatchlist = useDataStore((s) => s.toggleWatchlist);

  const watch = watchlists.find((w) => w.auditorId === user.id);
  const ids = watch?.companyIds ?? [];

  const rows = ids.map((id) => {
    const u = users.find((x) => x.id === id);
    const name = u ? (u.entityType === 'individual' ? `${u.firstName} ${u.lastName}` : u.companyName) : id;
    const list = cases.filter((c) => c.companyId === id);
    const avg = list.length > 0 ? Math.round(list.reduce((a, c) => a + c.riskScore, 0) / list.length) : 0;
    const duty = list.reduce((a, c) => a + c.dutyAtRisk, 0);
    return { id, name, count: list.length, avg, duty };
  });

  const handleRemove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleWatchlist(user.id, id);
    toast.info('İzləmə siyahısından silindi');
  };

  return (
    <div>
      <div className="section-header">
        <div>
          <h1>İzləmə Siyahısı</h1>
          <p className="text-muted">Auditor tərəfindən diqqətdə saxlanılan şirkətlər</p>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {rows.length === 0 ? (
            <EmptyState
              icon={<Bookmark size={24} />}
              title="İzləmə siyahısı boşdur"
              hint='Şirkət profili səhifəsindən "İzləmə Siyahısına Əlavə Et" düyməsi ilə əlavə edin'
            />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Şirkət</th>
                    <th className="cell-num">Audit İşləri</th>
                    <th className="cell-num">Orta Risk Skoru</th>
                    <th className="cell-num">Risk Altında Rüsum</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} onClick={() => navigate(`/pca/company/${r.id}`)}>
                      <td><b>{r.name}</b></td>
                      <td className="cell-num">{r.count}</td>
                      <td className="cell-num">{r.avg}</td>
                      <td className="cell-num">{formatCurrency(r.duty)}</td>
                      <td className="cell-actions">
                        <button className="btn btn-ghost btn-sm" onClick={(e) => handleRemove(r.id, e)}>
                          Siyahıdan Çıxart
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
