import type {
  CountryRiskEntry, BrokerProfile, RiskRule, ThresholdSet, AIScoreBand, Sector,
} from '../types';

// HS catalog moved to src/lib/hsCodes.ts (HS_CODES, lookupHs, searchHs).
// Pricing reference moved to src/lib/pricingReference.ts.

// ============================================================================
// Country risk tiers — based on sanctions, contraband history, FATF
// ============================================================================
export const COUNTRY_RISK: CountryRiskEntry[] = [
  { code: 'AZ', name: 'Azərbaycan',     tier: 'low',    reason: 'Yerli yurisdiksiya',                                  sanctioned: false },
  { code: 'TR', name: 'Türkiyə',        tier: 'low',    reason: 'Strateji tərəfdaş, stabil ticarət axını',             sanctioned: false },
  { code: 'GE', name: 'Gürcüstan',      tier: 'low',    reason: 'Qonşu ölkə, transit dəhliz',                          sanctioned: false },
  { code: 'DE', name: 'Almaniya',       tier: 'low',    reason: 'AB, yüksək uyğunluq tarixçəsi',                       sanctioned: false },
  { code: 'IT', name: 'İtaliya',        tier: 'low',    reason: 'AB, yüksək uyğunluq tarixçəsi',                       sanctioned: false },
  { code: 'FR', name: 'Fransa',         tier: 'low',    reason: 'AB, yüksək uyğunluq tarixçəsi',                       sanctioned: false },
  { code: 'GB', name: 'Böyük Britaniya',tier: 'low',    reason: 'OECD üzv',                                            sanctioned: false },
  { code: 'US', name: 'ABŞ',            tier: 'low',    reason: 'OECD üzv',                                            sanctioned: false },
  { code: 'AE', name: 'BƏƏ',            tier: 'medium', reason: 'Transit hub, ikinci dərəcəli mənşə riski',            sanctioned: false },
  { code: 'KR', name: 'Cənubi Koreya',  tier: 'low',    reason: 'OECD üzv',                                            sanctioned: false },
  { code: 'JP', name: 'Yaponiya',       tier: 'low',    reason: 'OECD üzv',                                            sanctioned: false },
  { code: 'CN', name: 'Çin',            tier: 'medium', reason: 'Aşağı qiymət və HS kodu uyğunsuzluğu tarixçəsi',      sanctioned: false },
  { code: 'IN', name: 'Hindistan',      tier: 'medium', reason: 'Aşağı qiymət bəyanı tarixçəsi',                       sanctioned: false },
  { code: 'KZ', name: 'Qazaxıstan',     tier: 'medium', reason: 'Transit mənşə riski',                                 sanctioned: false },
  { code: 'UZ', name: 'Özbəkistan',     tier: 'medium', reason: 'Transit mənşə riski',                                 sanctioned: false },
  { code: 'UA', name: 'Ukrayna',        tier: 'medium', reason: 'Münaqişə bölgəsi, sənəd uyğunsuzluğu artıb',          sanctioned: false },
  { code: 'RU', name: 'Rusiya',         tier: 'high',   reason: 'Beynəlxalq sanksiyalar; mənşə uyğunsuzluğu riski',   sanctioned: true  },
  { code: 'IR', name: 'İran',           tier: 'high',   reason: 'Beynəlxalq sanksiyalar; qaçaqmalçılıq riski yüksək', sanctioned: true  },
  { code: 'SA', name: 'Səudiyyə Ərəbistanı', tier: 'low', reason: 'Stabil ticarət əlaqəsi',                            sanctioned: false },
  { code: 'ES', name: 'İspaniya',       tier: 'low',    reason: 'AB üzv',                                              sanctioned: false },
];
export function findCountry(code?: string): CountryRiskEntry | undefined {
  if (!code) return undefined;
  return COUNTRY_RISK.find((c) => c.code === code);
}

// Commodity classifications removed — categorisation now lives on each
// HsCodeRecord in src/lib/hsCodes.ts (HsCodeRecord.category).

// ============================================================================
// Broker / company profile registry — used in PCA cross-check
// ============================================================================
export const BROKER_PROFILES: BrokerProfile[] = [
  { id: 'BRK_001', name: 'AzCustoms Brokerage MMC', licenseNumber: 'LIC-2019-001', registeredAt: '2019-03-12', riskRating: 'A', flaggedCount: 0 },
  { id: 'BRK_002', name: 'Caspian Trade Agents',    licenseNumber: 'LIC-2020-018', registeredAt: '2020-07-04', riskRating: 'B', flaggedCount: 2 },
  { id: 'BRK_003', name: 'Express Customs Solutions', licenseNumber: 'LIC-2021-044', registeredAt: '2021-01-22', riskRating: 'C', flaggedCount: 6 },
  { id: 'BRK_004', name: 'Border Logistics',         licenseNumber: 'LIC-2022-077', registeredAt: '2022-11-09', riskRating: 'D', flaggedCount: 11 },
];

