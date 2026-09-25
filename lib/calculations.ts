import {
  Purchase,
  Sale,
  Customer,
  SaleItem,
  Product,
  Category,
  KpiSummaryMetrics,
  RecentSaleView,
  LowStockItemView,
} from '@/types/executive';

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
 */
export function calculateAvailableInventoryValuation(products: Product[]): number {
  return products.reduce((sum, p) => {
    const stock = Number(p.current_stock) || 0;
    const cost = Number(p.cost_price) || 0;
    return sum + (stock * cost);
  }, 0);
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
    totalStockInvestment: calculateTotalStockInvestment(data.purchases),
    totalSalesRevenue: calculateTotalSalesRevenue(data.sales),
    totalOutstandingDue: calculateTotalOutstandingDue(data.customers),
    realizedNetProfit: calculateRealizedNetProfit(data.saleItems),
    availableInventoryValuation: calculateAvailableInventoryValuation(data.products),
  };
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
      customer_name: customer ? customer.name : 'Walk-in Customer',
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
    .filter((p) => (Number(p.current_stock) || 0) <= threshold)
    .sort((a, b) => (Number(a.current_stock) || 0) - (Number(b.current_stock) || 0))
    .map((p) => ({
      id: p.id,
      name: p.name,
      category_name: p.category_id ? categoryMap.get(p.category_id) || 'Uncategorized' : 'Uncategorized',
      current_stock: Number(p.current_stock) || 0,
      default_unit: p.default_unit || 'piece',
      cost_price: Number(p.cost_price) || 0,
      selling_price: Number(p.selling_price) || 0,
      threshold,
    }));
}

/**
 * Helper to format numbers as Currency (BDT ৳ or $ standard display)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount).replace('BDT', '৳');
}
