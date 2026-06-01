import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCurrentUser } from '../../store/authStore';
import { useDataStore } from '../../store/dataStore';
import { StatusBadge, RiskBadge, EmptyState, Pagination } from '../../components/ui/Primitives';
import { ALL_STATUSES } from '../../types';
import { formatDate } from '../../lib/utils';
import { usePortalPath } from '../../lib/routes';
import { DECLARATION_STATUS_LABEL } from '../../lib/i18n';
import type { IndividualUser } from '../../types';

export function DeclarationsList() {
  const user = useCurrentUser()!;
  const navigate = useNavigate();
  const pp = usePortalPath();
  const allDecls = useDataStore((s) => s.declarations);
  const departments = useDataStore((s) => s.departments);
  const logPCAView = useDataStore((s) => s.logPCAView);
  const [searchParams] = useSearchParams();

  const decls = React.useMemo(() => {
    if (user.role === 'user') return allDecls.filter((d) => d.ownerId === user.id);
    if (user.role === 'inspector') return allDecls.filter((d) => d.assignedInspectorId === user.id);
    if (user.role === 'departmentHead') {
      const dept = user.entityType === 'individual' ? (user as IndividualUser).department : null;
      return allDecls.filter((d) => d.department === dept);
    }
    if (user.role === 'pca') return allDecls.filter((d) => ['Təsdiq', 'Rədd', 'Tamamlanmış'].includes(d.status));
    return allDecls;
  }, [allDecls, user]);

  const [statusFilter, setStatusFilter] = React.useState<string>(searchParams.get('status') ?? '');
  const [kindFilter, setKindFilter] = React.useState<string>(searchParams.get('kind') ?? '');
  const [deptFilter, setDeptFilter] = React.useState<string>(searchParams.get('dept') ?? '');
  const [search, setSearch] = React.useState(searchParams.get('q') ?? '');
  const [page, setPage] = React.useState(1);
  const pageSize = 15;

  // Honor URL changes when the user clicks another linked KPI/cell
  React.useEffect(() => {
    setStatusFilter(searchParams.get('status') ?? '');
    setKindFilter(searchParams.get('kind') ?? '');
    setDeptFilter(searchParams.get('dept') ?? '');
    setSearch(searchParams.get('q') ?? '');
    setPage(1);
  }, [searchParams]);

  const filtered = decls.filter((d) => {
    if (statusFilter && d.status !== statusFilter) return false;
    if (kindFilter && d.kind !== kindFilter) return false;
    if (deptFilter && d.department !== deptFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!d.id.toLowerCase().includes(q) && !d.ownerDisplayName.toLowerCase().includes(q) && !d.referenceNumber?.toLowerCase().includes(q)) return false;
    }
    return true;
  }).sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

  const slice = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleRowClick = (id: string) => {
    if (user.role === 'pca') logPCAView(id, user);
    navigate(pp(`/declaration/${id}`));
  };

  const titleByRole: Record<string, string> = {
    user: 'Sənədlərim',
    inspector: 'Mənə Təyin Olunmuş Sənədlər',
    departmentHead: 'Şöbə Sənədləri',
    boss: 'Bütün Sənədlər',
    pca: 'Audit üçün Sənədlər',
  };

  return (
    <div>
      <div className="section-header">
        <h1>{titleByRole[user.role]}</h1>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="filter-bar">
            <input className="input search" placeholder="ID, sahib və ya istinad ilə axtar..."
              value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            <select className="select" value={kindFilter} onChange={(e) => { setKindFilter(e.target.value); setPage(1); }}>
              <option value="">Bütün sənəd növləri</option>
              <option value="Idxal">İdxal Sənədi</option>
              <option value="Ixrac">İxrac Sənədi</option>
              <option value="Tranzit">Tranzit Sənədi</option>
            </select>
            {(user.role === 'boss' || user.role === 'pca') && (
              <select className="select" value={deptFilter} onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }}>
                <option value="">Bütün şöbələr</option>
                {departments.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            )}
            <select className="select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">Bütün statuslar</option>
              {ALL_STATUSES.map((s) => <option key={s} value={s}>{DECLARATION_STATUS_LABEL[s] ?? s}</option>)}
            </select>
            {(statusFilter || kindFilter || deptFilter || search) && (
              <button className="btn btn-secondary btn-sm" onClick={() => { setStatusFilter(''); setKindFilter(''); setDeptFilter(''); setSearch(''); setPage(1); }}>
                Sıfırla
              </button>
            )}
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              title="Nəticə yoxdur"
              hint={decls.length === 0 ? 'Sizə uyğun sənəd tapılmadı' : 'Filtirləri dəyişdirib yenidən cəhd edin'}
            />
          ) : (
            <>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Qeydiyyat №</th>
                      {user.role !== 'user' && <th>Sahib</th>}
                      <th>Sənəd Növü</th>
                      <th>Şöbə</th>
                      <th>Qəbul Tarixi</th>
                      <th>Cari Vəziyyət</th>
                      <th>Risk Göstəricisi</th>
                      <th>Bəyan Dəyəri</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slice.map((d) => (
                      <tr key={d.id} onClick={() => handleRowClick(d.id)}>
                        <td className="cell-id">{d.id.slice(-12)}</td>
                        {user.role !== 'user' && <td>{d.ownerDisplayName}</td>}
                        <td>{d.kind}</td>
                        <td>{d.department}</td>
                        <td>{formatDate(d.uploadedAt)}</td>
                        <td><StatusBadge status={d.status} /></td>
                        <td><RiskBadge level={d.ai.riskLevel} score={d.ai.score} /></td>
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
