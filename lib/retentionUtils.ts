import { CustomerRetentionRecord } from '@/data/retentionGenerator';

export interface RetentionKpis {
  totalCustomers: number;
  totalRevenue: number;       // s DPH
  avgOrderValue: number;      // s DPH
  repeatPurchaseRate: number; // % with >1 order
  avgDaysBetween: number;     // avg days between consecutive purchases (customers with >1 order)
  ltvPerCustomer: number;     // totalRevenue / totalCustomers
}

export interface YearCustomerMetrics {
  year: number;
  customers: number;
  newCustomers: number;
  returningCustomers: number;
  orders: number;
  avgOrderValue: number;
  avgFirstPurchase: number;
  avgRepeatPurchase: number;
  avgDaysBetween: number;
}

export interface YearRetentionMetrics {
  year: number;
  customers: number;
  rate1Plus: number;
  rate2Plus: number;
  rate3Plus: number;
}

export interface YearRevenueMetrics {
  year: number;
  totalRevenue: number;
  revShare1Plus: number;
  revShare2Plus: number;
  revShare3Plus: number;
}

/** Compute avg days between consecutive purchases for a customer with >1 order */
function avgDaysBetweenOrders(dates: string[]): number {
  if (dates.length < 2) return 0;
  let totalMs = 0;
  for (let i = 1; i < dates.length; i++) {
    totalMs += new Date(dates[i]).getTime() - new Date(dates[i - 1]).getTime();
  }
  return totalMs / (dates.length - 1) / 86400000;
}

export function computeRetentionKpis(data: CustomerRetentionRecord[]): RetentionKpis {
  const totalCustomers = data.length;
  let totalRevenue = 0;
  let totalOrders = 0;
  let repeatCount = 0;
  let daysBetweenSum = 0;
  let daysBetweenCount = 0;

  for (const c of data) {
    const orderCount = c.dates.length;
    totalOrders += orderCount;
    for (const rv of c.revsVat) totalRevenue += rv;

    if (orderCount > 1) {
      repeatCount++;
      daysBetweenSum += avgDaysBetweenOrders(c.dates);
      daysBetweenCount++;
    }
  }

  return {
    totalCustomers,
    totalRevenue,
    avgOrderValue:       totalOrders > 0 ? totalRevenue / totalOrders : 0,
    repeatPurchaseRate:  totalCustomers > 0 ? (repeatCount / totalCustomers) * 100 : 0,
    avgDaysBetween:      daysBetweenCount > 0 ? daysBetweenSum / daysBetweenCount : 0,
    ltvPerCustomer:      totalCustomers > 0 ? totalRevenue / totalCustomers : 0,
  };
}

export function computeYearCustomerMetrics(data: CustomerRetentionRecord[]): YearCustomerMetrics[] {
  // Determine all years present
  const yearsSet = new Set<number>();
  for (const c of data) {
    for (const d of c.dates) yearsSet.add(parseInt(d.substring(0, 4)));
  }
  const years = [...yearsSet].sort();

  // Pre-compute per-customer total order count for retention filtering
  const totalOrders = data.map(c => c.dates.length);

  return years.map(year => {
    const yearStr = year.toString();

    let customers = 0;
    let newCustomers = 0;
    let returningCustomers = 0;
    let orders = 0;
    let revenueSum = 0;

    let firstPurchaseSum = 0;
    let firstPurchaseCount = 0;
    let repeatPurchaseSum = 0;
    let repeatPurchaseCount = 0;

    let daysBetweenSum = 0;
    let daysBetweenCount = 0;

    for (let ci = 0; ci < data.length; ci++) {
      const c = data[ci];
      // Find indices of orders in this year
      const inYearIndices: number[] = [];
      for (let i = 0; i < c.dates.length; i++) {
        if (c.dates[i].startsWith(yearStr)) inYearIndices.push(i);
      }
      if (inYearIndices.length === 0) continue;

      customers++;

      const isNew = c.dates[0].startsWith(yearStr);
      const hasOrdersBefore = c.dates.some(d => !d.startsWith(yearStr) && d < yearStr + '-01-01');

      if (isNew) {
        newCustomers++;
        // avg first purchase: revsVat[0] for customers whose first order was this year
        firstPurchaseSum += c.revsVat[0];
        firstPurchaseCount++;
      }
      if (hasOrdersBefore) {
        returningCustomers++;
      }

      for (const idx of inYearIndices) {
        orders++;
        revenueSum += c.revsVat[idx];

        // Repeat purchase = non-first orders from returning customers (orders in this year where customer has prior orders)
        if (hasOrdersBefore) {
          repeatPurchaseSum += c.revsVat[idx];
          repeatPurchaseCount++;
        }
      }

      // avgDaysBetween: for customers active in this year AND with >1 order total
      if (totalOrders[ci] > 1) {
        daysBetweenSum += avgDaysBetweenOrders(c.dates);
        daysBetweenCount++;
      }
    }

    return {
      year,
      customers,
      newCustomers,
      returningCustomers,
      orders,
      avgOrderValue:      orders > 0 ? revenueSum / orders : 0,
      avgFirstPurchase:   firstPurchaseCount > 0 ? firstPurchaseSum / firstPurchaseCount : 0,
      avgRepeatPurchase:  repeatPurchaseCount > 0 ? repeatPurchaseSum / repeatPurchaseCount : 0,
      avgDaysBetween:     daysBetweenCount > 0 ? daysBetweenSum / daysBetweenCount : 0,
    };
  });
}

