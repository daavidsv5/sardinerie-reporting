// Výpočty Měsíčního přehledu (/hlavni-dashboard), sdílené s Ročním přehledem (/rocni-prehled).

import { mockData } from '@/data/mockGenerator';
import { marginDataCZ } from '@/data/marginDataCZ';
import { marginDataSK as _marginDataSK } from '@/data/marginDataSK';
import { retentionDataCZ } from '@/data/retentionDataCZ';
import { retentionDataSK as _retentionDataSK } from '@/data/retentionDataSK';
import { computeMonthlyLtvBezDph } from '@/lib/retentionUtils';
import { SK_LAUNCH_DATE } from '@/data/types';
import type { Country } from '@/data/types';
import { emptyKpiRow, type KpiRow } from '@/lib/kpiMetrics';

const marginDataSK = _marginDataSK.filter(r => r.date >= SK_LAUNCH_DATE);
const retentionDataSK = _retentionDataSK.filter(c => c.dates[0] >= SK_LAUNCH_DATE);

/** Měsíční součty KPI za rok. `dateFilter` omezí dny (Roční přehled: cutoff / stejné období loni). */
export function aggregateMonthly(
  year: number,
  countries: Country[],
  eurToCzk: number,
  dateFilter?: (date: string) => boolean,
): KpiRow[] {
  const isSKOnly = countries.length === 1 && countries[0] === 'sk';
  const months: KpiRow[] = Array.from({ length: 12 }, emptyKpiRow);

  for (const r of mockData) {
    if (!countries.includes(r.country)) continue;
    if (dateFilter && !dateFilter(r.date)) continue;
    const [y, m] = r.date.split('-').map(Number);
    if (y !== year) continue;
    const mult = r.country === 'sk' && !isSKOnly ? eurToCzk : 1;
    const i = m - 1;
    months[i].revenue += r.revenue * mult;
    months[i].orders  += r.orders;
    months[i].cost    += r.cost * mult;
  }

  if (countries.includes('cz')) {
    for (const r of marginDataCZ) {
      if (dateFilter && !dateFilter(r.date)) continue;
      const [y, m] = r.date.split('-').map(Number);
      if (y !== year) continue;
      months[m - 1].purchaseCost += r.purchaseCost;
      months[m - 1].marginRev    += r.revenue;
    }
  }

  if (countries.includes('sk')) {
    const mult = isSKOnly ? 1 : eurToCzk;
    for (const r of marginDataSK) {
      if (dateFilter && !dateFilter(r.date)) continue;
      const [y, m] = r.date.split('-').map(Number);
      if (y !== year) continue;
      months[m - 1].purchaseCost += r.purchaseCost * mult;
      months[m - 1].marginRev    += r.revenue * mult;
    }
  }

  return months;
}

/** LTV (bez DPH) ke konci každého měsíce roku — kumulativní tržby bez DPH / kumulativní počet zákazníků
 *  (stejná definice jako box „LTV (bez DPH)" na /dashboard). Měsíce před prvními a po posledních datech = 0. */
export function monthlyLtv(year: number, countries: Country[], eurToCzk: number): number[] {
  const isSKOnly = countries.length === 1 && countries[0] === 'sk';
  const customers = [
    ...(countries.includes('cz') ? retentionDataCZ : []),
    ...(countries.includes('sk')
      ? retentionDataSK.map(c => isSKOnly ? c : { ...c, revenues: c.revenues.map(v => v * eurToCzk) })
      : []),
  ];
  const points = computeMonthlyLtvBezDph(customers);
  if (points.length === 0) return Array(12).fill(0);
  const lastMonth = points[points.length - 1].date.slice(0, 7);
  return Array.from({ length: 12 }, (_, i) => {
    const month = `${year}-${String(i + 1).padStart(2, '0')}`;
    if (month > lastMonth) return 0;
    let value = 0;
    for (const p of points) {
      if (p.date.slice(0, 7) > month) break;
      value = p.ltvBezDph;
    }
    return value;
  });
}
