import React from 'react';
import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, FileText } from 'lucide-react';
import { declStep1Schema, declStep3Schema, declStep4Schema } from '../../lib/schemas';
import {
  TextField, NumberField, SelectField, DateField, TextareaField, RadioCardsField,
  FileUploaderField,
} from '../../components/forms/Fields';
import { Modal, RiskBadge, ChannelPill } from '../../components/ui/Primitives';
import {
  CUSTOMS_POINTS, COUNTRIES, TRANSPORT_MODES, CURRENCIES, UNITS_OF_MEASURE,
  DOCUMENT_TYPES, DOCUMENT_GROUPS, PACKAGE_TYPES, INCOTERMS,
  SHIPPING_DOC_TYPES, CERTIFICATE_TYPES, PROCEDURE_CODES, CONTRACT_TYPES, PAYMENT_TERMS,
} from '../../lib/constants';
import { useCurrentUser } from '../../store/authStore';
import { useDataStore } from '../../store/dataStore';
import { runAI } from '../../lib/ai';
import { toast } from '../../store/toastStore';
// dynamic departments come via Step1 -> useDataStore
import type { AttachedDocument, DocumentTypeCode, DocumentGroup, Role } from '../../types';
import { uid } from '../../lib/utils';

interface WizardState {
  step1: any | null;
  step2: AttachedDocument[];
  step3: any | null;
  step4: any | null;
}

