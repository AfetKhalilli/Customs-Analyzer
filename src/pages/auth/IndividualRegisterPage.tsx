import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import { individualStep1Schema, individualStep2Schema } from '../../lib/schemas';
import { TextField, SelectField, DateField, PasswordField, CheckboxField } from '../../components/forms/Fields';
import { LogoMark } from '../../components/ui/LogoMark';
import { CITIES, COUNTRIES } from '../../lib/constants';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/toastStore';
import { uid } from '../../lib/utils';
import type { IndividualUser } from '../../types';

export function IndividualRegisterPage() {
  const [step, setStep] = React.useState(1);
  const [step1Data, setStep1Data] = React.useState<any>(null);
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);

  const m1 = useForm({
    resolver: zodResolver(individualStep1Schema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      firstName: '', lastName: '', fatherName: '', fin: '',
      dateOfBirth: '', gender: 'Kişi' as 'Kişi' | 'Qadın',
      citizenship: 'Azərbaycan', passportNumber: '',
    },
  });
  const m2 = useForm({
    resolver: zodResolver(individualStep2Schema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      phone: '+994 ', email: '', addressCity: '', addressLine: '', postalCode: '',
      password: '', passwordConfirm: '',
      acceptTerms: false, acceptPrivacy: false,
    },
  });

  const onStep1 = m1.handleSubmit((v) => { setStep1Data(v); setStep(2); });

  const onStep2 = m2.handleSubmit((v) => {
    const id = uid('user');
    const user: IndividualUser = {
      id, role: 'user', entityType: 'individual',
      firstName: step1Data.firstName, lastName: step1Data.lastName, fatherName: step1Data.fatherName,
      fin: step1Data.fin.toUpperCase(),
      dateOfBirth: step1Data.dateOfBirth, gender: step1Data.gender, citizenship: step1Data.citizenship,
      passportNumber: step1Data.passportNumber || undefined,
      phone: v.phone, email: v.email,
      address: { city: v.addressCity, line: v.addressLine, postalCode: v.postalCode || undefined },
      password: v.password,
      createdAt: new Date().toISOString(),
      status: 'active',
    };
    const res = register(user);
    if (!res.ok) { toast.error(res.error ?? 'Qeydiyyat alınmadı'); return; }
    toast.success('Qeydiyyat tamamlandı');
    navigate('/dashboard');
  });

  return (
    <div className="auth-shell">
      <div className="auth-hero">
        <div className="hero-brand">
          <LogoMark size={56} />
          <div className="hb-title">Customs Analyzer</div>
        </div>
        <div className="hero-body">
          <h2>Fiziki şəxs hesabı yaradın</h2>
          <p>
            Şəxsi məlumatlarınızı təhlükəsiz şəkildə daxil edin. Hesab yaratdıqdan sonra sənədləri
            təqdim edə və AI əsaslı risk analizindən faydalana biləcəksiniz.
          </p>
        </div>
      </div>
      <div className="auth-form-wrap">
        <div className="auth-card wide">
          <h1>Fiziki Şəxs Qeydiyyatı</h1>
          <p className="auth-sub">Addım {step} / 2</p>
        <div className="stepper">
          <div className={`step ${step === 1 ? 'active' : 'done'}`}><span className="num">1</span> Şəxsi Məlumatlar</div>
          <div className={`step ${step === 2 ? 'active' : ''}`}><span className="num">2</span> Əlaqə və Şifrə</div>
        </div>

        {step === 1 && (
          <FormProvider {...m1}>
            <form onSubmit={onStep1}>
              <div className="form-row cols-3">
                <TextField name="firstName" label="Ad" required transform={(v) => v.trim()} />
                <TextField name="lastName" label="Soyad" required transform={(v) => v.trim()} />
                <TextField name="fatherName" label="Ata adı" required transform={(v) => v.trim()} />
              </div>
              <div className="form-row cols-2">
                <TextField name="fin" label="FIN" required hint="7 simvol: hərflər və rəqəmlər" transform={(v) => v.toUpperCase().trim()} />
                <DateField name="dateOfBirth" label="Doğum tarixi" required max={new Date().toISOString().slice(0, 10)} />
              </div>
              <div className="form-row cols-3">
                <SelectField name="gender" label="Cins" required options={['Kişi', 'Qadın']} />
                <SelectField name="citizenship" label="Vətəndaşlıq" required options={COUNTRIES.map((c) => c.name)} />
                <TextField name="passportNumber" label="Pasport (ixtiyari)" hint="Format: AA1234567" transform={(v) => v.toUpperCase().trim()} />
              </div>
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
              <div className="form-row cols-2">
                <TextField name="phone" label="Telefon" required hint="+994 XX XXX XX XX" />
                <TextField name="email" label="E-poçt" required type="email" />
              </div>
              <div className="form-row cols-2">
                <SelectField name="addressCity" label="Şəhər" required options={CITIES} />
                <TextField name="postalCode" label="Poçt indeksi (ixtiyari)" hint="4 rəqəm" />
              </div>
              <TextField name="addressLine" label="Ünvan" required placeholder="Rayon, küçə, ev nömrəsi" />
              <div className="form-row cols-2">
                <PasswordField name="password" label="Şifrə" required showStrength hint="Ən azı 8 simvol, hərf və rəqəm" />
                <PasswordField name="passwordConfirm" label="Şifrəni təsdiq edin" required />
              </div>
              <CheckboxField name="acceptTerms" label={<>İstifadə şərtlərini qəbul edirəm</>} />
              <CheckboxField name="acceptPrivacy" label={<>Məxfilik siyasətini qəbul edirəm</>} />
              <div className="flex justify-between mt-4">
                <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>← Geri</button>
                <button type="submit" className="btn">Qeydiyyatdan keç</button>
              </div>
            </form>
          </FormProvider>
        )}
          <div className="auth-footer">
            Artıq hesabınız var? <Link to="/portal/login">Daxil olun</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
