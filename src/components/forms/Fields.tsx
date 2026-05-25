import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { Upload, File, X, Eye, EyeOff } from 'lucide-react';
import { cn } from '../../lib/utils';

type Option = string | { value: string; label: string };

function getError(errors: any, name: string): string | undefined {
  const path = name.split('.');
  let cur: any = errors;
  for (const k of path) { cur = cur?.[k]; if (!cur) return undefined; }
  return cur?.message;
}

interface BaseProps {
  name: string;
  label?: string;
  required?: boolean;
  hint?: string;
  placeholder?: string;
}

export function TextField({ name, label, required, hint, placeholder, transform, type = 'text' }: BaseProps & { transform?: (v: string) => string; type?: string }) {
  const { register, formState: { errors } } = useFormContext();
  const err = getError(errors, name);
  return (
    <div className="form-group">
      {label && <label className="label">{label}{required && <span className="req">*</span>}</label>}
      <input
        type={type}
        className={cn('input', err && 'error')}
        placeholder={placeholder}
        {...register(name, { setValueAs: transform ? (v: string) => v && transform(v) : undefined })}
      />
      {hint && !err && <div className="help-text">{hint}</div>}
      {err && <div className="error-text">{err}</div>}
    </div>
  );
}

export function NumberField({ name, label, required, hint, placeholder, step }: BaseProps & { step?: string }) {
  const { register, formState: { errors } } = useFormContext();
  const err = getError(errors, name);
  return (
    <div className="form-group">
      {label && <label className="label">{label}{required && <span className="req">*</span>}</label>}
      <input
        type="number" step={step ?? 'any'}
        className={cn('input', err && 'error')}
        placeholder={placeholder}
        {...register(name, { valueAsNumber: true })}
      />
      {hint && !err && <div className="help-text">{hint}</div>}
      {err && <div className="error-text">{err}</div>}
    </div>
  );
}

export function SelectField({ name, label, required, hint, placeholder, options }: BaseProps & { options: Option[] }) {
  const { register, formState: { errors } } = useFormContext();
  const err = getError(errors, name);
  return (
    <div className="form-group">
      {label && <label className="label">{label}{required && <span className="req">*</span>}</label>}
      <select className={cn('select', err && 'error')} {...register(name)}>
        <option value="">{placeholder ?? 'Seçin...'}</option>
        {options.map((o) => {
          const v = typeof o === 'string' ? o : o.value;
          const l = typeof o === 'string' ? o : o.label;
          return <option key={v} value={v}>{l}</option>;
        })}
      </select>
      {hint && !err && <div className="help-text">{hint}</div>}
      {err && <div className="error-text">{err}</div>}
    </div>
  );
}

export function DateField({ name, label, required, hint, max, min }: BaseProps & { max?: string; min?: string }) {
  const { register, formState: { errors } } = useFormContext();
  const err = getError(errors, name);
  return (
    <div className="form-group">
      {label && <label className="label">{label}{required && <span className="req">*</span>}</label>}
      <input type="date" className={cn('input', err && 'error')} max={max} min={min} {...register(name)} />
      {hint && !err && <div className="help-text">{hint}</div>}
      {err && <div className="error-text">{err}</div>}
    </div>
  );
}

export function TextareaField({ name, label, required, hint, placeholder, rows = 4 }: BaseProps & { rows?: number }) {
  const { register, formState: { errors } } = useFormContext();
  const err = getError(errors, name);
  return (
    <div className="form-group">
      {label && <label className="label">{label}{required && <span className="req">*</span>}</label>}
      <textarea rows={rows} className={cn('textarea', err && 'error')} placeholder={placeholder} {...register(name)} />
      {hint && !err && <div className="help-text">{hint}</div>}
      {err && <div className="error-text">{err}</div>}
    </div>
  );
}

export function CheckboxField({ name, label }: { name: string; label: React.ReactNode }) {
  const { register, formState: { errors } } = useFormContext();
  const err = getError(errors, name);
  return (
    <div className="form-group">
      <div className="checkbox-row">
        <input id={name} type="checkbox" {...register(name)} />
        <label htmlFor={name}>{label}</label>
      </div>
      {err && <div className="error-text">{err}</div>}
    </div>
  );
}

