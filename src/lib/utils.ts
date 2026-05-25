import clsx, { ClassValue } from 'clsx';
import { format, formatDistanceToNow, isToday, isYesterday, parseISO, differenceInDays } from 'date-fns';
import type { Declaration } from '../types';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function formatDate(iso: string): string {
  if (!iso) return '';
  try { return format(parseISO(iso), 'dd.MM.yyyy'); } catch { return iso; }
}

export function formatDateTime(iso: string): string {
  if (!iso) return '';
  try { return format(parseISO(iso), 'dd.MM.yyyy HH:mm'); } catch { return iso; }
}

export function formatNumber(n: number, decimals = 0): string {
  if (n == null || isNaN(n)) return '0';
  return n.toLocaleString('az-AZ', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function formatCurrency(amount: number, currency: string = 'AZN'): string {
  if (amount == null || isNaN(amount)) return `0 ${currency}`;
  const v = amount.toLocaleString('az-AZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency === 'AZN' ? `${v} ₼` : `${v} ${currency}`;
}

export const FX_TO_AZN: Record<string, number> = {
  AZN: 1, USD: 1.7, EUR: 1.85, GBP: 2.15, RUB: 0.018, TRY: 0.052,
};

export function convertToAZN(amount: number, currency: string): number {
  return amount * (FX_TO_AZN[currency] ?? 1);
}

export function relativeTime(iso: string): string {
  if (!iso) return '';
  try {
    const d = parseISO(iso);
    return formatDistanceToNow(d, { addSuffix: true });
  } catch { return iso; }
}

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? '').join('');
}

export function groupByDay<T extends { at: string }>(items: T[]): { label: string; items: T[] }[] {
  const labelFor = (iso: string) => {
    try {
      const d = parseISO(iso);
      if (isToday(d)) return 'Bu gün';
      if (isYesterday(d)) return 'Dünən';
      const diff = differenceInDays(new Date(), d);
      if (diff < 7) return format(d, 'EEEE');
      return format(d, 'dd MMM yyyy');
    } catch { return iso; }
  };
  const groups: Record<string, T[]> = {};
  const order: string[] = [];
  for (const it of items) {
    const k = labelFor(it.at);
    if (!groups[k]) { groups[k] = []; order.push(k); }
    groups[k].push(it);
  }
  return order.map((label) => ({ label, items: groups[label] }));
}

export function computeDutyAtRisk(declaredValueAZN: number, riskScore: number): number {
  const baseExposure = declaredValueAZN * 0.23; // 5% duty + 18% VAT
  const weight = 0.15 + (riskScore / 100) * 0.85;
  return baseExposure * weight;
}

export function downloadCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const esc = (v: any) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function paginationInfo(total: number, page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  return { totalPages, start, end };
}
