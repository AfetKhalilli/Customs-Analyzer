import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { LogoMark } from '../../components/ui/LogoMark';
import { toast } from '../../store/toastStore';

// Two-step demo flow: (1) verify identifier + email → token; (2) reset password.
// In production step 1 emails the token instead of returning it. Step 2 is
// identical and the rest of the UI doesn't need to change.
export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const requestReset = useAuthStore((s) => s.requestPasswordReset);
  const resetPassword = useAuthStore((s) => s.resetPassword);

  const [step, setStep] = React.useState<1 | 2>(1);
  const [identifier, setIdentifier] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [token, setToken] = React.useState('');
  const [newPw, setNewPw] = React.useState('');
  const [newPw2, setNewPw2] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const onRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!identifier.trim() || !email.trim()) {
      setError('FİN/VÖEN və e-poçt tələb olunur');
      return;
    }
    setSubmitting(true);
    const r = requestReset(identifier, email);
    setSubmitting(false);
    if (!r.ok) { setError(r.error ?? 'Sorğu uğursuz oldu'); return; }
    setToken(r.token ?? '');
    setStep(2);
    toast.success('Şifrə bərpa tokeni yaradıldı (30 dəqiqə etibarlıdır)');
  };

  const onReset = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!token.trim()) { setError('Token tələb olunur'); return; }
    if (newPw !== newPw2) { setError('Şifrələr uyğun deyil'); return; }
    setSubmitting(true);
    const r = resetPassword(token.trim(), newPw);
    setSubmitting(false);
    if (!r.ok) { setError(r.error ?? 'Şifrə dəyişdirilə bilmədi'); return; }
    toast.success('Şifrə yeniləndi — yeni şifrə ilə daxil olun');
    navigate('/login', { replace: true });
  };

  return (
    <div className="auth-shell">
      <div className="auth-hero">
        <div className="hero-brand">
          <LogoMark size={56} />
          <div className="hb-title">Gömrük Analizatoru</div>
        </div>
        <div className="hero-body">
          <h2>Şifrəni unutmusunuz?</h2>
          <p>FİN/VÖEN və qeydiyyat e-poçtunuzu daxil edin — sistem sizə təhlükəsiz bərpa tokeni verəcək. Token 30 dəqiqə etibarlıdır və yalnız bir dəfə istifadə oluna bilər.</p>
        </div>
      </div>

      <div className="auth-form-wrap">
        <div className="auth-card">
          <h1>{step === 1 ? 'Şifrəni bərpa et' : 'Yeni şifrə təyin et'}</h1>
          <p className="auth-sub">
            {step === 1 ? 'Hesabınızı təsdiqləyin' : 'Token + yeni şifrə daxil edin'}
          </p>

          {step === 1 ? (
            <form onSubmit={onRequest}>
              <div className="form-group">
                <label className="label">FİN və ya VÖEN <span className="req">*</span></label>
                <input className="input" value={identifier}
                  onChange={(e) => setIdentifier(e.target.value.toUpperCase())}
                  placeholder="məs: 7CA8FB1 və ya 1234567890" />
                <div className="help-text">Fiziki: 7 simvol FİN · Hüquqi: 10 rəqəm VÖEN</div>
              </div>
              <div className="form-group">
                <label className="label">Qeydiyyat e-poçtu <span className="req">*</span></label>
                <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@domain.com" />
              </div>
              {error && <div className="banner error" style={{ marginBottom: 12 }}>{error}</div>}
              <button type="submit" className="btn btn-block btn-lg" disabled={submitting}>
                Bərpa tokeni yarat
              </button>
            </form>
          ) : (
            <form onSubmit={onReset}>
              <div className="banner info" style={{ marginBottom: 12 }}>
                <div className="b-body">
                  <div className="b-title">Demo mühit</div>
                  <div>Sorğu uğurlu oldu. Aşağıdakı token avtomatik dolduruldu — istehsal mühitində bu token e-poçt ilə göndərilərdi.</div>
                </div>
              </div>
              <div className="form-group">
                <label className="label">Bərpa tokeni <span className="req">*</span></label>
                <input className="input mono" value={token} onChange={(e) => setToken(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="label">Yeni şifrə <span className="req">*</span></label>
                <input className="input" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
                <div className="help-text">Ən azı 8 simvol, bir hərf və bir rəqəm</div>
              </div>
              <div className="form-group">
                <label className="label">Yeni şifrəni təsdiq et <span className="req">*</span></label>
                <input className="input" type="password" value={newPw2} onChange={(e) => setNewPw2(e.target.value)} />
              </div>
              {error && <div className="banner error" style={{ marginBottom: 12 }}>{error}</div>}
              <button type="submit" className="btn btn-block btn-lg" disabled={submitting}>
                Şifrəni yenilə
              </button>
              <button type="button" className="btn btn-secondary btn-block" style={{ marginTop: 8 }}
                onClick={() => { setStep(1); setToken(''); setNewPw(''); setNewPw2(''); setError(null); }}>
                ← Geri (yeni token sorğusu)
              </button>
            </form>
          )}

          <div className="auth-footer" style={{ marginTop: 18 }}>
            <Link to="/login">← Giriş səhifəsinə qayıt</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
