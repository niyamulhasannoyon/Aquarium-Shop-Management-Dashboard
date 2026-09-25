export interface Category {
  id: number;
  name: string;
  created_at?: string;
}

export interface Product {
  id: number;
  category_id: number | null;
  name: string;
  default_unit: string;
  cost_price: number;
  selling_price: number;
  current_stock: number;
  created_at?: string;
}

export interface Purchase {
  id: number;
  product_id: number;
  unit_type: string;
  quantity: number;
  multiplier: number;
  total_pieces_added?: number;
  unit_cost: number;
  total_investment: number;
  purchase_date: string;
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  address?: string;
  total_due: number;
  created_at?: string;
}

export interface Sale {
  id: number;
  invoice_no: string;
  customer_id: number | null;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  sale_date: string;
}

export interface SaleItem {
  id: number;
  sale_id: number;
  product_id: number;
  unit_type: string;
  quantity: number;
  multiplier: number;
  stock_deduct_qty: number;
  unit_price: number;
  cost_price_snapshot: number;
  subtotal: number;
}

export interface DueCollection {
  id: number;
  customer_id: number;
  amount_paid: number;
  note?: string;
  payment_date: string;
}

export interface KpiSummaryMetrics {
  totalStockInvestment: number;
  totalSalesRevenue: number;
  totalOutstandingDue: number;
  realizedNetProfit: number;
  availableInventoryValuation: number;
}

export interface RecentSaleView {
  id: number;
  invoice_no: string;
  customer_name: string;
  customer_phone?: string;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  sale_date: string;
  status: 'paid' | 'partial' | 'due';
}

export interface LowStockItemView {
  id: number;
  name: string;
  category_name: string;
  current_stock: number;
  default_unit: string;
  cost_price: number;
  selling_price: number;
  threshold: number;
}
