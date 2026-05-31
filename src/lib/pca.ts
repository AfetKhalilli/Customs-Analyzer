import type { Declaration, PCAAnomaly, PCARiskBand, AnomalyPattern, FindingSeverity } from '../types';
import { uid, convertToAZN, computeDutyAtRisk } from './utils';

export function pcaRiskBand(score: number): PCARiskBand {
  if (score >= 75) return 'Kritik';
  if (score >= 50) return 'Yüksək';
  if (score >= 25) return 'Orta';
  return 'Aşağı';
}

export function pcaDutyAtRisk(d: Declaration): number {
  const azn = convertToAZN(d.totals.totalDeclaredValue ?? 0, d.totals.currency ?? 'AZN');
  return computeDutyAtRisk(azn, d.ai.score);
}

function sevFromScore(score: number): FindingSeverity {
  if (score >= 75) return 'Kritik';
  if (score >= 50) return 'Yüksək';
  if (score >= 25) return 'Orta';
  return 'Aşağı';
}

function mk(patternCode: AnomalyPattern, patternLabel: string, severity: FindingSeverity, description: string, companyIds: string[], declIds: string[]): PCAAnomaly {
  return {
    id: uid('anom'),
    patternCode, patternLabel, severity, description,
    affectedCompanyIds: companyIds, affectedDeclarationIds: declIds,
    detectedAt: new Date().toISOString(), dismissed: false,
  };
}

export function detectPatterns(declarations: Declaration[]): PCAAnomaly[] {
  const finalized = declarations.filter((d) => ['Təsdiq', 'Rədd', 'Tamamlanmış'].includes(d.status));
  const anomalies: PCAAnomaly[] = [];

  // group by ownerId
  const byOwner = new Map<string, Declaration[]>();
  for (const d of finalized) {
    const arr = byOwner.get(d.ownerId) ?? [];
    arr.push(d);
    byOwner.set(d.ownerId, arr);
  }

  // 1. REPEATED_HIGH_RISK — same company with 2+ high-risk declarations
  for (const [owner, list] of byOwner) {
    const high = list.filter((d) => d.ai.score >= 50);
    if (high.length >= 2) {
      anomalies.push(mk(
        'REPEATED_HIGH_RISK',
        'Təkrarlanan yüksək risk',
        'Yüksək',
        `${list[0].ownerDisplayName} şirkətinin ${high.length} yüksək riskli sənədi var`,
        [owner], high.map((d) => d.id)
      ));
    }
  }

  // 2. UNDERVALUATION_PATTERN — same company with 2+ low unit prices
  for (const [owner, list] of byOwner) {
    const undervalued = list.filter((d) => {
      if (!d.totals.totalDeclaredValue || !d.totals.totalQuantity) return false;
      const unit = convertToAZN(d.totals.totalDeclaredValue, d.totals.currency) / d.totals.totalQuantity;
      return unit < 5;
    });
    if (undervalued.length >= 2) {
      anomalies.push(mk(
        'UNDERVALUATION_PATTERN',
        'Aşağı qiymət qoyma davranışı',
        'Yüksək',
        `${list[0].ownerDisplayName}: ${undervalued.length} sənəddə vahid qiymət bazar səviyyəsindən aşağıdır`,
        [owner], undervalued.map((d) => d.id)
      ));
    }
  }

  // 3. HS_CODE_SWITCHING — same company uses different HS code prefixes for similar items
  for (const [owner, list] of byOwner) {
    const prefixes = new Set<string>();
    for (const d of list) {
      if (d.totals.hsCode) prefixes.add(d.totals.hsCode.slice(0, 2));
    }
    if (prefixes.size >= 4 && list.length >= 4) {
      anomalies.push(mk(
        'HS_CODE_SWITCHING',
        'HS kodu dəyişdirmə',
        'Orta',
        `${list[0].ownerDisplayName}: ${prefixes.size} fərqli HS prefiksi istifadə edib (${list.length} sənəddə)`,
        [owner], list.map((d) => d.id)
      ));
    }
  }

  // 4. VALUE_SPIKE — declaration value 3x bigger than company's previous average
  for (const [owner, list] of byOwner) {
    if (list.length < 2) continue;
    const sorted = [...list].sort((a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime());
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted.slice(0, i);
      const avgAZN = prev.reduce((a, d) => a + convertToAZN(d.totals.totalDeclaredValue ?? 0, d.totals.currency), 0) / prev.length;
      const curAZN = convertToAZN(sorted[i].totals.totalDeclaredValue ?? 0, sorted[i].totals.currency);
      if (avgAZN > 1000 && curAZN > avgAZN * 3) {
        anomalies.push(mk(
          'VALUE_SPIKE',
          'Bəyan dəyəri sıçrayışı',
          'Yüksək',
          `${list[0].ownerDisplayName}: ${sorted[i].id.slice(-8)} nömrəli sənəd ortalama dəyərdən ${(curAZN / avgAZN).toFixed(1)}x böyükdür`,
          [owner], [sorted[i].id]
        ));
        break;
      }
    }
  }

  // 5. POST_REJECTION_APPROVAL — same company rejected then approved within close timeframe
  for (const [owner, list] of byOwner) {
    const sorted = [...list].sort((a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime());
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i - 1].status === 'Rədd' && (sorted[i].status === 'Təsdiq' || sorted[i].status === 'Tamamlanmış')) {
        const gap = (new Date(sorted[i].uploadedAt).getTime() - new Date(sorted[i - 1].uploadedAt).getTime()) / 86400000;
        if (gap < 14) {
          anomalies.push(mk(
            'POST_REJECTION_APPROVAL',
            'Rəddən sonra təsdiq',
            'Orta',
            `${list[0].ownerDisplayName}: rəddən sonra ${gap.toFixed(0)} gün ərzində eyni şirkətin başqa sənədi təsdiqlənib`,
            [owner], [sorted[i - 1].id, sorted[i].id]
          ));
          break;
        }
      }
    }
  }

  return anomalies;
}
