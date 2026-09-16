'use client';

import { useMemo, useState } from 'react';
import { BookOpen, Search, Info, AlertTriangle, Target, Calculator, MapPin } from 'lucide-react';
import { useFilters } from '@/hooks/useFilters';
import { mockData } from '@/data/mockGenerator';
import { marginDataCZ } from '@/data/marginDataCZ';
import { marginDataSK as _marginDataSK } from '@/data/marginDataSK';
import { retentionDataCZ } from '@/data/retentionDataCZ';
import { retentionDataSK as _retentionDataSK } from '@/data/retentionDataSK';
import { SK_LAUNCH_DATE } from '@/data/types';
import { computeRetentionKpis } from '@/lib/retentionUtils';
import { formatCurrency, formatPercent, formatNumber, formatDate, localIsoDate } from '@/lib/formatters';
import {
  METRICS, CATEGORY_LABELS, SEGMENT_DESCRIPTION,
  type MetricCategory, type MetricDefinition, type CurrentValueKey, type ValueFormat, type Benchmark,
} from '@/lib/metricsGlossary';

const marginDataSK    = _marginDataSK.filter(r => r.date >= SK_LAUNCH_DATE);
const retentionDataSK = _retentionDataSK.filter(c => c.dates[0] >= SK_LAUNCH_DATE);

const CATEGORY_ORDER = Object.keys(CATEGORY_LABELS) as MetricCategory[];

// ─── Aktuální hodnoty Sardinerie (posledních 12 měsíců, CZ + SK v Kč) ─────────

function useCurrentValues(eurToCzk: number) {
  return useMemo(() => {
    const end = new Date();
    end.setDate(end.getDate() - 1);
    const start = new Date(end);
    start.setFullYear(start.getFullYear() - 1);
    start.setDate(start.getDate() + 1);
    const s = localIsoDate(start);
    const e = localIsoDate(end);

    let revenue = 0, revenueVat = 0, orders = 0, cost = 0;
    for (const r of mockData) {
      if (r.date < s || r.date > e) continue;
      const mult = r.currency === 'EUR' ? eurToCzk : 1;
      revenue    += r.revenue * mult;
      revenueVat += r.revenue_vat * mult;
      orders     += r.orders;
      cost       += r.cost * mult;
    }

    let marginRev = 0, purchaseCost = 0;
    for (const r of marginDataCZ) if (r.date >= s && r.date <= e) { marginRev += r.revenue; purchaseCost += r.purchaseCost; }
    for (const r of marginDataSK) if (r.date >= s && r.date <= e) { marginRev += r.revenue * eurToCzk; purchaseCost += r.purchaseCost * eurToCzk; }

    const customers = [
      ...retentionDataCZ,
      ...retentionDataSK.map(c => ({ ...c, revenues: c.revenues.map(v => v * eurToCzk), revsVat: c.revsVat.map(v => v * eurToCzk) })),
    ];
    const newCustomers = customers.filter(c => c.dates[0] >= s && c.dates[0] <= e).length;
    const ltvRevenue   = customers.reduce((sum, c) => sum + c.revenues.reduce((a, v) => a + v, 0), 0);
    const retention    = computeRetentionKpis(customers);

    const margin      = marginRev - purchaseCost;
    const marginPct   = marginRev > 0 ? (margin / marginRev) * 100 : 0;
    const grossProfit = margin - cost;
    const cac         = newCustomers > 0 ? cost / newCustomers : 0;
    const ltv         = customers.length > 0 ? ltvRevenue / customers.length : 0;
    const ltvProfit   = ltv * (marginPct / 100);

    const values: Record<CurrentValueKey, number | null> = {
      revenueVat, revenue, orders,
      aov:           orders > 0 ? revenueVat / orders : null,
      margin,
      marginPct:     marginRev > 0 ? marginPct : null,
      grossProfit,
      grossPct:      marginRev > 0 ? (grossProfit / marginRev) * 100 : null,
      grossPerOrder: orders > 0 ? grossProfit / orders : null,
      cost,
      pno:           revenue > 0 ? (cost / revenue) * 100 : null,
      poas:          cost > 0 ? margin / cost : null,
      cpa:           orders > 0 ? cost / orders : null,
      cac:           newCustomers > 0 ? cac : null,
      ltv:           customers.length > 0 ? ltv : null,
      ltvProfit:     customers.length > 0 ? ltvProfit : null,
      ltvCac:        cac > 0 ? ltvProfit / cac : null,
      repeatRate:    customers.length > 0 ? retention.repeatPurchaseRate : null,
      daysBetween:   retention.avgDaysBetween > 0 ? retention.avgDaysBetween : null,
    };
    return { values, start, end };
  }, [eurToCzk]);
}

function formatValue(v: number, format: ValueFormat): string {
  switch (format) {
    case 'currency': return formatCurrency(v, 'CZK');
    case 'percent':  return formatPercent(v);
    case 'number':   return formatNumber(Math.round(v));
    case 'ratio':    return `${v.toFixed(2).replace('.', ',')}×`;
    case 'days':     return `${Math.round(v)} dní`;
  }
}

