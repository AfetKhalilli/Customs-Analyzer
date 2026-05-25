import type {
  AIResult, AIFlag, AttachedDocument, ShipmentInfo, DeclarationTotals,
  EntityType, DeclarationKind, RiskLevel, ThresholdSet,
} from '../types';
import { convertToAZN } from './utils';
import {
  RISK_RULES, DEFAULT_THRESHOLDS, findRule, findHsEntry, findCountry, classifyHs, bandForScore,
} from './referenceData';

interface AIInput {
  ownerEntityType?: EntityType;
  kind?: DeclarationKind;
  documents?: AttachedDocument[];
  shipment?: Partial<ShipmentInfo>;
  totals?: Partial<DeclarationTotals>;
}

// Deterministic: identical inputs ALWAYS produce identical outputs.
// Every flag links back to a rule in RISK_RULES; every contributing fact is recorded as evidence.
export function runAI(d: AIInput, thresholds: ThresholdSet = DEFAULT_THRESHOLDS): AIResult {
  const flags: AIFlag[] = [];
  const docs = d.documents ?? [];
  const shipment = d.shipment ?? {};
  const totals = d.totals ?? {};
  const triggered = new Set<string>();

  const fire = (code: string, message: string, evidence: string, references: string[] = []) => {
    const rule = findRule(code);
    if (!rule || !rule.active) return;
    triggered.add(rule.id);
    flags.push({
      code: rule.code,
      message,
      severity: rule.severity,
      points: rule.weight,
      ruleId: rule.id,
      evidence,
      references,
    });
  };

  // ── Reference-data lookups ────────────────────────────────────────────────
  const hs = findHsEntry(totals.hsCode);
  const origin = findCountry(shipment.originCountry);
  const commodity = classifyHs(totals.hsCode);

  // ── R1 WEIGHT_MISMATCH ────────────────────────────────────────────────────
  if (shipment.grossWeightKg != null && shipment.netWeightKg != null && shipment.netWeightKg > shipment.grossWeightKg) {
    fire('WEIGHT_MISMATCH',
      'Netto çəki Brutto çəkidən böyükdür',
      `Brutto ${shipment.grossWeightKg} kq < Netto ${shipment.netWeightKg} kq`);
  }

  // ── R2 UNDERVALUATION_RISK ────────────────────────────────────────────────
  if (totals.totalDeclaredValue && totals.totalQuantity) {
    const azn = convertToAZN(totals.totalDeclaredValue, totals.currency ?? 'AZN');
    const unitPrice = azn / totals.totalQuantity;
    if (unitPrice < thresholds.lowUnitPriceAZN && totals.unitOfMeasure === 'ədəd') {
      fire('UNDERVALUATION_RISK',
        `Şübhəli aşağı vahid qiyməti: ${unitPrice.toFixed(2)} ₼/ədəd`,
        `Hədd: ${thresholds.lowUnitPriceAZN} ₼/ədəd; Hesablanmış: ${unitPrice.toFixed(2)} ₼/ədəd`,
        ['Threshold:lowUnitPriceAZN']);
    }
  }

  // ── R3/R4 NO_DOCS / LOW_DOC_COUNT ─────────────────────────────────────────
  if (docs.length === 0) {
    fire('NO_DOCS', 'Heç bir sənəd yüklənməyib', 'documents.length = 0');
  } else if (docs.length < 3) {
    fire('LOW_DOC_COUNT',
      `Yalnız ${docs.length} sənəd mövcuddur (minimum 3 tövsiyə olunur)`,
      `documents.length = ${docs.length}`);
  }

  // ── R5 MISSING_CUSTOMS_DOC ────────────────────────────────────────────────
  if ((d.kind === 'Idxal' || d.kind === 'Ixrac') && !docs.some((x) => x.group === 'CUSTOMS')) {
    fire('MISSING_CUSTOMS_DOC',
      'Gömrük sənədi əlavə edilməyib',
      `kind=${d.kind}, CUSTOMS group absent`);
  }

  // ── R6 MISSING_FINANCIAL_DOC ──────────────────────────────────────────────
  if (d.ownerEntityType === 'company' && !docs.some((x) => x.group === 'FINANCIAL')) {
    fire('MISSING_FINANCIAL_DOC',
      'Hüquqi şəxs üçün maliyyə sənədi əlavə edilməyib',
      'ownerEntityType=company, FINANCIAL group absent');
  }

  // ── R7 HIGH_VALUE ─────────────────────────────────────────────────────────
  if (totals.totalDeclaredValue) {
    const azn = convertToAZN(totals.totalDeclaredValue, totals.currency ?? 'AZN');
    if (azn > thresholds.highValueAZN) {
      fire('HIGH_VALUE',
        `Yüksək dəyər: ${azn.toFixed(0)} ₼`,
        `Hədd: ${thresholds.highValueAZN} ₼; Hesablanmış: ${azn.toFixed(0)} ₼`,
        ['Threshold:highValueAZN']);
    }
  }

  // ── R8 SENSITIVE_ORIGIN / R15 SANCTIONED_ORIGIN ───────────────────────────
  if (origin) {
    if (origin.sanctioned) {
      fire('SANCTIONED_ORIGIN',
        `Sanksiyalı mənşə ölkəsi: ${origin.name}`,
        origin.reason,
        [`CountryRisk:${origin.code}`]);
    } else if (origin.tier === 'high' || origin.tier === 'medium') {
      // SENSITIVE_ORIGIN only fires when not already sanctioned (avoid double-counting)
      fire('SENSITIVE_ORIGIN',
        `Həssas mənşə ölkəsi: ${origin.name} (${origin.tier === 'high' ? 'yüksək' : 'orta'} risk)`,
        origin.reason,
        [`CountryRisk:${origin.code}`]);
    }
  }

  // ── R9 PACKAGE_WEIGHT_ANOMALY ─────────────────────────────────────────────
  if (shipment.packageCount && shipment.grossWeightKg && shipment.packageCount > 0) {
    const avg = shipment.grossWeightKg / shipment.packageCount;
    if (avg > 0 && (avg < 0.5 || avg > 2000)) {
      fire('PACKAGE_WEIGHT_ANOMALY',
        `Bağlama başına çəki anomal: ${avg.toFixed(2)} kq`,
        `gross/packages = ${shipment.grossWeightKg}/${shipment.packageCount} = ${avg.toFixed(2)} kq`);
    }
  }

  // ── R10 HS_CODE_FORMAT ────────────────────────────────────────────────────
  if (totals.hsCode && !/^\d{4}\.\d{2}(\.\d{2})?$/.test(totals.hsCode)) {
    fire('HS_CODE_FORMAT', 'HS kodu format dəqiq deyil',
      `Daxil edilmiş: "${totals.hsCode}"; Gözlənilən format: NNNN.NN[.NN]`);
  }

  // ── R11 ROUND_NUMBER ──────────────────────────────────────────────────────
  if (totals.totalDeclaredValue) {
    const azn = convertToAZN(totals.totalDeclaredValue, totals.currency ?? 'AZN');
    if (azn >= 1000 && azn % 1000 === 0) {
      fire('ROUND_NUMBER', 'Bəyan dəyəri tam yuvarlaq rəqəmdir',
        `Bəyan: ${azn} ₼ (1000 ₼-ə tam bölünür)`);
    }
  }

  // ── R12 HS_NOT_IN_DB ──────────────────────────────────────────────────────
  if (totals.hsCode && /^\d{4}\.\d{2}/.test(totals.hsCode) && !hs) {
    fire('HS_NOT_IN_DB',
      `HS kodu reyestrdə yoxdur: ${totals.hsCode}`,
      'HS_CODE_DB-də bu prefiks üzrə qeyd tapılmadı',
      ['HS_CODE_DB']);
  }

  // ── R13 HIGH_TARIFF_HS ────────────────────────────────────────────────────
  if (hs && hs.tariffRate >= 20) {
    fire('HIGH_TARIFF_HS',
      `Yüksək rüsumlu HS kodu (${hs.tariffRate}%): ${hs.label}`,
      `HS ${hs.code} üçün tariff ${hs.tariffRate}% — orta tariff 5-15%`,
      [`HS_CODE_DB:${hs.code}`]);
  }

  // ── R14 HIGH_RISK_COMMODITY ───────────────────────────────────────────────
  if (hs && hs.riskTier === 'high') {
    fire('HIGH_RISK_COMMODITY',
      `Yüksək riskli mal kateqoriyası: ${hs.label}`,
      `Nəzarət tələbləri: ${hs.controls.join(', ') || '—'}`,
      [`HS_CODE_DB:${hs.code}`]);
  }

  // ── R16 TARIFF_VALUE_OUTLIER ──────────────────────────────────────────────
  if (hs && totals.totalDeclaredValue && totals.totalQuantity) {
    const azn = convertToAZN(totals.totalDeclaredValue, totals.currency ?? 'AZN');
    const expectedDuty = azn * (hs.tariffRate / 100);
    // surrogate: if declared value per unit < 30% of plausible minimum (very rough), flag
    const unit = azn / totals.totalQuantity;
    const referenceFloor = hs.tariffRate >= 15 ? 50 : 20; // AZN per unit floor
    if (unit < referenceFloor * 0.3) {
      fire('TARIFF_VALUE_OUTLIER',
        `Tarif/dəyər nisbəti normaldan kənar`,
        `Vahid qiymət ${unit.toFixed(2)} ₼ << gözlənilən min ${referenceFloor} ₼ (HS ${hs.code}); Hesablanmış rüsum ${expectedDuty.toFixed(0)} ₼`,
        [`HS_CODE_DB:${hs.code}`]);
    }
  }

  // ── Aggregate ─────────────────────────────────────────────────────────────
  const rawScore = flags.reduce((acc, f) => acc + f.points, 0);
  const score = Math.min(100, rawScore);
  const band = bandForScore(score, thresholds.scoreBands);
  const riskLevel = band.band as RiskLevel;
  const selectivityChannel = band.channel;

  // Plain-language reasoning
  const reasoningParts: string[] = [];
  reasoningParts.push(`Hesablanmış skor: ${score} / 100 (xam cəm: ${rawScore}).`);
  reasoningParts.push(`Skor ${band.min}–${band.max} aralığına düşür → "${band.label}" (${band.band}) → seçicilik kanalı: ${selectivityChannel}.`);
  if (flags.length === 0) {
    reasoningParts.push('Heç bir risk qaydası tetiklənmədi.');
  } else {
    reasoningParts.push(`Tetiklənən qaydalar (${flags.length}): ${flags.map((f) => `${f.code} (+${f.points})`).join(', ')}.`);
  }
  if (hs) reasoningParts.push(`HS ${hs.code} ("${hs.label}", tariff ${hs.tariffRate}%, risk: ${hs.riskTier}).`);
  if (origin) reasoningParts.push(`Mənşə "${origin.name}" — risk səviyyəsi: ${origin.tier}${origin.sanctioned ? ' (sanksiyalı)' : ''}.`);

  return {
    runAt: new Date().toISOString(),
    score,
    riskLevel,
    selectivityChannel,
    flags,
    reasoning: reasoningParts.join(' '),
    thresholds: thresholds.scoreBands,
    rulesEvaluated: RISK_RULES.map((r) => ({
      id: r.id,
      name: r.name,
      triggered: triggered.has(r.id),
      weight: r.weight,
    })),
    referenceData: {
      hsCode: hs ? { code: hs.code, label: hs.label, tariffRate: hs.tariffRate, riskTier: hs.riskTier } : undefined,
      originCountry: origin ? { code: origin.code, name: origin.name, tier: origin.tier, reason: origin.reason } : undefined,
      commodity: commodity ? { hsPrefix: commodity.prefix, label: commodity.group, controls: commodity.controls } : undefined,
    },
  };
}
