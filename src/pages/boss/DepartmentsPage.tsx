import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDataStore } from '../../store/dataStore';
import { usePortalPath } from '../../lib/routes';
import { Building2, UserCog } from 'lucide-react';
import type { IndividualUser } from '../../types';

export function DepartmentsPage() {
  const navigate = useNavigate();
  const pp = usePortalPath();
  const decls = useDataStore((s) => s.declarations);
  const users = useDataStore((s) => s.users);
  const departments = useDataStore((s) => s.departments);

  const rows = departments.map((dept) => {
    const list = decls.filter((d) => d.department === dept);
    const head = users.find((u) => u.role === 'departmentHead' && u.entityType === 'individual' && (u as IndividualUser).department === dept) as IndividualUser | undefined;
    const inspectors = users.filter((u) => u.role === 'inspector' && u.entityType === 'individual' && (u as IndividualUser).department === dept);
    const active = list.filter((d) => !['Tamamlanmış', 'Rədd'].includes(d.status)).length;
    const completed = list.filter((d) => d.status === 'Tamamlanmış' || d.status === 'Təsdiq').length;
    const avgRisk = list.length > 0 ? Math.round(list.reduce((a, d) => a + d.ai.score, 0) / list.length) : 0;
    return { dept, total: list.length, active, completed, avgRisk, headName: head ? `${head.firstName} ${head.lastName}` : '—', inspectorCount: inspectors.length };
  });

  return (
    <div>
      <div className="section-header">
        <div>
          <h1>Şöbələr</h1>
          <p className="text-muted">Bütün şöbələrin statistikası</p>
        </div>
        <Link to={pp('/staff')} className="btn">
          <UserCog size={14} /> Şöbələri idarə et
        </Link>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Şöbə</th>
              <th>Rəis</th>
              <th className="cell-num">İnspektorlar</th>
              <th className="cell-num">Ümumi</th>
              <th className="cell-num">Aktiv</th>
              <th className="cell-num">Tamamlanmış</th>
              <th className="cell-num">Orta risk</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.dept} onClick={() => navigate(pp(`/declarations?dept=${r.dept}`))}>
                <td><b><Building2 size={14} style={{ verticalAlign: 'middle' }} /> {r.dept}</b></td>
                <td>{r.headName}</td>
                <td className="cell-num">{r.inspectorCount}</td>
                <td className="cell-num">{r.total}</td>
                <td className="cell-num">{r.active}</td>
                <td className="cell-num">{r.completed}</td>
                <td className="cell-num">{r.avgRisk}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
