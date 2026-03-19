'use client';

import { useFilters, getDateRange } from '@/hooks/useFilters';
import { useDashboardData } from '@/hooks/useDashboardData';
import { mockData } from '@/data/mockGenerator';
import KpiCard from '@/components/kpi/KpiCard';
import CountryDistribution from '@/components/tables/CountryDistribution';
import DailyTable from '@/components/tables/DailyTable';
import { formatCurrency, formatNumber, formatPercent, formatDate } from '@/lib/formatters';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatShortDate } from '@/lib/formatters';

function formatYAxis(v: number, cur: 'CZK' | 'EUR' = 'CZK') {
  const s = cur === 'EUR' ? '€' : 'Kč';
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M ${s}`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}k ${s}`;
  return `${v} ${s}`;
}

export default function OrdersPage() {
  const { filters, eurToCzk } = useFilters();
  const { kpi, yoy, chartData, currentData, currency, hasPrevData } = useDashboardData(filters, mockData, eurToCzk);

  const { start, end } = getDateRange(filters);
  const subtitle = `${formatDate(start)} – ${formatDate(end)}`;

  const dailyRevenue = chartData.map((d) => d.revenue);
  const dailyOrders = chartData.map((d) => d.orders);
  const dailyAov = chartData.map((d) => (d.orders > 0 ? d.revenue / d.orders : 0));

  const fc = (v: number) => formatCurrency(v, currency);

  const kpiCards = [
    { title: 'Tržby s DPH',     value: fc(kpi.revenuevat), yoy: yoy.revenuevat, sparklineData: dailyRevenue },
    { title: 'Tržby bez DPH',   value: fc(kpi.revenue),    yoy: yoy.revenue,    sparklineData: dailyRevenue },
    { title: 'Počet objednávek', value: formatNumber(kpi.orders), yoy: yoy.orders, sparklineData: dailyOrders },
    { title: 'AOV',              value: fc(kpi.aov),        yoy: yoy.aov,        sparklineData: dailyAov },
    { title: 'Storna',           value: formatNumber(kpi.ordersCancelled), yoy: yoy.ordersCancelled, sparklineData: [], invertColors: true },
    { title: 'Podíl storen',     value: formatPercent(kpi.cancelRate),     yoy: yoy.cancelRate,      sparklineData: [], invertColors: true },
  ].map(c => ({ ...c, hasPrevData }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Objednávky</h1>
        <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {kpiCards.map((card) => (
          <KpiCard key={card.title} {...card} />
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Tržby a objednávky</h2>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tickFormatter={formatShortDate}
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              interval="preserveStartEnd"
            />
            <YAxis
              yAxisId="left"
              tickFormatter={(v) => formatYAxis(v, currency)}
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              width={65}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              width={40}
            />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, name: any) =>
                name === 'Objednávky' ? [value, name] : [fc(Number(value)), name]
              }
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar yAxisId="left" dataKey="revenue" name="Tržby bez DPH" fill="#3949AB" barSize={8} />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="orders"
              name="Objednávky"
              stroke="#e53935"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Tables */}
      <div className={`grid grid-cols-1 ${filters.countries.length > 1 ? 'xl:grid-cols-2' : ''} gap-6`}>
        <DailyTable data={currentData} eurToCzk={eurToCzk} />
        {filters.countries.length > 1 && (
          <CountryDistribution data={currentData} eurToCzk={eurToCzk} />
        )}
      </div>
    </div>
  );
}
