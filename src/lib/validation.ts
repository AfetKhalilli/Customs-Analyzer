import type {
  AttachedDocument, DocumentTypeCode, DeclarationKind, EntityType,
  ShipmentInfo, DeclarationTotals, ValidationIssue, ValidationResult,
} from '../types';
import {
  ALLOWED_FILE_EXTENSIONS, ALLOWED_MIME_TYPES, EXTENSION_TO_MIME,
  MAX_FILE_SIZE_KB, DOC_REQUIREMENTS, DOCUMENT_TYPES,
} from './constants';
import { declStep1Schema, declStep3Schema, declStep4Schema } from './schemas';

// ============================================================================
// ValidationError — thrown by store gates; carries the full issue list.
// ============================================================================
export class ValidationError extends Error {
  issues: ValidationIssue[];
  constructor(issues: ValidationIssue[]) {
    super(`Validation failed: ${issues.length} issue(s)`);
    this.name = 'ValidationError';
    this.issues = issues;
  }
}

const err = (code: string, message: string, field?: string): ValidationIssue =>
  ({ code, severity: 'error', message, field });
const warn = (code: string, message: string, field?: string): ValidationIssue =>
  ({ code, severity: 'warning', message, field });

const ok = (errors: ValidationIssue[], warnings: ValidationIssue[] = []): ValidationResult =>
  ({ ok: errors.length === 0, errors, warnings });

// ============================================================================
// File upload validation — mime + extension + size. ALL three must pass.
// ============================================================================
export interface FileLike {
  fileName: string;
  fileSizeKB: number;
  fileMime: string;
}

export function validateFile(f: FileLike): ValidationResult {
  const errors: ValidationIssue[] = [];

  if (!f || !f.fileName) {
    errors.push(err('FILE_REQUIRED', 'Fayl tələb olunur'));
    return ok(errors);
  }

  const ext = (f.fileName.split('.').pop() || '').toLowerCase();
  if (!ext || !ALLOWED_FILE_EXTENSIONS.includes(ext as (typeof ALLOWED_FILE_EXTENSIONS)[number])) {
    errors.push(err(
      'FILE_EXT_NOT_ALLOWED',
      `Fayl növü qadağandır (.${ext || '?'}). İcazə verilən: ${ALLOWED_FILE_EXTENSIONS.join(', ')}`,
    ));
  }

  // mime must be in allow-list AND match the extension family.
  if (!ALLOWED_MIME_TYPES.includes(f.fileMime)) {
    errors.push(err(
      'FILE_MIME_NOT_ALLOWED',
      `MIME növü qadağandır: ${f.fileMime || 'naməlum'}`,
    ));
  } else if (ext && EXTENSION_TO_MIME[ext] && !EXTENSION_TO_MIME[ext].includes(f.fileMime)) {
    errors.push(err(
      'FILE_MIME_EXT_MISMATCH',
      `Fayl uzantısı (.${ext}) və MIME (${f.fileMime}) uyğun gəlmir`,
    ));
  }

  if (typeof f.fileSizeKB !== 'number' || f.fileSizeKB <= 0) {
    errors.push(err('FILE_SIZE_INVALID', 'Fayl ölçüsü düzgün deyil'));
  } else if (f.fileSizeKB > MAX_FILE_SIZE_KB) {
    errors.push(err(
      'FILE_TOO_LARGE',
      `Fayl çox böyükdür: ${(f.fileSizeKB / 1024).toFixed(1)} MB (maks ${MAX_FILE_SIZE_KB / 1024} MB)`,
    ));
  }

  return ok(errors);
}

// ============================================================================
// Per-document field completeness — replaces the bogus `isComplete: true`.
// ============================================================================
const REQUIRED_FIELDS_BY_TYPE: Partial<Record<DocumentTypeCode, string[]>> = {
  INVOICE:             ['invoiceNumber', 'invoiceDate', 'sellerName', 'sellerAddress', 'buyerName', 'totalAmount', 'currency'],
  COMMERCIAL_INVOICE:  ['invoiceNumber', 'invoiceDate', 'sellerName', 'buyerName', 'incoterms', 'incotermsLocation', 'packageType', 'totalAmount', 'currency'],
  CONTRACT:            ['contractNumber', 'contractDate', 'contractType', 'counterpartyName', 'counterpartyAddress', 'paymentTerms'],
  CUSTOMS_DECLARATION: ['declarationNumber', 'procedureCode', 'hsCode', 'goodsDescription'],
  PACKING_LIST:        ['packingListNumber', 'packingDate'],
  PAYMENT_RECEIPT:     ['receiptNumber', 'paymentDate', 'amount', 'currency', 'bankName', 'payerName'],
  SHIPPING_DOCUMENT:   ['shippingDocType', 'shippingDocNumber', 'carrierName', 'loadingDate'],
  CERTIFICATE:         ['certificateType', 'certificateNumber', 'issueDate', 'issuingAuthority'],
};

