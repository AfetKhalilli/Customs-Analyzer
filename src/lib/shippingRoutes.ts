// =============================================================================
// Shipping route plausibility dataset.
//
// Used by ai.ts route-mode check. Each route lists the modes that are
// physically plausible for the (origin, destination) corridor along with
// transit time and freight cost ranges. AI flags declarations whose declared
// transport mode is not in `allowedModes` for the corridor.
// =============================================================================

import type { ShippingRoute } from '../types';

export const SHIPPING_ROUTES: ShippingRoute[] = [
  // ── To Azerbaijan ──────────────────────────────────────────────────────────
  { from: 'CN', to: 'AZ', allowedModes: ['Dəniz', 'Hava', 'Dəmir yolu'],          transitDaysRange: [18, 60], freightCostRangeUSD: [2500, 12000], notes: 'Avtomobil yalnız nadirən və yüksək qiymətli yüklər üçün — qeyri-real seçim.' },
  { from: 'KR', to: 'AZ', allowedModes: ['Dəniz', 'Hava'],                         transitDaysRange: [20, 55], freightCostRangeUSD: [3000, 11000] },
  { from: 'JP', to: 'AZ', allowedModes: ['Dəniz', 'Hava'],                         transitDaysRange: [25, 60], freightCostRangeUSD: [3500, 13000] },
  { from: 'IN', to: 'AZ', allowedModes: ['Dəniz', 'Hava'],                         transitDaysRange: [15, 45], freightCostRangeUSD: [2200, 9000] },
  { from: 'AE', to: 'AZ', allowedModes: ['Dəniz', 'Hava', 'Avtomobil'],            transitDaysRange: [5, 25],  freightCostRangeUSD: [800, 4500] },
  { from: 'SA', to: 'AZ', allowedModes: ['Dəniz', 'Hava'],                         transitDaysRange: [12, 35], freightCostRangeUSD: [1500, 6000] },
  { from: 'TR', to: 'AZ', allowedModes: ['Avtomobil', 'Hava', 'Dəniz'],            transitDaysRange: [3, 12],  freightCostRangeUSD: [400, 2500] },
  { from: 'GE', to: 'AZ', allowedModes: ['Avtomobil', 'Dəmir yolu'],               transitDaysRange: [1, 4],   freightCostRangeUSD: [100, 1200] },
  { from: 'RU', to: 'AZ', allowedModes: ['Avtomobil', 'Dəmir yolu', 'Dəniz'],      transitDaysRange: [3, 14],  freightCostRangeUSD: [500, 3500] },
  { from: 'IR', to: 'AZ', allowedModes: ['Avtomobil', 'Dəmir yolu'],               transitDaysRange: [1, 6],   freightCostRangeUSD: [200, 1500] },
  { from: 'UA', to: 'AZ', allowedModes: ['Avtomobil', 'Dəmir yolu', 'Dəniz'],      transitDaysRange: [5, 15],  freightCostRangeUSD: [600, 3000] },
  { from: 'KZ', to: 'AZ', allowedModes: ['Avtomobil', 'Dəmir yolu', 'Dəniz'],      transitDaysRange: [5, 18],  freightCostRangeUSD: [700, 3500] },
  { from: 'UZ', to: 'AZ', allowedModes: ['Avtomobil', 'Dəmir yolu', 'Dəniz'],      transitDaysRange: [7, 20],  freightCostRangeUSD: [800, 3800] },
  { from: 'DE', to: 'AZ', allowedModes: ['Avtomobil', 'Hava', 'Dəniz', 'Dəmir yolu'], transitDaysRange: [7, 25], freightCostRangeUSD: [1500, 7000] },
  { from: 'IT', to: 'AZ', allowedModes: ['Avtomobil', 'Hava', 'Dəniz'],            transitDaysRange: [7, 25],  freightCostRangeUSD: [1400, 6500] },
  { from: 'FR', to: 'AZ', allowedModes: ['Avtomobil', 'Hava', 'Dəniz'],            transitDaysRange: [8, 28],  freightCostRangeUSD: [1500, 7000] },
  { from: 'GB', to: 'AZ', allowedModes: ['Avtomobil', 'Hava', 'Dəniz'],            transitDaysRange: [8, 30],  freightCostRangeUSD: [1600, 7500] },
  { from: 'US', to: 'AZ', allowedModes: ['Dəniz', 'Hava'],                         transitDaysRange: [20, 55], freightCostRangeUSD: [3500, 14000] },
  { from: 'ES', to: 'AZ', allowedModes: ['Avtomobil', 'Hava', 'Dəniz'],            transitDaysRange: [10, 30], freightCostRangeUSD: [1800, 7500] },
  // ── Export corridors ───────────────────────────────────────────────────────
  { from: 'AZ', to: 'RU', allowedModes: ['Avtomobil', 'Dəmir yolu', 'Dəniz'],      transitDaysRange: [3, 14],  freightCostRangeUSD: [500, 3500] },
  { from: 'AZ', to: 'GE', allowedModes: ['Avtomobil', 'Dəmir yolu'],               transitDaysRange: [1, 4],   freightCostRangeUSD: [100, 1200] },
  { from: 'AZ', to: 'TR', allowedModes: ['Avtomobil', 'Hava', 'Dəniz'],            transitDaysRange: [3, 12],  freightCostRangeUSD: [400, 2500] },
  { from: 'AZ', to: 'IR', allowedModes: ['Avtomobil', 'Dəmir yolu'],               transitDaysRange: [1, 6],   freightCostRangeUSD: [200, 1500] },
  { from: 'AZ', to: 'KZ', allowedModes: ['Avtomobil', 'Dəmir yolu', 'Dəniz'],      transitDaysRange: [5, 18],  freightCostRangeUSD: [700, 3500] },
  { from: 'AZ', to: 'CN', allowedModes: ['Dəniz', 'Hava', 'Dəmir yolu'],           transitDaysRange: [18, 60], freightCostRangeUSD: [2500, 12000] },
  { from: 'AZ', to: 'DE', allowedModes: ['Avtomobil', 'Hava', 'Dəniz'],            transitDaysRange: [7, 25],  freightCostRangeUSD: [1500, 7000] },
  // ── Common transit corridors ───────────────────────────────────────────────
  { from: 'RU', to: 'IR', allowedModes: ['Avtomobil', 'Dəmir yolu'],               transitDaysRange: [4, 14],  freightCostRangeUSD: [700, 3500] },
  { from: 'TR', to: 'RU', allowedModes: ['Avtomobil', 'Dəniz'],                    transitDaysRange: [4, 12],  freightCostRangeUSD: [600, 3000] },
  { from: 'CN', to: 'TR', allowedModes: ['Dəniz', 'Hava', 'Dəmir yolu'],           transitDaysRange: [20, 45], freightCostRangeUSD: [2200, 10000] },
];

export function findRoute(from?: string, to?: string): ShippingRoute | undefined {
  if (!from || !to) return undefined;
  return SHIPPING_ROUTES.find((r) => r.from === from && r.to === to);
}

/** Returns the transit-day midpoint, used by AI to spot impossibly fast clearances. */
export function expectedTransitMidDays(route: ShippingRoute): number {
  return (route.transitDaysRange[0] + route.transitDaysRange[1]) / 2;
}
