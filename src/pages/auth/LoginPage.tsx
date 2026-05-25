import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { loginSchema } from '../../lib/schemas';
import { TextField, PasswordField, CheckboxField } from '../../components/forms/Fields';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/toastStore';

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [error, setError] = React.useState<string | null>(null);

  const methods = useForm({
    resolver: zodResolver(loginSchema),
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
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{
            width: 56, height: 56, margin: '0 auto 12px', borderRadius: 14,
            background: 'linear-gradient(135deg, var(--brand-500), var(--brand-700))',
            display: 'grid', placeItems: 'center', color: 'white',
          }}>
            <ShieldCheck size={28} />
          </div>
          <h1>Customs Analyzer</h1>
          <p className="auth-sub">Gömrük bəyannamə sisteminə daxil olun</p>
        </div>
        <FormProvider {...methods}>
          <form onSubmit={onSubmit}>
            <TextField
              name="loginIdentifier"
              label="FIN və ya VÖEN"
              required
              hint="Fiziki şəxslər üçün 7 simvolluq FIN, hüquqi şəxslər üçün 10 rəqəmli VÖEN"
              placeholder="məs: 7CA8FB1 və ya 1234567890"
              transform={(v) => v.toUpperCase()}
            />
            <PasswordField name="password" label="Şifrə" required />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '8px 0 16px' }}>
              <CheckboxField name="rememberMe" label="Məni xatırla" />
              <a href="#" onClick={(e) => { e.preventDefault(); toast.info('Şifrə bərpa imkanı demo versiyasında mövcud deyil'); }} style={{ fontSize: 13 }}>
                Şifrəni unutmusunuz?
              </a>
            </div>
            {error && <div className="banner error" style={{ marginBottom: 12 }}>{error}</div>}
            <button type="submit" className="btn btn-block btn-lg">Daxil ol</button>
          </form>
        </FormProvider>
        <div className="auth-footer">
          Hesabınız yoxdur? <Link to="/register">Qeydiyyatdan keçin</Link>
        </div>
        <div style={{ marginTop: 18, padding: 12, background: 'var(--n-50)', borderRadius: 8, fontSize: 12, color: 'var(--n-600)' }}>
          <strong style={{ color: 'var(--n-800)' }}>Demo girişləri:</strong>
          <div style={{ marginTop: 6, lineHeight: 1.7 }}>
            <div><b>Fiziki:</b> <span className="mono">7CA8FB1</span> / User1234</div>
            <div><b>Hüquqi:</b> <span className="mono">1234567890</span> / Company123</div>
            <div><b>Müfəttiş:</b> <span className="mono">INS1000</span> / Inspector123</div>
            <div><b>Şöbə Rəisi:</b> <span className="mono">DH02000</span> / Depthead123 <em style={{opacity:.7}}>(Qida şöbəsi)</em></div>
            <div><b>Boss:</b> <span className="mono">BOSS001</span> / Boss12345</div>
            <div><b>PCA:</b> <span className="mono">PCA0001</span> / Pcaaudit123</div>
          </div>
        </div>
      </div>
    </div>
  );
}
