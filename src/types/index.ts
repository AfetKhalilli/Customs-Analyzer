// ============== Roles & Entities ==============
export type EntityType = 'individual' | 'company';
export type Role = 'user' | 'inspector' | 'departmentHead' | 'boss' | 'pca';

export const DEPARTMENTS = [
  'Qida', 'Tekstil', 'Elektronika', 'Kimya', 'Maşınqayırma',
  'Tibbi', 'Kosmetika', 'Mebel', 'Avtomobil', 'İnşaat',
] as const;
export type Department = (typeof DEPARTMENTS)[number];

export type LegalForm = 'MMC' | 'ASC' | 'QSC' | 'Fərdi Sahibkar' | 'Digər';

export interface BaseUser {
  id: string;
  role: Role;
  email: string;
  phone: string;
  password: string;
  createdAt: string;
  status: 'active' | 'suspended';
  entityType: EntityType;
  department?: Department;
  staffTitle?: string;
}

export interface IndividualUser extends BaseUser {
  entityType: 'individual';
  firstName: string;
  lastName: string;
  fatherName: string;
  fin: string;
  dateOfBirth: string;
  gender: 'Kişi' | 'Qadın';
  citizenship: string;
  passportNumber?: string;
  address: { city: string; line: string; postalCode?: string };
}

export interface CompanyUser extends BaseUser {
  entityType: 'company';
  companyName: string;
  companyShortName?: string;
  tin: string;
  registrationNumber: string;
  legalForm: LegalForm;
  registrationDate: string;
  activityField: string;
  legalAddress: { city: string; line: string };
  actualAddress?: { city: string; line: string };
  responsiblePerson: {
    firstName: string;
    lastName: string;
    fatherName: string;
    position: string;
    fin: string;
    phone: string;
    email: string;
  };
  website?: string;
}

export type AppUser = IndividualUser | CompanyUser;

// ============== Declaration ==============
export type DeclarationKind = 'Idxal' | 'Ixrac' | 'Tranzit';

export const ALL_STATUSES = [
  'Yüklənib', 'Yoxlanılır', 'Düzəliş Tələb Olunur',
  'Təsdiq', 'Rədd', 'Tamamlanmış',
] as const;
export type DeclarationStatus = (typeof ALL_STATUSES)[number];

export type DocumentTypeCode =
  | 'INVOICE' | 'COMMERCIAL_INVOICE' | 'CONTRACT' | 'CUSTOMS_DECLARATION'
  | 'PACKING_LIST' | 'PAYMENT_RECEIPT' | 'SHIPPING_DOCUMENT' | 'CERTIFICATE';

export type DocumentGroup = 'FINANCIAL' | 'LEGAL' | 'CUSTOMS' | 'TRANSPORT' | 'CERTIFICATES';

export interface AttachedDocument {
  id: string;
  typeCode: DocumentTypeCode;
  group: DocumentGroup;
  fileName: string;
  fileSizeKB: number;
  fileMime: string;
  uploadedAt: string;
  fields: Record<string, any>;
  isComplete: boolean;
  // Per-document RBAC: roles allowed to see this document. Defaults to all roles.
  visibleTo: Role[];
}

export interface ShipmentInfo {
  originCountry: string;
  destinationCountry: string;
  transportMode: string;
  transportDocumentNumber: string;
  consignor: string;
  consignorAddress: string;
  consignee: string;
  consigneeAddress: string;
  containerNumber?: string;
  packageCount: number;
  grossWeightKg: number;
  netWeightKg: number;
}

