'use client';

import { useEffect, useState } from 'react';
import { useFilters } from '@/hooks/useFilters';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from 'recharts';
import { Monitor, Smartphone, Tablet, TrendingUp, Users, MousePointerClick, Clock } from 'lucide-react';

interface DailyRow {
  date: string;
  sessions: number;
  users: number;
  conversions: number;
  bounceRate: number;
  avgDuration: number;
}

interface SourceRow {
  source: string;
  medium: string;
  sessions: number;
  conversions: number;
  users: number;
}

interface DeviceRow {
  device: string;
  sessions: number;
  users: number;
}

interface GA4Data {
  daily: DailyRow[];
  sources: SourceRow[];
  devices: DeviceRow[];
}

const DEVICE_COLORS: Record<string, string> = {
  desktop: '#3b82f6',
  mobile:  '#10b981',
  tablet:  '#f59e0b',
};

const DEVICE_ICONS: Record<string, React.ReactNode> = {
  desktop: <Monitor size={14} />,
  mobile:  <Smartphone size={14} />,
  tablet:  <Tablet size={14} />,
};

function fmtDate(d: string) {
  // d = "20260319"
  return `${d.slice(6, 8)}.${d.slice(4, 6)}.${d.slice(0, 4)}`;
}

function fmtDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function KpiCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex items-start gap-3">
      <div className="p-2 bg-blue-50 rounded-xl text-blue-600">{icon}</div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-xl font-bold text-slate-900">{value}</p>
        {sub && <p className="text-xs text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { filters, getDateRange } = useFilters();
  const [data, setData]     = useState<GA4Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const { start, end } = getDateRange(filters);
    const fmt = (d: Date) => d.toISOString().split('T')[0];

    fetch(`/api/analytics?from=${fmt(start)}&to=${fmt(end)}`)
      .then(r => r.json())
      .then(json => {
        if (json.error) { setError(json.error); setData(null); }
        else setData(json);
      })
      .catch(() => setError('Nepodařilo se načíst data'))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.timePeriod]);

  const totals = data?.daily.reduce(
    (acc, r) => ({
      sessions:    acc.sessions    + r.sessions,
      users:       acc.users       + r.users,
      conversions: acc.conversions + r.conversions,
    }),
    { sessions: 0, users: 0, conversions: 0 }
  ) ?? { sessions: 0, users: 0, conversions: 0 };

  const avgBounce = data?.daily.length
    ? Math.round(data.daily.reduce((s, r) => s + r.bounceRate, 0) / data.daily.length)
    : 0;

  const avgDur = data?.daily.length
    ? Math.round(data.daily.reduce((s, r) => s + r.avgDuration, 0) / data.daily.length)
    : 0;

  const chartData = data?.daily.map(r => ({ ...r, dateLabel: fmtDate(r.date) })) ?? [];

  const totalDeviceSessions = data?.devices.reduce((s, d) => s + d.sessions, 0) ?? 1;

  return (
    <div className="space-y-6 py-2">
      <h1 className="text-xl font-bold text-slate-900">Návštěvnost (GA4)</h1>

      {loading && (
        <div className="text-slate-400 text-sm">Načítám data z Google Analytics…</div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-sm">
          Chyba: {error}
        </div>
      )}

      {data && (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <KpiCard icon={<TrendingUp size={16} />}     label="Sessions"       value={totals.sessions.toLocaleString('cs-CZ')} />
            <KpiCard icon={<Users size={16} />}          label="Unikátní uživatelé" value={totals.users.toLocaleString('cs-CZ')} />
            <KpiCard icon={<MousePointerClick size={16}/>} label="Konverze"     value={totals.conversions.toLocaleString('cs-CZ')} />
            <KpiCard icon={<TrendingUp size={16} />}     label="Bounce rate"    value={`${avgBounce} %`} sub="průměr za období" />
            <KpiCard icon={<Clock size={16} />}          label="Prům. délka"    value={fmtDuration(avgDur)} sub="min:sec" />
          </div>

          {/* Sessions over time */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Sessions v čase</h2>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="dateLabel" tick={{ fontSize: 10, fill: '#94a3b8' }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="sessions" name="Sessions" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="users"    name="Uživatelé" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Bounce + conversions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <h2 className="text-sm font-semibold text-slate-700 mb-4">Bounce rate (%)</h2>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="dateLabel" tick={{ fontSize: 10, fill: '#94a3b8' }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} unit="%" domain={[0, 100]} />
                  <Tooltip formatter={(v: unknown) => [`${v} %`, 'Bounce rate']} />
                  <Line type="monotone" dataKey="bounceRate" name="Bounce rate" stroke="#f59e0b" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <h2 className="text-sm font-semibold text-slate-700 mb-4">Konverze v čase</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="dateLabel" tick={{ fontSize: 10, fill: '#94a3b8' }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip />
                  <Bar dataKey="conversions" name="Konverze" fill="#6366f1" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sources + Devices */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Traffic sources */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <h2 className="text-sm font-semibold text-slate-700 mb-4">Zdroje návštěvnosti</h2>
              <div className="space-y-2">
                {data.sources.slice(0, 10).map((s, i) => {
                  const total = data.sources.reduce((acc, x) => acc + x.sessions, 0) || 1;
                  const pct = Math.round((s.sessions / total) * 100);
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between text-xs text-slate-600 mb-0.5">
                        <span className="truncate max-w-[200px]">{s.source} / {s.medium}</span>
                        <span className="font-medium ml-2">{s.sessions.toLocaleString('cs-CZ')} sessions ({pct} %)</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full">
                        <div className="h-1.5 bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Devices */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <h2 className="text-sm font-semibold text-slate-700 mb-4">Zařízení</h2>
              <div className="flex items-center gap-6">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={data.devices} dataKey="sessions" nameKey="device" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                      {data.devices.map((d, i) => (
                        <Cell key={i} fill={DEVICE_COLORS[d.device] ?? '#cbd5e1'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: unknown) => [Number(v).toLocaleString('cs-CZ'), 'Sessions']} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3 flex-1">
                  {data.devices.map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-slate-600">
                        <span style={{ color: DEVICE_COLORS[d.device] ?? '#94a3b8' }}>{DEVICE_ICONS[d.device] ?? null}</span>
                        <span className="capitalize">{d.device}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-slate-800">{Math.round((d.sessions / totalDeviceSessions) * 100)} %</span>
                        <span className="text-xs text-slate-400 ml-1">({d.sessions.toLocaleString('cs-CZ')})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
