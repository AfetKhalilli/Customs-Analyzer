// =============================================================================
// HS code database (mock, modelled on Azerbaijan customs nomenclature)
//
// Notes:
//  • Real reference: https://e.customs.gov.az/for-individuals/goods-nomenclature
//    Real codes are up to 10 digits. We accept 4 / 6 / 8 / 10 digit codes here,
//    with or without dots, and resolve from the most-specific prefix down to
//    the 4-digit heading so users can declare at any specificity.
//  • Pricing fields are AZN per declared unit and act as a sanity floor/ceiling
//    for undervaluation/overvaluation rules in src/lib/ai.ts.
// =============================================================================

export type HsRiskTier = 'low' | 'medium' | 'high';

export interface HsCodeRecord {
  code: string;                  // canonical with dots (e.g. "8517.12" or "8517.12.00")
  digits: 4 | 6 | 8 | 10;
  label: string;                 // AZ
  category:
    | 'Qida və içkilər' | 'Tekstil və geyim' | 'Elektronika' | 'Kosmetika və ətriyyat'
    | 'Kimya məhsulları' | 'Tibbi və əczaçılıq' | 'Tikinti materialları' | 'Mebel və ev əşyaları'
    | 'Avtomobil və nəqliyyat' | 'Maşın və avadanlıq' | 'Yanacaq və enerji'
    | 'Kənd təsərrüfatı və heyvandarlıq' | 'Digər';
  keywords: string[];            // for typeahead — Azerbaijani + Latin transliteration + English
  tariffRate: number;            // %
  vatRate: number;               // % (typically 18, 0 for pharma)
  riskTier: HsRiskTier;
  controls: string[];            // licensing / certificate requirements
  unit: 'ədəd' | 'kq' | 'litr' | 'metr' | 'ton';
  // Price band for the unit, in AZN — used by undervaluation/overvaluation rules.
  pricing: {
    expectedMinAZN: number;
    expectedMaxAZN: number;
    suspiciousLowAZN: number;    // below this → strong undervaluation signal
    suspiciousHighAZN: number;   // above this → overvaluation/laundering signal
    riskCoefficient: number;     // 0..1, multiplier amplifying undervaluation weight
  };
}

// Helper to keep the dataset readable.
function hs(
  code: string,
  label: string,
  category: HsCodeRecord['category'],
  keywords: string[],
  tariffRate: number,
  riskTier: HsRiskTier,
  controls: string[],
  unit: HsCodeRecord['unit'],
  expectedMin: number,
  expectedMax: number,
  riskCoefficient = 0.5,
  vatRate = 18,
): HsCodeRecord {
  const digits = code.replace(/\./g, '').length as 4 | 6 | 8 | 10;
  return {
    code,
    digits,
    label,
    category,
    keywords: keywords.map((k) => k.toLowerCase()),
    tariffRate,
    vatRate,
    riskTier,
    controls,
    unit,
    pricing: {
      expectedMinAZN: expectedMin,
      expectedMaxAZN: expectedMax,
      suspiciousLowAZN: +(expectedMin * 0.4).toFixed(2),
      suspiciousHighAZN: +(expectedMax * 2.5).toFixed(2),
      riskCoefficient,
    },
  };
}

