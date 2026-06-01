import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import { loginSchema, staffLoginSchema } from '../../lib/schemas';
import { TextField, PasswordField, CheckboxField } from '../../components/forms/Fields';
import { LogoMark } from '../../components/ui/LogoMark';
import { useAuthStore } from '../../store/authStore';
import { useDataStore } from '../../store/dataStore';
import { appPath, STAFF_ROLES } from '../../lib/routes';
import { toast } from '../../store/toastStore';
import type { Role } from '../../types';

// `portal` only affects presentation (heading + whether the register link shows)
// and the default redirect; the actual post-login destination is resolved from
// the authenticated user's role, so behaviour is identical regardless of which
// login page was used.
export function LoginPage({ portal = 'user' }: { portal?: 'user' | 'staff' }) {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [error, setError] = React.useState<string | null>(null);

  const isStaff = portal === 'staff';
  const methods = useForm({
    resolver: zodResolver(isStaff ? staffLoginSchema : loginSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: { loginIdentifier: '', password: '', rememberMe: false },
  });

  const onSubmit = methods.handleSubmit((values) => {
    setError(null);
    const id = values.loginIdentifier.trim();
    // Portal isolation: only the roles belonging to THIS portal may log in here.
    const allowedRoles: Role[] = isStaff ? STAFF_ROLES : ['user'];
    const res = login(id, values.password, values.rememberMe, allowedRoles);
    if (!res.ok) {
      setError(res.error ?? 'Daxil olmaq mümkün olmadı');
      return;
    }
    toast.success('Daxil oldunuz');
    // Resolve destination from the actual role: user → /portal/dashboard,
    // staff → /admin/dashboard.
    const role = res.userId
      ? useDataStore.getState().users.find((u) => u.id === res.userId)?.role
      : undefined;
    navigate(appPath(role ?? (portal === 'staff' ? 'inspector' : 'user'), '/dashboard'));
  });

  return (
    <div className="auth-shell">
      <div className="auth-hero">
        <div className="hero-brand">
          <LogoMark />
          <div className="hb-title">Customs Analyzer</div>
        </div>
        <div className="hero-body">
          <h2>Gömrük sənədləri analizi üçün idarəetmə panelinə xoş gəldiniz!</h2>
          <p>
           Gömrük bəyannamələrinin təqdim edilməsi, emalı və monitorinqi proseslərini vahid rəqəmsal platforma üzərindən həyata keçirə bilərsiniz.
          </p>
        </div>
      </div>

      <div className="auth-form-wrap">
        <div className="auth-card">
          <h1>{portal === 'staff' ? 'Əməkdaş Girişi' : 'Sistemə Daxil Ol'}</h1>
          <p className="auth-sub">
            {portal === 'staff'
              ? 'Əməkdaş hesabınıza daxil olun (inspektor, şöbə rəisi, direktor, PCA)'
              : 'Hesabınıza daxil olun və işə davam edin'}
          </p>
          <FormProvider {...methods}>
            <form onSubmit={onSubmit}>
              <TextField
                name="loginIdentifier"
                label={isStaff ? 'FİN nömrəsi' : 'FİN nömrəsi və ya VÖEN'}
                required
                placeholder="FİN kodunuzu daxil edin"
                transform={(v) => v.toUpperCase()}
              />
              <PasswordField name="password" label="Şifrə" required placeholder="Şifrənizi daxil edin" />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <CheckboxField name="rememberMe" label="Məni xatırla" />
                <Link to={isStaff ? '/admin/forgot-password' : '/forgot-password'} style={{ fontSize: 13, fontWeight: 600 }}>
                  Şifrəni unutmusunuz?
                </Link>
              </div>
              {error && <div className="banner error" style={{ marginBottom: 12 }}>{error}</div>}
              <button type="submit" className="btn btn-block btn-lg">Daxil ol</button>
            </form>
          </FormProvider>
          {portal !== 'staff' && (
            <div className="auth-footer">
              Hesabınız yoxdur? <Link to="/register">Qeydiyyatdan keçin</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
