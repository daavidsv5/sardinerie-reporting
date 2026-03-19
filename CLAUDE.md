# CLAUDE.md

Tento soubor slouží jako stručný návod pro Claude Code (claude.ai/code) při práci s tímto repozitářem.

## Příkazy

```bash
npm install      # Nainstaluje závislosti
npm run dev      # Spustí dev server (Next.js, hot reload)
npm run build    # Produkční build — často odhalí TS chyby
npm run start    # Spustí produkční build

node scripts/updateData.js   # Ruční refresh reálných dat z Google Sheets
```

V projektu nejsou nakonfigurované linter ani testy.

## Architektura

Next.js 16 (App Router). Řada stránek je jako client components (`'use client'`), protože závisí na stavu filtrů z React Contextu.

### Tok dat

```
Google Sheets (CSV)
       ↓  scripts/updateData.js  (runs daily at 06:00 via Windows Task Scheduler)
data/realDataCZ.ts   data/realDataSK.ts   (auto-generated, do not edit manually)
       ↓
data/mockGenerator.ts  →  export const mockData: DailyRecord[]
       ↓
hooks/useDashboardData.ts  (filters + aggregates → KpiData, chartData, YoY)
       ↓
app/(dashboard|orders|marketing)/page.tsx
```

### Práce s měnami

- CZ data jsou v **CZK**. SK data jsou v **EUR** (Slovensko používá EUR; náklady jsou také v EUR).
- `getDisplayCurrency(countries)` v `data/types.ts`: vrací `'EUR'` pouze tehdy, když je vybrané jen SK; jinak `'CZK'`.
- Při kombinaci CZ+SK se SK hodnoty násobí `EUR_TO_CZK = 25` uvnitř `useDashboardData` a `getMarketingSourceData` před agregací.
- Všechny money formattery berou `currency: 'CZK' | 'EUR'` — předávej hodnotu z `useDashboardData().currency`.

### Meziroční srovnání (YoY)

- **CZ nemá YoY** — e-shop běží od května 2025. Neexistují mock/historická CZ data. `hasPrevData` z `useDashboardData` bude `false` kdykoliv je ve filtru CZ a nejsou dostupné záznamy z předchozího roku.
- **SK má YoY** — reálná data od března 2024; mock SK data (v EUR, seeded RNG) doplňují leden–únor 2024 jako základ pro YoY.
- `hasPrevData` je potřeba předat do `KpiCard`, `RevenueOrdersChart` a `CostPnoChart`, aby šlo podmíněně skrýt YoY badge a “minulý rok” řady v grafech.

### Klíčové soubory

| File | Purpose |
|---|---|
| `data/types.ts` | `DailyRecord`, `KpiData`, `FilterState`, `EUR_TO_CZK`, `getDisplayCurrency` |
| `data/mockGenerator.ts` | Kombinuje reálná + mock data do `mockData[]`; `getMarketingSourceData()` pro rozpad zdrojů |
| `data/realDataCZ.ts` | Auto-generovaná reálná CZ data (CZK) |
| `data/realDataSK.ts` | Auto-generovaná reálná SK data (EUR) |
| `hooks/useFilters.ts` | `FiltersProvider` + `useFilters()` + `getDateRange()` (defaulty pro datum a stav filtrů) |
| `hooks/useDashboardData.ts` | Filtruje `mockData` podle data+země, normalizuje měny, počítá KPI + série do grafů |
| `scripts/updateData.js` | Čistý Node.js (bez deps) — stáhne 4 CSV z Google Sheets a přegeneruje `realDataCZ.ts` + `realDataSK.ts` |

### Konstanta `TODAY` (defaulty pro datum)

`hooks/useFilters.ts` používá aktuální datum dynamicky:
```ts
const TODAY = new Date();
```

Pokud řešíš funkce závislé na čase (např. “posledních 7 dní”), drž logiku dat na jednom místě (`hooks/useFilters.ts` / `getDateRange()`) a počítej s hraničními efekty časových pásem při groupingu po dnech.

### Vzorec PNO

`PNO = Marketingové investice / Tržby bez DPH × 100`
(marketingové náklady dělené tržbami bez DPH; v jmenovateli není DPH)
