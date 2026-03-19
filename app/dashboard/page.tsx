'use client';

import { useFilters, getDateRange } from '@/hooks/useFilters';
import { useDashboardData } from '@/hooks/useDashboardData';
import { mockData } from '@/data/mockGenerator';
import KpiCard from '@/components/kpi/KpiCard';
import RevenueOrdersChart from '@/components/charts/RevenueOrdersChart';
import CostPnoChart from '@/components/charts/CostPnoChart';
import DailyTable from '@/components/tables/DailyTable';
import { formatCurrency, formatPercent, formatNumber, formatDate } from '@/lib/formatters';

const periodTitles: Record<string, string> = {
  current_year: 'tento rok',
  current_month: 'tento měsíc',
  last_14_days: 'posledních 14 dní',
  custom: 'vlastní období',
};

export default function DashboardPage() {
  const { filters, eurToCzk } = useFilters();
  const { kpi, prevKpi: _prevKpi, yoy, chartData, currentData, currency, hasPrevData } = useDashboardData(filters, mockData, eurToCzk);

  const { start, end } = getDateRange(filters);
  const title = `KPI – ${periodTitles[filters.timePeriod] ?? 'aktuální období'} (YoY)`;
  const subtitle = `${formatDate(start)} – ${formatDate(end)}`;

  // Sparkline: daily revenue series for current period
  const dailyRevenue = chartData.map((d) => d.revenue);
  const dailyOrders = chartData.map((d) => d.orders);
  const dailyCost = chartData.map((d) => d.cost);
  const dailyPno = chartData.map((d) => d.pno);
  const dailyAov = chartData.map((d) => (d.orders > 0 ? d.revenue / d.orders : 0));
  const dailyCpa = chartData.map((d) => (d.orders > 0 ? d.cost / d.orders : 0));

  const fc = (v: number) => formatCurrency(v, currency);

  const kpiCards = [
    { title: 'Tržby s DPH',            value: fc(kpi.revenuevat), yoy: yoy.revenuevat, sparklineData: dailyRevenue },
    { title: 'Tržby bez DPH',          value: fc(kpi.revenue),    yoy: yoy.revenue,    sparklineData: dailyRevenue },
    { title: 'Počet objednávek',        value: formatNumber(kpi.orders), yoy: yoy.orders, sparklineData: dailyOrders },
    { title: 'AOV',                     value: fc(kpi.aov),        yoy: yoy.aov,        sparklineData: dailyAov },
    { title: 'Marketingové investice',  value: fc(kpi.cost),       yoy: yoy.cost,       sparklineData: dailyCost,  invertColors: true },
    { title: 'PNO (%)',                 value: formatPercent(kpi.pno), yoy: yoy.pno,    sparklineData: dailyPno,   invertColors: true },
    { title: 'Cena za objednávku',      value: fc(kpi.cpa),        yoy: yoy.cpa,        sparklineData: dailyCpa,   invertColors: true },
    { title: 'Storna',                  value: formatNumber(kpi.ordersCancelled), yoy: yoy.ordersCancelled, sparklineData: [], invertColors: true },
    { title: 'Podíl storen',            value: formatPercent(kpi.cancelRate),     yoy: yoy.cancelRate,      sparklineData: [], invertColors: true },
  ].map(c => ({ ...c, hasPrevData }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {kpiCards.map((card) => (
          <KpiCard key={card.title} {...card} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <RevenueOrdersChart data={chartData} currency={currency} hasPrevData={hasPrevData} />
        <CostPnoChart data={chartData} currency={currency} hasPrevData={hasPrevData} />
      </div>

      {/* Table */}
      <DailyTable data={currentData} eurToCzk={eurToCzk} />
    </div>
  );
}
