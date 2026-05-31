import React from 'react';
import { useCurrentUser } from '../../store/authStore';
import { useDataStore } from '../../store/dataStore';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { Drawer, Avatar, EmptyState, StatusBadge, RiskBadge } from '../../components/ui/Primitives';
import { formatDate } from '../../lib/utils';
import type { IndividualUser } from '../../types';

export function InspectorsPage() {
  const user = useCurrentUser()!;
  const navigate = useNavigate();
  const users = useDataStore((s) => s.users);
  const declarations = useDataStore((s) => s.declarations);
  const departments = useDataStore((s) => s.departments);

  const [deptFilter, setDeptFilter] = React.useState<string>(
    user.role === 'departmentHead' && user.entityType === 'individual' ? (user as IndividualUser).department ?? '' : ''
  );
  const [search, setSearch] = React.useState('');
  const [open, setOpen] = React.useState<IndividualUser | null>(null);

  let inspectors = users.filter((u) => u.role === 'inspector' && u.entityType === 'individual') as IndividualUser[];
  if (user.role === 'departmentHead') {
    inspectors = inspectors.filter((i) => i.department === (user as IndividualUser).department);
  }
  if (deptFilter && user.role === 'boss') {
    inspectors = inspectors.filter((i) => i.department === deptFilter);
  }
  if (search) {
    const q = search.toLowerCase();
    inspectors = inspectors.filter((i) => `${i.firstName} ${i.lastName}`.toLowerCase().includes(q) || i.fin.toLowerCase().includes(q));
  }

  const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);

  const inspectorStats = (id: string) => {
    const my = declarations.filter((d) => d.assignedInspectorId === id);
    const active = my.filter((d) => !['Tamamlanmış', 'Rədd'].includes(d.status));
    const completedMonth = my.filter((d) => d.status === 'Tamamlanmış' && d.completedAt && new Date(d.completedAt) >= startOfMonth);
    const decided = my.filter((d) => d.status === 'Tamamlanmış' || d.status === 'Təsdiq');
    const approved = decided.filter((d) => !d.rejectReason);
    const approvalRate = decided.length === 0 ? 0 : Math.round((approved.length / decided.length) * 100);
    const completedDecls = my.filter((d) => d.status === 'Tamamlanmış' && d.completedAt);
    const avgCycle = completedDecls.length === 0 ? 0 : Math.round(completedDecls.reduce((acc, d) =>
      acc + (new Date(d.completedAt!).getTime() - new Date(d.uploadedAt).getTime()) / 3600_000, 0) / completedDecls.length * 10) / 10;
    return { active: active.length, completedMonth: completedMonth.length, approvalRate, avgCycle };
  };

  return (
    <div>
      <div className="section-header">
        <div>
          <h1>Müfəttişlər</h1>
          <p className="text-muted">{inspectors.length} müfəttiş</p>
        </div>
        <Link to="/admin/staff" className="btn">
          <UserPlus size={14} /> Əməkdaş əlavə et / idarə et
        </Link>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="filter-bar">
            <input className="input search" placeholder="Ad və ya FIN ilə axtar..." value={search} onChange={(e) => setSearch(e.target.value)} />
            {user.role === 'boss' && (
              <select className="select" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
                <option value="">Bütün şöbələr</option>
                {departments.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            )}
          </div>

          {inspectors.length === 0 ? <EmptyState title="Müfəttiş tapılmadı" /> : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Ad</th>
                    <th>FIN</th>
                    <th>Şöbə</th>
                    <th>Aktiv</th>
                    <th>Bu ay tamam</th>
                    <th>Təsdiq %</th>
                    <th>Orta dövr</th>
                  </tr>
                </thead>
                <tbody>
                  {inspectors.map((i) => {
                    const s = inspectorStats(i.id);
                    return (
                      <tr key={i.id} onClick={() => setOpen(i)}>
                        <td><Avatar name={`${i.firstName} ${i.lastName}`} size="sm" /> {i.firstName} {i.lastName}</td>
                        <td className="mono">{i.fin}</td>
                        <td>{i.department ?? '—'}</td>
                        <td>{s.active}</td>
                        <td>{s.completedMonth}</td>
                        <td>{s.approvalRate}%</td>
                        <td>{s.avgCycle} saat</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {open && (
        <Drawer open={true} onClose={() => setOpen(null)} title={`${open.firstName} ${open.lastName}`}>
          <div style={{ marginBottom: 14 }}>
            <small className="text-muted">FIN</small>
            <div className="mono">{open.fin}</div>
            <small className="text-muted" style={{ marginTop: 8, display: 'block' }}>Şöbə</small>
            <div>{open.department}</div>
            <small className="text-muted" style={{ marginTop: 8, display: 'block' }}>E-poçt</small>
            <div>{open.email}</div>
            <small className="text-muted" style={{ marginTop: 8, display: 'block' }}>Telefon</small>
            <div>{open.phone}</div>
          </div>
          <h4>Son sənədləri</h4>
          {declarations.filter((d) => d.assignedInspectorId === open.id).slice(0, 10).length === 0 ? (
            <p className="text-muted">İş tarixçəsi yoxdur</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Qeydiyyat №</th><th>Cari Vəziyyət</th><th>Risk Göstəricisi</th><th>Qəbul Tarixi</th></tr></thead>
                <tbody>
                  {declarations.filter((d) => d.assignedInspectorId === open.id).slice(0, 10).map((d) => (
                    <tr key={d.id} onClick={() => navigate(`/declaration/${d.id}`)}>
                      <td className="cell-id">{d.id.slice(-10)}</td>
                      <td><StatusBadge status={d.status} /></td>
                      <td><RiskBadge level={d.ai.riskLevel} score={d.ai.score} /></td>
                      <td>{formatDate(d.uploadedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Drawer>
      )}
    </div>
  );
}
