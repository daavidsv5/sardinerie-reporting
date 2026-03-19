'use client';

import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, ShoppingBag, Boxes, Package, ChevronUp, ChevronDown, Download } from 'lucide-react';
import { useFilters, getDateRange } from '@/hooks/useFilters';
import { productDataCZ } from '@/data/productDataCZ';
import { productDataSK } from '@/data/productDataSK';
import { getDisplayCurrency } from '@/data/types';
import { formatCurrency, formatNumber, formatDate } from '@/lib/formatters';

type SortKey = 'name' | 'amount' | 'revenue' | 'revenue_vat';
type SortDir = 'asc' | 'desc';

interface ProductRow {
  name: string;
  amount: number;
  revenue: number;
  revenue_vat: number;
  prevAmount: number;
  prevRevenue: number;
}

function yoyPct(current: number, prev: number): number | null {
  if (prev === 0) return null;
  return ((current - prev) / prev) * 100;
}

function YoyBadge({ current, prev }: { current: number; prev: number }) {
  const pct = yoyPct(current, prev);
  if (pct === null) return null;
  const positive = pct >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-lg ml-1.5 ${
      positive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'
    }`}>
      {positive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {pct > 0 ? '+' : ''}{pct.toFixed(1)}%
    </span>
  );
}

function KpiBox({ label, sublabel, value }: {
  label: string; sublabel: string; value: string;
  icon: React.ElementType; gradient: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 border-2 border-blue-800 shadow-sm flex flex-col gap-3">
      <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider leading-snug">{label}</p>
      <p className="text-2xl font-bold text-slate-800 leading-none">{value}</p>
      <p className="text-[11px] text-slate-400">{sublabel}</p>
    </div>
  );
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronUp size={12} className="text-slate-300" />;
  return sortDir === 'asc'
    ? <ChevronUp size={12} className="text-blue-500" />
    : <ChevronDown size={12} className="text-blue-500" />;
}

function aggregateByName(
  countries: string[],
  startStr: string,
  endStr: string,
  skMult: number
): Record<string, { amount: number; revenue: number; revenue_vat: number }> {
  const byName: Record<string, { amount: number; revenue: number; revenue_vat: number }> = {};

  if (countries.includes('cz')) {
    for (const r of productDataCZ) {
      if (r.date < startStr || r.date > endStr) continue;
      if (!byName[r.name]) byName[r.name] = { amount: 0, revenue: 0, revenue_vat: 0 };
      byName[r.name].amount      += r.amount;
      byName[r.name].revenue     += r.revenue;
      byName[r.name].revenue_vat += r.revenue_vat;
    }
  }

  if (countries.includes('sk')) {
    for (const r of productDataSK) {
      if (r.date < startStr || r.date > endStr) continue;
      if (!byName[r.name]) byName[r.name] = { amount: 0, revenue: 0, revenue_vat: 0 };
      byName[r.name].amount      += r.amount;
      byName[r.name].revenue     += r.revenue     * skMult;
      byName[r.name].revenue_vat += r.revenue_vat * skMult;
    }
  }

  return byName;
}

export default function ProductsPage() {
  const { filters, eurToCzk } = useFilters();
  const [sortKey, setSortKey] = useState<SortKey>('amount');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const { start, end, prevStart, prevEnd } = getDateRange(filters);
  const startStr     = start.toISOString().split('T')[0];
  const endStr       = end.toISOString().split('T')[0];
  const prevStartStr = prevStart.toISOString().split('T')[0];
  const prevEndStr   = prevEnd.toISOString().split('T')[0];

  const currency = getDisplayCurrency(filters.countries);
  const fc = (v: number) => formatCurrency(v, currency);

  const onlySK = filters.countries.length === 1 && filters.countries[0] === 'sk';
  const skMult = onlySK ? 1 : eurToCzk;

  const { rows, hasPrevData } = useMemo(() => {
    const current = aggregateByName(filters.countries, startStr, endStr, skMult);
    const prev    = aggregateByName(filters.countries, prevStartStr, prevEndStr, skMult);

    const hasPrev = Object.values(prev).some(r => r.amount > 0);

    // Merge all product names from both periods
    const allNames = new Set([...Object.keys(current), ...Object.keys(prev)]);
    const list: ProductRow[] = [];

    for (const name of allNames) {
      const c = current[name] ?? { amount: 0, revenue: 0, revenue_vat: 0 };
      const p = prev[name]    ?? { amount: 0, revenue: 0, revenue_vat: 0 };
      if (c.amount === 0 && c.revenue === 0) continue; // only show products with current period data
      list.push({
        name,
        amount:      c.amount,
        revenue:     c.revenue,
        revenue_vat: c.revenue_vat,
        prevAmount:  p.amount,
        prevRevenue: p.revenue,
      });
    }

    list.sort((a, b) => {
      const mult = sortDir === 'asc' ? 1 : -1;
      if (sortKey === 'name') return mult * a.name.localeCompare(b.name, 'cs');
      return mult * (a[sortKey] - b[sortKey]);
    });

    return { rows: list, hasPrevData: hasPrev };
  }, [filters.countries, startStr, endStr, prevStartStr, prevEndStr, skMult, sortKey, sortDir]);

  const totalAmount     = rows.reduce((s, r) => s + r.amount, 0);
  const totalRevenue    = rows.reduce((s, r) => s + r.revenue, 0);
  const totalRevenueVat = rows.reduce((s, r) => s + r.revenue_vat, 0);
  const uniqueProducts  = rows.length;

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const exportCsv = () => {
    const header = ['Název produktu', 'Počet kusů', 'Počet kusů (loni)', `Bez DPH (${currency})`, `Bez DPH loni (${currency})`, `S DPH (${currency})`];
    const csvRows = rows.map(r => [
      `"${r.name.replace(/"/g, '""')}"`,
      r.amount,
      r.prevAmount,
      r.revenue.toFixed(2),
      r.prevRevenue.toFixed(2),
      r.revenue_vat.toFixed(2),
    ]);
    const content = [header, ...csvRows].map(r => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prodejnost_${startStr}_${endStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const subtitle = `${formatDate(start)} – ${formatDate(end)}`;
  const thClass = () => `px-4 py-3 text-[11px] font-semibold text-white uppercase tracking-wider cursor-pointer select-none hover:text-blue-200 transition-colors`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Prodejnost produktů</h1>
        <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
      </div>

      {/* KPI boxes */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiBox label="Celkový prodej s DPH" sublabel={currency} value={fc(totalRevenueVat)} icon={TrendingUp} gradient="bg-gradient-to-br from-purple-600 to-indigo-600" />
        <KpiBox label="Celkový prodej bez DPH" sublabel={currency} value={fc(totalRevenue)} icon={ShoppingBag} gradient="bg-gradient-to-br from-blue-500 to-blue-700" />
        <KpiBox label="Celkový počet kusů" sublabel="prodáno" value={formatNumber(totalAmount)} icon={Boxes} gradient="bg-gradient-to-br from-cyan-400 to-sky-600" />
        <KpiBox label="Počet produktů" sublabel="unikátních produktů" value={formatNumber(uniqueProducts)} icon={Package} gradient="bg-gradient-to-br from-teal-400 to-emerald-600" />
      </div>

      {/* Product table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-700">Přehled produktů</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {formatNumber(uniqueProducts)} produktů · seřazeno dle {sortKey === 'amount' ? 'počtu kusů' : sortKey === 'revenue_vat' ? 'tržeb s DPH' : sortKey === 'revenue' ? 'tržeb bez DPH' : 'názvu'}
              {hasPrevData && <span className="ml-1">· včetně YoY srovnání</span>}
            </p>
          </div>
          <button
            onClick={exportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 transition-colors"
          >
            <Download size={13} />
            Export CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-blue-900 border-b border-blue-800">
                <th className={`${thClass()} text-left`} onClick={() => handleSort('name')}>
                  <span className="inline-flex items-center gap-1">
                    Název produktu <SortIcon col="name" sortKey={sortKey} sortDir={sortDir} />
                  </span>
                </th>
                <th className={`${thClass()} text-right`} onClick={() => handleSort('amount')}>
                  <span className="inline-flex items-center gap-1 justify-end w-full">
                    Počet kusů <SortIcon col="amount" sortKey={sortKey} sortDir={sortDir} />
                  </span>
                </th>
                <th className={`${thClass()} text-right`} onClick={() => handleSort('revenue')}>
                  <span className="inline-flex items-center gap-1 justify-end w-full">
                    Bez DPH ({currency}) <SortIcon col="revenue" sortKey={sortKey} sortDir={sortDir} />
                  </span>
                </th>
                <th className={`${thClass()} text-right`} onClick={() => handleSort('revenue_vat')}>
                  <span className="inline-flex items-center gap-1 justify-end w-full">
                    S DPH ({currency}) <SortIcon col="revenue_vat" sortKey={sortKey} sortDir={sortDir} />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={r.name} className={`border-b border-slate-50 hover:bg-slate-50/70 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                  <td className="px-4 py-2.5 text-slate-700">{r.name}</td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="inline-block bg-slate-100 text-slate-700 text-xs font-semibold px-2.5 py-1 rounded-lg whitespace-nowrap">
                        {formatNumber(r.amount)}
                      </span>
                      {hasPrevData && <YoyBadge current={r.amount} prev={r.prevAmount} />}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-500">
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="whitespace-nowrap">{fc(r.revenue)}</span>
                      {hasPrevData && <YoyBadge current={r.revenue} prev={r.prevRevenue} />}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-800 font-semibold">{fc(r.revenue_vat)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-blue-50/60 border-t-2 border-blue-100 font-semibold">
                <td className="px-4 py-3 text-blue-500 text-xs">Celkem</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <span className="inline-block bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-lg">
                    {formatNumber(totalAmount)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-slate-500">{fc(totalRevenue)}</td>
                <td className="px-4 py-3 text-right text-slate-700">{fc(totalRevenueVat)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
