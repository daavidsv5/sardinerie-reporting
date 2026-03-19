'use client';

import { useFilters, getDateRange } from '@/hooks/useFilters';
import { useDashboardData } from '@/hooks/useDashboardData';
import { mockData, getMarketingSourceData, getDailyMarketingData } from '@/data/mockGenerator';
import KpiCard from '@/components/kpi/KpiCard';
import CostPnoChart from '@/components/charts/CostPnoChart';
import { formatCurrency, formatPercent, formatNumber, formatDate } from '@/lib/formatters';

function pnoColor(pno: number): string {
  if (pno < 15) return 'bg-green-100 text-green-800';
  if (pno < 25) return 'bg-yellow-100 text-yellow-800';
  if (pno < 35) return 'bg-orange-100 text-orange-800';
  return 'bg-red-100 text-red-800';
}

export default function MarketingPage() {
  const { filters, eurToCzk } = useFilters();
  const { kpi, yoy, chartData, currentData, currency, hasPrevData } = useDashboardData(filters, mockData, eurToCzk);
  const fc = (v: number) => formatCurrency(v, currency);

  const { start, end } = getDateRange(filters);
  const subtitle = `${formatDate(start)} – ${formatDate(end)}`;

  const dailyCost = chartData.map((d) => d.cost);
  const dailyPno = chartData.map((d) => d.pno);
  const dailyCpa = chartData.map((d) => (d.orders > 0 ? d.cost / d.orders : 0));
  const dailyRevenue = chartData.map((d) => d.revenue);

  const kpiCards = [
    { title: 'Marketingové investice', value: fc(kpi.cost),    yoy: yoy.cost,    sparklineData: dailyCost,    invertColors: true },
    { title: 'PNO (%)',                value: formatPercent(kpi.pno), yoy: yoy.pno, sparklineData: dailyPno, invertColors: true },
    { title: 'Cena za objednávku',     value: fc(kpi.cpa),    yoy: yoy.cpa,     sparklineData: dailyCpa,     invertColors: true },
    { title: 'Tržby bez DPH',          value: fc(kpi.revenue),yoy: yoy.revenue, sparklineData: dailyRevenue },
  ].map(c => ({ ...c, hasPrevData }));

  // Daily marketing table with channel breakdown
  const { start: sDaily, end: eDaily } = getDateRange(filters);
  const dailyRows = getDailyMarketingData(
    sDaily.toISOString().split('T')[0],
    eDaily.toISOString().split('T')[0],
    filters.countries,
    eurToCzk
  ).slice(0, 30).map(r => ({
    ...r,
    pno: r.revenue > 0 ? (r.cost / r.revenue) * 100 : 0,
    cpa: r.orders > 0 ? r.cost / r.orders : 0,
    pno_fb: r.revenue > 0 ? (r.cost_facebook / r.revenue) * 100 : 0,
    pno_g:  r.revenue > 0 ? (r.cost_google   / r.revenue) * 100 : 0,
  }));

  // Source breakdown — use real data with date range + country context
  const sourceData = getMarketingSourceData(
    sDaily.toISOString().split('T')[0],
    eDaily.toISOString().split('T')[0],
    filters.countries,
    eurToCzk
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Marketingové investice</h1>
        <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <KpiCard key={card.title} {...card} />
        ))}
      </div>

      {/* Chart */}
      <CostPnoChart data={chartData} currency={currency} hasPrevData={hasPrevData} />

      {/* Tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Daily marketing table with channel breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-800">Přehled po dnech</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-blue-900 border-b border-blue-800">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">Datum</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wide">Náklady celkem</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wide">Facebook Ads</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wide">Google Ads</th>
                </tr>
              </thead>
              <tbody>
                {dailyRows.map((r, idx) => (
                  <tr key={r.date} className={`border-b border-gray-50 hover:bg-blue-50/30 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                    <td className="px-4 py-2.5 text-gray-700 font-medium whitespace-nowrap">
                      {formatDate(new Date(r.date + 'T12:00:00'))}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-800 font-semibold">{fc(r.cost)}</td>
                    <td className="px-4 py-2.5 text-right text-blue-700">{fc(r.cost_facebook)}</td>
                    <td className="px-4 py-2.5 text-right text-green-700">{fc(r.cost_google)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Source breakdown table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-800">Přehled podle zdroje</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-blue-900 border-b border-blue-800">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">Zdroj</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wide">Náklady</th>
                </tr>
              </thead>
              <tbody>
                {sourceData.map((r, idx) => (
                  <tr key={r.source} className={`border-b border-gray-50 hover:bg-blue-50/30 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                    <td className="px-4 py-2.5 text-gray-800 font-semibold">{r.source}</td>
                    <td className="px-4 py-2.5 text-right text-gray-700">{formatCurrency(r.cost, r.currency)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-blue-50 border-t-2 border-blue-200 font-semibold">
                  <td className="px-4 py-3 text-blue-600 text-xs">Celkem</td>
                  <td className="px-4 py-3 text-right">{fc(sourceData.reduce((s, r) => s + r.cost, 0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