export function computeYearRetentionMetrics(data: CustomerRetentionRecord[]): YearRetentionMetrics[] {
  const yearsSet = new Set<number>();
  for (const c of data) {
    for (const d of c.dates) yearsSet.add(parseInt(d.substring(0, 4)));
  }
  const years = [...yearsSet].sort();

  return years.map(year => {
    const yearStr = year.toString();
    let customers = 0;
    let count1Plus = 0;
    let count2Plus = 0;
    let count3Plus = 0;

    for (const c of data) {
      const activeInYear = c.dates.some(d => d.startsWith(yearStr));
      if (!activeInYear) continue;

      customers++;
      const totalOrd = c.dates.length;
      if (totalOrd > 1) count1Plus++;
      if (totalOrd > 2) count2Plus++;
      if (totalOrd > 3) count3Plus++;
    }

    return {
      year,
      customers,
      rate1Plus: customers > 0 ? (count1Plus / customers) * 100 : 0,
      rate2Plus: customers > 0 ? (count2Plus / customers) * 100 : 0,
      rate3Plus: customers > 0 ? (count3Plus / customers) * 100 : 0,
    };
  });
}

export function computeYearRevenueMetrics(data: CustomerRetentionRecord[]): YearRevenueMetrics[] {
  const yearsSet = new Set<number>();
  for (const c of data) {
    for (const d of c.dates) yearsSet.add(parseInt(d.substring(0, 4)));
  }
  const years = [...yearsSet].sort();

  // Pre-compute total order count per customer for efficiency
  const totalOrderCount = data.map(c => c.dates.length);

  return years.map(year => {
    const yearStr = year.toString();
    let totalRevenue = 0;
    let rev1Plus = 0;
    let rev2Plus = 0;
    let rev3Plus = 0;

    for (let ci = 0; ci < data.length; ci++) {
      const c = data[ci];
      const tc = totalOrderCount[ci];

      for (let i = 0; i < c.dates.length; i++) {
        if (!c.dates[i].startsWith(yearStr)) continue;
        const rv = c.revsVat[i];
        totalRevenue += rv;
        if (tc > 1) rev1Plus += rv;
        if (tc > 2) rev2Plus += rv;
        if (tc > 3) rev3Plus += rv;
      }
    }

    return {
      year,
      totalRevenue,
      revShare1Plus: totalRevenue > 0 ? (rev1Plus / totalRevenue) * 100 : 0,
      revShare2Plus: totalRevenue > 0 ? (rev2Plus / totalRevenue) * 100 : 0,
      revShare3Plus: totalRevenue > 0 ? (rev3Plus / totalRevenue) * 100 : 0,
    };
  });
}
