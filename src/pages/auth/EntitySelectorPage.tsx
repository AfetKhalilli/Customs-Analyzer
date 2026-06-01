import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Building2 } from 'lucide-react';
import { LogoMark } from '../../components/ui/LogoMark';

export function EntitySelectorPage() {
  const navigate = useNavigate();
  return (
    <div className="auth-shell">
      <div className="auth-hero">
        <div className="hero-brand">
          <LogoMark size={56} />
          <div className="hb-title">Customs Analyzer</div>
        </div>
        <div className="hero-body">
          <h2>Hesab növünüzü seçin və qeydiyyata başlayın</h2>
          <p>
            Fərdi və ya şirkət hesabı yaradın. Gömrük sənədlərinizi təqdim edin, süni intellekt əsaslı risk
            analizindən faydalanın və status izləməsinə dərhal başlayın.
          </p>
        </div>
      </div>

      <div className="auth-form-wrap">
        <div className="auth-card wide">
          <h1>Qeydiyyat növü</h1>
          <p className="auth-sub">Hesab növünüzü seçin</p>
          <div className="entity-cards">
            <div className="entity-card" onClick={() => navigate('/register/individual')}>
              <div className="ic"><User /></div>
              <h3>Fiziki Şəxs</h3>
              <p>Fərdi istifadəçi kimi sənəd təqdim edin</p>
            </div>
            <div className="entity-card" onClick={() => navigate('/register/company')}>
              <div className="ic"><Building2 /></div>
              <h3>Hüquqi Şəxs</h3>
              <p>Şirkət adından sənəd təqdim edin</p>
            </div>
          </div>
          <div className="auth-footer">
            Artıq hesabınız var? <Link to="/login">Daxil olun</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
