import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Edit2, Building2 } from 'lucide-react';
import { useDataStore } from '../../store/dataStore';
import { useCurrentUser } from '../../store/authStore';
import { TextField, SelectField, PasswordField } from '../../components/forms/Fields';
import { Modal, EmptyState, RoleChip, ConfirmDialog, Tabs, Avatar } from '../../components/ui/Primitives';
import { toast } from '../../store/toastStore';
import type { IndividualUser, AppUser, Role } from '../../types';

const ROLE_LABELS: Record<string, string> = {
  inspector: 'İnspektor', departmentHead: 'Şöbə Rəisi', pca: 'PCA Auditor', boss: 'Baş Direktor',
};

const finRegex = /^[A-Z0-9]{7}$/;
const phoneRegex = /^\+994\s?\d{2}\s?\d{3}\s?\d{2}\s?\d{2}$/;

const staffSchema = z.object({
  role: z.enum(['inspector', 'departmentHead', 'pca']),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  fatherName: z.string().min(2),
  fin: z.string().regex(finRegex, 'FIN düz 7 simvol'),
  email: z.string().email('Düzgün e-poçt'),
  phone: z.string().regex(phoneRegex, 'Format: +994 XX XXX XX XX'),
  department: z.string().optional(),
  staffTitle: z.string().optional(),
  password: z.string().min(8, 'Ən azı 8 simvol').regex(/[A-Za-z]/, 'Hərf').regex(/\d/, 'Rəqəm'),
}).refine((d) => d.role === 'pca' || !!d.department, {
  message: 'İnspektor və Şöbə Rəisi üçün şöbə seçilməlidir', path: ['department'],
});