export const HS_CODES: HsCodeRecord[] = [
  // ── Food & beverages (HS 02, 09, 19, 22) ────────────────────────────────────
  hs('0207.14', 'Toyuq əti, dondurulmuş', 'Qida və içkilər',
    ['toyuq', 'tovuq', 'chicken', 'kurica', 'ət', 'dondurulmuş'], 15, 'medium',
    ['Veterinar sertifikatı', 'Sanitar nəzarət'], 'kq', 3, 7, 0.7),
  hs('0902.30', 'Qara çay, qablaşdırılmış', 'Qida və içkilər',
    ['çay', 'cay', 'chai', 'tea', 'qara çay'], 15, 'medium',
    ['Sanitar nəzarət'], 'kq', 4, 25, 0.5),
  hs('1905.31', 'Şirin biskvit', 'Qida və içkilər',
    ['biskvit', 'cookie', 'pechenye', 'şirniyyat', 'şirin'], 15, 'low',
    ['Sanitar nəzarət'], 'kq', 3, 12, 0.4),
  hs('2202.10', 'Şəkərli qazlı içkilər', 'Qida və içkilər',
    ['içki', 'icki', 'qazlı', 'kola', 'cola', 'sodalı'], 15, 'low',
    ['Sanitar nəzarət'], 'litr', 1, 4, 0.3),
  hs('2204.21', 'Şərab, 2 litrdən az qablarda', 'Qida və içkilər',
    ['şərab', 'şərab', 'wine', 'vino'], 30, 'medium',
    ['Aksiz', 'Sanitar nəzarət'], 'litr', 8, 60, 0.6),

  // ── Tobacco & alcohol — high tariff, high risk ──────────────────────────────
  hs('2208.30', 'Viski', 'Qida və içkilər',
    ['viski', 'whisky', 'whiskey'], 30, 'high',
    ['Aksiz', 'Sanitar nəzarət'], 'litr', 20, 200, 0.8),
  hs('2402.20', 'Siqaret, tütünlə', 'Qida və içkilər',
    ['siqaret', 'cigarette', 'tütün', 'tutun'], 30, 'high',
    ['Aksiz', 'Sağlamlıq xəbərdarlığı'], 'ədəd', 0.1, 0.6, 0.9),

  // ── Pharma (HS 30) — riskTier high, special tariff ──────────────────────────
  hs('3003.90', 'Dərman vasitələri, qablaşdırılmamış', 'Tibbi və əczaçılıq',
    ['dərman', 'derman', 'medicine', 'lekarstvo'], 0, 'high',
    ['Səhiyyə Nazirliyi icazəsi'], 'kq', 100, 5000, 0.5, 0),
  hs('3004.90', 'Dərman vasitələri, digər', 'Tibbi və əczaçılıq',
    ['dərman', 'medicine', 'tablet', 'həb', 'pill'], 0, 'high',
    ['Səhiyyə Nazirliyi icazəsi'], 'ədəd', 0.5, 50, 0.6, 0),
  hs('3005.10', 'Tibbi sarğı materialları', 'Tibbi və əczaçılıq',
    ['sarğı', 'bandage', 'tibbi'], 5, 'medium',
    ['Tibbi sertifikat'], 'ədəd', 1, 8, 0.4),

  // ── Cosmetics (HS 33) ───────────────────────────────────────────────────────
  hs('3303.00', 'Ətriyyat və tualet suları', 'Kosmetika və ətriyyat',
    ['ətriyyat', 'parfum', 'perfume', 'duxi'], 15, 'medium',
    ['Keyfiyyət sertifikatı'], 'litr', 20, 400, 0.6),
  hs('3304.99', 'Kosmetika məhsulları, digər', 'Kosmetika və ətriyyat',
    ['kosmetika', 'kosmetik', 'cosmetic', 'krem', 'cream'], 15, 'medium',
    ['Keyfiyyət sertifikatı'], 'ədəd', 5, 80, 0.5),
  hs('3305.10', 'Şampun', 'Kosmetika və ətriyyat',
    ['şampun', 'shampoo', 'şampuan'], 15, 'low',
    ['Keyfiyyət sertifikatı'], 'litr', 6, 30, 0.4),

  // ── Chemicals (HS 34, 38) ───────────────────────────────────────────────────
  hs('3402.20', 'Yuyucu vasitələr, pərakəndə', 'Kimya məhsulları',
    ['yuyucu', 'detergent', 'sabun', 'soap'], 5, 'medium',
    ['Təhlükəsizlik sənədi'], 'litr', 2, 10, 0.4),
  hs('3808.91', 'İnsektisidlər', 'Kimya məhsulları',
    ['insektisid', 'pesticide', 'həşərat'], 5, 'high',
    ['Kənd Təsərrüfatı Nazirliyi icazəsi'], 'kq', 8, 40, 0.7),

  // ── Textiles (HS 52, 61, 62) ────────────────────────────────────────────────
  hs('5208.21', 'Pambıq parça, ağardılmış', 'Tekstil və geyim',
    ['pambıq', 'cotton', 'parça', 'fabric'], 5, 'low',
    [], 'kq', 6, 25, 0.3),
  hs('6109.10', 'Pambıq tişört', 'Tekstil və geyim',
    ['tişört', 'tisort', 't-shirt', 'pambıq köynək'], 15, 'medium',
    [], 'ədəd', 4, 40, 0.6),
  hs('6203.42', 'Pambıq şalvar (kişi)', 'Tekstil və geyim',
    ['şalvar', 'pants', 'cins', 'jeans'], 15, 'medium',
    [], 'ədəd', 12, 80, 0.5),
  hs('6204.62', 'Pambıq şalvar (qadın)', 'Tekstil və geyim',
    ['qadın şalvar', 'jeans', 'şalvar'], 15, 'medium',
    [], 'ədəd', 12, 80, 0.5),

  // ── Construction (HS 25, 68, 73) ────────────────────────────────────────────
  hs('2523.29', 'Sement, portland', 'Tikinti materialları',
    ['sement', 'cement', 'portland'], 5, 'low',
    [], 'ton', 80, 250),
  hs('6810.11', 'Beton blokları, tikinti', 'Tikinti materialları',
    ['beton', 'concrete', 'blok'], 15, 'low',
    [], 'ədəd', 1, 10),
  hs('7308.30', 'Polad konstruksiyalar', 'Tikinti materialları',
    ['polad', 'steel', 'metal konstruksiya'], 15, 'medium',
    [], 'kq', 2, 8),

  // ── Machinery (HS 84) ───────────────────────────────────────────────────────
  hs('8418.10', 'Soyuducu-dondurucu kombinə', 'Maşın və avadanlıq',
    ['soyuducu', 'fridge', 'refrigerator', 'dondurucu'], 15, 'medium',
    [], 'ədəd', 600, 4000),
  hs('8450.11', 'Paltaryuyan maşın, avtomatik', 'Maşın və avadanlıq',
    ['paltaryuyan', 'washing machine', 'maşın'], 15, 'medium',
    [], 'ədəd', 400, 2500),
  hs('8479.89', 'Maşınlar, digər funksional', 'Maşın və avadanlıq',
    ['sənaye maşını', 'machinery', 'avadanlıq'], 5, 'medium',
    [], 'ədəd', 1000, 50000),

  // ── Electronics (HS 85) ─────────────────────────────────────────────────────
  hs('8504.40', 'Statik çeviricilər', 'Elektronika',
    ['çevirici', 'converter', 'adapter'], 5, 'low',
    [], 'ədəd', 10, 200),
  hs('8517.12', 'Mobil telefonlar', 'Elektronika',
    ['telefon', 'phone', 'mobile', 'smartfon', 'smartphone'], 0, 'high',
    ['IMEI qeydiyyatı'], 'ədəd', 100, 3500, 0.7),
  hs('8517.13', 'Smartfonlar', 'Elektronika',
    ['smartfon', 'smartphone', 'telefon'], 0, 'high',
    ['IMEI qeydiyyatı'], 'ədəd', 300, 4000, 0.7),
  hs('8528.72', 'Televiziya alıcıları', 'Elektronika',
    ['televizor', 'tv', 'television'], 15, 'medium',
    [], 'ədəd', 250, 6000),
  hs('8528.52', 'Monitorlar', 'Elektronika',
    ['monitor', 'displey', 'display'], 5, 'medium',
    [], 'ədəd', 150, 2500),
  hs('8471.30', 'Laptoplar', 'Elektronika',
    ['laptop', 'noutbuk', 'notebook', 'kompüter'], 0, 'medium',
    [], 'ədəd', 800, 6000),
  hs('8473.30', 'Kompüter aksesuarları', 'Elektronika',
    ['aksesuar', 'accessory', 'usb', 'kabel', 'cable'], 5, 'low',
    [], 'ədəd', 2, 80),

  // ── Vehicles (HS 87) — heavy excise/duty ────────────────────────────────────
  hs('8703.21', 'Minik avtomobilləri (—1500 sm³)', 'Avtomobil və nəqliyyat',
    ['avtomobil', 'car', 'maşın', 'mashin'], 30, 'high',
    ['Aksiz', 'Ekoloji standart'], 'ədəd', 15000, 60000, 0.6),
  hs('8703.23', 'Minik avtomobilləri (1500–3000 sm³)', 'Avtomobil və nəqliyyat',
    ['avtomobil', 'car', 'sedan'], 30, 'high',
    ['Aksiz', 'Ekoloji standart'], 'ədəd', 25000, 120000, 0.6),
  hs('8704.21', 'Yük avtomobilləri', 'Avtomobil və nəqliyyat',
    ['yük maşını', 'truck', 'kamyon'], 15, 'high',
    ['Aksiz', 'Ekoloji standart'], 'ədəd', 30000, 200000),

  // ── Furniture (HS 94) ───────────────────────────────────────────────────────
  hs('9401.30', 'Oturacaqlar, hündürlüyü tənzimlənən', 'Mebel və ev əşyaları',
    ['stul', 'chair', 'kresloluq'], 15, 'low',
    [], 'ədəd', 80, 600),
  hs('9403.30', 'Ofis mebeli, ağacdan', 'Mebel və ev əşyaları',
    ['mebel', 'furniture', 'masa', 'ofis'], 15, 'low',
    [], 'ədəd', 150, 2000),
  hs('9403.60', 'Yataq otağı mebeli', 'Mebel və ev əşyaları',
    ['yataq', 'bed', 'şkaf', 'shkaf'], 15, 'low',
    [], 'ədəd', 200, 3500),

  // ── Fuels (HS 27) ───────────────────────────────────────────────────────────
  hs('2710.19', 'Neft məhsulları, digər', 'Yanacaq və enerji',
    ['neft', 'oil', 'yanacaq', 'fuel', 'dizel'], 5, 'high',
    ['Aksiz'], 'litr', 1, 4),
];

