// ============================================================================
// Centralized localization & terminology dictionary
// ----------------------------------------------------------------------------
// All user-facing strings, label mappings, and enum→Azerbaijani conversions
// live here. Backend field names and storage values are preserved; only the
// presentation layer is translated. Customs, audit, compliance and public-
// sector terminology is consistently applied across the platform.
// ============================================================================

import type {
  DeclarationStatus, PCAStatus, PCARiskBand, RiskLevel, FindingStatus,
  FindingSeverity, FindingCategory, AnomalyPattern, DeclarationKind, Role,
  LogAction,
} from '../types';

// ── Roles ─────────────────────────────────────────────────────────────────
export const ROLE_LABEL: Record<Role, string> = {
  user:           'İstifadəçi',
  inspector:      'İnspektor',
  departmentHead: 'Şöbə Rəisi',
  boss:           'Baş Direktor',
  pca:            'PCA Auditoru',
};

// ── Declaration statuses ──────────────────────────────────────────────────
export const DECLARATION_STATUS_LABEL: Record<DeclarationStatus, string> = {
  'Yüklənib':             'Təqdim Edilib',
  'Yoxlanılır':           'Audit Yoxlamasında',
  'Düzəliş Tələb Olunur': 'Düzəliş Tələb Edilir',
  'Təsdiq':               'Təsdiq Edilib',
  'Rədd':                 'Rədd Edilib',
  'Tamamlanmış':          'Bağlanmış',
};

// ── PCA case statuses (kept as backend keys; displayed in Azerbaijani) ───
export const PCA_STATUS_LABEL: Record<PCAStatus, string> = {
  'Pending':         'Gözləmədə',
  'In Review':       'Audit Yoxlamasında',
  'Approved':        'Təsdiq Edilib',
  'Penalty Applied': 'Cərimə Tətbiq Edilib',
  'Escalated':       'Eskaləsiya Edilib',
  'Closed':          'Bağlanmış',
};

export const PCA_STATUS_DESCRIPTION: Record<PCAStatus, string> = {
  'Pending':         'Audit prosesi başlanmamış, gözləmə vəziyyətindədir',
  'In Review':       'Auditor tərəfindən aktiv yoxlama aparılır',
  'Approved':        'Audit nəticəsində uyğunluq təsdiq olunub',
  'Penalty Applied': 'Aşkarlanmış pozuntuya görə cərimə tətbiq edilib',
  'Escalated':       'İş yuxarı səlahiyyətli orqana ötürülüb',
  'Closed':          'Audit prosesi tam bağlanıb',
};

// ── Risk bands & levels ───────────────────────────────────────────────────
export const PCA_RISK_BAND_LABEL: Record<PCARiskBand, string> = {
  'Aşağı':  'Aşağı Risk',
  'Orta':   'Orta Risk',
  'Yüksək': 'Yüksək Risk',
  'Kritik': 'Kritik Risk',
};

export const RISK_LEVEL_LABEL: Record<RiskLevel, string> = {
  LOW:      'Aşağı Risk',
  MEDIUM:   'Orta Risk',
  HIGH:     'Yüksək Risk',
  CRITICAL: 'Kritik Risk',
};

// ── Selectivity channels ──────────────────────────────────────────────────
export const CHANNEL_LABEL: Record<'GREEN' | 'YELLOW' | 'RED', string> = {
  GREEN:  'Yaşıl Dəhliz',
  YELLOW: 'Sarı Dəhliz',
  RED:    'Qırmızı Dəhliz',
};

// ── Declaration kinds ─────────────────────────────────────────────────────
export const DECLARATION_KIND_LABEL: Record<DeclarationKind, string> = {
  Idxal:   'İdxal Sənədi',
  Ixrac:   'İxrac Sənədi',
  Tranzit: 'Tranzit Sənədi',
};

// ── Finding categories — NEW 7-category enum (single source of truth) ─────
// These ARE the storage values; old categories migrate on read.
export const FINDING_CATEGORY_LABEL: Record<FindingCategory, string> = {
  'Gömrük Dəyərinin Təhrif Edilməsi':   'Gömrük Dəyərinin Təhrif Edilməsi',
  'HS Kodunun Səhv Təsnifləşdirilməsi': 'HS Kodunun Səhv Təsnifləşdirilməsi',
  'Mənşə Məlumatlarının Saxtalaşdırılması': 'Mənşə Məlumatlarının Saxtalaşdırılması',
  'Sənəd Saxtakarlığı':                 'Sənəd Saxtakarlığı',
  'Gömrük Ödənişlərindən Yayınma':      'Gömrük Ödənişlərindən Yayınma',
  'Gömrük Prosedurlarının Pozulması':   'Gömrük Prosedurlarının Pozulması',
  'Digər Pozuntu':                       'Digər Pozuntu',
};

