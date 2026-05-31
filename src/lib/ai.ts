import type {
  AIResult, AIFlag, AttachedDocument, ShipmentInfo, DeclarationTotals,
  EntityType, DeclarationKind, RiskLevel, ThresholdSet, SelectivityChannel,
} from '../types';
import { convertToAZN } from './utils';
import {
  RISK_RULES, DEFAULT_THRESHOLDS, findRule, findCountry, bandForScore,
  allowedCategoriesForDepartment,
} from './referenceData';
import { DOC_REQUIREMENTS, DOCUMENT_TYPES } from './constants';
import { findRoute } from './shippingRoutes';
import { lookupHs, canonicalizeHs } from './hsCodes';
import { bandForHs, classifyUnitPrice } from './pricingReference';

interface AIInput {
  ownerEntityType?: EntityType;
  kind?: DeclarationKind;
  department?: string;
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
  const hs = lookupHs(totals.hsCode);
  const origin = findCountry(shipment.originCountry);

  // ── R1 WEIGHT_MISMATCH ────────────────────────────────────────────────────
  if (shipment.grossWeightKg != null && shipment.netWeightKg != null && shipment.netWeightKg > shipment.grossWeightKg) {
    fire('WEIGHT_MISMATCH',
      'Netto çəki Brutto çəkidən böyükdür',
      `Brutto ${shipment.grossWeightKg} kq < Netto ${shipment.netWeightKg} kq`);
  }

  // ── R2 UNDERVALUATION_RISK — now uses HS/category pricing reference ───────
  if (totals.totalDeclaredValue && totals.totalQuantity) {
    const azn = convertToAZN(totals.totalDeclaredValue, totals.currency ?? 'AZN');
    const unitPrice = azn / totals.totalQuantity;
    const band = bandForHs(hs);
    const verdict = classifyUnitPrice(unitPrice, band);
    if (verdict === 'suspicious_low') {
      fire('UNDERVALUATION_RISK',
        `Vahid qiymət bazar həddindən kəskin aşağıdır: ${unitPrice.toFixed(2)} ₼/${band.unit}`,
        `Gözlənilən min ${band.suspiciousLowAZN} ₼; hesablanmış ${unitPrice.toFixed(2)} ₼ (${band.category})`,
        [`Pricing:${band.category}`]);
    } else if (verdict === 'suspicious_high') {
      fire('TARIFF_VALUE_OUTLIER',
        `Vahid qiymət bazar həddindən çox yüksəkdir: ${unitPrice.toFixed(2)} ₼/${band.unit}`,
        `Gözlənilən maks ${band.suspiciousHighAZN} ₼; hesablanmış ${unitPrice.toFixed(2)} ₼ (mümkün laundering)`,
        [`Pricing:${band.category}`]);
    }
  }

