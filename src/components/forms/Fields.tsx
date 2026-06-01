import React from 'react';
import { createPortal } from 'react-dom';
import { Controller, useFormContext } from 'react-hook-form';
import { Upload, File, X, Eye, EyeOff } from 'lucide-react';
import { cn } from '../../lib/utils';
import { validateFile } from '../../lib/validation';
import { FILE_ACCEPT_ATTR, ALLOWED_FILE_EXTENSIONS, MAX_FILE_SIZE_MB } from '../../lib/constants';
import { searchHs, lookupHs, HsCodeRecord, HS_CODES, HS_CATEGORIES } from '../../lib/hsCodes';

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
  const { setValue, watch, setError, clearErrors, formState: { errors } } = useFormContext();
  const err = getError(errors, name);
  const file = watch(name);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files || !files[0]) return;
    const f = files[0];
    const candidate = {
      fileName: f.name,
      fileSizeKB: Math.round(f.size / 1024),
      fileMime: f.type || 'application/octet-stream',
      uploadedAt: new Date().toISOString(),
    };

    // HARD GATE: mime + extension + size. ALL must pass; first failure blocks.
    const v = validateFile(candidate);
    if (!v.ok) {
      setValue(name, undefined, { shouldDirty: true });
      setError(name, { type: 'manual', message: v.errors[0].message });
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    clearErrors(name);
    setValue(name, candidate, { shouldValidate: true, shouldDirty: true });
  };

  return (
    <div className="form-group">
      {label && <label className="label">{label}</label>}
      <input
        ref={inputRef}
        type="file"
        accept={accept ?? FILE_ACCEPT_ATTR}
        style={{ display: 'none' }}
        onChange={(e) => handleFiles(e.target.files)}
      />
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
          <div className="help-text" style={{ marginTop: 4 }}>
            {hint ?? `İcazə verilən: ${ALLOWED_FILE_EXTENSIONS.join(', ')} — maks ${MAX_FILE_SIZE_MB} MB`}
          </div>
        </div>
      ) : (
        <div className="doc-card">
          <div className="doc-icon"><File size={18} /></div>
          <div className="doc-meta">
            <div className="doc-name">{file.fileName}</div>
            <div className="doc-info">{file.fileSizeKB} KB · {file.fileMime}</div>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setValue(name, undefined, { shouldDirty: true }); clearErrors(name); }}>
            <X size={14} />
          </button>
        </div>
      )}
      {err && <div className="error-text">{err}</div>}
    </div>
  );
}

/**
 * HS code selection — a TWO-STEP, registry-validated picker.
 *   Step 1: narrow by commodity category (speeds selection, optional).
 *   Step 2: search & pick a concrete code from the official registry, then
 *           EXPLICITLY CONFIRM the classification.
 * The form value is only ever set to a code that exists in HS_CODES and was
 * confirmed by the user — free-typed or partial codes can never be committed,
 * which structurally prevents an incorrect final HS assignment.
 */
const hsTier = (t: string) => (t === 'high' ? 'yüksək' : t === 'medium' ? 'orta' : 'aşağı');