export const FINDING_CATEGORIES: FindingCategory[] = [
  'Gömrük Dəyərinin Təhrif Edilməsi',
  'HS Kodunun Səhv Təsnifləşdirilməsi',
  'Mənşə Məlumatlarının Saxtalaşdırılması',
  'Sənəd Saxtakarlığı',
  'Gömrük Ödənişlərindən Yayınma',
  'Gömrük Prosedurlarının Pozulması',
  'Digər Pozuntu',
];

// Legacy → new mapping (covers anything persisted before the rename).
export function migrateLegacyFindingCategory(input: string | undefined): FindingCategory {
  if (!input) return 'Digər Pozuntu';
  const map: Record<string, FindingCategory> = {
    // Old terminology produced by AI-classifier or legacy seeds
    'Aşağı qiymət':       'Gömrük Dəyərinin Təhrif Edilməsi',
    'Aşağı qiymət qoyma': 'Gömrük Dəyərinin Təhrif Edilməsi',
    'HS kodu səhvi':      'HS Kodunun Səhv Təsnifləşdirilməsi',
    'Çəki uyğunsuzluğu':  'Gömrük Prosedurlarının Pozulması',
    'Sənəd çatışmır':     'Sənəd Saxtakarlığı',
    'Sənəd səhvi':        'Sənəd Saxtakarlığı',
    'Digər':              'Digər Pozuntu',
    // English aliases (just in case)
    'Valuation Fraud':       'Gömrük Dəyərinin Təhrif Edilməsi',
    'HS Misclassification':  'HS Kodunun Səhv Təsnifləşdirilməsi',
    'Origin Fraud':          'Mənşə Məlumatlarının Saxtalaşdırılması',
    'Document Forgery':      'Sənəd Saxtakarlığı',
    'Duty Evasion':          'Gömrük Ödənişlərindən Yayınma',
    'Procedural Violation':  'Gömrük Prosedurlarının Pozulması',
    'Other':                 'Digər Pozuntu',
  };
  if (map[input]) return map[input];
  if (FINDING_CATEGORIES.includes(input as FindingCategory)) return input as FindingCategory;
  return 'Digər Pozuntu';
}

// ── Finding severities & statuses ─────────────────────────────────────────
export const FINDING_SEVERITY_LABEL: Record<FindingSeverity, string> = {
  'Aşağı':  'Aşağı Şiddət',
  'Orta':   'Orta Şiddət',
  'Yüksək': 'Yüksək Şiddət',
  'Kritik': 'Kritik Şiddət',
};

export const FINDING_STATUS_LABEL: Record<FindingStatus, string> = {
  'Açıq':    'Açıq Tapıntı',
  'İşlənir': 'Araşdırılır',
  'Bağlı':   'Bağlanmış',
  'Əsassız': 'Əsassız Sayılıb',
};

// ── Penalty & Escalation severity (audit workflow) ────────────────────────
export const ESCALATION_LEVEL_LABEL: Record<'Departament' | 'BaşDirektor' | 'NazirlerKabineti' | 'HüquqMühafizə', string> = {
  Departament:       'Şöbə Rəhbərliyinə',
  BaşDirektor:       'Baş Direktorluğa',
  NazirlerKabineti:  'Nazirlər Kabinetinə',
  HüquqMühafizə:     'Hüquq Mühafizə Orqanlarına',
};

// ── Audit log actions ─────────────────────────────────────────────────────
export const LOG_ACTION_LABEL: Record<LogAction, string> = {
  UPLOAD:                'Sənəd təqdim edildi',
  AI_RUN:                'Süni intellekt risk qiymətləndirməsi aparıldı',
  ASSIGNED:              'İnspektor təyinatı aparıldı',
  STATUS_CHANGE:         'Status dəyişikliyi qeydə alındı',
  COMMENT:               'Şərh əlavə edildi',
  CORRECTION_REQUESTED:  'Düzəliş tələbi göndərildi',
  RESUBMITTED:           'Yenidən təqdim edildi',
  DECISION:              'Audit qərarı verildi',
  AUTO_COMPLETED:        'Sistem tərəfindən avtomatik bağlandı',
  REASSIGNED:            'İnspektor yenidən təyin olundu',
  VIEWED_BY_PCA:         'PCA Auditoru tərəfindən baxış aparıldı',
  FINDING_OPENED:        'Audit tapıntısı açıldı',
  WATCHLIST_TOGGLE:      'İzləmə siyahısı yeniləndi',
  AUDIT_STARTED:         'Audit prosesi başladı',
  PENALTY_APPLIED:       'Cərimə tətbiq edildi',
  CASE_ESCALATED:        'İş yuxarı orqana eskaləsiya edildi',
  CASE_CLOSED:           'İş bağlandı',
  CASE_REOPENED:         'İş yenidən açıldı',
  INSPECTION_DEADLINE:   'Yoxlama müddəti qeydə alındı',
  EXPLANATION_REQUESTED: 'İzahat tələb edildi',
};

