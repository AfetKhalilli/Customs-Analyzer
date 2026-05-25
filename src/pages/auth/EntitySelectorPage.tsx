import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Building2 } from 'lucide-react';

export function EntitySelectorPage() {
  const navigate = useNavigate();
  return (
    <div className="auth-shell">
      <div className="auth-card wide">
        <h1>Qeydiyyat növü</h1>
        <p className="auth-sub">Hesab növünüzü seçin</p>
        <div className="entity-cards">
          <div className="entity-card" onClick={() => navigate('/register/individual')}>
            <div className="ic"><User /></div>
            <h3>Fiziki Şəxs</h3>
            <p>Fərdi istifadəçi kimi bəyannamə təqdim edin</p>
          </div>
          <div className="entity-card" onClick={() => navigate('/register/company')}>
            <div className="ic"><Building2 /></div>
            <h3>Hüquqi Şəxs</h3>
            <p>Şirkət adından bəyannamə təqdim edin</p>
          </div>
        </div>
        <div className="auth-footer">
          Artıq hesabınız var? <Link to="/login">Daxil olun</Link>
        </div>
      </div>
    </div>
  );
}