// ============================================================================
// Risk rule catalog — every flag emitted by AI must link to a rule here
// ============================================================================
export const RISK_RULES: RiskRule[] = [
  { id: 'RULE_WEIGHT_MISMATCH',     code: 'WEIGHT_MISMATCH',      name: 'Netto > Brutto',                     description: 'Bəyan edilmiş netto çəki brutto çəkidən böyükdür — fiziki cəhətdən mümkünsüz.', weight: 25, severity: 'critical', category: 'shipment',   active: true },
  { id: 'RULE_UNDERVALUATION',      code: 'UNDERVALUATION_RISK',  name: 'Şübhəli aşağı vahid qiymət',         description: 'Vahid qiymət bazar həddi olan eşikdən aşağıdır.',                            weight: 20, severity: 'critical', category: 'value',      active: true },
  { id: 'RULE_NO_DOCS',             code: 'NO_DOCS',              name: 'Sənəd yoxdur',                       description: 'Heç bir təsdiqedici sənəd əlavə edilməyib.',                                 weight: 30, severity: 'critical', category: 'documents',  active: true },
  { id: 'RULE_LOW_DOC_COUNT',       code: 'LOW_DOC_COUNT',        name: 'Yetərsiz sənəd sayı',                description: 'Sənəd sayı tövsiyə olunan minimumdan azdır (≥3).',                           weight: 8,  severity: 'warning',  category: 'documents',  active: true },
  { id: 'RULE_MISSING_CUSTOMS_DOC', code: 'MISSING_CUSTOMS_DOC',  name: 'Gömrük sənədi yoxdur',               description: 'İdxal/İxrac üçün gömrük sənədi tələb olunur.',                               weight: 15, severity: 'critical', category: 'documents',  active: true },
  { id: 'RULE_MISSING_FINANCIAL',   code: 'MISSING_FINANCIAL_DOC',name: 'Maliyyə sənədi yoxdur',              description: 'Hüquqi şəxslər üçün ən azı bir maliyyə sənədi (invoys/qəbz) tələb olunur.',  weight: 15, severity: 'warning',  category: 'documents',  active: true },
  { id: 'RULE_HIGH_VALUE',          code: 'HIGH_VALUE',           name: 'Yüksək bəyan dəyəri',                description: 'Bəyan dəyəri yüksək dəyər həddini aşır.',                                    weight: 10, severity: 'warning',  category: 'value',      active: true },
  { id: 'RULE_SENSITIVE_ORIGIN',    code: 'SENSITIVE_ORIGIN',     name: 'Yüksək riskli mənşə',                description: 'Mənşə ölkəsi sanksiyalar/yüksək risk siyahısındadır.',                       weight: 12, severity: 'warning',  category: 'origin',     active: true },
  { id: 'RULE_PKG_WEIGHT_ANOMALY',  code: 'PACKAGE_WEIGHT_ANOMALY',name:'Bağlama çəkisi anomal',              description: 'Bağlama başına çəki normaldan ciddi şəkildə kənardır.',                       weight: 6,  severity: 'info',     category: 'shipment',   active: true },
  { id: 'RULE_HS_FORMAT',           code: 'HS_CODE_FORMAT',       name: 'HS kodu format səhvi',               description: 'HS kodu standart formata uyğun deyil (NNNN.NN[.NN]).',                       weight: 5,  severity: 'info',     category: 'reference',  active: true },
  { id: 'RULE_ROUND_NUMBER',        code: 'ROUND_NUMBER',         name: 'Yuvarlaq dəyər',                     description: 'Bəyan dəyəri tam yuvarlaq rəqəmdir — qiymət manipulyasiyası göstəricisi.',   weight: 3,  severity: 'info',     category: 'value',      active: true },
  { id: 'RULE_HS_UNKNOWN',          code: 'HS_NOT_IN_DB',         name: 'HS kodu reyestrdə yoxdur',           description: 'Verilmiş HS kodu rəsmi reyestrdə tapılmadı — bəyan yenidən yoxlanılmalıdır.', weight: 8,  severity: 'warning',  category: 'reference',  active: true },
  { id: 'RULE_HS_HIGH_TARIFF',      code: 'HIGH_TARIFF_HS',       name: 'Yüksək rüsumlu HS kodu',             description: 'Bu HS kodu üzrə rüsum ≥20% — qiymət/sənəd dəqiqliyinə xüsusi diqqət.',       weight: 8,  severity: 'warning',  category: 'reference',  active: true },
  { id: 'RULE_HS_HIGH_RISK_TIER',   code: 'HIGH_RISK_COMMODITY',  name: 'Yüksək riskli mal kateqoriyası',     description: 'HS kodu reyestrdə yüksək risk kateqoriyasındadır (məs: əczaçılıq, telefonlar).', weight: 7, severity: 'warning', category: 'reference', active: true },
  { id: 'RULE_SANCTIONED_ORIGIN',   code: 'SANCTIONED_ORIGIN',    name: 'Sanksiyalı mənşə',                   description: 'Mənşə ölkəsi sanksiya rejimindədir — əlavə sənəd yoxlaması məcburidir.',     weight: 18, severity: 'critical', category: 'origin',     active: true },
  { id: 'RULE_TARIFF_VS_VALUE',     code: 'TARIFF_VALUE_OUTLIER', name: 'Tarif/dəyər nisbəti normaldan kənar',description: 'Hesablanmış rüsum bazar tarifindən ciddi şəkildə fərqlənir.',                 weight: 6,  severity: 'info',     category: 'reference',  active: true },
  // ── New: required-doc + cross-doc + route plausibility ────────────────────
  { id: 'RULE_MISSING_REQUIRED_DOC', code: 'MISSING_REQUIRED_DOC', name: 'Tələb olunan sənəd çatışmır',       description: 'Bu sənəd növü/şəxs növü üçün məcburi əlavə sənəd qoşulmayıb.',              weight: 25, severity: 'critical', category: 'documents',  active: true },
  { id: 'RULE_VALIDATION_FAIL',      code: 'VALIDATION_FAIL',      name: 'Sistem validasiyası uğursuz',       description: 'Sənəd L1 sistem validasiyasından keçməyib (sahə/sənəd/fayl səhvi).',        weight: 30, severity: 'critical', category: 'documents',  active: true },
  { id: 'RULE_INVOICE_VALUE_MM',     code: 'INVOICE_VALUE_MISMATCH', name: 'Invoys ↔ bəyan dəyəri uyğunsuz', description: 'Hesab-faktura məbləği ümumi bəyan dəyərindən >5% kənardır.',                weight: 20, severity: 'critical', category: 'value',      active: true },
  { id: 'RULE_INVOICE_CCY_MM',       code: 'INVOICE_CURRENCY_MISMATCH', name: 'Invoys valyutası uyğun deyil', description: 'Hesab-faktura valyutası sənəd valyutasından fərqlidir.',                 weight: 10, severity: 'warning',  category: 'value',      active: true },
  { id: 'RULE_PACK_QTY_MM',          code: 'PACKING_QTY_MISMATCH', name: 'Qablaşdırma ↔ miqdar uyğunsuz',      description: 'Qablaşdırma siyahısındakı miqdar cəmi ümumi miqdara uyğun deyil.',           weight: 15, severity: 'warning',  category: 'documents',  active: true },
  { id: 'RULE_PACK_WT_MM',           code: 'PACKING_WEIGHT_MISMATCH', name: 'Qablaşdırma ↔ netto çəki uyğunsuz', description: 'Qablaşdırma çəki cəmi netto çəkidən >10% fərqlidir.',                  weight: 15, severity: 'warning',  category: 'documents',  active: true },
  { id: 'RULE_PACK_PKG_MM',          code: 'PACKING_PKGCOUNT_MISMATCH', name: 'Qablaşdırma ↔ bağlama sayı',   description: 'Qablaşdırma siyahısındakı sətir sayı bəyan edilən bağlama sayı ilə uyğun deyil.', weight: 10, severity: 'warning', category: 'documents', active: true },
  { id: 'RULE_HS_INTRA_MM',          code: 'HS_CODE_INTRA_MISMATCH', name: 'HS kodu sənədlər arası uyğunsuz', description: 'Gömrük sənədindəki HS kodu ümumi HS kodundan fərqlidir.',                   weight: 20, severity: 'critical', category: 'documents',  active: true },
  { id: 'RULE_BUYER_CON_MM',         code: 'BUYER_CONSIGNEE_MISMATCH', name: 'Alıcı ↔ alıcı (daşıma) uyğunsuz', description: 'Invoysun alıcısı bəyan edilən alıcıdan əhəmiyyətli dərəcədə fərqlidir.', weight: 10, severity: 'warning',  category: 'documents',  active: true },
  { id: 'RULE_SELLER_CON_MM',        code: 'SELLER_CONSIGNOR_MISMATCH', name: 'Satıcı ↔ göndərən uyğunsuz',   description: 'Invoys satıcısı bəyan edilən göndərəndən əhəmiyyətli dərəcədə fərqlidir.', weight: 10, severity: 'warning',  category: 'documents',  active: true },
  { id: 'RULE_CERT_ORIGIN_MM',       code: 'CERT_ORIGIN_MISMATCH', name: 'Sertifikat ↔ mənşə uyğunsuz',       description: 'Mənşə sertifikatındakı ölkə daşıma mənşə ölkəsindən fərqlidir.',           weight: 15, severity: 'warning',  category: 'origin',     active: true },
  { id: 'RULE_ROUTE_MODE_IMP',       code: 'ROUTE_MODE_IMPLAUSIBLE', name: 'Daşıma marşrut/növ uyğunsuz',     description: 'Bu mənşə-təyinat marşrutu üçün bəyan edilən nəqliyyat növü mümkün deyil.',  weight: 12, severity: 'warning',  category: 'shipment',   active: true },
  { id: 'RULE_ROUTE_UNKNOWN',        code: 'ROUTE_UNKNOWN',        name: 'Marşrut məlumat bazasında yoxdur',  description: 'Bu mənşə-təyinat marşrutu üçün plausibility datası tapılmadı.',            weight: 4,  severity: 'info',     category: 'shipment',   active: true },
  { id: 'RULE_DEPT_HS_MISMATCH',     code: 'DEPT_HS_MISMATCH',     name: 'HS kodu şöbə ilə uyğun deyil',      description: 'HS kodunun kateqoriyası seçilmiş gömrük şöbəsinin yurisdiksiyasından kənardadır (məs: Qida şöbəsi + Kosmetika HS).', weight: 22, severity: 'critical', category: 'reference', active: true },
];

