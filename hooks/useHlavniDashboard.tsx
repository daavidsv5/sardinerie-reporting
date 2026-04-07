'use client';

import React, { createContext, useContext, useState, useMemo } from 'react';
import { mockData } from '@/data/mockGenerator';

export type HlavniMarket = 'all' | 'cz' | 'sk';

interface HlavniDashCtx {
  market: HlavniMarket;
  setMarket: (m: HlavniMarket) => void;
  yearA: number;
  yearB: number;
  yearOptions: [number, number][];
  selectedPairIdx: number;
  setYearPairByIdx: (idx: number) => void;
}

const Ctx = createContext<HlavniDashCtx | null>(null);

function getAvailableYears(): number[] {
  const years = new Set<number>();
  for (const r of mockData) years.add(+r.date.slice(0, 4));
  return Array.from(years).sort((a, b) => b - a);
}

export function HlavniDashboardProvider({ children }: { children: React.ReactNode }) {
  const availableYears = useMemo(() => getAvailableYears(), []);

  const yearOptions: [number, number][] = useMemo(() => {
    const opts: [number, number][] = [];
    for (let i = 0; i < availableYears.length - 1; i++) {
      opts.push([availableYears[i], availableYears[i + 1]]);
    }
    return opts;
  }, [availableYears]);

  const defaultA = availableYears[0] ?? new Date().getFullYear();
  const defaultB = availableYears[1] ?? defaultA - 1;

  const [market, setMarket] = useState<HlavniMarket>('all');
  const [yearA, setYearA] = useState(defaultA);
  const [yearB, setYearB] = useState(defaultB);

  const selectedPairIdx = yearOptions.findIndex(([a, b]) => a === yearA && b === yearB);

  const setYearPairByIdx = (idx: number) => {
    const pair = yearOptions[idx];
    if (pair) { setYearA(pair[0]); setYearB(pair[1]); }
  };

  return (
    <Ctx.Provider value={{ market, setMarket, yearA, yearB, yearOptions, selectedPairIdx, setYearPairByIdx }}>
      {children}
    </Ctx.Provider>
  );
}

export function useHlavniDashboard(): HlavniDashCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useHlavniDashboard must be used within HlavniDashboardProvider');
  return ctx;
}