type Verdict = 'good' | 'watch' | null;

function evaluate(b: Benchmark | undefined, v: number): Verdict {
  if (!b?.better) return null;
  const { min, max, better } = b;
  if (better === 'higher') return min !== undefined && v < min ? 'watch' : 'good';
  if (better === 'lower')  return max !== undefined && v > max ? 'watch' : 'good';
  if (min !== undefined && v < min) return 'watch';
  if (max !== undefined && v > max) return 'watch';
  return 'good';
}

// ─── Karta metriky ───────────────────────────────────────────────────────────

function MetricCard({ metric, value }: { metric: MetricDefinition; value: number | null }) {
  const verdict = value !== null && metric.current ? evaluate(metric.benchmark, value) : null;

  return (
    <article id={metric.id} className="bg-white rounded-xl border border-slate-100 shadow-sm flex flex-col scroll-mt-24">
      <header className="px-5 pt-4 pb-3 border-b border-slate-100 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-slate-800">{metric.name}</h3>
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            <MapPin size={12} className="text-slate-400" />
            {metric.where.map(w => (
              <span key={w} className="text-[11px] text-slate-500 bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5">{w}</span>
            ))}
          </div>
        </div>
        {metric.current && value !== null && (
          <div className="text-right shrink-0">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Sardinerie</p>
            <p className="text-lg font-bold text-slate-800 leading-tight tabular-nums">{formatValue(value, metric.current.format)}</p>
            {verdict && (
              <span className={`inline-block mt-1 text-[11px] font-semibold rounded px-1.5 py-0.5 ${
                verdict === 'good' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
              }`}>
                {verdict === 'good' ? 'v pořádku' : 'ke sledování'}
              </span>
            )}
          </div>
        )}
      </header>

      <div className="px-5 py-4 space-y-3 text-sm flex-1">
        <p className="text-slate-600 leading-relaxed">{metric.meaning}</p>

        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
            <Calculator size={12} /> Výpočet
          </p>
          <pre className="text-[12.5px] leading-relaxed text-slate-700 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 whitespace-pre-wrap font-mono">{metric.formula}</pre>
        </div>

        {metric.benchmark && (
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              <Target size={12} /> Benchmark
            </p>
            <p className="text-slate-600 leading-relaxed">{metric.benchmark.text}</p>
          </div>
        )}

        {metric.note && (
          <p className="flex gap-2 text-[13px] text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 leading-relaxed">
            <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-600" />
            <span>{metric.note}</span>
          </p>
        )}
      </div>
    </article>
  );
}

// ─── Stránka ─────────────────────────────────────────────────────────────────

export default function SlovnikPage() {
  const { eurToCzk } = useFilters();
  const { values, start, end } = useCurrentValues(eurToCzk);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<MetricCategory | 'all'>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('cs');
    return METRICS.filter(m =>
      (category === 'all' || m.category === category) &&
      (!q || `${m.name} ${m.meaning} ${m.formula}`.toLocaleLowerCase('cs').includes(q)),
    );
  }, [query, category]);

  const grouped = CATEGORY_ORDER
    .map(cat => ({ cat, items: filtered.filter(m => m.category === cat) }))
    .filter(g => g.items.length > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <BookOpen size={22} className="text-blue-600" /> Slovník klíčových metrik
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Co jednotlivé metriky v reportingu znamenají, jak se počítají a jaké hodnoty jsou v segmentu běžné
        </p>
      </div>

      {/* Kontext */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-5 py-4 flex gap-3">
        <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm text-slate-600 space-y-1.5 leading-relaxed">
          <p>{SEGMENT_DESCRIPTION}</p>
          <p className="text-slate-500">
            <strong className="font-semibold text-slate-600">Hodnota Sardinerie</strong> u metrik = posledních 12 měsíců
            ({formatDate(start)} – {formatDate(end)}), CZ + SK přepočtené do Kč. Metriky zákazníků (LTV, míra opakovaného nákupu)
            jsou za celou historii. <strong className="font-semibold text-slate-600">Benchmarky jsou orientační</strong> rozpětí
            z praxe e-shopů s potravinami a delikatesami v CZ/SK, ne oficiální statistika — štítek „ke sledování“ neznamená chybu,
            jen že hodnota leží mimo běžné pásmo.
          </p>
        </div>
      </div>

      {/* Filtry */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <label className="relative md:w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Hledat metriku…"
            className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </label>
        <div className="flex flex-wrap gap-1.5">
          {(['all', ...CATEGORY_ORDER] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                category === cat
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {cat === 'all' ? 'Vše' : CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      {/* Sekce */}
      {grouped.length === 0 && (
        <p className="text-sm text-slate-400">Žádná metrika neodpovídá hledání.</p>
      )}
      {grouped.map(({ cat, items }) => (
        <section key={cat}>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{CATEGORY_LABELS[cat]}</h2>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {items.map(m => (
              <MetricCard key={m.id} metric={m} value={m.current ? values[m.current.key] : null} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
