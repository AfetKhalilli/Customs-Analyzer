import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import { loginSchema } from '../../lib/schemas';
import { TextField, PasswordField, CheckboxField } from '../../components/forms/Fields';
import { LogoMark } from '../../components/ui/LogoMark';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/toastStore';

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [error, setError] = React.useState<string | null>(null);

  const methods = useForm({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: { loginIdentifier: '', password: '', rememberMe: false },
  });

  const onSubmit = methods.handleSubmit((values) => {
    setError(null);
    const id = values.loginIdentifier.trim();
    const res = login(id, values.password, values.rememberMe);
    if (!res.ok) {
      setError(res.error ?? 'Daxil olmaq mümkün olmadı');
      return;
    }
    toast.success('Daxil oldunuz');
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
          <h2>Gömrük sənədləri analizi üçün idarəetmə panelinə xoş gəldiniz!</h2>
          <p>
            Gömrük sənədlərinizi avtomatik analiz edin, tarif və vergi fərqlərini dərhal öyrənin.
            Sistem vasitəsilə potensial riskləri və uyğunsuzluqları vaxtında müəyyən edin və iş
            prosesinizi daha səmərəli hala gətirin.
          </p>
        </div>
      </div>

      <div className="auth-form-wrap">
        <div className="auth-card">
          <h1>Sistemə Daxil Ol</h1>
          <p className="auth-sub">Hesabınıza daxil olun və işə davam edin</p>
          <FormProvider {...methods}>
            <form onSubmit={onSubmit}>
              <TextField
                name="loginIdentifier"
                label="FİN nömrəsi və ya VÖEN"
                required
                hint="Fiziki şəxslər üçün 7 simvolluq FİN, hüquqi şəxslər üçün 10 rəqəmli VÖEN"
                placeholder="FİN kodunuzu daxil edin"
                transform={(v) => v.toUpperCase()}
              />
              <PasswordField name="password" label="Şifrə" required placeholder="Şifrənizi daxil edin" />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '8px 0 18px' }}>
                <CheckboxField name="rememberMe" label="Məni xatırla" />
                <Link to="/forgot-password" style={{ fontSize: 13, fontWeight: 600 }}>
                  Şifrəni unutmusunuz?
                </Link>
              </div>
              {error && <div className="banner error" style={{ marginBottom: 12 }}>{error}</div>}
              <button type="submit" className="btn btn-block btn-lg">Daxil ol</button>
            </form>
          </FormProvider>
          <div className="auth-footer">
            Hesabınız yoxdur? <Link to="/register">Qeydiyyatdan keçin</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
