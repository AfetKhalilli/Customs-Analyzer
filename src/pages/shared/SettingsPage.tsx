import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { changePasswordSchema } from '../../lib/schemas';
import { PasswordField } from '../../components/forms/Fields';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/toastStore';

export function SettingsPage() {
  const changePassword = useAuthStore((s) => s.changePassword);
  const methods = useForm({
    resolver: zodResolver(changePasswordSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: { currentPassword: '', newPassword: '', newPasswordConfirm: '' },
  });

  const onSubmit = methods.handleSubmit((v) => {
    const r = changePassword(v.currentPassword, v.newPassword);
    if (!r.ok) { toast.error(r.error ?? 'Şifrə dəyişdirilə bilmədi'); return; }
    toast.success('Şifrə uğurla dəyişdirildi');
    methods.reset();
  });

  return (
    <div className="container-narrow">
      <h1>Tənzimləmələr</h1>
      <p className="text-muted">Hesab tənzimləmələrinizi idarə edin</p>

      <div className="card">
        <div className="card-header"><h3>Şifrəni dəyiş</h3></div>
        <div className="card-body">
          <FormProvider {...methods}>
            <form onSubmit={onSubmit}>
              <PasswordField name="currentPassword" label="Cari şifrə" required />
              <PasswordField name="newPassword" label="Yeni şifrə" required showStrength hint="Ən azı 8 simvol, bir hərf və bir rəqəm" />
              <PasswordField name="newPasswordConfirm" label="Yeni şifrəni təsdiq et" required />
              <div className="text-right mt-3">
                <button type="submit" className="btn">Şifrəni dəyiş</button>
              </div>
            </form>
          </FormProvider>
        </div>
      </div>

      <div className="card mt-4">
        <div className="card-header"><h3>Görünüş və bildirişlər</h3></div>
        <div className="card-body">
          <p className="text-muted">Bu seçimlər demo versiyada qeyri-aktivdir.</p>
          <div className="checkbox-row" style={{ marginTop: 10 }}>
            <input type="checkbox" disabled defaultChecked />
            <label>E-poçt bildirişlərini aktivləşdir</label>
          </div>
          <div className="checkbox-row" style={{ marginTop: 10 }}>
            <input type="checkbox" disabled defaultChecked />
            <label>Push bildirişlərini aktivləşdir</label>
          </div>
        </div>
      </div>
    </div>
  );
}
