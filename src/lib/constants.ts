import type {
  DocumentTypeCode, DocumentGroup, DeclarationStatus, RiskLevel,
  PCAStatus, PCARiskBand, DeclarationKind, EntityType, ShippingRoute,
} from '../types';

export const CITIES = [
  'Bakı', 'Gəncə', 'Sumqayıt', 'Şəki', 'Mingəçevir', 'Lənkəran',
  'Naxçıvan', 'Şirvan', 'Quba', 'Şamaxı', 'Xırdalan', 'Yevlax',
];

export const COUNTRIES = [
  { code: 'AZ', name: 'Azərbaycan' },
  { code: 'TR', name: 'Türkiyə' },
  { code: 'RU', name: 'Rusiya' },
  { code: 'IR', name: 'İran' },
  { code: 'GE', name: 'Gürcüstan' },
  { code: 'CN', name: 'Çin' },
  { code: 'DE', name: 'Almaniya' },
  { code: 'US', name: 'ABŞ' },
  { code: 'GB', name: 'Böyük Britaniya' },
  { code: 'FR', name: 'Fransa' },
  { code: 'IT', name: 'İtaliya' },
  { code: 'ES', name: 'İspaniya' },
  { code: 'JP', name: 'Yaponiya' },
  { code: 'KR', name: 'Cənubi Koreya' },
  { code: 'IN', name: 'Hindistan' },
  { code: 'AE', name: 'BƏƏ' },
  { code: 'SA', name: 'Səudiyyə Ərəbistanı' },
  { code: 'UA', name: 'Ukrayna' },
  { code: 'KZ', name: 'Qazaxıstan' },
  { code: 'UZ', name: 'Özbəkistan' },
];

export const CUSTOMS_POINTS = [
  'Bakı Baş Gömrük İdarəsi', 'Astara Gömrük Postu', 'Sədərək Gömrük Postu',
  'Biləsuvar Gömrük Postu', 'Heydər Əliyev Hava Limanı', 'Bakı Dəniz Limanı',
  'Balakən Gömrük Postu', 'Şəmkir Gömrük Postu', 'Sumqayıt Gömrük Postu',
];

export const CURRENCIES = ['AZN', 'USD', 'EUR', 'GBP', 'RUB', 'TRY'];

export const UNITS_OF_MEASURE = [
  'ədəd', 'kq', 'ton', 'litr', 'metr', 'kvadrat metr', 'kub metr',
  'bağlama', 'qutu', 'palet', 'konteyner',
];

export const TRANSPORT_MODES = [
  'Avtomobil', 'Dəmir yolu', 'Hava', 'Dəniz', 'Boru kəməri', 'Çay',
];

export const LEGAL_FORMS = ['MMC', 'ASC', 'QSC', 'Fərdi Sahibkar', 'Digər'];

export const ACTIVITY_FIELDS = [
  'Ticarət', 'İstehsal', 'Xidmət', 'Tikinti', 'Nəqliyyat',
  'Kənd təsərrüfatı', 'IT və Texnologiya', 'Səhiyyə', 'Təhsil', 'Digər',
];

export const POSITIONS = [
  'Direktor', 'İcraçı Direktor', 'Sədr', 'Sədr müavini',
  'Baş Mühasib', 'Şöbə Müdiri', 'Menecer', 'Digər',
];

export const PACKAGE_TYPES = ['Qutu', 'Palet', 'Konteyner', 'Çuval', 'Bağlama', 'Sandıq', 'Bidon'];

export const INCOTERMS = ['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'];

export const SHIPPING_DOC_TYPES = ['CMR', 'B/L (Bill of Lading)', 'AWB (Air Waybill)', 'SMGS', 'TIR Carnet'];

export const CERTIFICATE_TYPES = [
  'Mənşə sertifikatı', 'Keyfiyyət sertifikatı', 'Sanitar sertifikat',
  'Fitosanitar sertifikat', 'Halal sertifikatı', 'CE sertifikatı', 'Veterinar sertifikatı',
];

export const PROCEDURE_CODES = [
  '40 — Daxili istehlak üçün buraxılış',
  '10 — Daimi ixrac',
  '21 — Müvəqqəti ixrac',
  '53 — Müvəqqəti idxal',
  '71 — Gömrük anbarına yerləşdirmə',
  '80 — Tranzit',
];

export const CONTRACT_TYPES = ['Alqı-satqı', 'Distribütor', 'Agentlik', 'Lizinq', 'Lisenziya'];

export const PAYMENT_TERMS = [
  'Avans 100%',
  'Avans 50% + 50% göndərmədən sonra',
  'Avans 30% + 70% çatdırılmadan sonra',
  'Akkreditiv',
  'Inkasso',
  'Açıq hesab 30 gün',
  'Açıq hesab 60 gün',
  'Açıq hesab 90 gün',
];

