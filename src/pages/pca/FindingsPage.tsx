import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, FormProvider } from 'react-hook-form';
import { useDataStore } from '../../store/dataStore';
import { useCurrentUser } from '../../store/authStore';
import { EmptyState, Modal, Pagination } from '../../components/ui/Primitives';
import { TextField, SelectField, NumberField, TextareaField } from '../../components/forms/Fields';
import { formatDate, formatCurrency } from '../../lib/utils';
import { Plus, FileSearch } from 'lucide-react';
import { toast } from '../../store/toastStore';
import type { FindingCategory, FindingSeverity, FindingStatus, PCACase } from '../../types';

export function FindingsPage() {
  const navigate = useNavigate();
  const user = useCurrentUser()!;
  const findings = useDataStore((s) => s.pcaFindings);
  const cases = useDataStore((s) => s.pcaCases);
  const addFinding = useDataStore((s) => s.addPCAFinding);

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
          <h1>Tapıntılar</h1>
          <p className="text-muted">Audit tapıntılarının reyestri</p>
        </div>
        <button className="btn" onClick={() => setOpen(true)} disabled={cases.length === 0}>
          <Plus size={14} /> Yeni tapıntı
        </button>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="filter-bar">
            <select className="select" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
              <option value="">Bütün kateqoriyalar</option>
              <option value="Aşağı qiymət">Aşağı qiymət</option>
              <option value="HS kodu səhvi">HS kodu səhvi</option>
              <option value="Çəki uyğunsuzluğu">Çəki uyğunsuzluğu</option>
              <option value="Sənəd çatışmır">Sənəd çatışmır</option>
              <option value="Digər">Digər</option>
            </select>
            <select className="select" value={sevFilter} onChange={(e) => setSevFilter(e.target.value)}>
              <option value="">Bütün şiddətlər</option>
              <option value="Kritik">Kritik</option>
              <option value="Yüksək">Yüksək</option>
              <option value="Orta">Orta</option>
              <option value="Aşağı">Aşağı</option>
            </select>
            <select className="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Bütün statuslar</option>
              <option value="Açıq">Açıq</option>
              <option value="İşlənir">İşlənir</option>
              <option value="Bağlı">Bağlı</option>
              <option value="Əsassız">Əsassız</option>
            </select>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<FileSearch size={24} />}
              title="Tapıntı yoxdur"
              hint={findings.length === 0 ? '“Yeni tapıntı” düyməsi ilə ilk tapıntını yaradın' : 'Filtrlərə uyğun nəticə yoxdur'}
            />
          ) : (
            <>
              <div className="table-wrap">
                <table className="table table-dense">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Şirkət</th>
                      <th>Başlıq</th>
                      <th>Kateqoriya</th>
                      <th>Şiddət</th>
                      <th>Status</th>
                      <th>Rüsum təsiri</th>
                      <th>Tarix</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slice.map((f) => (
                      <tr key={f.id} onClick={() => navigate(`/pca/company/${f.companyId}`)}>
                        <td className="cell-id">{f.id.slice(-8)}</td>
                        <td>{f.companyName}</td>
                        <td><b>{f.title}</b></td>
                        <td>{f.category}</td>
                        <td>{f.severity}</td>
                        <td>{f.status}</td>
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
        addFinding({ ...data, createdBy: user.id, createdByName: user.entityType === 'individual' ? `${user.firstName} ${user.lastName}` : '' });
        toast.success('Tapıntı yaradıldı');
        setOpen(false);
      }} />
    </div>
  );
}

function FindingFormModal({ open, onClose, cases, onSave }: { open: boolean; onClose: () => void; cases: PCACase[]; onSave: (d: any) => void }) {
  const methods = useForm({
    defaultValues: {
      caseId: '', title: '', description: '',
      category: 'Aşağı qiymət' as FindingCategory,
      severity: 'Orta' as FindingSeverity,
      status: 'Açıq' as FindingStatus,
      dutyImpact: 0,
    },
  });

  const onSubmit = methods.handleSubmit((values) => {
    if (!values.caseId) return;
    const c = cases.find((x) => x.id === values.caseId);
    if (!c) return;
    onSave({
      ...values,
      declarationId: c.declarationId,
      companyId: c.companyId,
      companyName: c.companyName,
    });
    methods.reset();
  });

  return (
    <Modal open={open} onClose={onClose} title="Yeni tapıntı" size="lg" footer={
      <>
        <button className="btn btn-secondary" onClick={onClose}>Ləğv et</button>
        <button className="btn" onClick={onSubmit}>Yarat</button>
      </>
    }>
      <FormProvider {...methods}>
        <form onSubmit={onSubmit}>
          <SelectField name="caseId" label="PCA işi" required options={cases.map((c) => ({ value: c.id, label: `${c.id} — ${c.companyName}` }))} />
          <TextField name="title" label="Başlıq" required />
          <TextareaField name="description" label="Təsvir" />
          <div className="form-row cols-3">
            <SelectField name="category" label="Kateqoriya" required options={['Aşağı qiymət', 'HS kodu səhvi', 'Çəki uyğunsuzluğu', 'Sənəd çatışmır', 'Digər']} />
            <SelectField name="severity" label="Şiddət" required options={['Aşağı', 'Orta', 'Yüksək', 'Kritik']} />
            <SelectField name="status" label="Status" required options={['Açıq', 'İşlənir', 'Bağlı', 'Əsassız']} />
          </div>
          <NumberField name="dutyImpact" label="Rüsum təsiri (₼)" step="0.01" />
        </form>
      </FormProvider>
    </Modal>
  );
}