export function findRule(code: string): RiskRule | undefined {
  return RISK_RULES.find((r) => r.code === code);
}

// ============================================================================
// Thresholds (default) — admin can override at runtime
// ============================================================================
export const DEFAULT_THRESHOLDS: ThresholdSet = {
  scoreBands: [
    { band: 'LOW',      min: 0,  max: 24,  channel: 'GREEN',  label: 'Aşağı' },
    { band: 'MEDIUM',   min: 25, max: 49,  channel: 'YELLOW', label: 'Orta' },
    { band: 'HIGH',     min: 50, max: 74,  channel: 'RED',    label: 'Yüksək' },
    { band: 'CRITICAL', min: 75, max: 100, channel: 'RED',    label: 'Kritik' },
  ],
  slaHoursReview: 48,
  highValueAZN: 100_000,
  lowUnitPriceAZN: 1,
};

export function bandForScore(score: number, bands: AIScoreBand[] = DEFAULT_THRESHOLDS.scoreBands): AIScoreBand {
  return bands.find((b) => score >= b.min && score <= b.max) ?? bands[0];
}

// ============================================================================
// Sector → Department mapping (used by admin page)
// ============================================================================
export const SECTOR_DEPARTMENT_MAP: Record<Sector, string[]> = {
  'İstehlak malları': ['Qida', 'Tekstil', 'Kosmetika', 'Mebel'],
  'Ağır sənaye':      ['Maşınqayırma', 'Kimya', 'İnşaat'],
  'Texnologiya':      ['Elektronika'],
  'Səhiyyə':          ['Tibbi'],
  'Aqro-sənaye':      ['Qida'],
  'Tikinti':          ['İnşaat', 'Mebel'],
};

// ============================================================================
// Department → allowed HS categories.
// Each customs department only handles a defined set of HS categories.
// If a declaration's HS code maps to a category outside this allow-list we
// flag DEPT_HS_MISMATCH (e.g. "Qida" department + cosmetic HS 3304.99).
// ============================================================================
export const DEPARTMENT_HS_CATEGORIES: Record<string, string[]> = {
  'Qida':         ['Qida və içkilər', 'Kənd təsərrüfatı və heyvandarlıq'],
  'Tekstil':      ['Tekstil və geyim'],
  'Elektronika':  ['Elektronika'],
  'Kimya':        ['Kimya məhsulları', 'Yanacaq və enerji'],
  'Maşınqayırma': ['Maşın və avadanlıq'],
  'Tibbi':        ['Tibbi və əczaçılıq'],
  'Kosmetika':    ['Kosmetika və ətriyyat'],
  'Mebel':        ['Mebel və ev əşyaları'],
  'Avtomobil':    ['Avtomobil və nəqliyyat'],
  'İnşaat':       ['Tikinti materialları'],
};

export function allowedCategoriesForDepartment(dept?: string): string[] | undefined {
  if (!dept) return undefined;
  return DEPARTMENT_HS_CATEGORIES[dept];
}