// ── Anomaly patterns ──────────────────────────────────────────────────────
export const ANOMALY_PATTERN_LABEL: Record<AnomalyPattern, string> = {
  REPEATED_HIGH_RISK:      'Təkrarlanan Yüksək Risk',
  UNDERVALUATION_PATTERN:  'Sistematik Aşağı Qiymət',
  HS_CODE_SWITCHING:       'HS Kodu Manipulyasiyası',
  VALUE_SPIKE:             'Bəyan Dəyəri Sıçrayışı',
  POST_REJECTION_APPROVAL: 'Rəddən Sonra Təsdiq',
};

// ── Inspection rules ──────────────────────────────────────────────────────
export const INSPECTION_RULES = {
  /** Maximum allowed inspection duration in business days. */
  MAX_INSPECTION_DAYS: 2,
} as const;

/** Calculate the deadline date string (YYYY-MM-DD) from a start moment. */
export function calculateInspectionDeadline(startIso: string, days = INSPECTION_RULES.MAX_INSPECTION_DAYS): string {
  const start = new Date(startIso);
  if (isNaN(start.getTime())) return '';
  const dl = new Date(start);
  dl.setDate(dl.getDate() + days);
  return dl.toISOString();
}

/** Hours remaining (can be negative if overdue). */
export function hoursUntil(targetIso: string): number {
  if (!targetIso) return 0;
  const t = new Date(targetIso).getTime();
  if (isNaN(t)) return 0;
  return Math.round((t - Date.now()) / 3_600_000);
}

/** Human-readable countdown / overdue label. */
export function formatInspectionDeadline(deadlineIso?: string): { label: string; overdue: boolean; hours: number } {
  if (!deadlineIso) return { label: '— Müəyyən edilməyib —', overdue: false, hours: 0 };
  const hrs = hoursUntil(deadlineIso);
  if (hrs < 0) return { label: `${Math.abs(hrs)} saat gecikib`, overdue: true, hours: hrs };
  if (hrs < 24) return { label: `${hrs} saat qalıb`, overdue: false, hours: hrs };
  return { label: `${Math.ceil(hrs / 24)} gün qalıb`, overdue: false, hours: hrs };
}

// ── Common phrases used across pages ──────────────────────────────────────
export const UI = {
  // Buttons / actions
  startAudit:         'Auditə Götür',
  openFinding:        'Tapıntı Aç',
  applyPenalty:       'Cərimə Tətbiq Et',
  escalate:           'Yuxarı Orqana Eskalə Et',
  closeCase:          'İşi Bağla',
  reopenCase:         'İşi Yenidən Aç',
  requestExplanation: 'İzahat Tələb Et',
  addToWatchlist:     'İzləmə Siyahısına Əlavə Et',
  removeFromWatchlist:'İzləmə Siyahısından Çıxart',
  watching:           'İzlənilir',
  save:               'Yadda Saxla',
  cancel:             'Ləğv Et',
  confirm:            'Təsdiqlə',
  back:               'Geri',
  next:               'Növbəti',
  submit:             'Təqdim Et',
  approve:            'Təsdiq Et',
  reject:             'Rədd Et',
  requestCorrection:  'Düzəliş Tələb Et',
  reassignInspector:  'İnspektoru Dəyiş',
  startReview:        'Audit Yoxlamasına Başla',

  // Empty states
  noFindings:         'Audit tapıntısı yoxdur',
  noCases:            'Audit işi yoxdur',
  noAnomalies:        'Anomaliya aşkarlanmayıb',
  noResults:          'Nəticə tapılmadı',

  // Section titles
  caseRegistry:       'Audit İşlərinin Reyestri',
  findingRegistry:    'Audit Tapıntılarının Reyestri',
  anomalyDetection:   'Anomaliya Aşkarlama',
  watchlistTitle:     'İzləmə Siyahısı',
  auditTimeline:      'Audit Tarixçəsi',
  companyProfile:     'Şirkət Profili',

  // Field labels
  legalBasis:         'Hüquqi Əsas',
  reason:             'Səbəb',
  dueDate:            'Son Ödəniş Tarixi',
  amount:             'Məbləğ',
  comments:           'Şərhlər',
  notes:              'Qeydlər',
  auditor:            'Auditor',
  assignedTo:         'Təyinatlı Şəxs',
  progress:           'Proqres',
  startDate:          'Başlama Tarixi',
  expectedCompletion: 'Gözlənilən Bitmə Tarixi',
  inspectionDuration: 'Yoxlama Müddəti',
  inspectionDeadline: 'Yoxlama Son Tarixi',
  inspectionStatus:   'Yoxlama Statusu',
};

// ── Generic enum → label resolver (defensive fallback for unknown values) ─
export function label<T extends string>(map: Record<T, string>, key: T | string | undefined): string {
  if (!key) return '';
  return (map as Record<string, string>)[key] ?? String(key);
}
