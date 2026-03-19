'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string;
  yoy: number;
  sparklineData?: number[];
  invertColors?: boolean;
  hasPrevData?: boolean;
}

export default function KpiCard({
  title,
  value,
  yoy,
  invertColors = false,
  hasPrevData = true,
}: KpiCardProps) {
  const isPositive = invertColors ? yoy < 0 : yoy > 0;
  const isNeutral  = yoy === 0;

  return (
    <div className="bg-white rounded-2xl p-5 border-2 border-blue-800 shadow-sm flex flex-col gap-3">
      {/* Top row: title + YoY badge */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider leading-snug">
          {title}
        </p>
        {hasPrevData && !isNeutral && (
          <span
            className={`inline-flex items-center gap-1 text-sm md:text-[22px] font-bold px-2 md:px-3 py-1 rounded-lg flex-shrink-0 ${
              isPositive
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-rose-50 text-rose-500'
            }`}
          >
            {isPositive ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
            {yoy > 0 ? '+' : ''}{yoy.toFixed(1)}%
          </span>
        )}
      </div>

      {/* Value */}
      <p className="text-2xl md:text-4xl font-bold text-slate-800 leading-none">{value}</p>

      {/* Footer label */}
      <p className="text-[11px] text-slate-400">
        {!hasPrevData ? 'bez YoY srovnání' : 'vs. loňský rok'}
      </p>
    </div>
  );
}
