// =============================================================================
// Pricing reference — category-level fallbacks for HS codes that don't have
// an explicit price band yet, plus shared helpers for undervaluation logic.
//
// AI flow:
//   1. If HS record has its own `pricing`, prefer it.
//   2. Else fall back to the category band here.
//   3. Else fall back to the global default.
// =============================================================================

import type { HsCodeRecord } from './hsCodes';

export interface CategoryPriceBand {
  category: HsCodeRecord['category'];
  unit: HsCodeRecord['unit'];
  expectedMinAZN: number;
  expectedMaxAZN: number;
  suspiciousLowAZN: number;   // hard floor — below this is almost certainly undervaluation
  suspiciousHighAZN: number;  // hard ceiling — above this is overvaluation / laundering
  riskCoefficient: number;    // 0..1, multiplier on undervaluation penalty
}

export const CATEGORY_PRICE_BANDS: CategoryPriceBand[] = [
  { category: 'Qida və içkilər',             unit: 'kq',   expectedMinAZN: 3,    expectedMaxAZN: 25,    suspiciousLowAZN: 1,    suspiciousHighAZN: 80,    riskCoefficient: 0.5 },
  { category: 'Tekstil və geyim',            unit: 'ədəd', expectedMinAZN: 5,    expectedMaxAZN: 60,    suspiciousLowAZN: 2,    suspiciousHighAZN: 200,   riskCoefficient: 0.6 },
  { category: 'Elektronika',                 unit: 'ədəd', expectedMinAZN: 50,   expectedMaxAZN: 3500,  suspiciousLowAZN: 15,   suspiciousHighAZN: 10000, riskCoefficient: 0.7 },
  { category: 'Kosmetika və ətriyyat',       unit: 'ədəd', expectedMinAZN: 5,    expectedMaxAZN: 250,   suspiciousLowAZN: 2,    suspiciousHighAZN: 800,   riskCoefficient: 0.5 },
  { category: 'Kimya məhsulları',            unit: 'litr', expectedMinAZN: 2,    expectedMaxAZN: 30,    suspiciousLowAZN: 0.5,  suspiciousHighAZN: 120,   riskCoefficient: 0.5 },
  { category: 'Tibbi və əczaçılıq',          unit: 'ədəd', expectedMinAZN: 0.5,  expectedMaxAZN: 80,    suspiciousLowAZN: 0.1,  suspiciousHighAZN: 300,   riskCoefficient: 0.5 },
  { category: 'Tikinti materialları',        unit: 'kq',   expectedMinAZN: 1,    expectedMaxAZN: 10,    suspiciousLowAZN: 0.3,  suspiciousHighAZN: 50,    riskCoefficient: 0.4 },
  { category: 'Mebel və ev əşyaları',        unit: 'ədəd', expectedMinAZN: 80,   expectedMaxAZN: 2500,  suspiciousLowAZN: 25,   suspiciousHighAZN: 8000,  riskCoefficient: 0.5 },
  { category: 'Avtomobil və nəqliyyat',      unit: 'ədəd', expectedMinAZN: 8000, expectedMaxAZN: 100000,suspiciousLowAZN: 3000, suspiciousHighAZN: 350000,riskCoefficient: 0.8 },
  { category: 'Maşın və avadanlıq',          unit: 'ədəd', expectedMinAZN: 200,  expectedMaxAZN: 30000, suspiciousLowAZN: 60,   suspiciousHighAZN: 80000, riskCoefficient: 0.6 },
  { category: 'Yanacaq və enerji',           unit: 'litr', expectedMinAZN: 1,    expectedMaxAZN: 5,     suspiciousLowAZN: 0.3,  suspiciousHighAZN: 20,    riskCoefficient: 0.5 },
  { category: 'Kənd təsərrüfatı və heyvandarlıq', unit: 'kq', expectedMinAZN: 1,  expectedMaxAZN: 15,    suspiciousLowAZN: 0.3,  suspiciousHighAZN: 60,    riskCoefficient: 0.5 },
  { category: 'Digər',                       unit: 'ədəd', expectedMinAZN: 5,    expectedMaxAZN: 500,   suspiciousLowAZN: 1,    suspiciousHighAZN: 2000,  riskCoefficient: 0.4 },
];

const DEFAULT_BAND: CategoryPriceBand = {
  category: 'Digər', unit: 'ədəd',
  expectedMinAZN: 5, expectedMaxAZN: 500,
  suspiciousLowAZN: 1, suspiciousHighAZN: 2000,
  riskCoefficient: 0.4,
};

/** Return the band to use for a given HS record (or null if no HS lookup). */
export function bandForHs(hs?: HsCodeRecord): CategoryPriceBand {
  if (!hs) return DEFAULT_BAND;
  // HS record has its own band → derive a CategoryPriceBand-shaped object.
  return {
    category: hs.category,
    unit: hs.unit,
    expectedMinAZN: hs.pricing.expectedMinAZN,
    expectedMaxAZN: hs.pricing.expectedMaxAZN,
    suspiciousLowAZN: hs.pricing.suspiciousLowAZN,
    suspiciousHighAZN: hs.pricing.suspiciousHighAZN,
    riskCoefficient: hs.pricing.riskCoefficient,
  };
}

export function bandForCategory(category: HsCodeRecord['category']): CategoryPriceBand {
  return CATEGORY_PRICE_BANDS.find((b) => b.category === category) ?? DEFAULT_BAND;
}

export type ValuationVerdict = 'normal' | 'low' | 'suspicious_low' | 'high' | 'suspicious_high';

/** Compare a per-unit AZN price against the band; used by AI undervaluation rule. */
export function classifyUnitPrice(unitPriceAZN: number, band: CategoryPriceBand): ValuationVerdict {
  if (!isFinite(unitPriceAZN) || unitPriceAZN <= 0) return 'normal';
  if (unitPriceAZN < band.suspiciousLowAZN) return 'suspicious_low';
  if (unitPriceAZN < band.expectedMinAZN) return 'low';
  if (unitPriceAZN > band.suspiciousHighAZN) return 'suspicious_high';
  if (unitPriceAZN > band.expectedMaxAZN) return 'high';
  return 'normal';
}