export function DeclarationWizard() {
  const user = useCurrentUser()!;
  const navigate = useNavigate();
  const addDeclaration = useDataStore((s) => s.addDeclaration);

  const [step, setStep] = React.useState(1);
  const [state, setState] = React.useState<WizardState>({ step1: null, step2: [], step3: null, step4: null });

  return (
    <div className="container-narrow">
      <h1>Yeni Bəyannamə</h1>
      <p className="text-muted">Addım {step} / 4</p>
      <div className="stepper">
        <div className={`step ${step === 1 ? 'active' : step > 1 ? 'done' : ''}`}><span className="num">1</span> Növ və Şöbə</div>
        <div className={`step ${step === 2 ? 'active' : step > 2 ? 'done' : ''}`}><span className="num">2</span> Sənədlər</div>
        <div className={`step ${step === 3 ? 'active' : step > 3 ? 'done' : ''}`}><span className="num">3</span> Daşıma</div>
        <div className={`step ${step === 4 ? 'active' : ''}`}><span className="num">4</span> Dəyərlər</div>
      </div>

      {step === 1 && <Step1 initial={state.step1} onNext={(d) => { setState({ ...state, step1: d }); setStep(2); }} />}
      {step === 2 && (
        <Step2
          entityType={user.entityType}
          docs={state.step2}
          kind={state.step1?.kind}
          onChange={(docs) => setState({ ...state, step2: docs })}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}
      {step === 3 && <Step3 initial={state.step3} onBack={() => setStep(2)} onNext={(d) => { setState({ ...state, step3: d }); setStep(4); }} />}
      {step === 4 && (
        <Step4
          initial={state.step4}
          state={state}
          ownerEntityType={user.entityType}
          onBack={() => setStep(3)}
          onSubmit={(s4) => {
            const ownerDisplayName = user.entityType === 'individual' ? `${user.firstName} ${user.lastName}` : user.companyName;
            const id = addDeclaration({
              ownerId: user.id, ownerEntityType: user.entityType, ownerDisplayName,
              kind: state.step1.kind, department: state.step1.department,
              declarationDate: state.step1.declarationDate,
              customsPoint: state.step1.customsPoint,
              referenceNumber: state.step1.referenceNumber || undefined,
              documents: state.step2,
              shipment: { ...state.step3 },
              totals: { ...s4 },
            });
            toast.success('Bəyannamə təqdim edildi');
            navigate(`/declaration/${id}`);
          }}
        />
      )}
    </div>
  );
}

function Step1({ initial, onNext }: { initial: any | null; onNext: (d: any) => void }) {
  const departments = useDataStore((s) => s.departments);
  const methods = useForm({
    resolver: zodResolver(declStep1Schema),
    defaultValues: initial ?? {
      kind: 'Idxal', department: '', declarationDate: new Date().toISOString().slice(0, 10),
      customsPoint: '', referenceNumber: '',
    },
  });
  return (
    <FormProvider {...methods}>
      <form className="card" onSubmit={methods.handleSubmit(onNext)}>
        <div className="card-body">
          <RadioCardsField
            name="kind"
            label="Bəyannamə növü"
            required
            options={[
              { value: 'Idxal', title: 'İdxal', description: 'Xaricdən gətirmə' },
              { value: 'Ixrac', title: 'İxrac', description: 'Xaricə göndərmə' },
              { value: 'Tranzit', title: 'Tranzit', description: 'Bir ölkədən digərinə keçid' },
            ]}
          />
          <div className="form-row cols-2">
            <SelectField name="department" label="Şöbə" required options={departments} />
            <SelectField name="customsPoint" label="Gömrük postu" required options={CUSTOMS_POINTS} />
          </div>
          <div className="form-row cols-2">
            <DateField name="declarationDate" label="Bəyannamə tarixi" required max={new Date().toISOString().slice(0, 10)} />
            <TextField name="referenceNumber" label="İstinad nömrəsi (ixtiyari)" />
          </div>
        </div>
        <div className="card-footer flex justify-end">
          <button type="submit" className="btn">Növbəti →</button>
        </div>
      </form>
    </FormProvider>
  );
}

function Step3({ initial, onBack, onNext }: { initial: any | null; onBack: () => void; onNext: (d: any) => void }) {
  const methods = useForm({
    resolver: zodResolver(declStep3Schema),
    defaultValues: initial ?? {
      originCountry: '', destinationCountry: '', transportMode: '', transportDocumentNumber: '',
      consignor: '', consignorAddress: '', consignee: '', consigneeAddress: '',
      containerNumber: '',
      packageCount: 0, grossWeightKg: 0, netWeightKg: 0,
    },
  });
  return (
    <FormProvider {...methods}>
      <form className="card" onSubmit={methods.handleSubmit(onNext)}>
        <div className="card-body">
          <h3>Marşrut</h3>
          <div className="form-row cols-2">
            <SelectField name="originCountry" label="Mənşə ölkəsi" required options={COUNTRIES.map((c) => ({ value: c.code, label: c.name }))} />
            <SelectField name="destinationCountry" label="Təyinat ölkəsi" required options={COUNTRIES.map((c) => ({ value: c.code, label: c.name }))} />
          </div>
          <div className="form-row cols-2">
            <SelectField name="transportMode" label="Nəqliyyat növü" required options={TRANSPORT_MODES} />
            <TextField name="transportDocumentNumber" label="Daşıma sənədi №" required hint="məs: CMR-12345" />
          </div>
          <h3 style={{ marginTop: 14 }}>Göndərən</h3>
          <TextField name="consignor" label="Göndərənin adı" required />
          <TextField name="consignorAddress" label="Göndərənin ünvanı" required />
          <h3 style={{ marginTop: 14 }}>Alıcı</h3>
          <TextField name="consignee" label="Alıcının adı" required />
          <TextField name="consigneeAddress" label="Alıcının ünvanı" required />
          <h3 style={{ marginTop: 14 }}>Yük məlumatları</h3>
          <div className="form-row cols-3">
            <TextField name="containerNumber" label="Konteyner № (ixtiyari)" />
            <NumberField name="packageCount" label="Bağlama sayı" required />
            <NumberField name="grossWeightKg" label="Brutto çəki (kq)" required step="0.01" />
          </div>
          <NumberField name="netWeightKg" label="Netto çəki (kq)" required step="0.01" hint="Netto ≤ Brutto olmalıdır" />
        </div>
        <div className="card-footer flex justify-between">
          <button type="button" className="btn btn-secondary" onClick={onBack}>← Geri</button>
          <button type="submit" className="btn">Növbəti →</button>
        </div>
      </form>
    </FormProvider>
  );
}

function Step4({ initial, state, ownerEntityType, onBack, onSubmit }: {
  initial: any | null; state: WizardState; ownerEntityType: 'individual' | 'company';
  onBack: () => void; onSubmit: (d: any) => void;
}) {
  const methods = useForm({
    resolver: zodResolver(declStep4Schema),
    defaultValues: initial ?? {
      currency: 'USD', totalDeclaredValue: 0, totalQuantity: 0,
      unitOfMeasure: 'ədəd', hsCode: '', originCertificateNo: '', additionalNotes: '',
    },
  });
  const values = methods.watch();

  // live AI preview
  const aiPreview = React.useMemo(() => {
    return runAI({
      ownerEntityType,
      kind: state.step1.kind,
      documents: state.step2,
      shipment: state.step3 ? { ...state.step3 } : undefined,
      totals: { ...values },
    });
  }, [values, state, ownerEntityType]);

  return (
    <FormProvider {...methods}>
      <form className="card" onSubmit={methods.handleSubmit(onSubmit)}>
        <div className="card-body">
          <div className="form-row cols-3">
            <SelectField name="currency" label="Valyuta" required options={CURRENCIES} />
            <NumberField name="totalDeclaredValue" label="Ümumi dəyər" required step="0.01" />
            <SelectField name="unitOfMeasure" label="Ölçü vahidi" required options={UNITS_OF_MEASURE} />
          </div>
          <div className="form-row cols-2">
            <NumberField name="totalQuantity" label="Ümumi miqdar" required step="0.01" />
            <TextField name="hsCode" label="HS Kodu (ixtiyari)" hint="Format: NNNN.NN və ya NNNN.NN.NN" />
          </div>
          <TextField name="originCertificateNo" label="Mənşə sertifikatı № (ixtiyari)" />
          <TextareaField name="additionalNotes" label="Əlavə qeydlər (ixtiyari)" placeholder="Müfəttişə qeyd və ya kontekst..." />

          <div style={{ marginTop: 16, padding: 16, borderRadius: 10, background: 'var(--n-50)', border: '1px solid var(--n-200)' }}>
            <h3 style={{ marginBottom: 10 }}>AI Risk Ön Baxış</h3>
            <div className="flex items-center gap-3 mb-3">
              <RiskBadge level={aiPreview.riskLevel} score={aiPreview.score} />
              <ChannelPill channel={aiPreview.selectivityChannel} />
              <span className="text-muted text-sm">{aiPreview.flags.length} əlamət</span>
            </div>
            {aiPreview.flags.length === 0 && (
              <div className="text-muted text-sm">Hələ heç bir risk əlaməti yoxdur. Bütün addımları tamamladıqdan sonra yenilənəcək.</div>
            )}
            <div className="ai-flags">
              {aiPreview.flags.map((f, i) => (
                <div key={i} className={`ai-flag ${f.severity}`}>
                  <strong>{f.message}</strong> <span className="text-muted">(+{f.points})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="card-footer flex justify-between">
          <button type="button" className="btn btn-secondary" onClick={onBack}>← Geri</button>
          <button type="submit" className="btn btn-success">Bəyannaməni təqdim et</button>
        </div>
      </form>
    </FormProvider>
  );
}

// ============== Step 2: Documents ==============

function Step2({ entityType, docs, kind, onChange, onBack, onNext }: {
  entityType: 'individual' | 'company';
  docs: AttachedDocument[]; kind?: string;
  onChange: (d: AttachedDocument[]) => void;
  onBack: () => void; onNext: () => void;
}) {
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [docFormType, setDocFormType] = React.useState<DocumentTypeCode | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const availableDocs = DOCUMENT_TYPES.filter((d) => d.availableTo.includes(entityType));

  const handleAddDoc = (doc: AttachedDocument) => {
    onChange([...docs, doc]);
    setDocFormType(null);
  };
  const handleRemove = (id: string) => onChange(docs.filter((d) => d.id !== id));

  const proceed = () => {
    setError(null);
    if (docs.length === 0) { setError('Ən azı bir sənəd yükləməlisiniz'); return; }
    if ((kind === 'Idxal' || kind === 'Ixrac') && !docs.some((d) => d.group === 'CUSTOMS')) {
      setError('İdxal/İxrac üçün ən azı bir Gömrük sənədi tələb olunur');
      return;
    }
    if (entityType === 'company' && !docs.some((d) => d.group === 'FINANCIAL')) {
      setError('Hüquqi şəxslər üçün ən azı bir Maliyyə sənədi tələb olunur');
      return;
    }
    onNext();
  };

  const grouped: Record<DocumentGroup, AttachedDocument[]> = {
    FINANCIAL: [], LEGAL: [], CUSTOMS: [], TRANSPORT: [], CERTIFICATES: [],
  };
  for (const d of docs) grouped[d.group].push(d);

  return (
    <div className="card">
      <div className="card-body">
        <div className="flex items-center justify-between mb-3">
          <h3 style={{ margin: 0 }}>Yüklənmiş sənədlər ({docs.length})</h3>
          <button type="button" className="btn" onClick={() => setPickerOpen(true)}>
            <Plus size={14} /> Sənəd əlavə et
          </button>
        </div>

        {error && <div className="banner error">{error}</div>}

        {docs.length === 0 && (
          <div className="empty-state" style={{ padding: 40 }}>
            <FileText size={32} style={{ color: 'var(--n-400)' }} />
            <p style={{ marginTop: 12 }}>Hələ sənəd yüklənməyib. Yuxarıdakı düymə ilə sənəd əlavə edin.</p>
          </div>
        )}

        {Object.entries(grouped).map(([group, items]) => items.length === 0 ? null : (
          <div key={group} style={{ marginBottom: 14 }}>
            <h4 className="text-muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>
              {DOCUMENT_GROUPS[group as DocumentGroup]}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map((d) => (
                <div key={d.id} className="doc-card">
                  <div className="doc-icon"><FileText size={18} /></div>
                  <div className="doc-meta">
                    <div className="doc-name">{DOCUMENT_TYPES.find((t) => t.code === d.typeCode)?.label} — {d.fileName}</div>
                    <div className="doc-info">{d.fileSizeKB} KB · {Object.keys(d.fields).length} sahə doldurulub</div>
                  </div>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleRemove(d.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="card-footer flex justify-between">
        <button type="button" className="btn btn-secondary" onClick={onBack}>← Geri</button>
        <button type="button" className="btn" onClick={proceed}>Növbəti →</button>
      </div>

      <Modal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Sənəd növünü seçin"
        size="lg"
      >
        {(['FINANCIAL', 'LEGAL', 'CUSTOMS', 'TRANSPORT', 'CERTIFICATES'] as DocumentGroup[]).map((g) => {
          const items = availableDocs.filter((d) => d.group === g);
          if (items.length === 0) return null;
          return (
            <div key={g} style={{ marginBottom: 14 }}>
              <h4 className="text-muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>
                {DOCUMENT_GROUPS[g]}
              </h4>
              <div className="radio-cards">
                {items.map((d) => (
                  <div key={d.code} className="radio-card" onClick={() => { setPickerOpen(false); setDocFormType(d.code); }}>
                    <div className="rc-title">{d.label}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </Modal>

      {docFormType && (
        <DocumentForm
          typeCode={docFormType}
          onCancel={() => setDocFormType(null)}
          onSave={handleAddDoc}
        />
      )}
    </div>
  );
}

// ============== Document type forms ==============
function DocumentForm({ typeCode, onCancel, onSave }: {
  typeCode: DocumentTypeCode;
  onCancel: () => void;
  onSave: (d: AttachedDocument) => void;
}) {
  const docMeta = DOCUMENT_TYPES.find((d) => d.code === typeCode)!;
  const methods = useForm({ defaultValues: defaultFieldsFor(typeCode) });
  const file = methods.watch('_file');

  const onSubmit = methods.handleSubmit((values) => {
    if (!values._file) {
      methods.setError('_file', { type: 'manual', message: 'Fayl yükləyin' });
      return;
    }
    const { _file, _visibleTo, ...fields } = values;
    const visibleTo = (_visibleTo as Role[] | undefined) ?? ['user', 'inspector', 'departmentHead', 'boss', 'pca'];
    const doc: AttachedDocument = {
      id: uid('doc'),
      typeCode,
      group: docMeta.group,
      fileName: _file.fileName,
      fileSizeKB: _file.fileSizeKB,
      fileMime: _file.fileMime,
      uploadedAt: _file.uploadedAt,
      fields,
      isComplete: true,
      visibleTo,
    };
    onSave(doc);
  });

  return (
    <Modal open={true} onClose={onCancel} title={`${docMeta.label} əlavə et`} size="lg"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onCancel}>Ləğv et</button>
          <button className="btn" onClick={onSubmit}>Yadda saxla</button>
        </>
      }
    >
      <FormProvider {...methods}>
        <form onSubmit={onSubmit}>
          <FileUploaderField name="_file" label="Fayl" hint="PDF, JPG, PNG qəbul edilir" />
          <DocumentFields typeCode={typeCode} />
          <VisibilityPicker />
        </form>
      </FormProvider>
    </Modal>
  );
}

function DocumentFields({ typeCode }: { typeCode: DocumentTypeCode }) {
  if (typeCode === 'INVOICE') {
    return (
      <>
        <div className="form-row cols-2">
          <TextField name="invoiceNumber" label="Hesab-faktura №" required />
          <DateField name="invoiceDate" label="Hesab-faktura tarixi" required />
        </div>
        <TextField name="sellerName" label="Satıcının adı" required />
        <TextField name="sellerAddress" label="Satıcının ünvanı" required />
        <TextField name="buyerName" label="Alıcının adı" required />
        <div className="form-row cols-2">
          <NumberField name="totalAmount" label="Ümumi məbləğ" required step="0.01" />
          <SelectField name="currency" label="Valyuta" required options={CURRENCIES} />
        </div>
      </>
    );
  }
  if (typeCode === 'COMMERCIAL_INVOICE') {
    return (
      <>
        <div className="form-row cols-2">
          <TextField name="invoiceNumber" label="Invoys №" required />
          <DateField name="invoiceDate" label="Invoys tarixi" required />
        </div>
        <TextField name="sellerName" label="Satıcının adı" required />
        <TextField name="buyerName" label="Alıcının adı" required />
        <div className="form-row cols-3">
          <SelectField name="incoterms" label="Incoterms" required options={INCOTERMS} />
          <TextField name="incotermsLocation" label="Incoterms yeri" required placeholder="məs: Bakı" />
          <SelectField name="packageType" label="Bağlama növü" required options={PACKAGE_TYPES} />
        </div>
        <div className="form-row cols-2">
          <NumberField name="totalAmount" label="Ümumi məbləğ" required step="0.01" />
          <SelectField name="currency" label="Valyuta" required options={CURRENCIES} />
        </div>
      </>
    );
  }
  if (typeCode === 'CONTRACT') {
    return (
      <>
        <div className="form-row cols-2">
          <TextField name="contractNumber" label="Müqavilə №" required />
          <DateField name="contractDate" label="Müqavilə tarixi" required />
        </div>
        <SelectField name="contractType" label="Müqavilə növü" required options={CONTRACT_TYPES} />
        <div className="form-row cols-2">
          <TextField name="counterpartyName" label="Qarşı tərəfin adı" required />
          <TextField name="counterpartyAddress" label="Qarşı tərəfin ünvanı" required />
        </div>
        <SelectField name="paymentTerms" label="Ödəniş şərtləri" required options={PAYMENT_TERMS} />
        <TextareaField name="subject" label="Müqavilənin predmeti" placeholder="Qısa təsvir" />
      </>
    );
  }
  if (typeCode === 'CUSTOMS_DECLARATION') {
    return (
      <>
        <div className="form-row cols-2">
          <TextField name="declarationNumber" label="Bəyannamə №" required />
          <SelectField name="procedureCode" label="Prosedur kodu" required options={PROCEDURE_CODES} />
        </div>
        <TextField name="hsCode" label="HS Kodu" required hint="Format: NNNN.NN" />
        <TextField name="goodsDescription" label="Malların təsviri" required />
      </>
    );
  }
  if (typeCode === 'PACKING_LIST') {
    return <PackingListFields />;
  }
  if (typeCode === 'PAYMENT_RECEIPT') {
    return (
      <>
        <div className="form-row cols-2">
          <TextField name="receiptNumber" label="Qəbz №" required />
          <DateField name="paymentDate" label="Ödəniş tarixi" required />
        </div>
        <div className="form-row cols-3">
          <NumberField name="amount" label="Məbləğ" required step="0.01" />
          <SelectField name="currency" label="Valyuta" required options={CURRENCIES} />
          <TextField name="bankName" label="Bank adı" required />
        </div>
        <TextField name="payerName" label="Ödəyicinin adı" required />
      </>
    );
  }
  if (typeCode === 'SHIPPING_DOCUMENT') {
    return (
      <>
        <div className="form-row cols-2">
          <SelectField name="shippingDocType" label="Daşıma sənədi növü" required options={SHIPPING_DOC_TYPES} />
          <TextField name="shippingDocNumber" label="Sənəd №" required />
        </div>
        <div className="form-row cols-2">
          <TextField name="carrierName" label="Daşıyıcının adı" required />
          <TextField name="vehicleNumber" label="Nəqliyyat vasitəsi №" />
        </div>
        <div className="form-row cols-2">
          <DateField name="loadingDate" label="Yükləmə tarixi" required />
          <DateField name="estimatedArrival" label="Çatma tarixi" />
        </div>
      </>
    );
  }
  if (typeCode === 'CERTIFICATE') {
    return (
      <>
        <div className="form-row cols-2">
          <SelectField name="certificateType" label="Sertifikat növü" required options={CERTIFICATE_TYPES} />
          <TextField name="certificateNumber" label="Sertifikat №" required />
        </div>
        <div className="form-row cols-2">
          <DateField name="issueDate" label="Verilmə tarixi" required />
          <DateField name="expiryDate" label="Bitmə tarixi" />
        </div>
        <TextField name="issuingAuthority" label="Verən orqan" required />
        <TextField name="goodsCovered" label="Əhatə etdiyi mallar" />
      </>
    );
  }
  return null;
}

function PackingListFields() {
  const { setValue, watch } = useFormContext();
  const items = watch('items') ?? [];
  const add = () => setValue('items', [...items, { description: '', quantity: 1, weight: 0, packageNumber: '' }]);
  const remove = (i: number) => setValue('items', items.filter((_: any, idx: number) => idx !== i));
  const update = (i: number, key: string, val: any) => {
    const next = items.map((it: any, idx: number) => (idx === i ? { ...it, [key]: val } : it));
    setValue('items', next);
  };
  return (
    <>
      <div className="form-row cols-2">
        <TextField name="packingListNumber" label="Qablaşdırma siyahısı №" required />
        <DateField name="packingDate" label="Tarix" required />
      </div>
      <h4 style={{ marginTop: 10 }}>Mal sətirləri</h4>
      {(items as any[]).length === 0 && (
        <div className="text-muted text-sm mb-2">Hələ sətir əlavə edilməyib</div>
      )}
      {(items as any[]).map((it, i) => (
        <div key={i} className="card" style={{ padding: 12, marginBottom: 8 }}>
          <div className="form-row cols-2">
            <div className="form-group">
              <label className="label">Təsvir</label>
              <input className="input" value={it.description} onChange={(e) => update(i, 'description', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">Bağlama №</label>
              <input className="input" value={it.packageNumber} onChange={(e) => update(i, 'packageNumber', e.target.value)} />
            </div>
          </div>
          <div className="form-row cols-2">
            <div className="form-group">
              <label className="label">Miqdar</label>
              <input className="input" type="number" value={it.quantity} onChange={(e) => update(i, 'quantity', Number(e.target.value))} />
            </div>
            <div className="form-group">
              <label className="label">Çəki (kq)</label>
              <input className="input" type="number" value={it.weight} onChange={(e) => update(i, 'weight', Number(e.target.value))} />
            </div>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => remove(i)}>
            <Trash2 size={14} /> Sil
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-secondary btn-sm" onClick={add}>
        <Plus size={14} /> Sətir əlavə et
      </button>
    </>
  );
}

const VISIBILITY_OPTIONS: { value: Role; label: string }[] = [
  { value: 'user',           label: 'Mən (sənəd sahibi)' },
  { value: 'inspector',      label: 'Müfəttiş' },
  { value: 'departmentHead', label: 'Şöbə Rəisi' },
  { value: 'boss',           label: 'Baş Direktor' },
  { value: 'pca',            label: 'PCA Auditor' },
];

function VisibilityPicker() {
  const { setValue, watch } = useFormContext();
  const cur: Role[] = watch('_visibleTo') ?? ['user', 'inspector', 'departmentHead', 'boss', 'pca'];
  const toggle = (r: Role) => {
    const next = cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r];
    // 'user' (the owner) is always required — they uploaded it
    if (!next.includes('user')) next.push('user');
    setValue('_visibleTo', next, { shouldDirty: true });
  };
  return (
    <div className="form-group" style={{ marginTop: 12, padding: 12, background: 'var(--n-50)', borderRadius: 8, border: '1px solid var(--n-200)' }}>
      <label className="label">Bu sənədə kim baxa bilər?</label>
      <div className="help-text" style={{ marginBottom: 6 }}>Standart: hamı. Yalnız müəyyən rollar üçün məhdudlaşdırmaq olar. Sənəd sahibi (siz) həmişə daxildir.</div>
      <div className="chip-row">
        {VISIBILITY_OPTIONS.map((o) => (
          <button type="button" key={o.value}
            className={`chip ${cur.includes(o.value) ? 'active' : ''}`}
            onClick={() => toggle(o.value)}
            disabled={o.value === 'user'}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function defaultFieldsFor(code: DocumentTypeCode): Record<string, any> {
  const today = new Date().toISOString().slice(0, 10);
  switch (code) {
    case 'INVOICE': return { _file: undefined, invoiceNumber: '', invoiceDate: today, sellerName: '', sellerAddress: '', buyerName: '', totalAmount: 0, currency: 'USD' };
    case 'COMMERCIAL_INVOICE': return { _file: undefined, invoiceNumber: '', invoiceDate: today, sellerName: '', buyerName: '', incoterms: 'FOB', incotermsLocation: '', packageType: 'Qutu', totalAmount: 0, currency: 'USD' };
    case 'CONTRACT': return { _file: undefined, contractNumber: '', contractDate: today, contractType: 'Alqı-satqı', counterpartyName: '', counterpartyAddress: '', paymentTerms: 'Avans 50% + 50% göndərmədən sonra', subject: '' };
    case 'CUSTOMS_DECLARATION': return { _file: undefined, declarationNumber: '', procedureCode: '40 — Daxili istehlak üçün buraxılış', hsCode: '', goodsDescription: '' };
    case 'PACKING_LIST': return { _file: undefined, packingListNumber: '', packingDate: today, items: [] };
    case 'PAYMENT_RECEIPT': return { _file: undefined, receiptNumber: '', paymentDate: today, amount: 0, currency: 'USD', bankName: '', payerName: '' };
    case 'SHIPPING_DOCUMENT': return { _file: undefined, shippingDocType: 'CMR', shippingDocNumber: '', carrierName: '', vehicleNumber: '', loadingDate: today, estimatedArrival: '' };
    case 'CERTIFICATE': return { _file: undefined, certificateType: 'Mənşə sertifikatı', certificateNumber: '', issueDate: today, expiryDate: '', issuingAuthority: '', goodsCovered: '' };
  }
}
