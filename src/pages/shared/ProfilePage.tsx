import React from 'react';
import { Link } from 'react-router-dom';
import { Edit2 } from 'lucide-react';
import { useCurrentUser, useAuthStore } from '../../store/authStore';
import { Modal, Avatar, RoleChip } from '../../components/ui/Primitives';
import { formatDate } from '../../lib/utils';
import { usePortalPath } from '../../lib/routes';
import { useForm, FormProvider } from 'react-hook-form';
import { TextField, SelectField } from '../../components/forms/Fields';
import { CITIES, COUNTRIES } from '../../lib/constants';
import { toast } from '../../store/toastStore';
import type { IndividualUser, CompanyUser } from '../../types';

type SectionEditing = null | 'personal' | 'contact' | 'address' | 'company' | 'legalAddress' | 'actualAddress' | 'responsible' | 'companyContact';

export function ProfilePage() {
  const user = useCurrentUser()!;
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const pp = usePortalPath();
  const [editing, setEditing] = React.useState<SectionEditing>(null);

  const dispName = user.entityType === 'individual' ? `${user.firstName} ${user.lastName}` : user.companyName;

  const save = (patch: any) => {
    updateProfile(patch);
    toast.success('Profil yeniləndi');
    setEditing(null);
  };

  if (user.entityType === 'individual') {
    const u = user as IndividualUser;
    return (
      <div>
        <h1>Profil</h1>
        <p className="text-muted">Şəxsi məlumatlarınızı izləyin və yeniləyin</p>

        <div className="card mb-4">
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Avatar name={dispName} size="lg" />
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: 0 }}>{dispName}</h2>
              <div className="flex items-center gap-2 mt-2">
                <RoleChip role={u.role} />
                <span className="text-muted text-sm">Qeydiyyat: {formatDate(u.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>

        <ProfileSection title="Şəxsi məlumatlar" onEdit={() => setEditing('personal')}>
          <Field label="Ad" value={u.firstName} />
          <Field label="Soyad" value={u.lastName} />
          <Field label="Ata adı" value={u.fatherName} />
          <Field label="FIN" value={<span className="mono">{u.fin}</span>} note="dəyişdirilə bilməz" />
          <Field label="Doğum tarixi" value={formatDate(u.dateOfBirth)} />
          <Field label="Cins" value={u.gender} />
          <Field label="Vətəndaşlıq" value={u.citizenship} />
          {u.passportNumber && <Field label="Pasport" value={u.passportNumber} />}
        </ProfileSection>

        <ProfileSection title="Əlaqə" onEdit={() => setEditing('contact')}>
          <Field label="Telefon" value={u.phone} />
          <Field label="E-poçt" value={u.email} />
        </ProfileSection>

        <ProfileSection title="Ünvan" onEdit={() => setEditing('address')}>
          <Field label="Şəhər" value={u.address.city} />
          <Field label="Ünvan" value={u.address.line} />
          {u.address.postalCode && <Field label="Poçt indeksi" value={u.address.postalCode} />}
        </ProfileSection>

        {u.role === 'inspector' && (
          <ProfileSection title="İş məlumatları">
            <Field label="Şöbə" value={u.department ?? '—'} />
            <Field label="Vəzifə" value={u.staffTitle ?? 'İnspektor'} />
          </ProfileSection>
        )}

        <ProfileSection title="Hesab təhlükəsizliyi">
          <p className="text-muted">Şifrəni dəyişmək üçün <Link to={pp('/settings')}>Tənzimləmələrə</Link> keçin.</p>
        </ProfileSection>

        {editing === 'personal' && (
          <EditModal title="Şəxsi məlumatları redaktə et" onClose={() => setEditing(null)}
            defaults={{ firstName: u.firstName, lastName: u.lastName, fatherName: u.fatherName, dateOfBirth: u.dateOfBirth, gender: u.gender, citizenship: u.citizenship, passportNumber: u.passportNumber ?? '' }}
            onSave={save}>
            {() => (
              <>
                <div className="form-row cols-3">
                  <TextField name="firstName" label="Ad" required transform={(v) => v.trim()} />
                  <TextField name="lastName" label="Soyad" required transform={(v) => v.trim()} />
                  <TextField name="fatherName" label="Ata adı" required transform={(v) => v.trim()} />
                </div>
                <div className="form-row cols-3">
                  <TextField name="dateOfBirth" label="Doğum tarixi" type="date" />
                  <SelectField name="gender" label="Cins" options={['Kişi', 'Qadın']} />
                  <SelectField name="citizenship" label="Vətəndaşlıq" options={COUNTRIES.map((c) => c.name)} />
                </div>
                <TextField name="passportNumber" label="Pasport" />
              </>
            )}
          </EditModal>
        )}

        {editing === 'contact' && (
          <EditModal title="Əlaqə məlumatlarını redaktə et" onClose={() => setEditing(null)}
            defaults={{ phone: u.phone, email: u.email }} onSave={save}>
            {() => (
              <>
                <TextField name="phone" label="Telefon" required />
                <TextField name="email" label="E-poçt" required type="email" />
              </>
            )}
          </EditModal>
        )}

        {editing === 'address' && (
          <EditModal title="Ünvanı redaktə et" onClose={() => setEditing(null)}
            defaults={{ addressCity: u.address.city, addressLine: u.address.line, postalCode: u.address.postalCode ?? '' }}
            onSave={(v) => save({ address: { city: v.addressCity, line: v.addressLine, postalCode: v.postalCode || undefined } })}>
            {() => (
              <>
                <SelectField name="addressCity" label="Şəhər" required options={CITIES} />
                <TextField name="addressLine" label="Ünvan" required />
                <TextField name="postalCode" label="Poçt indeksi" />
              </>
            )}
          </EditModal>
        )}
      </div>
    );
  }

  const c = user as CompanyUser;
  return (
    <div>
      <h1>Şirkət Profili</h1>
      <p className="text-muted">Şirkət məlumatlarınızı izləyin və yeniləyin</p>

      <div className="card mb-4">
        <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Avatar name={c.companyName} size="lg" />
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0 }}>{c.companyName}</h2>
            <small className="text-muted">VÖEN: <span className="mono">{c.tin}</span> · {c.legalForm}</small>
          </div>
        </div>
      </div>

      <ProfileSection title="Şirkət məlumatları" onEdit={() => setEditing('company')}>
        <Field label="Tam ad" value={c.companyName} />
        {c.companyShortName && <Field label="Qısa ad" value={c.companyShortName} />}
        <Field label="VÖEN" value={<span className="mono">{c.tin}</span>} note="dəyişdirilə bilməz" />
        <Field label="Qeydiyyat №" value={c.registrationNumber} />
        <Field label="Hüquqi forma" value={c.legalForm} />
        <Field label="Qeydiyyat tarixi" value={formatDate(c.registrationDate)} note="dəyişdirilə bilməz" />
        <Field label="Fəaliyyət sahəsi" value={c.activityField} />
      </ProfileSection>

      <ProfileSection title="Hüquqi ünvan" onEdit={() => setEditing('legalAddress')}>
        <Field label="Şəhər" value={c.legalAddress.city} />
        <Field label="Ünvan" value={c.legalAddress.line} />
      </ProfileSection>

      <ProfileSection title="Faktiki ünvan" onEdit={() => setEditing('actualAddress')}>
        <Field label="Şəhər" value={c.actualAddress.city} />
        <Field label="Ünvan" value={c.actualAddress.line} />
      </ProfileSection>

      <ProfileSection title="Məsul şəxs" onEdit={() => setEditing('responsible')}>
        <Field label="Ad" value={c.responsiblePerson.firstName} />
        <Field label="Soyad" value={c.responsiblePerson.lastName} />
        <Field label="Ata adı" value={c.responsiblePerson.fatherName} />
        <Field label="Vəzifə" value={c.responsiblePerson.position} />
        <Field label="FIN" value={<span className="mono">{c.responsiblePerson.fin}</span>} />
        <Field label="Telefon" value={c.responsiblePerson.phone} />
        <Field label="E-poçt" value={c.responsiblePerson.email} />
      </ProfileSection>

      <ProfileSection title="Əlaqə" onEdit={() => setEditing('companyContact')}>
        <Field label="Şirkət e-poçtu" value={c.email} />
        <Field label="Şirkət telefonu" value={c.phone} />
        {c.website && <Field label="Veb sayt" value={c.website} />}
      </ProfileSection>

      <ProfileSection title="Hesab təhlükəsizliyi">
        <p className="text-muted">Şifrəni dəyişmək üçün <Link to={pp('/settings')}>Tənzimləmələrə</Link> keçin.</p>
      </ProfileSection>

      {editing === 'company' && (
        <EditModal title="Şirkət məlumatlarını redaktə et" onClose={() => setEditing(null)}
          defaults={{ companyName: c.companyName, companyShortName: c.companyShortName ?? '', registrationNumber: c.registrationNumber, activityField: c.activityField }}
          onSave={save}>
          {() => (
            <>
              <TextField name="companyName" label="Tam ad" required />
              <TextField name="companyShortName" label="Qısa ad" />
              <TextField name="registrationNumber" label="Qeydiyyat №" required />
              <TextField name="activityField" label="Fəaliyyət sahəsi" required />
            </>
          )}
        </EditModal>
      )}

      {editing === 'legalAddress' && (
        <EditModal title="Hüquqi ünvanı redaktə et" onClose={() => setEditing(null)}
          defaults={{ city: c.legalAddress.city, line: c.legalAddress.line }}
          onSave={(v) => save({ legalAddress: { city: v.city, line: v.line } })}>
          {() => (
            <>
              <SelectField name="city" label="Şəhər" required options={CITIES} />
              <TextField name="line" label="Ünvan" required />
            </>
          )}
        </EditModal>
      )}

      {editing === 'actualAddress' && (
        <EditModal title="Faktiki ünvanı redaktə et" onClose={() => setEditing(null)}
          defaults={{ city: c.actualAddress.city, line: c.actualAddress.line }}
          onSave={(v) => save({ actualAddress: { city: v.city, line: v.line } })}>
          {() => (
            <>
              <SelectField name="city" label="Şəhər" required options={CITIES} />
              <TextField name="line" label="Ünvan" required />
            </>
          )}
        </EditModal>
      )}

      {editing === 'responsible' && (
        <EditModal title="Məsul şəxsi redaktə et" onClose={() => setEditing(null)}
          defaults={c.responsiblePerson}
          onSave={(v) => save({ responsiblePerson: v })}>
          {() => (
            <>
              <div className="form-row cols-3">
                <TextField name="firstName" label="Ad" required />
                <TextField name="lastName" label="Soyad" required />
                <TextField name="fatherName" label="Ata adı" required />
              </div>
              <div className="form-row cols-2">
                <TextField name="position" label="Vəzifə" required />
                <TextField name="fin" label="FIN" required transform={(v) => v.toUpperCase().trim()} />
              </div>
              <div className="form-row cols-2">
                <TextField name="phone" label="Telefon" required />
                <TextField name="email" label="E-poçt" required type="email" />
              </div>
            </>
          )}
        </EditModal>
      )}

      {editing === 'companyContact' && (
        <EditModal title="Şirkət əlaqə məlumatlarını redaktə et" onClose={() => setEditing(null)}
          defaults={{ email: c.email, phone: c.phone, website: c.website ?? '' }}
          onSave={save}>
          {() => (
            <>
              <TextField name="email" label="E-poçt" required type="email" />
              <TextField name="phone" label="Telefon" required />
              <TextField name="website" label="Veb sayt" />
            </>
          )}
        </EditModal>
      )}
    </div>
  );
}

