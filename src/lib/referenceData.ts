import type {
  HsCodeEntry, CountryRiskEntry, BrokerProfile, RiskRule, ThresholdSet, AIScoreBand, Sector,
} from '../types';

// ============================================================================
// HS code database — Azerbaijani customs (subset, covers seed declarations)
// ============================================================================
export const HS_CODE_DB: HsCodeEntry[] = [
  { code: '0902.30', label: 'Qara çay, qablaşdırılmış',          commodityGroup: 'Qida & içkilər',     tariffRate: 15, vatRate: 18, riskTier: 'medium', controls: ['Sanitar nəzarət'],     unit: 'kq' },
  { code: '1905.31', label: 'Şirin biskvit',                      commodityGroup: 'Qida & içkilər',     tariffRate: 15, vatRate: 18, riskTier: 'low',    controls: ['Sanitar nəzarət'],     unit: 'kq' },
  { code: '3304.99', label: 'Kosmetika məhsulları, digər',        commodityGroup: 'Kosmetika',          tariffRate: 15, vatRate: 18, riskTier: 'medium', controls: ['Keyfiyyət sertifikatı'], unit: 'ədəd' },
  { code: '3402.20', label: 'Yuyucu vasitələr, pərakəndə',        commodityGroup: 'Kimya məhsulları',   tariffRate: 5,  vatRate: 18, riskTier: 'medium', controls: ['Təhlükəsizlik sənədi'], unit: 'litr' },
  { code: '3004.90', label: 'Dərman vasitələri, digər',           commodityGroup: 'Səhiyyə',            tariffRate: 0,  vatRate: 0,  riskTier: 'high',   controls: ['Səhiyyə Nazirliyi icazəsi'], unit: 'ədəd' },
  { code: '5208.21', label: 'Pambıq parça, ağardılmış',           commodityGroup: 'Tekstil',            tariffRate: 5,  vatRate: 18, riskTier: 'low',    controls: [],                       unit: 'kq' },
  { code: '6810.11', label: 'Beton blokları, tikinti',            commodityGroup: 'Tikinti materialları', tariffRate: 15, vatRate: 18, riskTier: 'low',  controls: [],                       unit: 'ədəd' },
  { code: '8479.89', label: 'Maşınlar, digər funksional',         commodityGroup: 'Maşın & avadanlıq',  tariffRate: 5,  vatRate: 18, riskTier: 'medium', controls: [],                       unit: 'ədəd' },
  { code: '8517.12', label: 'Mobil telefonlar',                   commodityGroup: 'Texnologiya',        tariffRate: 0,  vatRate: 18, riskTier: 'high',   controls: ['IMEI qeydiyyatı'],     unit: 'ədəd' },
  { code: '8528.72', label: 'Televiziya alıcıları',               commodityGroup: 'Texnologiya',        tariffRate: 15, vatRate: 18, riskTier: 'medium', controls: [],                       unit: 'ədəd' },
  { code: '8703.23', label: 'Minik avtomobilləri (1500–3000 sm³)',commodityGroup: 'Avtomobil',          tariffRate: 30, vatRate: 18, riskTier: 'high',   controls: ['Aksiz', 'Ekoloji standart'], unit: 'ədəd' },
  { code: '9403.30', label: 'Ofis mebeli, ağacdan',               commodityGroup: 'Mebel',              tariffRate: 15, vatRate: 18, riskTier: 'low',    controls: [],                       unit: 'ədəd' },
  // padding for variety
  { code: '0207.14', label: 'Toyuq əti, dondurulmuş',             commodityGroup: 'Qida & içkilər',     tariffRate: 15, vatRate: 18, riskTier: 'medium', controls: ['Veterinar sertifikatı'], unit: 'kq' },
  { code: '2710.19', label: 'Neft məhsulları, digər',             commodityGroup: 'Yanacaq',            tariffRate: 5,  vatRate: 18, riskTier: 'high',   controls: ['Aksiz'],                unit: 'litr' },
  { code: '7308.30', label: 'Polad konstruksiyalar',              commodityGroup: 'Tikinti materialları', tariffRate: 15, vatRate: 18, riskTier: 'medium', controls: [],                     unit: 'kq' },
];

export function findHsEntry(code?: string): HsCodeEntry | undefined {
  if (!code) return undefined;
  return HS_CODE_DB.find((h) => h.code === code) ?? HS_CODE_DB.find((h) => h.code.startsWith(code.slice(0, 4)));
}

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

// ============================================================================
// Commodity classifications — coarse buckets used for grouping & analytics
// ============================================================================
export const COMMODITY_CLASSIFICATIONS: { prefix: string; group: string; controls: string[] }[] = [
  { prefix: '01', group: 'Canlı heyvanlar',          controls: ['Veterinar nəzarəti'] },
  { prefix: '02', group: 'Ət və ət məhsulları',      controls: ['Veterinar sertifikatı', 'Sanitar nəzarət'] },
  { prefix: '09', group: 'Çay, kofe, ədviyyatlar',   controls: ['Sanitar nəzarət'] },
  { prefix: '19', group: 'Un məmulatları',           controls: ['Sanitar nəzarət'] },
  { prefix: '27', group: 'Mineral yanacaqlar',       controls: ['Aksiz'] },
  { prefix: '30', group: 'Əczaçılıq məhsulları',     controls: ['Səhiyyə Nazirliyi icazəsi'] },
  { prefix: '33', group: 'Kosmetika, ətriyyat',      controls: ['Keyfiyyət sertifikatı'] },
  { prefix: '34', group: 'Yuyucu və yağlama vasitələri', controls: [] },
  { prefix: '52', group: 'Pambıq və pambıq parça',   controls: [] },
  { prefix: '68', group: 'Tikinti daş və beton',     controls: [] },
  { prefix: '73', group: 'Polad məmulatları',        controls: [] },
  { prefix: '84', group: 'Maşın və avadanlıq',       controls: [] },
  { prefix: '85', group: 'Elektrik və elektronika',  controls: ['IMEI qeydiyyatı (telefonlar üçün)'] },
  { prefix: '87', group: 'Nəqliyyat vasitələri',     controls: ['Aksiz', 'Ekoloji standart'] },
  { prefix: '94', group: 'Mebel',                    controls: [] },
];
export function classifyHs(code?: string) {
  if (!code) return undefined;
  return COMMODITY_CLASSIFICATIONS.find((c) => code.startsWith(c.prefix));
}

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
  { id: 'RULE_NO_DOCS',             code: 'NO_DOCS',              name: 'Sənəd yoxdur',                       description: 'Bəyannaməyə heç bir təsdiqedici sənəd əlavə edilməyib.',                     weight: 30, severity: 'critical', category: 'documents',  active: true },
  { id: 'RULE_LOW_DOC_COUNT',       code: 'LOW_DOC_COUNT',        name: 'Yetərsiz sənəd sayı',                description: 'Sənəd sayı tövsiyə olunan minimumdan azdır (≥3).',                           weight: 8,  severity: 'warning',  category: 'documents',  active: true },
  { id: 'RULE_MISSING_CUSTOMS_DOC', code: 'MISSING_CUSTOMS_DOC',  name: 'Gömrük sənədi yoxdur',               description: 'İdxal/İxrac üçün gömrük bəyannaməsi sənədi tələb olunur.',                   weight: 15, severity: 'critical', category: 'documents',  active: true },
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
