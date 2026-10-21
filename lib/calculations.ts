import {
  Purchase,
  Sale,
  Customer,
  SaleItem,
  Product,
  Category,
  DueCollection,
  KpiSummaryMetrics,
  RecentSaleView,
  LowStockItemView,
  TimeframePeriod,
  TimeframeMetrics,
  CombinedActivityEvent,
} from '@/types/executive';

/**
 * Helper to check if a date string falls within a timeframe period
 */
export function isDateInTimeframe(
  dateStr: string,
  period: TimeframePeriod,
  customStart?: string,
  customEnd?: string
): boolean {
  if (!dateStr) return false;
  const targetDate = new Date(dateStr);
  if (isNaN(targetDate.getTime())) return false;
  const now = new Date();

  if (period === 'overall') return true;

  if (period === 'today') {
    return (
      targetDate.getFullYear() === now.getFullYear() &&
      targetDate.getMonth() === now.getMonth() &&
      targetDate.getDate() === now.getDate()
    );
  }

  if (period === 'this_month') {
    return (
      targetDate.getFullYear() === now.getFullYear() &&
      targetDate.getMonth() === now.getMonth()
    );
  }

  if (period === 'last_month') {
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return (
      targetDate.getFullYear() === lastMonthDate.getFullYear() &&
      targetDate.getMonth() === lastMonthDate.getMonth()
    );
  }

  if (period === 'custom' && customStart && customEnd) {
    const start = new Date(customStart);
    start.setHours(0, 0, 0, 0);
    const end = new Date(customEnd);
    end.setHours(23, 59, 59, 999);
    return targetDate >= start && targetDate <= end;
  }

  return true;
}

/**
 * 1. Total Stock Investment: Sum of all purchases (quantity * unit_cost).
 */
export function calculateTotalStockInvestment(purchases: Purchase[]): number {
  return purchases.reduce((sum, p) => {
    const qty = Number(p.quantity) || 0;
    const unitCost = Number(p.unit_cost) || 0;
    return sum + (qty * unitCost);
  }, 0);
}

/**
 * 2. Total Sales Revenue: Sum of all sales (total_amount).
 */
export function calculateTotalSalesRevenue(sales: Sale[]): number {
  return sales.reduce((sum, s) => {
    return sum + (Number(s.total_amount) || 0);
  }, 0);
}

/**
 * 3. Total Outstanding Due: Sum of total_due across all customers.
 */
export function calculateTotalOutstandingDue(customers: Customer[]): number {
  return customers.reduce((sum, c) => {
    return sum + (Number(c.total_due) || 0);
  }, 0);
}

/**
 * 4. Realized Net Profit: Calculated based on sold items:
 * Sum of (sale_items.unit_price - sale_items.cost_price_snapshot) * sale_items.quantity.
 */
export function calculateRealizedNetProfit(saleItems: SaleItem[]): number {
  return saleItems.reduce((sum, item) => {
    const price = Number(item.unit_price) || 0;
    const cost = Number(item.cost_price_snapshot) || 0;
    const qty = Number(item.quantity) || 0;
    return sum + ((price - cost) * qty);
  }, 0);
}

/**
 * 5. Available Inventory Valuation: Current sum of (products.current_stock * products.cost_price).
 * Strictly non-negative: physical in-stock items and valuation cannot drop below 0.
 */
export function calculateAvailableInventoryValuation(products: Product[]): number {
  const total = products.reduce((sum, p) => {
    const stock = Math.max(0, Number(p.current_stock) || 0);
    const cost = Math.max(0, Number(p.cost_price) || 0);
    return sum + (stock * cost);
  }, 0);
  return Math.max(0, total);
}

/**
 * Calculate metrics for a specific Timeframe (Daily, Monthly, Overall, etc.)
 */