export function RadioCardsField({ name, label, required, options }: BaseProps & { options: { value: string; title: string; description?: string }[] }) {
  const { control, formState: { errors } } = useFormContext();
  const err = getError(errors, name);
  return (
    <div className="form-group">
      {label && <label className="label">{label}{required && <span className="req">*</span>}</label>}
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <div className="radio-cards">
            {options.map((o) => (
              <div
                key={o.value}
                className={cn('radio-card', field.value === o.value && 'selected')}
                onClick={() => field.onChange(o.value)}
              >
                <div className="rc-title">{o.title}</div>
                {o.description && <div className="rc-desc">{o.description}</div>}
              </div>
            ))}
          </div>
        )}
      />
      {err && <div className="error-text">{err}</div>}
    </div>
  );
}

export function PasswordField({ name, label, required, hint, showStrength }: BaseProps & { showStrength?: boolean }) {
  const { register, watch, formState: { errors } } = useFormContext();
  const err = getError(errors, name);
  const [shown, setShown] = React.useState(false);
  const val = watch(name) ?? '';
  let strength = 0;
  if (val.length >= 8) strength++;
  if (/[A-Z]/.test(val)) strength++;
  if (/[a-z]/.test(val)) strength++;
  if (/\d/.test(val)) strength++;
  if (/[^A-Za-z0-9]/.test(val)) strength++;
  const labels = ['Çox zəif', 'Zəif', 'Orta', 'Yaxşı', 'Güclü', 'Çox güclü'];
  const colors = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#10b981', '#059669'];
  return (
    <div className="form-group">
      {label && <label className="label">{label}{required && <span className="req">*</span>}</label>}
      <div style={{ position: 'relative' }}>
        <input
          type={shown ? 'text' : 'password'}
          className={cn('input', err && 'error')}
          style={{ paddingRight: 40 }}
          {...register(name)}
        />
        <button
          type="button"
          onClick={() => setShown(!shown)}
          style={{ position: 'absolute', right: 10, top: 8, background: 'none', border: 'none', color: 'var(--n-500)' }}
          aria-label={shown ? 'Gizlət' : 'Göstər'}
        >
          {shown ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {showStrength && val && (
        <div className="password-strength">
          <div className="ps-bar"><div className="ps-bar-fill" style={{ width: `${(strength / 5) * 100}%`, background: colors[strength] }} /></div>
          <div className="ps-label" style={{ color: colors[strength] }}>{labels[strength]}</div>
        </div>
      )}
      {hint && !err && <div className="help-text">{hint}</div>}
      {err && <div className="error-text">{err}</div>}
    </div>
  );
}

export function FileUploaderField({ name, label, hint, accept }: { name: string; label?: string; hint?: string; accept?: string }) {
  const { setValue, watch, formState: { errors } } = useFormContext();
  const err = getError(errors, name);
  const file = watch(name);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files || !files[0]) return;
    const f = files[0];
    setValue(name, {
      fileName: f.name,
      fileSizeKB: Math.round(f.size / 1024),
      fileMime: f.type || 'application/octet-stream',
      uploadedAt: new Date().toISOString(),
    }, { shouldValidate: true, shouldDirty: true });
  };

  return (
    <div className="form-group">
      {label && <label className="label">{label}</label>}
      <input ref={inputRef} type="file" accept={accept} style={{ display: 'none' }} onChange={(e) => handleFiles(e.target.files)} />
      {!file ? (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
          style={{
            border: '2px dashed var(--n-300)', borderRadius: 10, padding: 24,
            textAlign: 'center', cursor: 'pointer', background: 'var(--n-50)',
            color: 'var(--n-500)',
          }}
        >
          <Upload size={20} style={{ marginBottom: 6 }} />
          <div style={{ fontWeight: 500, color: 'var(--n-700)' }}>Fayl seçin və ya bura sürüşdürün</div>
          <div className="help-text" style={{ marginTop: 4 }}>{hint ?? 'PDF, JPG, PNG, DOC, DOCX qəbul edilir'}</div>
        </div>
      ) : (
        <div className="doc-card">
          <div className="doc-icon"><File size={18} /></div>
          <div className="doc-meta">
            <div className="doc-name">{file.fileName}</div>
            <div className="doc-info">{file.fileSizeKB} KB · {file.fileMime}</div>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setValue(name, undefined, { shouldDirty: true })}>
            <X size={14} />
          </button>
        </div>
      )}
      {err && <div className="error-text">{err}</div>}
    </div>
  );
}