// =============================================================================
// Lookup helpers
// =============================================================================

/** Canonicalize a user-entered HS code into "NNNN[.NN[.NN[.NN]]]" with dots. */
export function canonicalizeHs(input?: string): string | null {
  if (!input) return null;
  const digits = input.replace(/[^\d]/g, '');
  if (digits.length < 4) return null;
  if (digits.length > 10) return null;
  if (digits.length % 2 !== 0) return null;     // must be 4/6/8/10
  const parts: string[] = [digits.slice(0, 4)];
  for (let i = 4; i < digits.length; i += 2) parts.push(digits.slice(i, i + 2));
  return parts.join('.');
}

/** Loose HS check — accepts 4/6/8/10 digit codes with or without dots. */
export const HS_CODE_REGEX = /^\d{4}(\.\d{2}){0,3}$/;

/**
 * Resolve an HS code to the most-specific record in the catalog.
 * Falls back to broader prefixes so a 10-digit code matches an 8/6/4-digit
 * record. Returns `undefined` only when even the 4-digit heading is unknown.
 */
export function lookupHs(input?: string): HsCodeRecord | undefined {
  const canonical = canonicalizeHs(input);
  if (!canonical) return undefined;
  const digitsOnly = canonical.replace(/\./g, '');
  // walk down 10 → 8 → 6 → 4
  for (let len = digitsOnly.length; len >= 4; len -= 2) {
    const prefix = digitsOnly.slice(0, len);
    const dotted = canonicalizeHs(prefix)!;
    const exact = HS_CODES.find((h) => h.code === dotted);
    if (exact) return exact;
    // also try records that start with this prefix (most specific first)
    const startsWith = HS_CODES
      .filter((h) => h.code.replace(/\./g, '').startsWith(prefix))
      .sort((a, b) => b.digits - a.digits)[0];
    if (startsWith) return startsWith;
  }
  return undefined;
}

/** Free-text search across code/label/keywords for the typeahead. */
export function searchHs(query: string, limit = 12): HsCodeRecord[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  // numeric? prefix match against code digits
  if (/^\d/.test(q)) {
    const digits = q.replace(/[^\d]/g, '');
    return HS_CODES
      .filter((h) => h.code.replace(/\./g, '').startsWith(digits))
      .slice(0, limit);
  }
  // text: score by token-overlap with label + keywords
  const tokens = q.split(/\s+/).filter(Boolean);
  return HS_CODES
    .map((h) => {
      const hay = (h.label.toLowerCase() + ' ' + h.keywords.join(' '));
      const score = tokens.reduce((acc, t) => acc + (hay.includes(t) ? 1 : 0), 0);
      return { h, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.h.digits - b.h.digits)
    .slice(0, limit)
    .map((x) => x.h);
}

/** Per-category index for analytics / typeahead grouping. */
export const HS_CATEGORIES = Array.from(new Set(HS_CODES.map((h) => h.category)));