export function StaffManagementPage() {
  const me = useCurrentUser()!;
  const users = useDataStore((s) => s.users);
  const departments = useDataStore((s) => s.departments);
  const addUser = useDataStore((s) => s.addUser);
  const updateUser = useDataStore((s) => s.updateUser);
  const deleteUser = useDataStore((s) => s.deleteUser);
  const addDepartment = useDataStore((s) => s.addDepartment);
  const renameDepartment = useDataStore((s) => s.renameDepartment);
  const deleteDepartment = useDataStore((s) => s.deleteDepartment);
  const addLog = useDataStore((s) => s.addLog);

  const [tab, setTab] = React.useState('staff');
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<IndividualUser | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<IndividualUser | null>(null);
  const [search, setSearch] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState<string>('');
  const [deptFilter, setDeptFilter] = React.useState<string>('');

  // Dept-head can only manage inspectors in their own department.
  const isBoss = me.role === 'boss';
  const isDeptHead = me.role === 'departmentHead';
  const myDept = isDeptHead && me.entityType === 'individual' ? (me as IndividualUser).department : undefined;

  let staff = users.filter(
    (u) => (u.role === 'inspector' || u.role === 'departmentHead' || u.role === 'pca') && u.entityType === 'individual',
  ) as IndividualUser[];

  if (isDeptHead) {
    // Dept head: only inspectors in own department
    staff = staff.filter((u) => u.role === 'inspector' && u.department === myDept);
  }
  if (roleFilter) staff = staff.filter((u) => u.role === roleFilter);
  if (deptFilter) staff = staff.filter((u) => u.department === deptFilter);
  if (search) {
    const q = search.toLowerCase();
    staff = staff.filter((u) =>
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
      u.fin.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q),
    );
  }

  const handleSave = (values: any, editId?: string) => {
    if (editId) {
      updateUser(editId, {
        firstName: values.firstName, lastName: values.lastName, fatherName: values.fatherName,
        email: values.email, phone: values.phone,
        department: values.department, staffTitle: values.staffTitle,
        password: values.password,
      } as Partial<AppUser>);
      addLog({
        actorId: me.id, actorRole: me.role, actorDisplayName: me.entityType === 'individual' ? `${me.firstName} ${me.lastName}` : '',
        action: 'STATUS_CHANGE', description: `Əməkdaş yeniləndi: ${values.firstName} ${values.lastName}`,
      });
      toast.success('Əməkdaş yeniləndi');
    } else {
      const finUp = values.fin.toUpperCase().trim();
      if (users.some((u) => u.entityType === 'individual' && (u as IndividualUser).fin === finUp)) {
        toast.error('Bu FIN ilə əməkdaş artıq mövcuddur');
        return;
      }
      if (users.some((u) => u.email === values.email)) {
        toast.error('Bu e-poçt artıq qeydiyyatdadır');
        return;
      }
      const newUser: IndividualUser = {
        id: finUp,
        role: values.role,
        entityType: 'individual',
        firstName: values.firstName, lastName: values.lastName, fatherName: values.fatherName,
        fin: finUp, email: values.email, phone: values.phone,
        password: values.password,
        department: values.role === 'pca' ? undefined : values.department,
        staffTitle: values.staffTitle || ROLE_LABELS[values.role],
        createdAt: new Date().toISOString(),
        status: 'active',
        dateOfBirth: '1985-01-01',
        gender: 'Kişi',
        citizenship: 'Azərbaycan',
        address: { city: 'Bakı', line: '—' },
      };
      addUser(newUser);
      addLog({
        actorId: me.id, actorRole: me.role, actorDisplayName: me.entityType === 'individual' ? `${me.firstName} ${me.lastName}` : '',
        action: 'STATUS_CHANGE',
        description: `Yeni əməkdaş yaradıldı: ${newUser.firstName} ${newUser.lastName} (${ROLE_LABELS[newUser.role]})`,
      });
      toast.success(`${ROLE_LABELS[newUser.role]} yaradıldı`);
    }
    setOpen(false);
    setEditing(null);
  };

  const handleDelete = () => {
    if (!confirmDelete) return;
    const res = deleteUser(confirmDelete.id, me.id);
    if (!res.ok) toast.error(res.error ?? 'Silinmədi');
    else toast.success('Əməkdaş silindi');
    setConfirmDelete(null);
  };

  return (
    <div>
      <div className="section-header">
        <div>
          <h1>{isBoss ? 'İdarəetmə Paneli' : 'Əməkdaş İdarəetməsi'}</h1>
          <p className="text-muted">
            {isBoss
              ? 'İnspektorları, Şöbə Rəislərini, PCA auditorlarını və şöbələri idarə edin'
              : `${myDept} şöbəsinin müfəttişlərini görüntüləyin (yalnız oxuma)`}
          </p>
        </div>
        {/* Only Boss can create staff accounts. DepartmentHead is view-only. */}
        {isBoss && (
          <button className="btn" onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus size={14} /> Yeni əməkdaş
          </button>
        )}
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        items={isBoss
          ? [{ value: 'staff', label: 'Əməkdaşlar', count: staff.length }, { value: 'departments', label: 'Şöbələr', count: departments.length }]
          : [{ value: 'staff', label: 'İnspektorlar', count: staff.length }]
        }
      />

      {tab === 'staff' && (
        <div className="card">
          <div className="card-body">
            <div className="filter-bar">
              <input className="input search" placeholder="Ad, FIN, e-poçt..." value={search} onChange={(e) => setSearch(e.target.value)} />
              {isBoss && (
                <>
                  <select className="select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                    <option value="">Bütün rollar</option>
                    <option value="inspector">İnspektor</option>
                    <option value="departmentHead">Şöbə Rəisi</option>
                    <option value="pca">PCA Auditor</option>
                  </select>
                  <select className="select" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
                    <option value="">Bütün şöbələr</option>
                    {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </>
              )}
            </div>

            {staff.length === 0 ? <EmptyState title="Əməkdaş tapılmadı" /> : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Ad Soyad</th><th>Vəzifə</th><th>FİN</th><th>Şöbə</th><th>E-poçt</th><th>Cari Vəziyyət</th>
                      {isBoss && <th className="cell-actions">Əməliyyatlar</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {staff.map((u) => (
                      <tr key={u.id} style={{ cursor: 'default' }}>
                        <td><Avatar name={`${u.firstName} ${u.lastName}`} size="sm" /> {u.firstName} {u.lastName}</td>
                        <td><RoleChip role={u.role as Role} /></td>
                        <td className="mono">{u.fin}</td>
                        <td>{u.department ?? '—'}</td>
                        <td>{u.email}</td>
                        <td>{u.status === 'active' ? 'Aktiv' : 'Dayandırılıb'}</td>
                        {isBoss && (
                          <td className="cell-actions">
                            <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(u); setOpen(true); }}>
                              <Edit2 size={14} />
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(u)}>
                              <Trash2 size={14} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'departments' && isBoss && (
        <DepartmentsAdmin
          departments={departments}
          users={users}
          onAdd={(name) => {
            const r = addDepartment(name);
            if (r.ok) toast.success('Şöbə yaradıldı'); else toast.error(r.error ?? '');
          }}
          onRename={(o, n) => {
            const r = renameDepartment(o, n);
            if (r.ok) toast.success('Şöbə yenidən adlandırıldı'); else toast.error(r.error ?? '');
          }}
          onDelete={(n) => {
            const r = deleteDepartment(n);
            if (r.ok) toast.success('Şöbə silindi'); else toast.error(r.error ?? '');
          }}
        />
      )}

      {open && (
        <StaffFormModal
          initial={editing}
          forceRole={isDeptHead ? 'inspector' : undefined}
          forceDepartment={isDeptHead ? myDept : undefined}
          departments={departments}
          onClose={() => { setOpen(false); setEditing(null); }}
          onSave={(v) => handleSave(v, editing?.id)}
        />
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Əməkdaşı sil"
        message={confirmDelete ? `"${confirmDelete.firstName} ${confirmDelete.lastName}" əməkdaşı silinsin?` : ''}
        danger
        confirmText="Sil"
      />
    </div>
  );
}

function StaffFormModal({ initial, forceRole, forceDepartment, departments, onClose, onSave }: {
  initial: IndividualUser | null;
  forceRole?: 'inspector';
  forceDepartment?: string;
  departments: string[];
  onClose: () => void;
  onSave: (v: any) => void;
}) {
  const methods = useForm<any>({
    resolver: zodResolver(staffSchema as any),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: initial
      ? {
        role: initial.role,
        firstName: initial.firstName, lastName: initial.lastName, fatherName: initial.fatherName,
        fin: initial.fin, email: initial.email, phone: initial.phone,
        department: initial.department ?? '', staffTitle: initial.staffTitle ?? '',
        password: initial.password,
      }
      : {
        role: forceRole ?? 'inspector',
        firstName: '', lastName: '', fatherName: '',
        fin: '', email: '', phone: '+994 ',
        department: forceDepartment ?? '',
        staffTitle: '', password: '',
      },
  });
  const role = methods.watch('role');
  const isEdit = !!initial;
  const submit = methods.handleSubmit(onSave);

  return (
    <Modal
      open={true} onClose={onClose} size="lg"
      title={isEdit ? 'Əməkdaşı redaktə et' : 'Yeni əməkdaş yarat'}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Ləğv et</button>
          <button className="btn" onClick={submit}>{isEdit ? 'Yadda saxla' : 'Yarat'}</button>
        </>
      }
    >
      <FormProvider {...methods}>
        <form onSubmit={submit}>
          <div className="form-row cols-2">
            <SelectField name="role" label="Rol" required
              options={forceRole
                ? [{ value: 'inspector', label: 'İnspektor' }]
                : [
                  { value: 'inspector', label: 'İnspektor' },
                  { value: 'departmentHead', label: 'Şöbə Rəisi' },
                  { value: 'pca', label: 'PCA Auditor' },
                ]} />
            {(role === 'inspector' || role === 'departmentHead') && (
              <SelectField name="department" label="Şöbə" required options={departments} />
            )}
          </div>
          <div className="form-row cols-3">
            <TextField name="firstName" label="Ad" required transform={(v) => v.trim()} />
            <TextField name="lastName" label="Soyad" required transform={(v) => v.trim()} />
            <TextField name="fatherName" label="Ata adı" required transform={(v) => v.trim()} />
          </div>
          <div className="form-row cols-2">
            <TextField name="fin" label="FIN" required hint="7 simvol — A-Z və 0-9"
              transform={(v) => v.toUpperCase().trim()} />
            <TextField name="staffTitle" label="Vəzifə (ixtiyari)" />
          </div>
          <div className="form-row cols-2">
            <TextField name="email" label="E-poçt" required type="email" />
            <TextField name="phone" label="Telefon" required placeholder="+994 50 123 45 67" />
          </div>
          <PasswordField name="password" label={isEdit ? 'Şifrəni yenilə' : 'Başlanğıc şifrə'} required showStrength
            hint="Ən azı 8 simvol, hərf və rəqəm" />
        </form>
      </FormProvider>
    </Modal>
  );
}

function DepartmentsAdmin({ departments, users, onAdd, onRename, onDelete }: {
  departments: string[];
  users: AppUser[];
  onAdd: (n: string) => void;
  onRename: (o: string, n: string) => void;
  onDelete: (n: string) => void;
}) {
  const [newName, setNewName] = React.useState('');
  const [renaming, setRenaming] = React.useState<{ old: string; next: string } | null>(null);

  const inspectorsOf = (dept: string) =>
    users.filter((u) => u.role === 'inspector' && u.entityType === 'individual' && (u as IndividualUser).department === dept).length;
  const headOf = (dept: string) =>
    users.find((u) => u.role === 'departmentHead' && u.entityType === 'individual' && (u as IndividualUser).department === dept) as IndividualUser | undefined;

  return (
    <div className="card">
      <div className="card-header"><h3>Şöbələrin idarə edilməsi</h3></div>
      <div className="card-body">
        <div className="filter-bar">
          <input className="input search" placeholder="Yeni şöbə adı..." value={newName} onChange={(e) => setNewName(e.target.value)} />
          <button className="btn" onClick={() => { if (newName.trim()) { onAdd(newName); setNewName(''); } }}>
            <Plus size={14} /> Şöbə əlavə et
          </button>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Şöbə</th><th>Rəis</th><th className="cell-num">İnspektorlar</th>
                <th className="cell-actions">Əməllər</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((d) => {
                const h = headOf(d);
                return (
                  <tr key={d} style={{ cursor: 'default' }}>
                    <td><b><Building2 size={14} style={{ verticalAlign: 'middle' }} /> {d}</b></td>
                    <td>{h ? `${h.firstName} ${h.lastName}` : <span className="text-muted">— təyin olunmayıb —</span>}</td>
                    <td className="cell-num">{inspectorsOf(d)}</td>
                    <td className="cell-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => setRenaming({ old: d, next: d })}>
                        <Edit2 size={14} />
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => onDelete(d)}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {renaming && (
        <Modal
          open={true} onClose={() => setRenaming(null)} title="Şöbəni yenidən adlandır"
          footer={<>
            <button className="btn btn-secondary" onClick={() => setRenaming(null)}>Ləğv et</button>
            <button className="btn" onClick={() => { onRename(renaming.old, renaming.next); setRenaming(null); }}>Yadda saxla</button>
          </>}
        >
          <div className="form-group">
            <label className="label">Köhnə ad</label>
            <input className="input" value={renaming.old} disabled />
          </div>
          <div className="form-group">
            <label className="label">Yeni ad</label>
            <input className="input" value={renaming.next} onChange={(e) => setRenaming({ ...renaming, next: e.target.value })} />
          </div>
        </Modal>
      )}
    </div>
  );
}
