'use client';

import { useState, useMemo } from 'react';
import { Users, DollarSign, ShoppingCart, RefreshCw, Calendar, TrendingUp } from 'lucide-react';
import { retentionDataCZ } from '@/data/retentionDataCZ';
import { retentionDataSK } from '@/data/retentionDataSK';
import {
  computeRetentionKpis,
  computeYearCustomerMetrics,
  computeYearRetentionMetrics,
  computeYearRevenueMetrics,
} from '@/lib/retentionUtils';
import { formatCurrency, formatPercent, formatNumber } from '@/lib/formatters';

type Tab = 'cz' | 'sk';

function StatCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border-2 border-blue-800 p-4 flex items-start justify-between">
      <div className="min-w-0 flex-1 pr-3">
        <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">{title}</p>
        <p className="text-2xl font-bold text-slate-800 leading-tight">{value}</p>
      </div>
      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 flex-shrink-0">
        {icon}
      </div>
    </div>
  );
}

function TableCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        {children}
      </div>
    </div>
  );
}

const thClass = 'px-4 py-3 text-[11px] font-semibold text-white uppercase tracking-wider whitespace-nowrap';
const tdClass = 'px-4 py-2.5 whitespace-nowrap';

export default function RetentionPage() {
  const [tab, setTab] = useState<Tab>('cz');

  const data = tab === 'cz' ? retentionDataCZ : retentionDataSK;
  const currency = tab === 'cz' ? 'CZK' : 'EUR';
  const fc = (v: number) => formatCurrency(v, currency);
  const fp = (v: number) => formatPercent(v, 1);

  const kpis = useMemo(() => computeRetentionKpis(data), [data]);
  const yearCustomer  = useMemo(() => computeYearCustomerMetrics(data), [data]);
  const yearRetention = useMemo(() => computeYearRetentionMetrics(data), [data]);
  const yearRevenue   = useMemo(() => computeYearRevenueMetrics(data), [data]);

  // Totals for footer rows
  const totalOrders = yearCustomer.reduce((s, r) => s + r.orders, 0);
  const totalNewCustomers = yearCustomer.reduce((s, r) => s + r.newCustomers, 0);
  const totalReturning = yearCustomer.reduce((s, r) => s + r.returningCustomers, 0);
  const totalRevAll = yearRevenue.reduce((s, r) => s + r.totalRevenue, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Retenční analýza zákazníků</h1>
          <p className="text-sm text-slate-500 mt-0.5">Analýza nákupního chování zákazníků</p>
        </div>

        {/* CZ / SK Tab switcher */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg self-start sm:self-auto">
          <button
            onClick={() => setTab('cz')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === 'cz'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-gray-500 hover:text-slate-600'
            }`}
          >
            <span>🇨🇿</span> CZ
          </button>
          <button
            onClick={() => setTab('sk')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === 'sk'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-gray-500 hover:text-slate-600'
            }`}
          >
            <span>🇸🇰</span> SK
          </button>
        </div>
      </div>

      {/* Summary line */}
      <p className="text-sm text-slate-500">
        <span className="font-semibold text-slate-700">{formatNumber(totalOrders)}</span> objednávek
        {' '}•{' '}
        <span className="font-semibold text-slate-700">{formatNumber(kpis.totalCustomers)}</span> zákazníků
      </p>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Celkem zákazníků"
          value={formatNumber(kpis.totalCustomers)}
          icon={<Users size={18} />}
        />
        <StatCard
          title="Celkový obrat"
          value={fc(kpis.totalRevenue)}
          icon={<DollarSign size={18} />}
        />
        <StatCard
          title="Ø objednávka"
          value={fc(kpis.avgOrderValue)}
          icon={<ShoppingCart size={18} />}
        />
        <StatCard
          title="Opakovaný nákup"
          value={fp(kpis.repeatPurchaseRate)}
          icon={<RefreshCw size={18} />}
        />
        <StatCard
          title="Ø dní mezi nákupy"
          value={`${Math.round(kpis.avgDaysBetween)} dní`}
          icon={<Calendar size={18} />}
        />
        <StatCard
          title="LTV / zákazník"
          value={fc(kpis.ltvPerCustomer)}
          icon={<TrendingUp size={18} />}
        />
      </div>

      {/* Zákaznické metriky */}
      <TableCard title="Zákaznické metriky">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-blue-900 border-b border-blue-800">
              <th className={`${thClass} text-left`}>Rok</th>
              <th className={`${thClass} text-right`}>Zákazníků</th>
              <th className={`${thClass} text-right`}>Nových</th>
              <th className={`${thClass} text-right`}>Stávajících</th>
              <th className={`${thClass} text-right`}>Objednávek</th>
              <th className={`${thClass} text-right`}>Ø objednávka</th>
              <th className={`${thClass} text-right`}>Ø 1. nákup</th>
              <th className={`${thClass} text-right`}>Ø opakovaný</th>
              <th className={`${thClass} text-right`}>Ø dní mezi nákupy</th>
            </tr>
          </thead>
          <tbody>
            {yearCustomer.map((r, idx) => (
              <tr
                key={r.year}
                className={`border-b border-gray-50 hover:bg-slate-50/70 transition-colors ${
                  idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                }`}
              >
                <td className={`${tdClass} font-semibold text-slate-600`}>{r.year}</td>
                <td className={`${tdClass} text-right text-slate-700`}>{formatNumber(r.customers)}</td>
                <td className={`${tdClass} text-right text-emerald-700 font-medium`}>{formatNumber(r.newCustomers)}</td>
                <td className={`${tdClass} text-right text-blue-700 font-medium`}>{formatNumber(r.returningCustomers)}</td>
                <td className={`${tdClass} text-right text-slate-600`}>{formatNumber(r.orders)}</td>
                <td className={`${tdClass} text-right text-slate-600`}>{fc(r.avgOrderValue)}</td>
                <td className={`${tdClass} text-right text-slate-600`}>{r.avgFirstPurchase > 0 ? fc(r.avgFirstPurchase) : '—'}</td>
                <td className={`${tdClass} text-right text-slate-600`}>{r.avgRepeatPurchase > 0 ? fc(r.avgRepeatPurchase) : '—'}</td>
                <td className={`${tdClass} text-right text-slate-600`}>{r.avgDaysBetween > 0 ? `${Math.round(r.avgDaysBetween)} dní` : '—'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-blue-50/60 border-t-2 border-blue-100 font-semibold">
              <td className={`${tdClass} text-blue-600 text-xs`}>Celkem</td>
              <td className={`${tdClass} text-right text-slate-800`}>{formatNumber(kpis.totalCustomers)}</td>
              <td className={`${tdClass} text-right text-emerald-700`}>{formatNumber(totalNewCustomers)}</td>
              <td className={`${tdClass} text-right text-blue-700`}>{formatNumber(totalReturning)}</td>
              <td className={`${tdClass} text-right text-slate-800`}>{formatNumber(totalOrders)}</td>
              <td className={`${tdClass} text-right text-slate-800`}>{fc(kpis.avgOrderValue)}</td>
              <td className={`${tdClass} text-right text-slate-600`}>—</td>
              <td className={`${tdClass} text-right text-slate-600`}>—</td>
              <td className={`${tdClass} text-right text-slate-800`}>{kpis.avgDaysBetween > 0 ? `${Math.round(kpis.avgDaysBetween)} dní` : '—'}</td>
            </tr>
          </tfoot>
        </table>
      </TableCard>

      {/* Retenční metriky */}
      <TableCard title="Retenční metriky (zákazníci)">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-blue-900 border-b border-blue-800">
              <th className={`${thClass} text-left`}>Rok</th>
              <th className={`${thClass} text-right`}>Zákazníků</th>
              <th className={`${thClass} text-right`}>&gt; 1 nákup</th>
              <th className={`${thClass} text-right`}>&gt; 2 nákupy</th>
              <th className={`${thClass} text-right`}>&gt; 3 nákupy</th>
            </tr>
          </thead>
          <tbody>
            {yearRetention.map((r, idx) => (
              <tr
                key={r.year}
                className={`border-b border-gray-50 hover:bg-slate-50/70 transition-colors ${
                  idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                }`}
              >
                <td className={`${tdClass} font-semibold text-slate-600`}>{r.year}</td>
                <td className={`${tdClass} text-right text-slate-700`}>{formatNumber(r.customers)}</td>
                <td className={`${tdClass} text-right`}>
                  <span className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                    {fp(r.rate1Plus)}
                  </span>
                </td>
                <td className={`${tdClass} text-right`}>
                  <span className="inline-block bg-indigo-100 text-indigo-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                    {fp(r.rate2Plus)}
                  </span>
                </td>
                <td className={`${tdClass} text-right`}>
                  <span className="inline-block bg-purple-100 text-purple-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                    {fp(r.rate3Plus)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-blue-50/60 border-t-2 border-blue-100 font-semibold">
              <td className={`${tdClass} text-blue-600 text-xs`}>Celkem</td>
              <td className={`${tdClass} text-right text-slate-800`}>{formatNumber(kpis.totalCustomers)}</td>
              <td className={`${tdClass} text-right`}>
                <span className="inline-block bg-blue-200 text-blue-900 text-xs font-bold px-2 py-0.5 rounded-full">
                  {fp(kpis.repeatPurchaseRate)}
                </span>
              </td>
              <td className={`${tdClass} text-right text-slate-600`}>—</td>
              <td className={`${tdClass} text-right text-slate-600`}>—</td>
            </tr>
          </tfoot>
        </table>
      </TableCard>

      {/* Obratové metriky */}
      <TableCard title="Obratové metriky">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-blue-900 border-b border-blue-800">
              <th className={`${thClass} text-left`}>Rok</th>
              <th className={`${thClass} text-right`}>Celkový obrat</th>
              <th className={`${thClass} text-right`}>Obrat &gt; 1 nákup</th>
              <th className={`${thClass} text-right`}>Obrat &gt; 2 nákupy</th>
              <th className={`${thClass} text-right`}>Obrat &gt; 3 nákupy</th>
            </tr>
          </thead>
          <tbody>
            {yearRevenue.map((r, idx) => (
              <tr
                key={r.year}
                className={`border-b border-gray-50 hover:bg-slate-50/70 transition-colors ${
                  idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                }`}
              >
                <td className={`${tdClass} font-semibold text-slate-600`}>{r.year}</td>
                <td className={`${tdClass} text-right text-slate-800 font-medium`}>{fc(r.totalRevenue)}</td>
                <td className={`${tdClass} text-right`}>
                  <span className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                    {fp(r.revShare1Plus)}
                  </span>
                </td>
                <td className={`${tdClass} text-right`}>
                  <span className="inline-block bg-indigo-100 text-indigo-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                    {fp(r.revShare2Plus)}
                  </span>
                </td>
                <td className={`${tdClass} text-right`}>
                  <span className="inline-block bg-purple-100 text-purple-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                    {fp(r.revShare3Plus)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-blue-50/60 border-t-2 border-blue-100 font-semibold">
              <td className={`${tdClass} text-blue-600 text-xs`}>Celkem</td>
              <td className={`${tdClass} text-right text-slate-800`}>{fc(totalRevAll)}</td>
              <td className={`${tdClass} text-right text-slate-600`}>—</td>
              <td className={`${tdClass} text-right text-slate-600`}>—</td>
              <td className={`${tdClass} text-right text-slate-600`}>—</td>
            </tr>
          </tfoot>
        </table>
      </TableCard>
    </div>
  );
}