function ProfileSection({ title, children, onEdit }: { title: string; children: React.ReactNode; onEdit?: () => void }) {
  return (
    <div className="card mb-3">
      <div className="card-header">
        <h3 style={{ flex: 1 }}>{title}</h3>
        {onEdit && <button className="btn btn-ghost btn-sm" onClick={onEdit}><Edit2 size={14} /> Redaktə et</button>}
      </div>
      <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, value, note }: { label: string; value: React.ReactNode; note?: string }) {
  return (
    <div>
      <small className="text-muted">{label}</small>
      <div>{value}</div>
      {note && <small className="text-muted" style={{ fontStyle: 'italic' }}>{note}</small>}
    </div>
  );
}

function EditModal({ title, defaults, onSave, onClose, children }: { title: string; defaults: any; onSave: (v: any) => void; onClose: () => void; children: () => React.ReactNode }) {
  const methods = useForm({
    defaultValues: defaults,
    mode: 'onChange',
    reValidateMode: 'onChange',
  });
  const submit = methods.handleSubmit((v) => onSave(v));
  return (
    <Modal open={true} onClose={onClose} title={title}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Ləğv et</button><button className="btn" onClick={submit}>Yadda saxla</button></>}>
      <FormProvider {...methods}>
        <form onSubmit={submit}>{children()}</form>
      </FormProvider>
    </Modal>
  );
}