function isFilled(v: any): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (typeof v === 'number') return !isNaN(v) && v > 0;
  return true;
}

export function validateDocumentFields(doc: AttachedDocument): ValidationResult {
  const errors: ValidationIssue[] = [];
  const required = REQUIRED_FIELDS_BY_TYPE[doc.typeCode] || [];
  const label = DOCUMENT_TYPES.find((t) => t.code === doc.typeCode)?.label ?? doc.typeCode;

  for (const f of required) {
    if (!isFilled((doc.fields ?? {})[f])) {
      errors.push(err(
        'DOC_FIELD_MISSING',
        `${label}: "${f}" boşdur`,
        `documents.${doc.id}.${f}`,
      ));
    }
  }

  // re-validate the file attached to this doc
  const fileV = validateFile({
    fileName: doc.fileName,
    fileSizeKB: doc.fileSizeKB,
    fileMime: doc.fileMime,
  });
  for (const e of fileV.errors) errors.push({ ...e, field: `documents.${doc.id}.file` });

  return ok(errors);
}

// ============================================================================
// Document policy — does the user have the mandatory docs for this declaration?
// ============================================================================
export function validateDocumentsAgainstPolicy(
  kind: DeclarationKind,
  entityType: EntityType,
  docs: AttachedDocument[],
): ValidationResult {
  const errors: ValidationIssue[] = [];
  const required = DOC_REQUIREMENTS[kind][entityType];
  const present = new Set(docs.map((d) => d.typeCode));
  for (const req of required) {
    if (!present.has(req)) {
      const label = DOCUMENT_TYPES.find((t) => t.code === req)?.label ?? req;
      errors.push(err(
        'MISSING_REQUIRED_DOC',
        `Tələb olunan sənəd çatışmır: ${label}`,
        `documents.${req}`,
      ));
    }
  }
  return ok(errors);
}

// ============================================================================
// Whole-declaration validation — single source of truth.
// Used by: wizard final submit, store gates, AI re-check.
// ============================================================================
export interface FullDeclarationInput {
  ownerEntityType: EntityType;
  kind: DeclarationKind;
  department: string;
  declarationDate: string;
  customsPoint: string;
  referenceNumber?: string;
  documents: AttachedDocument[];
  shipment: ShipmentInfo;
  totals: DeclarationTotals;
}

function pushZod(target: ValidationIssue[], result: { success: boolean; error?: { issues: { code: string; message: string; path: (string | number)[] }[] } }, codePrefix: string) {
  if (result.success || !result.error) return;
  for (const i of result.error.issues) {
    target.push(err(
      `${codePrefix}_${i.code.toUpperCase()}`,
      i.message,
      i.path.join('.'),
    ));
  }
}

export function validateDeclaration(input: FullDeclarationInput): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  // ── 1. Per-step zod schemas applied to the assembled payload ──────────────
  pushZod(errors, declStep1Schema.safeParse({
    kind: input.kind,
    department: input.department,
    declarationDate: input.declarationDate,
    customsPoint: input.customsPoint,
    referenceNumber: input.referenceNumber ?? '',
  }), 'STEP1');

  pushZod(errors, declStep3Schema.safeParse(input.shipment), 'STEP3');

  pushZod(errors, declStep4Schema.safeParse({
    currency: input.totals.currency,
    totalDeclaredValue: input.totals.totalDeclaredValue,
    totalQuantity: input.totals.totalQuantity,
    unitOfMeasure: input.totals.unitOfMeasure,
    hsCode: input.totals.hsCode ?? '',
    originCertificateNo: input.totals.originCertificateNo ?? '',
    additionalNotes: input.totals.additionalNotes ?? '',
  }), 'STEP4');

  // ── 2. Document policy (required docs for this kind × entityType) ─────────
  const polV = validateDocumentsAgainstPolicy(input.kind, input.ownerEntityType, input.documents);
  errors.push(...polV.errors);

  // ── 3. Per-document field completeness + per-file rules ───────────────────
  if (!input.documents || input.documents.length === 0) {
    errors.push(err('NO_DOCUMENTS', 'Ən azı bir sənəd yüklənməlidir', 'documents'));
  } else {
    for (const d of input.documents) {
      const dv = validateDocumentFields(d);
      errors.push(...dv.errors);
    }
  }

  // ── 4. Numeric/physical sanity ────────────────────────────────────────────
  if (input.shipment && input.shipment.grossWeightKg && input.shipment.netWeightKg
      && input.shipment.netWeightKg > input.shipment.grossWeightKg) {
    errors.push(err('NET_GT_GROSS', 'Netto çəki Brutto çəkidən böyük ola bilməz', 'shipment.netWeightKg'));
  }

  return ok(errors, warnings);
}

// ============================================================================
// Helper for UI: short summary of all issues, grouped by code.
// ============================================================================
export function summarizeIssues(issues: ValidationIssue[]): string {
  if (!issues.length) return '';
  return issues.map((i) => `• ${i.message}`).join('\n');
}
