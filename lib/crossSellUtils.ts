import { CrossSellOrderRecord } from '@/data/crossSellDataCZ';

export interface CrossSellPair {
  productA: string;
  productB: string;
  count: number;   // number of orders containing both products
  pct: number;     // % of total orders in the period
}

export interface CrossSellData {
  totalOrders: number;
  multiItemOrders: number;
  pairs: CrossSellPair[];
}

/** Spočítá top N nejčastějších párů produktů z per-order dat za zvolené období */
export function computeCrossSellPairs(orders: CrossSellOrderRecord[], topN = 100): CrossSellData {
  const pairCounts = new Map<string, number>();
  let multiItemOrders = 0;

  for (const order of orders) {
    const arr = order.products;
    if (arr.length < 2) continue;
    multiItemOrders++;

    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const key = `${arr[i]}|||${arr[j]}`;
        pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
      }
    }
  }

  const totalOrders = orders.length;
  const pairs = [...pairCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([key, count]) => {
      const sep = key.indexOf('|||');
      return {
        productA: key.slice(0, sep),
        productB: key.slice(sep + 3),
        count,
        pct: totalOrders > 0 ? Math.round((count / totalOrders) * 10000) / 100 : 0,
      };
    });

  return { totalOrders, multiItemOrders, pairs };
}
