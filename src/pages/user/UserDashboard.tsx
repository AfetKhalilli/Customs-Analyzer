import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCurrentUser } from '../../store/authStore';
import { useDataStore } from '../../store/dataStore';
import { FilePlus, AlertTriangle } from 'lucide-react';
import { StatusBadge, RiskBadge, EmptyState, Pagination } from '../../components/ui/Primitives';
import { ALL_STATUSES } from '../../types';
import { formatDate } from '../../lib/utils';

export function UserDashboard() {
  const user = useCurrentUser()!;
  const navigate = useNavigate();
  const decls = useDataStore((s) => s.declarations).filter((d) => d.ownerId === user.id);
  const departments = useDataStore((s) => s.departments);

  const [statusFilter, setStatusFilter] = React.useState<string>('');
  const [kindFilter, setKindFilter] = React.useState<string>('');
  const [deptFilter, setDeptFilter] = React.useState<string>('');
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const pageSize = 10;

  const filtered = decls.filter((d) => {
    if (statusFilter && d.status !== statusFilter) return false;
    if (kindFilter && d.kind !== kindFilter) return false;
    if (deptFilter && d.department !== deptFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!d.id.toLowerCase().includes(q) && !d.referenceNumber?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const correctionRequests = decls.filter((d) => d.status === 'Düzəliş Tələb Olunur');

  const k = {
    total: decls.length,
    pending: decls.filter((d) => d.status === 'Yüklənib').length,
    inReview: decls.filter((d) => d.status === 'Yoxlanılır').length,
    correction: correctionRequests.length,
    completed: decls.filter((d) => d.status === 'Təsdiq' || d.status === 'Tamamlanmış').length,
  };

  const slice = filtered.slice((page - 1) * pageSize, page * pageSize);
  const dispName = user.entityType === 'individual' ? user.firstName : user.companyShortName ?? user.companyName;

  return (
    <div>
      <div className="section-header">
        <div>
          <h1>Salam, {dispName}!</h1>
          <p className="text-muted">Bəyannamələrinizi izləyin və yeni bəyannamə təqdim edin</p>
        </div>
        <Link to="/declaration/new" className="btn"><FilePlus size={16} /> Yeni bəyannamə</Link>
      </div>

      {correctionRequests.length > 0 && (
        <div className="banner warning">
          <AlertTriangle size={20} />
          <div className="b-body">
            <div className="b-title">Düzəliş tələb olunan bəyannamələr var</div>
            <div>{correctionRequests.length} ədəd bəyannamə üzrə müfəttiş düzəliş tələb edib. Aşağıdakı siyahıdan baxın.</div>
          </div>
        </div>
      )}

      <div className="kpi-grid">
        <div className={`kpi-card blue clickable`} onClick={() => setStatusFilter('')}>
          <div className="kpi-label">Ümumi</div>
          <div className="kpi-value">{k.total}</div>
          <div className="kpi-hint">Bütün bəyannamələr</div>
        </div>
        <div className="kpi-card amber clickable" onClick={() => setStatusFilter('Yüklənib')}>
          <div className="kpi-label">Yüklənib</div>
          <div className="kpi-value">{k.pending}</div>
          <div className="kpi-hint">Müfəttiş təyini gözlənilir</div>
        </div>
        <div className="kpi-card purple clickable" onClick={() => setStatusFilter('Yoxlanılır')}>
          <div className="kpi-label">Yoxlanılır</div>
          <div className="kpi-value">{k.inReview}</div>
          <div className="kpi-hint">Aktiv yoxlama</div>
        </div>
        <div className="kpi-card orange clickable" onClick={() => setStatusFilter('Düzəliş Tələb Olunur')}>
          <div className="kpi-label">Düzəliş</div>
          <div className="kpi-value">{k.correction}</div>
          <div className="kpi-hint">Diqqət tələb edir</div>
        </div>
        <div className="kpi-card green clickable" onClick={() => setStatusFilter('Tamamlanmış')}>
          <div className="kpi-label">Tamamlanmış</div>
          <div className="kpi-value">{k.completed}</div>
          <div className="kpi-hint">Uğurla bitmiş</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Bəyannamələrim</h3>
        </div>
        <div className="card-body">
          <div className="filter-bar">
            <input className="input search" placeholder="ID və ya istinad nömrəsi ilə axtar..."
              value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            <select className="select" value={kindFilter} onChange={(e) => { setKindFilter(e.target.value); setPage(1); }}>
              <option value="">Bütün növlər</option>
              <option value="Idxal">İdxal</option>
              <option value="Ixrac">İxrac</option>
              <option value="Tranzit">Tranzit</option>
            </select>
            <select className="select" value={deptFilter} onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }}>
              <option value="">Bütün şöbələr</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <select className="select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">Bütün statuslar</option>
              {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {(statusFilter || kindFilter || deptFilter || search) && (
              <button className="btn btn-secondary btn-sm"
                onClick={() => { setStatusFilter(''); setKindFilter(''); setDeptFilter(''); setSearch(''); setPage(1); }}>
                Filtirləri sıfırla
              </button>
            )}
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              title={decls.length === 0 ? 'Hələ bəyannamə yoxdur' : 'Filtrə uyğun nəticə yoxdur'}
              hint={decls.length === 0 ? 'İlk bəyannamənizi yaratmaq üçün “Yeni bəyannamə” düyməsini sıxın' : 'Filtrləri dəyişdirib yenidən cəhd edin'}
              action={decls.length === 0 ? <Link to="/declaration/new" className="btn"><FilePlus size={16} /> Yeni bəyannamə</Link> : undefined}
            />
          ) : (
            <>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Növ</th>
                      <th>Şöbə</th>
                      <th>Tarix</th>
                      <th>Status</th>
                      <th>Risk</th>
                      <th>Sənədlər</th>
                      <th>Dəyər</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slice.map((d) => (
                      <tr key={d.id} onClick={() => navigate(`/declaration/${d.id}`)}>
                        <td className="cell-id">{d.id.slice(-12)}</td>
                        <td>{d.kind}</td>
                        <td>{d.department}</td>
                        <td>{formatDate(d.uploadedAt)}</td>
                        <td><StatusBadge status={d.status} /></td>
                        <td><RiskBadge level={d.ai.riskLevel} score={d.ai.score} /></td>
                        <td>{d.documents.length}</td>
                        <td className="cell-num">{d.totals.totalDeclaredValue.toFixed(2)} {d.totals.currency}</td>
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
