import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import { companyStep1Schema, companyStep2Schema, companyStep3Schema } from '../../lib/schemas';
import { TextField, SelectField, DateField, PasswordField, CheckboxField } from '../../components/forms/Fields';
import { CITIES, LEGAL_FORMS, ACTIVITY_FIELDS, POSITIONS } from '../../lib/constants';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/toastStore';
import { uid } from '../../lib/utils';
import type { CompanyUser } from '../../types';

export function CompanyRegisterPage() {
  const [step, setStep] = React.useState(1);
  const [s1, setS1] = React.useState<any>(null);
  const [s2, setS2] = React.useState<any>(null);
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);

  const m1 = useForm({
    resolver: zodResolver(companyStep1Schema),
    defaultValues: {
      companyName: '', companyShortName: '', tin: '', registrationNumber: '',
      legalForm: 'MMC' as const, registrationDate: '', activityField: '',
      legalAddressCity: '', legalAddressLine: '',
      actualAddressSame: true, actualAddressCity: '', actualAddressLine: '',
    },
  });
  const m2 = useForm({
    resolver: zodResolver(companyStep2Schema),
    defaultValues: {
      responsibleFirstName: '', responsibleLastName: '', responsibleFatherName: '',
      responsiblePosition: '', responsibleFin: '',
      responsiblePhone: '+994 ', responsibleEmail: '',
    },
  });
  const m3 = useForm({
    resolver: zodResolver(companyStep3Schema),
    defaultValues: {
      companyEmail: '', companyPhone: '+994 ', website: '',
      password: '', passwordConfirm: '',
      acceptTerms: false, acceptPrivacy: false,
    },
  });

  const sameAddress = m1.watch('actualAddressSame');

  const onStep1 = m1.handleSubmit((v) => { setS1(v); setStep(2); });
  const onStep2 = m2.handleSubmit((v) => { setS2(v); setStep(3); });
  const onStep3 = m3.handleSubmit((v) => {
    const id = uid('comp');
    const user: CompanyUser = {
      id, role: 'user', entityType: 'company',
      companyName: s1.companyName,
      companyShortName: s1.companyShortName || undefined,
      tin: s1.tin, registrationNumber: s1.registrationNumber,
      legalForm: s1.legalForm,
      registrationDate: s1.registrationDate,
      activityField: s1.activityField,
      legalAddress: { city: s1.legalAddressCity, line: s1.legalAddressLine },
      actualAddress: s1.actualAddressSame
        ? { city: s1.legalAddressCity, line: s1.legalAddressLine }
        : { city: s1.actualAddressCity, line: s1.actualAddressLine },
      responsiblePerson: {
        firstName: s2.responsibleFirstName, lastName: s2.responsibleLastName,
        fatherName: s2.responsibleFatherName, position: s2.responsiblePosition,
        fin: s2.responsibleFin.toUpperCase(),
        phone: s2.responsiblePhone, email: s2.responsibleEmail,
      },
      email: v.companyEmail, phone: v.companyPhone,
      website: v.website || undefined,
      password: v.password,
      createdAt: new Date().toISOString(),
      status: 'active',
    };
    const res = register(user);
    if (!res.ok) { toast.error(res.error ?? 'Qeydiyyat alınmadı'); return; }
    toast.success('Şirkət qeydiyyatdan keçdi');
    navigate('/dashboard');
  });

  return (
    <div className="auth-shell">
      <div className="auth-card wide">
        <h1>Hüquqi Şəxs Qeydiyyatı</h1>
        <p className="auth-sub">Addım {step} / 3</p>
        <div className="stepper">
          <div className={`step ${step > 1 ? 'done' : step === 1 ? 'active' : ''}`}><span className="num">1</span> Şirkət</div>
          <div className={`step ${step > 2 ? 'done' : step === 2 ? 'active' : ''}`}><span className="num">2</span> Məsul Şəxs</div>
          <div className={`step ${step === 3 ? 'active' : ''}`}><span className="num">3</span> Əlaqə</div>
        </div>

        {step === 1 && (
          <FormProvider {...m1}>
            <form onSubmit={onStep1}>
              <div className="form-row cols-2">
                <TextField name="companyName" label="Tam ad" required />
                <TextField name="companyShortName" label="Qısa ad" />
              </div>
              <div className="form-row cols-3">
                <TextField name="tin" label="VÖEN" required hint="10 rəqəm" />
                <TextField name="registrationNumber" label="Qeydiyyat nömrəsi" required hint="8–15 simvol" transform={(v) => v.trim()} />
                <SelectField name="legalForm" label="Hüquqi forma" required options={LEGAL_FORMS as any} />
              </div>
              <div className="form-row cols-3">
                <DateField name="registrationDate" label="Qeydiyyat tarixi" required max={new Date().toISOString().slice(0, 10)} />
                <SelectField name="activityField" label="Fəaliyyət sahəsi" required options={ACTIVITY_FIELDS} />
              </div>
              <h3 style={{ marginTop: 14 }}>Hüquqi ünvan</h3>
              <div className="form-row cols-2">
                <SelectField name="legalAddressCity" label="Şəhər" required options={CITIES} />
                <TextField name="legalAddressLine" label="Ünvan" required placeholder="Rayon, küçə, ev/ofis" />
              </div>
              <CheckboxField name="actualAddressSame" label="Faktiki ünvan hüquqi ünvanla eynidir" />
              {!sameAddress && (
                <>
                  <h3 style={{ marginTop: 14 }}>Faktiki ünvan</h3>
                  <div className="form-row cols-2">
                    <SelectField name="actualAddressCity" label="Şəhər" required options={CITIES} />
                    <TextField name="actualAddressLine" label="Ünvan" required />
                  </div>
                </>
              )}
              <div className="flex justify-between mt-4">
                <Link to="/register" className="btn btn-secondary">Geri</Link>
                <button type="submit" className="btn">Növbəti →</button>
              </div>
            </form>
          </FormProvider>
        )}

        {step === 2 && (
          <FormProvider {...m2}>
            <form onSubmit={onStep2}>
              <div className="form-row cols-3">
                <TextField name="responsibleFirstName" label="Ad" required transform={(v) => v.trim()} />
                <TextField name="responsibleLastName" label="Soyad" required transform={(v) => v.trim()} />
                <TextField name="responsibleFatherName" label="Ata adı" required transform={(v) => v.trim()} />
              </div>
              <div className="form-row cols-2">
                <SelectField name="responsiblePosition" label="Vəzifə" required options={POSITIONS} />
                <TextField name="responsibleFin" label="Məsul şəxsin FIN-i" required transform={(v) => v.toUpperCase().trim()} />
              </div>
              <div className="form-row cols-2">
                <TextField name="responsiblePhone" label="Telefon" required hint="+994 XX XXX XX XX" />
                <TextField name="responsibleEmail" label="E-poçt" required type="email" />
              </div>
              <div className="flex justify-between mt-4">
                <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>← Geri</button>
                <button type="submit" className="btn">Növbəti →</button>
              </div>
            </form>
          </FormProvider>
        )}

        {step === 3 && (
          <FormProvider {...m3}>
            <form onSubmit={onStep3}>
              <div className="form-row cols-2">
                <TextField name="companyEmail" label="Şirkət e-poçtu" required type="email" />
                <TextField name="companyPhone" label="Şirkət telefonu" required />
              </div>
              <TextField name="website" label="Veb sayt (ixtiyari)" placeholder="https://example.az" />
              <div className="form-row cols-2">
                <PasswordField name="password" label="Şifrə" required showStrength />
                <PasswordField name="passwordConfirm" label="Şifrəni təsdiq edin" required />
              </div>
              <CheckboxField name="acceptTerms" label="İstifadə şərtlərini qəbul edirəm" />
              <CheckboxField name="acceptPrivacy" label="Məxfilik siyasətini qəbul edirəm" />
              <div className="flex justify-between mt-4">
                <button type="button" className="btn btn-secondary" onClick={() => setStep(2)}>← Geri</button>
                <button type="submit" className="btn">Qeydiyyatdan keç</button>
              </div>
            </form>
          </FormProvider>
        )}

        <div className="auth-footer">
          Artıq hesabınız var? <Link to="/login">Daxil olun</Link>
        </div>
      </div>
    </div>
  );
}