export function calculateMetricsForTimeframe(
  data: {
    purchases: Purchase[];
    sales: Sale[];
    customers: Customer[];
    saleItems: SaleItem[];
    products: Product[];
    dueCollections?: DueCollection[];
  },
  period: TimeframePeriod = 'overall',
  customStart?: string,
  customEnd?: string
): TimeframeMetrics {
  const filteredSales = data.sales.filter((s) =>
    isDateInTimeframe(s.sale_date, period, customStart, customEnd)
  );

  const filteredPurchases = data.purchases.filter((p) =>
    isDateInTimeframe(p.purchase_date, period, customStart, customEnd)
  );

  const filteredDueCollections = (data.dueCollections || []).filter((dc) =>
    isDateInTimeframe(dc.payment_date, period, customStart, customEnd)
  );

  // Filter sale items corresponding to filtered sales
  const filteredSaleIds = new Set(filteredSales.map((s) => s.id));
  const filteredSaleItems = data.saleItems.filter((si) => filteredSaleIds.has(si.sale_id));

  const totalSalesRevenue = Math.max(0, calculateTotalSalesRevenue(filteredSales));
  const totalStockInvestment = Math.max(0, calculateTotalStockInvestment(filteredPurchases));
  const totalOutstandingDue = Math.max(0, calculateTotalOutstandingDue(data.customers)); // Always current total due
  const realizedNetProfit = calculateRealizedNetProfit(filteredSaleItems);
  const availableInventoryValuation = Math.max(0, calculateAvailableInventoryValuation(data.products));
  const totalDueCollectionsAmount = filteredDueCollections.reduce((acc, c) => acc + (Number(c.amount_paid) || 0), 0);

  return {
    period,
    totalStockInvestment,
    totalSalesRevenue,
    totalOutstandingDue,
    realizedNetProfit,
    availableInventoryValuation,
    totalSalesCount: filteredSales.length,
    totalPurchasesCount: filteredPurchases.length,
    totalDueCollectionsAmount,
    startDate: customStart,
    endDate: customEnd,
  };
}

/**
 * Calculate all 5 Executive KPI Summary Metrics at once.
 */
export function calculateAllMetrics(data: {
  purchases: Purchase[];
  sales: Sale[];
  customers: Customer[];
  saleItems: SaleItem[];
  products: Product[];
}): KpiSummaryMetrics {
  return {
    totalStockInvestment: Math.max(0, calculateTotalStockInvestment(data.purchases)),
    totalSalesRevenue: Math.max(0, calculateTotalSalesRevenue(data.sales)),
    totalOutstandingDue: Math.max(0, calculateTotalOutstandingDue(data.customers)),
    realizedNetProfit: calculateRealizedNetProfit(data.saleItems),
    availableInventoryValuation: Math.max(0, calculateAvailableInventoryValuation(data.products)),
  };
}

/**
 * Get Combined Activity Feed (Day-by-Day Buy/Sell Log)
 */