export function HsCodeField({
  name,
  label = 'HS Kodu',
  required,
  hint = 'Addım 1: kateqoriya seçin · Addım 2: kodu seçib təsdiqləyin',
}: BaseProps & {}) {
  const { register, setValue, watch, clearErrors, formState: { errors } } = useFormContext();
  const err = getError(errors, name);
  const value: string = watch(name) ?? '';
  const matched: HsCodeRecord | undefined = React.useMemo(() => lookupHs(value), [value]);

  const [category, setCategory] = React.useState<string>('');
  const [query, setQuery] = React.useState<string>('');
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState<HsCodeRecord | null>(null);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [anchor, setAnchor] = React.useState<{ top: number; left: number; width: number; openUp: boolean }>(
    { top: 0, left: 0, width: 0, openUp: false }
  );

  // Register the field so RHF tracks it while we own the UX.
  React.useEffect(() => { register(name); }, [register, name]);

  React.useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      if ((target as HTMLElement)?.closest?.('[data-hs-listbox]')) return;
      setOpen(false);
    };
    window.addEventListener('mousedown', onDocClick);
    return () => window.removeEventListener('mousedown', onDocClick);
  }, []);

  // Position the portal-rendered dropdown relative to the input so it never
  // gets clipped inside a scrollable modal body; flips up when room is tight.
  React.useEffect(() => {
    if (!open) return;
    const update = () => {
      const el = inputRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const spaceBelow = window.innerHeight - r.bottom - 8;
      const spaceAbove = r.top - 8;
      const openUp = spaceBelow < 240 && spaceAbove > spaceBelow;
      setAnchor({ top: openUp ? r.top - 4 : r.bottom + 4, left: r.left, width: r.width, openUp });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open]);

  const results = React.useMemo(() => {
    let list = query.trim() ? searchHs(query, 60) : HS_CODES;
    if (category) list = list.filter((h) => h.category === category);
    return list.slice(0, 12);
  }, [query, category]);

  const choose = (rec: HsCodeRecord) => { setPending(rec); setOpen(false); setQuery(''); };
  const confirm = () => {
    if (!pending) return;
    setValue(name, pending.code, { shouldValidate: true, shouldDirty: true });
    clearErrors(name);
    setPending(null);
  };
  const reset = () => {
    setValue(name, '', { shouldValidate: true, shouldDirty: true });
    setPending(null);
    setQuery('');
  };

  return (
    <div className="form-group" ref={containerRef}>
      {label && <label className="label">{label}{required && <span className="req">*</span>}</label>}

      {value && matched && !pending ? (
        /* Confirmed, registry-validated classification */
        <div className="hs-confirmed">
          <div className="hs-confirmed-main">
            <span className="hs-confirmed-check">✓</span>
            <div>
              <div><span className="mono">{matched.code}</span> — {matched.label}</div>
              <div className="hs-confirmed-sub">{matched.category} · rüsum {matched.tariffRate}% · {hsTier(matched.riskTier)} risk</div>
            </div>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={reset}>Dəyiş</button>
        </div>
      ) : pending ? (
        /* Step 2b — confirm the picked classification before it is assigned */
        <div className="hs-pending">
          <div className="hs-pending-title">Bu təsnifatı təsdiqləyin:</div>
          <div className="hs-pending-body">
            <div><span className="mono">{pending.code}</span> — <b>{pending.label}</b></div>
            <div className="hs-confirmed-sub">
              {pending.category} · rüsum {pending.tariffRate}% · ƏDV {pending.vatRate}% · {hsTier(pending.riskTier)} risk
              {pending.controls.length > 0 && <> · Nəzarət: {pending.controls.join(', ')}</>}
            </div>
          </div>
          <div className="hs-pending-actions">
            <button type="button" className="btn btn-success btn-sm" onClick={confirm}>Təsdiqlə</button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPending(null)}>Ləğv et</button>
          </div>
        </div>
      ) : (
        /* Step 1 (category) + Step 2 (search & pick) */
        <>
          <div className="hs-step-row">
            <select
              className="select"
              value={category}
              onChange={(e) => { setCategory(e.target.value); setOpen(true); }}
              aria-label="Addım 1 — kateqoriya"
            >
              <option value="">Addım 1 — Bütün kateqoriyalar</option>
              {HS_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input
              ref={inputRef}
              className={cn('input', err && 'error')}
              placeholder="Addım 2 — kod və ya məhsul axtar..."
              autoComplete="off"
              value={query}
              onFocus={() => setOpen(true)}
              onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            />
          </div>
          {open && results.length > 0 && createPortal(
            <div
              role="listbox"
              data-hs-listbox
              className="hs-listbox"
              style={{
                position: 'fixed',
                top: anchor.openUp ? undefined : anchor.top,
                bottom: anchor.openUp ? window.innerHeight - anchor.top : undefined,
                left: anchor.left,
                width: anchor.width,
              }}
            >
              {results.map((r) => (
                <button
                  key={r.code}
                  type="button"
                  className="hs-listbox-item"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(r)}
                >
                  <span className="mono hs-listbox-code">{r.code}</span>
                  <span className="hs-listbox-meta">
                    <span className="hs-listbox-label">{r.label}</span>
                    <span className="hs-listbox-sub">{r.category} · {r.tariffRate}% rüsum · {hsTier(r.riskTier)} risk</span>
                  </span>
                </button>
              ))}
            </div>,
            document.body
          )}
          {open && results.length === 0 && query.trim() && (
            <div className="help-text">Uyğun kod tapılmadı — başqa açar söz və ya kateqoriya yoxlayın.</div>
          )}
        </>
      )}

      {hint && !err && !value && !pending && <div className="help-text">{hint}</div>}
      {err && <div className="error-text">{err}</div>}
    </div>
  );
}