export const DOCUMENT_TYPES: { code: DocumentTypeCode; label: string; group: DocumentGroup; availableTo: ('individual' | 'company')[] }[] = [
  { code: 'INVOICE',             label: 'Hesab-faktura',       group: 'FINANCIAL',    availableTo: ['individual', 'company'] },
  { code: 'COMMERCIAL_INVOICE',  label: 'Kommersiya invoysu',  group: 'FINANCIAL',    availableTo: ['company'] },
  { code: 'PAYMENT_RECEIPT',     label: 'Ödəniş qəbzi',        group: 'FINANCIAL',    availableTo: ['individual', 'company'] },
  { code: 'CONTRACT',            label: 'Müqavilə',            group: 'LEGAL',        availableTo: ['company'] },
  { code: 'CUSTOMS_DECLARATION', label: 'Gömrük bəyannaməsi',  group: 'CUSTOMS',      availableTo: ['individual', 'company'] },
  { code: 'SHIPPING_DOCUMENT',   label: 'Daşıma sənədi',       group: 'TRANSPORT',    availableTo: ['individual', 'company'] },
  { code: 'PACKING_LIST',        label: 'Qablaşdırma siyahısı',group: 'TRANSPORT',    availableTo: ['individual', 'company'] },
  { code: 'CERTIFICATE',         label: 'Sertifikat',          group: 'CERTIFICATES', availableTo: ['individual', 'company'] },
];

export const DOCUMENT_GROUPS: Record<DocumentGroup, string> = {
  FINANCIAL: 'Maliyyə Sənədləri',
  LEGAL: 'Hüquqi Sənədlər',
  CUSTOMS: 'Gömrük Sənədləri',
  TRANSPORT: 'Daşıma Sənədləri',
  CERTIFICATES: 'Sertifikatlar',
};

export const STATUS_META: Record<DeclarationStatus, { bg: string; text: string }> = {
  'Yüklənib':             { bg: '#dbeafe', text: '#1e3a8a' },
  'Yoxlanılır':           { bg: '#ede9fe', text: '#5b21b6' },
  'Düzəliş Tələb Olunur': { bg: '#fef3c7', text: '#92400e' },
  'Təsdiq':               { bg: '#d1fae5', text: '#065f46' },
  'Rədd':                 { bg: '#fee2e2', text: '#991b1b' },
  'Tamamlanmış':          { bg: '#e5e7eb', text: '#374151' },
};

export const RISK_META: Record<RiskLevel, { bg: string; text: string; label: string }> = {
  LOW:      { bg: '#d1fae5', text: '#065f46', label: 'Aşağı' },
  MEDIUM:   { bg: '#fef3c7', text: '#92400e', label: 'Orta' },
  HIGH:     { bg: '#ffedd5', text: '#9a3412', label: 'Yüksək' },
  CRITICAL: { bg: '#fee2e2', text: '#991b1b', label: 'Kritik' },
};

export const PCA_STATUS_META: Record<PCAStatus, { bg: string; text: string }> = {
  'Pending':         { bg: '#dbeafe', text: '#1e3a8a' },
  'In Review':       { bg: '#ede9fe', text: '#5b21b6' },
  'Approved':        { bg: '#d1fae5', text: '#065f46' },
  'Penalty Applied': { bg: '#fee2e2', text: '#991b1b' },
  'Escalated':       { bg: '#ffe4e6', text: '#9f1239' },
  'Closed':          { bg: '#e5e7eb', text: '#374151' },
};

// ============== File upload rules (enforced in UI + validator) ==============
export const ALLOWED_FILE_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png'] as const;

export const ALLOWED_MIME_TYPES: ReadonlyArray<string> = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
];

export const EXTENSION_TO_MIME: Record<string, string[]> = {
  pdf: ['application/pdf'],
  doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  xls: ['application/vnd.ms-excel'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  png: ['image/png'],
};

export const MAX_FILE_SIZE_MB = 15;
export const MAX_FILE_SIZE_KB = MAX_FILE_SIZE_MB * 1024;

export const FILE_ACCEPT_ATTR = ALLOWED_FILE_EXTENSIONS.map((e) => '.' + e).join(',');

// ============== Mandatory document matrix (kind × entityType) ==============
export const DOC_REQUIREMENTS: Record<DeclarationKind, Record<EntityType, DocumentTypeCode[]>> = {
  Idxal: {
    individual: ['INVOICE', 'SHIPPING_DOCUMENT', 'CUSTOMS_DECLARATION'],
    company:    ['COMMERCIAL_INVOICE', 'CONTRACT', 'SHIPPING_DOCUMENT', 'CUSTOMS_DECLARATION'],
  },
  Ixrac: {
    individual: ['INVOICE', 'SHIPPING_DOCUMENT', 'CUSTOMS_DECLARATION'],
    company:    ['COMMERCIAL_INVOICE', 'CONTRACT', 'SHIPPING_DOCUMENT', 'CUSTOMS_DECLARATION'],
  },
  Tranzit: {
    individual: ['SHIPPING_DOCUMENT', 'CUSTOMS_DECLARATION'],
    company:    ['SHIPPING_DOCUMENT', 'CUSTOMS_DECLARATION'],
  },
};

export function requiredDocsFor(kind: DeclarationKind, entityType: EntityType): DocumentTypeCode[] {
  return DOC_REQUIREMENTS[kind][entityType];
}

// Shipping plausibility moved to src/lib/shippingRoutes.ts — re-export for back-compat.
export { SHIPPING_ROUTES as SHIPPING_PLAUSIBILITY, findRoute } from './shippingRoutes';

export const PCA_RISK_META: Record<PCARiskBand, { bg: string; text: string }> = {
  'Aşağı':   { bg: '#d1fae5', text: '#065f46' },
  'Orta':    { bg: '#fef3c7', text: '#92400e' },
  'Yüksək':  { bg: '#ffedd5', text: '#9a3412' },
  'Kritik':  { bg: '#fee2e2', text: '#991b1b' },
};