export function getCombinedActivityFeed(data: {
  sales: Sale[];
  purchases: Purchase[];
  dueCollections: DueCollection[];
  customers: Customer[];
  products: Product[];
  saleItems: SaleItem[];
}): CombinedActivityEvent[] {
  const customerMap = new Map<number, Customer>();
  data.customers.forEach((c) => customerMap.set(c.id, c));

  const productMap = new Map<number, Product>();
  data.products.forEach((p) => productMap.set(p.id, p));

  const events: CombinedActivityEvent[] = [];

  // 1. Sales Events
  data.sales.forEach((s) => {
    const cust = s.customer_id ? customerMap.get(s.customer_id) : undefined;
    const items = data.saleItems.filter((si) => si.sale_id === s.id);
    
    // Calculate profit for this sale
    const saleProfit = items.reduce((sum, item) => {
      return sum + ((item.unit_price - item.cost_price_snapshot) * item.quantity);
    }, 0);

    const itemsSummary = items
      .map((i) => {
        const prod = productMap.get(i.product_id);
        const name = prod?.name || i.product_name || 'Product';
        return `${i.quantity} ${i.unit_type} ${name}`;
      })
      .join(', ');

    events.push({
      id: `sale-${s.id}`,
      type: 'sale',
      timestamp: new Date(s.sale_date).getTime(),
      dateStr: s.sale_date,
      ref: s.invoice_no,
      title: `Sale Invoice (${s.invoice_no})`,
      partyName: cust ? cust.name : 'General Customer (সাধারণ খদ্দের)',
      partyPhone: cust?.phone,
      itemsSummary: itemsSummary || 'Retail Items',
      totalAmount: s.total_amount,
      paidAmount: s.paid_amount,
      dueAmount: s.due_amount,
      profit: saleProfit,
    });
  });

  // 2. Purchase Events (Restock / Buying)
  data.purchases.forEach((p) => {
    const prod = productMap.get(p.product_id);
    const prodName = prod?.name || p.product_name || 'Product';
    events.push({
      id: `pur-${p.id}`,
      type: 'purchase',
      timestamp: new Date(p.purchase_date).getTime(),
      dateStr: p.purchase_date,
      ref: `PO-${p.id.toString().padStart(4, '0')}`,
      title: `Stock Purchase (${prodName})`,
      partyName: 'Supplier / Wholesale (মহাজন/পাইকারি)',
      itemsSummary: `Bought ${p.quantity} ${p.unit_type} @ ৳${p.unit_cost}/${p.unit_type}`,
      totalAmount: p.total_investment,
      paidAmount: p.total_investment,
      dueAmount: 0,
    });
  });

  // 3. Due Collections
  data.dueCollections.forEach((dc) => {
    const cust = customerMap.get(dc.customer_id);
    events.push({
      id: `dc-${dc.id}`,
      type: 'collection',
      timestamp: new Date(dc.payment_date).getTime(),
      dateStr: dc.payment_date,
      ref: `REC-${dc.id.toString().padStart(4, '0')}`,
      title: `Due Collection Receipt`,
      partyName: cust ? cust.name : 'Customer',
      partyPhone: cust?.phone,
      note: dc.note || 'Cash payment received for due',
      totalAmount: dc.amount_paid,
      paidAmount: dc.amount_paid,
      dueAmount: 0,
    });
  });

  // Sort descending (newest first)
  return events.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Get Last 5 Sales Invoices with date, customer name, total amount, paid amount, due amount, and status badge.
 */
export function getRecentSales(
  sales: Sale[],
  customers: Customer[],
  limit = 5
): RecentSaleView[] {
  const customerMap = new Map<number, Customer>();
  customers.forEach((c) => customerMap.set(c.id, c));

  const sortedSales = [...sales].sort(
    (a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime()
  );

  return sortedSales.slice(0, limit).map((s) => {
    const customer = s.customer_id ? customerMap.get(s.customer_id) : undefined;
    const total = Number(s.total_amount) || 0;
    const paid = Number(s.paid_amount) || 0;
    const due = Number(s.due_amount) || 0;

    let status: 'paid' | 'partial' | 'due' = 'paid';
    if (due >= total && total > 0) {
      status = 'due';
    } else if (due > 0) {
      status = 'partial';
    }

    return {
      id: s.id,
      invoice_no: s.invoice_no,
      customer_name: customer ? customer.name : 'General Customer',
      customer_phone: customer?.phone,
      total_amount: total,
      paid_amount: paid,
      due_amount: due,
      sale_date: s.sale_date,
      status,
    };
  });
}

/**
 * Get Low Stock Products table items where current_stock <= threshold.
 */
export function getLowStockProducts(
  products: Product[],
  categories: Category[],
  threshold = 10
): LowStockItemView[] {
  const categoryMap = new Map<number, string>();
  categories.forEach((cat) => categoryMap.set(cat.id, cat.name));

  return products
    .filter((p) => Math.max(0, Number(p.current_stock) || 0) <= threshold)
    .sort((a, b) => Math.max(0, Number(a.current_stock) || 0) - Math.max(0, Number(b.current_stock) || 0))
    .map((p) => ({
      id: p.id,
      name: p.name,
      category_name: p.category_id ? categoryMap.get(p.category_id) || 'Uncategorized' : 'Uncategorized',
      current_stock: Math.max(0, Number(p.current_stock) || 0),
      default_unit: p.default_unit || 'piece',
      cost_price: Math.max(0, Number(p.cost_price) || 0),
      selling_price: Math.max(0, Number(p.selling_price) || 0),
      threshold,
    }));
}

/**
 * Helper to format numbers as Currency (BDT ৳ display)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount).replace('BDT', '৳');
}

/**
 * Deduplicate categories by id and case-insensitive trimmed name
 */
export function deduplicateCategories(categories: Category[]): Category[] {
  if (!Array.isArray(categories)) return [];
  const seenIds = new Set<number>();
  const seenNames = new Set<string>();
  const deduped: Category[] = [];

  for (const cat of categories) {
    if (!cat || typeof cat.name !== 'string') continue;
    const cleanName = cat.name.trim().toLowerCase();
    if (!cleanName) continue;
    if (seenIds.has(cat.id) || seenNames.has(cleanName)) continue;
    seenIds.add(cat.id);
    seenNames.add(cleanName);
    deduped.push(cat);
  }
  return deduped;
}

export interface MonthlyStockProductSummary {
  productId: number;
  productName: string;
  categoryId: number | null;
  categoryName: string;
  totalQuantity: number;
  totalInvestment: number;
  purchasesCount: number;
  unitType: string;
  latestUnitCost: number;
  currentStock: number;
}

export interface MonthlyStockGroup {
  monthKey: string;
  monthLabel: string;
  year: number;
  month: number;
  totalQuantity: number;
  totalInvestment: number;
  purchasesCount: number;
  uniqueProductsCount: number;
  purchases: Purchase[];
  productSummaries: MonthlyStockProductSummary[];
}

/**
 * Group purchases by calendar month and aggregate product-wise and monthly totals.
 */
export function groupPurchasesByMonth(
  purchases: Purchase[],
  products: Product[] = [],
  categories: Category[] = []
): MonthlyStockGroup[] {
  if (!Array.isArray(purchases)) return [];

  const categoryMap = new Map<number, string>();
  categories.forEach((c) => categoryMap.set(c.id, c.name));

  const productMap = new Map<number, Product>();
  products.forEach((p) => productMap.set(p.id, p));

  const groups = new Map<string, {
    monthKey: string;
    monthLabel: string;
    year: number;
    month: number;
    purchases: Purchase[];
  }>();

  for (const p of purchases) {
    if (!p) continue;
    const dateObj = p.purchase_date ? new Date(p.purchase_date) : new Date();
    const validDate = isNaN(dateObj.getTime()) ? new Date() : dateObj;
    const year = validDate.getFullYear();
    const month = validDate.getMonth() + 1;
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;
    const monthLabel = validDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    if (!groups.has(monthKey)) {
      groups.set(monthKey, {
        monthKey,
        monthLabel,
        year,
        month,
        purchases: [],
      });
    }
    groups.get(monthKey)!.purchases.push(p);
  }

  // Sort months descending (latest first)
  const sortedMonthKeys = Array.from(groups.keys()).sort((a, b) => b.localeCompare(a));

  return sortedMonthKeys.map((mKey) => {
    const group = groups.get(mKey)!;
    const groupPurchases = group.purchases.sort((a, b) => {
      const timeA = new Date(a.purchase_date).getTime();
      const timeB = new Date(b.purchase_date).getTime();
      return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
    });

    let totalQuantity = 0;
    let totalInvestment = 0;
    const prodSummaryMap = new Map<number, MonthlyStockProductSummary>();

    for (const p of groupPurchases) {
      const mult = Number(p.multiplier) || 1;
      const qty = (Number(p.quantity) || 0) * mult;
      const cost = Number(p.unit_cost) || 0;
      const invest = Number(p.total_investment) || (qty * cost);

      totalQuantity += qty;
      totalInvestment += invest;

      const prod = productMap.get(p.product_id);
      const prodName = p.product_name || prod?.name || `Product #${p.product_id}`;
      const catId = p.category_id !== undefined ? p.category_id : (prod?.category_id ?? null);
      const catName = p.category_name || (catId ? categoryMap.get(catId) || 'Uncategorized' : 'Uncategorized');
      const unitType = p.unit_type || prod?.default_unit || 'piece';
      const curStock = Number(prod?.current_stock) || 0;

      if (!prodSummaryMap.has(p.product_id)) {
        prodSummaryMap.set(p.product_id, {
          productId: p.product_id,
          productName: prodName,
          categoryId: catId,
          categoryName: catName,
          totalQuantity: 0,
          totalInvestment: 0,
          purchasesCount: 0,
          unitType,
          latestUnitCost: cost,
          currentStock: curStock,
        });
      }

      const summary = prodSummaryMap.get(p.product_id)!;
      summary.totalQuantity += qty;
      summary.totalInvestment += invest;
      summary.purchasesCount += 1;
      if (cost > 0) {
        summary.latestUnitCost = cost;
      }
    }

    const productSummaries = Array.from(prodSummaryMap.values()).sort(
      (a, b) => b.totalQuantity - a.totalQuantity
    );

    return {
      monthKey: group.monthKey,
      monthLabel: group.monthLabel,
      year: group.year,
      month: group.month,
      totalQuantity,
      totalInvestment,
      purchasesCount: groupPurchases.length,
      uniqueProductsCount: productSummaries.length,
      purchases: groupPurchases,
      productSummaries,
    };
  });
}