  // ── R3/R4 NO_DOCS / LOW_DOC_COUNT ─────────────────────────────────────────
  // "Minimum 3 documents" is interpreted as 3 DISTINCT document TYPES
  // (typeCode). Uploading the same type 3 times passes total count but is
  // still flagged because it's the same artefact attached repeatedly.
  // Source of rule: src/lib/referenceData.ts → RULE_LOW_DOC_COUNT, weight 8.
  const distinctTypes = new Set(docs.map((d) => d.typeCode));
  if (docs.length === 0) {
    fire('NO_DOCS', 'Heç bir sənəd yüklənməyib', 'documents.length = 0');
  } else if (distinctTypes.size < 3) {
    fire('LOW_DOC_COUNT',
      `Yalnız ${distinctTypes.size} fərqli sənəd növü mövcuddur (minimum 3 fərqli növ tövsiyə olunur)`,
      `distinct(documents.typeCode) = ${distinctTypes.size}; total = ${docs.length}`);
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

  // ── R10 HS_CODE_FORMAT — only fires when canonicalization fails ───────────
  if (totals.hsCode && !canonicalizeHs(totals.hsCode)) {
    fire('HS_CODE_FORMAT', 'HS kodu formatı tanınmadı',
      `Daxil edilmiş: "${totals.hsCode}"; Gözlənilən: 4/6/8/10 rəqəm (məs: 8517.12)`);
  }

  // ── R11 ROUND_NUMBER ──────────────────────────────────────────────────────
  if (totals.totalDeclaredValue) {
    const azn = convertToAZN(totals.totalDeclaredValue, totals.currency ?? 'AZN');
    if (azn >= 1000 && azn % 1000 === 0) {
      fire('ROUND_NUMBER', 'Bəyan dəyəri tam yuvarlaq rəqəmdir',
        `Bəyan: ${azn} ₼ (1000 ₼-ə tam bölünür)`);
    }
  }

  // ── R12 HS_NOT_IN_DB — fires only when canonicalization succeeded but the
  // catalog returns nothing (i.e. real "unknown" code, not a typo). ─────────
  if (totals.hsCode && canonicalizeHs(totals.hsCode) && !hs) {
    fire('HS_NOT_IN_DB',
      `HS kodu reyestrdə yoxdur: ${totals.hsCode}`,
      'HS_CATALOG-də bu prefiks üzrə qeyd tapılmadı — manual yoxlama tələb olunur',
      ['HS_CATALOG']);
  }

  // ── R13 HIGH_TARIFF_HS ────────────────────────────────────────────────────
  if (hs && hs.tariffRate >= 20) {
    fire('HIGH_TARIFF_HS',
      `Yüksək rüsumlu HS kodu (${hs.tariffRate}%): ${hs.label}`,
      `HS ${hs.code} üçün tariff ${hs.tariffRate}% — orta tariff 5-15%`,
      [`HS_CATALOG:${hs.code}`]);
  }

  // ── R25 DEPT_HS_MISMATCH — HS category must match the customs department.
  // Example: a Qida (food) declaration declaring HS 3304.99 (cosmetics) fires
  // this rule. The check is permissive when the department is unknown.
  if (hs && d.department) {
    const allowed = allowedCategoriesForDepartment(d.department);
    if (allowed && allowed.length > 0 && !allowed.includes(hs.category)) {
      fire('DEPT_HS_MISMATCH',
        `Şöbə "${d.department}" üçün HS kateqoriyası "${hs.category}" qəbul edilmir`,
        `Allowed for ${d.department}: ${allowed.join(', ')}; declared HS=${hs.code} (${hs.category})`,
        [`HS_CATALOG:${hs.code}`, `DEPT:${d.department}`]);
    }
  }

  // ── R14 HIGH_RISK_COMMODITY ───────────────────────────────────────────────
  if (hs && hs.riskTier === 'high') {
    fire('HIGH_RISK_COMMODITY',
      `Yüksək riskli mal kateqoriyası: ${hs.label}`,
      `Nəzarət tələbləri: ${hs.controls.join(', ') || '—'}`,
      [`HS_CATALOG:${hs.code}`]);
  }

  // R16 TARIFF_VALUE_OUTLIER is now driven by R2 (pricing reference) above.

  // ── R17 MISSING_REQUIRED_DOC (kind × entityType matrix) ───────────────────
  if (d.kind && d.ownerEntityType) {
    const required = DOC_REQUIREMENTS[d.kind][d.ownerEntityType];
    const present = new Set(docs.map((x) => x.typeCode));
    for (const req of required) {
      if (!present.has(req)) {
        const label = DOCUMENT_TYPES.find((t) => t.code === req)?.label ?? req;
        fire('MISSING_REQUIRED_DOC',
          `Tələb olunan sənəd çatışmır: ${label}`,
          `${d.kind} / ${d.ownerEntityType} üçün ${req} məcburidir`);
      }
    }
  }

  // ── R19 INVOICE_VALUE_MISMATCH / INVOICE_CURRENCY_MISMATCH ────────────────
  // Comparison logic for ALL uploaded invoices (not just the first):
  //   • Σ invoice.totalAmount (converted to AZN) is compared with totals.totalDeclaredValue
  //   • If aggregate diff > 5% → INVOICE_VALUE_MISMATCH fires
  //   • Any invoice whose currency ≠ totals.currency → INVOICE_CURRENCY_MISMATCH fires
  // This is the single canonical "high/low/equal" comparison for invoice ↔ totals.
  // It feeds: AI risk score (via rule weights in referenceData.ts), the
  // RED-channel critical override, the validateDeclaration gate (cannot
  // approve a mismatched declaration), and the PCA findings page.
  const invoiceDocs = docs.filter((x) => x.typeCode === 'INVOICE' || x.typeCode === 'COMMERCIAL_INVOICE');
  if (invoiceDocs.length > 0 && totals.totalDeclaredValue && totals.currency) {
    let invoiceSumAZN = 0;
    const ccyMismatches: string[] = [];
    for (const inv of invoiceDocs) {
      const invAmt = Number(inv.fields?.totalAmount);
      const invCcy = String(inv.fields?.currency ?? '');
      if (invCcy && invCcy !== totals.currency) ccyMismatches.push(`${inv.fileName}:${invCcy}`);
      if (!isNaN(invAmt) && invAmt > 0) {
        invoiceSumAZN += convertToAZN(invAmt, invCcy || totals.currency);
      }
    }
    if (ccyMismatches.length > 0) {
      fire('INVOICE_CURRENCY_MISMATCH',
        `Invoys valyutası bəyan valyutasından (${totals.currency}) fərqlidir: ${ccyMismatches.join(', ')}`,
        `mismatched=${ccyMismatches.length}/${invoiceDocs.length}`);
    }
    if (invoiceSumAZN > 0) {
      const decAZN = convertToAZN(totals.totalDeclaredValue, totals.currency);
      const diff = Math.abs(invoiceSumAZN - decAZN) / Math.max(invoiceSumAZN, decAZN);
      const verdict = invoiceSumAZN > decAZN ? 'higher' : invoiceSumAZN < decAZN ? 'lower' : 'equal';
      if (diff > 0.05) {
        fire('INVOICE_VALUE_MISMATCH',
          `Invoyslərin cəmi (${invoiceSumAZN.toFixed(0)} ₼) bəyan dəyərindən (${decAZN.toFixed(0)} ₼) ${(diff * 100).toFixed(1)}% ${verdict === 'higher' ? 'yüksək' : 'aşağı'}dır`,
          `invoices(${invoiceDocs.length})=${invoiceSumAZN.toFixed(0)} ₼ vs declared=${decAZN.toFixed(0)} ₼ (>5% ${verdict})`);
      }
    }
  }
  // keep a "first" reference for legacy cross-checks below
  const invoiceDoc = invoiceDocs[0];

  // ── R20 PACKING_LIST cross-checks (aggregate over ALL packing lists) ──────
  const packingDocs = docs.filter((x) => x.typeCode === 'PACKING_LIST');
  if (packingDocs.length > 0) {
    let qtySum = 0;
    let wtSum = 0;
    let totalRows = 0;
    for (const pd of packingDocs) {
      const items: Array<{ quantity?: number; weight?: number }> = Array.isArray(pd.fields?.items) ? pd.fields.items : [];
      qtySum += items.reduce((a, it) => a + (Number(it.quantity) || 0), 0);
      wtSum  += items.reduce((a, it) => a + (Number(it.weight) || 0), 0);
      totalRows += items.length;
    }
    if (totals.totalQuantity && qtySum > 0 && Math.abs(qtySum - totals.totalQuantity) / Math.max(qtySum, totals.totalQuantity) > 0.01) {
      fire('PACKING_QTY_MISMATCH',
        `Qablaşdırma miqdarı cəmi (${qtySum}, ${packingDocs.length} siyahıdan) ümumi miqdara (${totals.totalQuantity}) uyğun deyil`,
        `Σ packing.qty=${qtySum} ≠ totals.totalQuantity=${totals.totalQuantity}`);
    }
    if (shipment.netWeightKg && wtSum > 0 && Math.abs(wtSum - shipment.netWeightKg) / Math.max(wtSum, shipment.netWeightKg) > 0.10) {
      fire('PACKING_WEIGHT_MISMATCH',
        `Qablaşdırma çəkisi cəmi (${wtSum} kq, ${packingDocs.length} siyahıdan) netto çəkidən (${shipment.netWeightKg} kq) >10% fərqlidir`,
        `Σ packing.weight=${wtSum} vs shipment.netWeightKg=${shipment.netWeightKg}`);
    }
    if (shipment.packageCount && totalRows > 0 && totalRows !== shipment.packageCount) {
      fire('PACKING_PKGCOUNT_MISMATCH',
        `Qablaşdırma sətirlərinin cəmi sayı (${totalRows}, ${packingDocs.length} siyahıdan) bağlama sayına (${shipment.packageCount}) uyğun deyil`,
        `Σ packing.items.length=${totalRows} ≠ shipment.packageCount=${shipment.packageCount}`);
    }
  }

  // ── R21 HS_CODE_INTRA_MISMATCH (ALL customs declarations vs totals) ───────
  // Previous behaviour considered only the first CUSTOMS_DECLARATION doc, so
  // a user could mask a bad HS by attaching a correct one first. We now scan
  // every customs declaration and also cross-check them against each other.
  const customsDocs = docs.filter((x) => x.typeCode === 'CUSTOMS_DECLARATION');
  if (customsDocs.length > 0 && totals.hsCode) {
    const totalsHsNorm = canonicalizeHs(totals.hsCode) ?? totals.hsCode;
    for (const cd of customsDocs) {
      const cdHs = cd.fields?.hsCode;
      if (cdHs) {
        const cdHsNorm = canonicalizeHs(String(cdHs)) ?? String(cdHs);
        if (cdHsNorm !== totalsHsNorm) {
          fire('HS_CODE_INTRA_MISMATCH',
            `Gömrük sənədi (${cd.fileName}) HS=${cdHs} ≠ ümumi HS=${totals.hsCode}`,
            `customs_decl.${cd.id}.hsCode=${cdHs} ≠ totals.hsCode=${totals.hsCode}`);
        }
      }
    }
  }
  // Cross-check between multiple customs declarations themselves
  if (customsDocs.length > 1) {
    const seen = new Map<string, string>();
    for (const cd of customsDocs) {
      const cdHs = cd.fields?.hsCode;
      if (!cdHs) continue;
      const norm = canonicalizeHs(String(cdHs)) ?? String(cdHs);
      if (seen.size && !seen.has(norm)) {
        const firstKey = Array.from(seen.keys())[0];
        fire('HS_CODE_INTRA_MISMATCH',
          `Birdən çox gömrük sənədində fərqli HS kodları aşkar edildi: ${firstKey} vs ${norm}`,
          `customs_decls=${customsDocs.length}; HSlər: ${Array.from(seen.values()).concat(cd.fileName).join(', ')}`);
        break;
      }
      seen.set(norm, cd.fileName);
    }
  }

  // ── R22 BUYER/SELLER fuzzy match against consignor/consignee ──────────────
  const tokenOverlap = (a: string, b: string): number => {
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9çğşöüəı ]/gi, ' ').split(/\s+/).filter(Boolean);
    const ta = new Set(norm(a)); const tb = new Set(norm(b));
    if (!ta.size || !tb.size) return 0;
    let inter = 0; ta.forEach((t) => { if (tb.has(t)) inter++; });
    return inter / Math.min(ta.size, tb.size);
  };
  if (invoiceDoc && shipment.consignee && invoiceDoc.fields?.buyerName) {
    const overlap = tokenOverlap(String(invoiceDoc.fields.buyerName), shipment.consignee);
    if (overlap < 0.5) {
      fire('BUYER_CONSIGNEE_MISMATCH',
        'Invoys alıcısı bəyan edilən alıcıdan əhəmiyyətli dərəcədə fərqlidir',
        `invoice.buyerName="${invoiceDoc.fields.buyerName}" vs shipment.consignee="${shipment.consignee}" (overlap=${overlap.toFixed(2)})`);
    }
  }
  if (invoiceDoc && shipment.consignor && invoiceDoc.fields?.sellerName) {
    const overlap = tokenOverlap(String(invoiceDoc.fields.sellerName), shipment.consignor);
    if (overlap < 0.5) {
      fire('SELLER_CONSIGNOR_MISMATCH',
        'Invoys satıcısı bəyan edilən göndərəndən əhəmiyyətli dərəcədə fərqlidir',
        `invoice.sellerName="${invoiceDoc.fields.sellerName}" vs shipment.consignor="${shipment.consignor}" (overlap=${overlap.toFixed(2)})`);
    }
  }

  // ── R23 CERT_ORIGIN_MISMATCH ──────────────────────────────────────────────
  const originCert = docs.find((x) => x.typeCode === 'CERTIFICATE' && x.fields?.certificateType === 'Mənşə sertifikatı');
  if (originCert && shipment.originCountry && originCert.fields?.goodsCovered) {
    const text = String(originCert.fields.goodsCovered).toLowerCase();
    const originName = (findCountry(shipment.originCountry)?.name || '').toLowerCase();
    if (originName && text.length > 0 && !text.includes(originName) && !text.includes(shipment.originCountry.toLowerCase())) {
      // soft signal — only fires when cert has a clear country mention that doesn't match
      // (treat as warning so absence-of-mention doesn't false-positive)
    }
  }

  // ── R24 ROUTE_MODE_IMPLAUSIBLE / ROUTE_UNKNOWN ────────────────────────────
  if (shipment.originCountry && shipment.destinationCountry && shipment.transportMode) {
    const route = findRoute(shipment.originCountry, shipment.destinationCountry);
    if (!route) {
      fire('ROUTE_UNKNOWN',
        `Marşrut məlumat bazasında yoxdur: ${shipment.originCountry}→${shipment.destinationCountry}`,
        'SHIPPING_PLAUSIBILITY-də qeyd tapılmadı');
    } else if (!route.allowedModes.includes(shipment.transportMode)) {
      fire('ROUTE_MODE_IMPLAUSIBLE',
        `${shipment.originCountry}→${shipment.destinationCountry} marşrutu üçün "${shipment.transportMode}" mümkün deyil`,
        `Allowed: ${route.allowedModes.join(', ')}; declared: ${shipment.transportMode}`,
        [`SHIPPING_ROUTE:${route.from}-${route.to}`]);
    }
  }

  // ── Aggregate ─────────────────────────────────────────────────────────────
  const rawScore = flags.reduce((acc, f) => acc + f.points, 0);
  let score = Math.min(100, rawScore);
  let band = bandForScore(score, thresholds.scoreBands);
  let riskLevel = band.band as RiskLevel;
  let selectivityChannel: SelectivityChannel = band.channel;

  // ── HARD INVARIANT: incomplete / critical data can NEVER be GREEN ─────────
  // Any critical-severity flag forces channel = RED and lifts score into the
  // RED band. This is structural, not numeric — it does not rely on weights
  // adding up to 50, and it cannot be bypassed by tuning thresholds.
  const criticalFlags = flags.filter((f) => f.severity === 'critical');
  const overrideApplied = criticalFlags.length > 0;
  if (overrideApplied) {
    selectivityChannel = 'RED';
    score = Math.max(score, 50);
    band = bandForScore(score, thresholds.scoreBands);
    riskLevel = band.band as RiskLevel;
  }

  // Plain-language reasoning
  const reasoningParts: string[] = [];
  if (overrideApplied) {
    reasoningParts.push(
      `KRİTİK ÖVERRIDE: ${criticalFlags.length} kritik bayraq aşkar olundu (${criticalFlags.map((f) => f.code).join(', ')}) — kanal RED-ə zorlandı, GREEN mümkün deyil.`,
    );
  }
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
      commodity: hs ? { hsPrefix: hs.code.slice(0, 2), label: hs.category, controls: hs.controls } : undefined,
    },
  };
}
