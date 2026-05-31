import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataStore } from '../../store/dataStore';
import { useCurrentUser } from '../../store/authStore';
import { EmptyState, Modal, Pagination } from '../../components/ui/Primitives';
import { formatDate, formatCurrency } from '../../lib/utils';
import { Plus, FileSearch } from 'lucide-react';
import { toast } from '../../store/toastStore';
import {
  FINDING_CATEGORY_LABEL, FINDING_CATEGORIES, FINDING_STATUS_LABEL,
} from '../../lib/i18n';
import type { FindingCategory, FindingSeverity, PCACase } from '../../types';

export function FindingsPage() {
  const navigate = useNavigate();
  const user = useCurrentUser()!;
  const findings = useDataStore((s) => s.pcaFindings);
  const cases = useDataStore((s) => s.pcaCases);
  const openFinding = useDataStore((s) => s.openFindingWithWorkflow);

  const [open, setOpen] = React.useState(false);
  const [catFilter, setCatFilter] = React.useState('');
  const [sevFilter, setSevFilter] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [page, setPage] = React.useState(1);
  const pageSize = 15;

  const filtered = findings.filter((f) => {
    if (catFilter && f.category !== catFilter) return false;
    if (sevFilter && f.severity !== sevFilter) return false;
    if (statusFilter && f.status !== statusFilter) return false;
    return true;
  });

  const slice = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div>
      <div className="section-header">
        <div>
          <h1>Audit Tapıntıları</h1>
          <p className="text-muted">PCA tərəfindən aşkarlanmış pozuntuların reyestri</p>
        </div>
        <button className="btn" onClick={() => setOpen(true)} disabled={cases.length === 0}>
          <Plus size={14} /> Yeni Tapıntı Aç
        </button>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="filter-bar">
            <select className="select" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
              <option value="">Bütün pozuntu növləri</option>
              {FINDING_CATEGORIES.map((c) => (
                <option key={c} value={c}>{FINDING_CATEGORY_LABEL[c]}</option>
              ))}
            </select>
            <select className="select" value={sevFilter} onChange={(e) => setSevFilter(e.target.value)}>
              <option value="">Bütün şiddət səviyyələri</option>
              <option value="Kritik">Kritik</option>
              <option value="Yüksək">Yüksək</option>
              <option value="Orta">Orta</option>
              <option value="Aşağı">Aşağı</option>
            </select>
            <select className="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Bütün statuslar</option>
              <option value="Açıq">{FINDING_STATUS_LABEL['Açıq']}</option>
              <option value="İşlənir">{FINDING_STATUS_LABEL['İşlənir']}</option>
              <option value="Bağlı">{FINDING_STATUS_LABEL['Bağlı']}</option>
              <option value="Əsassız">{FINDING_STATUS_LABEL['Əsassız']}</option>
            </select>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<FileSearch size={24} />}
              title="Audit tapıntısı yoxdur"
              hint={findings.length === 0 ? '"Yeni Tapıntı Aç" düyməsi ilə ilk tapıntını qeydə alın' : 'Filtrlərə uyğun nəticə yoxdur'}
            />
          ) : (
            <>
              <div className="table-wrap">
                <table className="table table-dense">
                  <thead>
                    <tr>
                      <th>Tapıntı №</th>
                      <th>Şirkət</th>
                      <th>Başlıq</th>
                      <th>Pozuntu Növü</th>
                      <th>Şiddət</th>
                      <th>Cari Vəziyyət</th>
                      <th className="cell-num">Rüsum Təsiri</th>
                      <th>Qeydiyyat Tarixi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slice.map((f) => (
                      <tr key={f.id} onClick={() => navigate(`/pca/company/${f.companyId}`)}>
                        <td className="cell-id">{f.id.slice(-8)}</td>
                        <td>{f.companyName}</td>
                        <td><b>{f.title}</b></td>
                        <td>{FINDING_CATEGORY_LABEL[f.category] ?? f.category}</td>
                        <td>{f.severity}</td>
                        <td>{FINDING_STATUS_LABEL[f.status] ?? f.status}</td>
                        <td className="cell-num">{formatCurrency(f.dutyImpact)}</td>
                        <td>{formatDate(f.createdAt)}</td>
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

      <FindingFormModal open={open} onClose={() => setOpen(false)} cases={cases} onSave={(data) => {
        const c = cases.find((x) => x.id === data.caseId);
        if (!c) { toast.error('PCA işi tapılmadı'); return; }
        const r = openFinding({
          caseId: c.id,
          declarationId: c.declarationId,
          companyId: c.companyId,
          companyName: c.companyName,
          category: data.category,
          severity: data.severity,
          title: data.title,
          description: data.description,
          dutyImpact: data.dutyImpact,
          legalBasis: data.legalBasis,
          requestExplanation: data.requestExplanation,
        }, user);
        if (r.ok) { toast.success('Tapıntı qeydə alındı'); setOpen(false); } else toast.error(r.error ?? 'Xəta');
      }} />
    </div>
  );
}

function FindingFormModal({ open, onClose, cases, onSave }: {
  open: boolean; onClose: () => void; cases: PCACase[];
  onSave: (d: {
    caseId: string; title: string; description: string;
    category: FindingCategory; severity: FindingSeverity;
    dutyImpact: number; legalBasis: string; requestExplanation: boolean;
  }) => void;
}) {
  const [caseId, setCaseId] = React.useState('');
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [category, setCategory] = React.useState<FindingCategory>('Gömrük Dəyərinin Təhrif Edilməsi');
  const [severity, setSeverity] = React.useState<FindingSeverity>('Orta');
  const [legalBasis, setLegalBasis] = React.useState('');
  const [dutyImpact, setDutyImpact] = React.useState(0);
  const [requestExplanation, setRequestExplanation] = React.useState(true);

  React.useEffect(() => {
    if (!open) {
      setCaseId(''); setTitle(''); setDescription('');
      setCategory('Gömrük Dəyərinin Təhrif Edilməsi'); setSeverity('Orta');
      setLegalBasis(''); setDutyImpact(0); setRequestExplanation(true);
    }
  }, [open]);

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title="Yeni Audit Tapıntısı" size="lg" footer={
      <>
        <button className="btn btn-secondary" onClick={onClose}>Ləğv Et</button>
        <button className="btn" onClick={() => {
          if (!caseId) { toast.error('PCA işi seçin'); return; }
          if (!title.trim()) { toast.error('Başlıq tələb olunur'); return; }
          if (!legalBasis.trim()) { toast.error('Hüquqi əsas tələb olunur'); return; }
          onSave({ caseId, title: title.trim(), description: description.trim(), category, severity, dutyImpact, legalBasis: legalBasis.trim(), requestExplanation });
        }}>Tapıntını Qeyd Et</button>
      </>
    }>
      <div className="form-group">
        <label className="label">PCA İşi <span className="req">*</span></label>
        <select className="select" value={caseId} onChange={(e) => setCaseId(e.target.value)}>
          <option value="">Seçin...</option>
          {cases.map((c) => (
            <option key={c.id} value={c.id}>{c.id} — {c.companyName}</option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label className="label">Tapıntı başlığı <span className="req">*</span></label>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="form-row cols-2">
        <div className="form-group">
          <label className="label">Pozuntu Növü <span className="req">*</span></label>
          <select className="select" value={category} onChange={(e) => setCategory(e.target.value as FindingCategory)}>
            {FINDING_CATEGORIES.map((c) => <option key={c} value={c}>{FINDING_CATEGORY_LABEL[c]}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="label">Şiddət</label>
          <select className="select" value={severity} onChange={(e) => setSeverity(e.target.value as FindingSeverity)}>
            <option value="Aşağı">Aşağı</option>
            <option value="Orta">Orta</option>
            <option value="Yüksək">Yüksək</option>
            <option value="Kritik">Kritik</option>
          </select>
        </div>
      </div>
      <div className="form-group">
        <label className="label">Hüquqi əsas <span className="req">*</span></label>
        <input className="input" value={legalBasis} onChange={(e) => setLegalBasis(e.target.value)} placeholder="məs: Gömrük Məcəlləsi maddə 159" />
      </div>
      <div className="form-group">
        <label className="label">Təsvir</label>
        <textarea className="textarea" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="form-group">
        <label className="label">Rüsum təsiri (₼)</label>
        <input className="input" type="number" step="0.01" value={dutyImpact} onChange={(e) => setDutyImpact(Number(e.target.value))} />
      </div>
      <div className="checkbox-row">
        <input id="reqExpFP" type="checkbox" checked={requestExplanation} onChange={(e) => setRequestExplanation(e.target.checked)} />
        <label htmlFor="reqExpFP">Şirkətdən rəsmi izahat tələb et və araşdırma prosesini başlat</label>
      </div>
    </Modal>
  );
}