export interface DeclarationTotals {
  currency: string;
  totalDeclaredValue: number;
  totalQuantity: number;
  unitOfMeasure: string;
  hsCode?: string;
  originCertificateNo?: string;
  additionalNotes?: string;
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type SelectivityChannel = 'GREEN' | 'YELLOW' | 'RED';

export interface AIFlag {
  code: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  points: number;
  ruleId?: string;             // links to RiskRule.id
  evidence?: string;           // explainability: what observation triggered it
  references?: string[];       // references used (HS code, country tier, tariff, etc.)
}

export interface AIScoreBand {
  band: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  min: number;
  max: number;
  channel: SelectivityChannel;
  label: string;
}

export interface AIResult {
  runAt: string;
  score: number;
  riskLevel: RiskLevel;
  selectivityChannel: SelectivityChannel;
  flags: AIFlag[];
  // Explainability — populated on every run, never random
  reasoning: string;
  thresholds: AIScoreBand[];
  rulesEvaluated: { id: string; name: string; triggered: boolean; weight: number }[];
  referenceData: {
    hsCode?: { code: string; label: string; tariffRate: number; riskTier: 'low' | 'medium' | 'high' };
    originCountry?: { code: string; name: string; tier: 'low' | 'medium' | 'high'; reason: string };
    commodity?: { hsPrefix: string; label: string; controls: string[] };
  };
}

// ============== Reference Data ==============
// HsCodeRecord lives in src/lib/hsCodes.ts (richer dataset; supersedes the
// previous HsCodeEntry type that lived here).

export interface CountryRiskEntry {
  code: string;
  name: string;
  tier: 'low' | 'medium' | 'high';
  reason: string;
  sanctioned: boolean;
}

export interface BrokerProfile {
  id: string;
  name: string;
  licenseNumber: string;
  registeredAt: string;
  riskRating: 'A' | 'B' | 'C' | 'D';
  flaggedCount: number;
}

export interface RiskRule {
  id: string;             // e.g. "RULE_WEIGHT_MISMATCH"
  code: string;           // short code surfaced in flags
  name: string;
  description: string;
  weight: number;
  severity: 'critical' | 'warning' | 'info';
  category: 'shipment' | 'documents' | 'value' | 'origin' | 'reference' | 'pattern';
  active: boolean;
}

export interface ThresholdSet {
  scoreBands: AIScoreBand[];
  slaHoursReview: number;       // declarations spending > this in 'Yoxlanılır' get SLA flag
  highValueAZN: number;         // value beyond which HIGH_VALUE fires
  lowUnitPriceAZN: number;      // below which UNDERVALUATION fires
}

export type Sector =
  | 'İstehlak malları' | 'Ağır sənaye' | 'Texnologiya'
  | 'Səhiyyə' | 'Aqro-sənaye' | 'Tikinti';

// ============== Validation ==============
export interface ValidationIssue {
  code: string;
  field?: string;
  severity: 'error' | 'warning';
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

// ============== Shipping plausibility ==============
export interface ShippingRoute {
  from: string;
  to: string;
  allowedModes: string[];
  transitDaysRange: [number, number];
  freightCostRangeUSD: [number, number];
  notes?: string;
}

export interface CommentEntry {
  id: string;
  declarationId: string;
  authorId: string;
  authorRole: Role;
  authorDisplayName: string;
  text: string;
  at: string;
}

export interface CorrectionRequest {
  id: string;
  inspectorId: string;
  inspectorDisplayName: string;
  summary: string;
  details: string;
  requestedAt: string;
  resolvedAt?: string;
}

export interface Declaration {
  id: string;
  ownerId: string;
  ownerEntityType: EntityType;
  ownerDisplayName: string;
  kind: DeclarationKind;
  department: Department;
  declarationDate: string;
  customsPoint: string;
  referenceNumber?: string;
  documents: AttachedDocument[];
  shipment: ShipmentInfo;
  totals: DeclarationTotals;
  status: DeclarationStatus;
  assignedInspectorId: string | null;
  ai: AIResult;
  aiHistory: AIResult[];
  comments: CommentEntry[];
  correctionRequest?: CorrectionRequest;
  rejectReason?: string;
  uploadedAt: string;
  completedAt?: string;
}

// ============== Logs ==============
export type LogAction =
  | 'UPLOAD' | 'AI_RUN' | 'ASSIGNED' | 'STATUS_CHANGE' | 'COMMENT'
  | 'CORRECTION_REQUESTED' | 'RESUBMITTED' | 'DECISION' | 'AUTO_COMPLETED'
  | 'REASSIGNED' | 'VIEWED_BY_PCA' | 'FINDING_OPENED' | 'WATCHLIST_TOGGLE';

export interface LogEntry {
  id: string;
  declarationId?: string;
  companyId?: string;
  actorId: string;
  actorRole: Role;
  actorDisplayName: string;
  action: LogAction;
  description: string;
  meta?: Record<string, any>;
  at: string;
}

// ============== Notifications ==============
export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  link?: string;
  read: boolean;
  at: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

// ============== PCA (Doc 2) ==============
export type PCAStatus = 'Pending' | 'In Review' | 'Approved' | 'Penalty Applied' | 'Escalated' | 'Closed';
export type PCARiskBand = 'Aşağı' | 'Orta' | 'Yüksək' | 'Kritik';

export interface PCACase {
  id: string;
  declarationId: string;
  companyId: string;
  companyName: string;
  hsCode: string;
  riskBand: PCARiskBand;
  riskScore: number;
  status: PCAStatus;
  dutyAtRisk: number;
  createdAt: string;
  watchlisted: boolean;
  findings: string[];
  notes: string;
}

export type FindingCategory = 'Aşağı qiymət' | 'HS kodu səhvi' | 'Çəki uyğunsuzluğu' | 'Sənəd çatışmır' | 'Digər';
export type FindingSeverity = 'Aşağı' | 'Orta' | 'Yüksək' | 'Kritik';
export type FindingStatus = 'Açıq' | 'İşlənir' | 'Bağlı' | 'Əsassız';

export interface PCAFinding {
  id: string;
  caseId: string;
  declarationId: string;
  companyId: string;
  companyName: string;
  category: FindingCategory;
  severity: FindingSeverity;
  status: FindingStatus;
  title: string;
  description: string;
  dutyImpact: number;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

export type AnomalyPattern =
  | 'REPEATED_HIGH_RISK' | 'UNDERVALUATION_PATTERN' | 'HS_CODE_SWITCHING'
  | 'VALUE_SPIKE' | 'POST_REJECTION_APPROVAL';

export interface PCAAnomaly {
  id: string;
  patternCode: AnomalyPattern;
  patternLabel: string;
  severity: FindingSeverity;
  description: string;
  affectedCompanyIds: string[];
  affectedDeclarationIds: string[];
  detectedAt: string;
  dismissed: boolean;
}

export interface Watchlist {
  auditorId: string;
  companyIds: string[];
}
