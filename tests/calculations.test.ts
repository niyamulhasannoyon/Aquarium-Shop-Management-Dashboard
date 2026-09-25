import { describe, it, expect } from 'vitest';
import {
  calculateTotalStockInvestment,
  calculateTotalSalesRevenue,
  calculateTotalOutstandingDue,
  calculateRealizedNetProfit,
  calculateAvailableInventoryValuation,
  getRecentSales,
  getLowStockProducts,
} from '@/lib/calculations';
import {
  Purchase,
  Sale,
  Customer,
  SaleItem,
  Product,
  Category,
} from '@/types/executive';

describe('Executive Overview Dashboard Calculations', () => {
  const samplePurchases: Purchase[] = [
    {
      id: 1,
      product_id: 10,
      unit_type: 'bag',
      quantity: 10,
      multiplier: 1,
      unit_cost: 500,
      total_investment: 5000,
      purchase_date: '2026-09-01T00:00:00Z',
    },
    {
      id: 2,
      product_id: 20,
      unit_type: 'bottle',
      quantity: 5,
      multiplier: 1,
      unit_cost: 200,
      total_investment: 1000,
      purchase_date: '2026-09-02T00:00:00Z',
    },
  ];

  const sampleSales: Sale[] = [
    {
      id: 1,
      invoice_no: 'INV-001',
      customer_id: 1,
      total_amount: 1500,
      paid_amount: 1000,
      due_amount: 500,
      sale_date: '2026-09-20T10:00:00Z',
    },
    {
      id: 2,
      invoice_no: 'INV-002',
      customer_id: 2,
      total_amount: 2500,
      paid_amount: 2500,
      due_amount: 0,
      sale_date: '2026-09-22T10:00:00Z',
    },
  ];

  const sampleCustomers: Customer[] = [
    {
      id: 1,
      name: 'John Doe',
      phone: '01700000000',
      total_due: 500,
    },
    {
      id: 2,
      name: 'Jane Smith',
      phone: '01800000000',
      total_due: 1200,
    },
  ];

  const sampleSaleItems: SaleItem[] = [
    {
      id: 1,
      sale_id: 1,
      product_id: 10,
      unit_type: 'bag',
      quantity: 2,
      multiplier: 1,
      stock_deduct_qty: 2,
      unit_price: 650,
      cost_price_snapshot: 500,
      subtotal: 1300,
    },
    {
      id: 2,
      sale_id: 2,
      product_id: 20,
      unit_type: 'bottle',
      quantity: 3,
      multiplier: 1,
      stock_deduct_qty: 3,
      unit_price: 250,
      cost_price_snapshot: 200,
      subtotal: 750,
    },
  ];

  const sampleProducts: Product[] = [
    {
      id: 10,
      category_id: 1,
      name: 'Item A',
      default_unit: 'piece',
      cost_price: 500,
      selling_price: 650,
      current_stock: 8, // low stock (<= 10)
    },
    {
      id: 20,
      category_id: 1,
      name: 'Item B',
      default_unit: 'bottle',
      cost_price: 200,
      selling_price: 250,
      current_stock: 50,
    },
  ];

  const sampleCategories: Category[] = [
    { id: 1, name: 'General' },
  ];

  it('1. calculates Total Stock Investment correctly: sum(quantity * unit_cost)', () => {
    // (10 * 500) + (5 * 200) = 5000 + 1000 = 6000
    const investment = calculateTotalStockInvestment(samplePurchases);
    expect(investment).toBe(6000);
  });

  it('2. calculates Total Sales Revenue correctly: sum(total_amount)', () => {
    // 1500 + 2500 = 4000
    const revenue = calculateTotalSalesRevenue(sampleSales);
    expect(revenue).toBe(4000);
  });

  it('3. calculates Total Outstanding Due correctly: sum(customers.total_due)', () => {
    // 500 + 1200 = 1700
    const due = calculateTotalOutstandingDue(sampleCustomers);
    expect(due).toBe(1700);
  });

  it('4. calculates Realized Net Profit correctly: sum((unit_price - cost_price_snapshot) * quantity)', () => {
    // ((650 - 500) * 2) + ((250 - 200) * 3) = 300 + 150 = 450
    const profit = calculateRealizedNetProfit(sampleSaleItems);
    expect(profit).toBe(450);
  });

  it('5. calculates Available Inventory Valuation correctly: sum(current_stock * cost_price)', () => {
    // (8 * 500) + (50 * 200) = 4000 + 10000 = 14000
    const valuation = calculateAvailableInventoryValuation(sampleProducts);
    expect(valuation).toBe(14000);
  });

  it('retrieves recent sales correctly sorted by date descending', () => {
    const recent = getRecentSales(sampleSales, sampleCustomers, 5);
    expect(recent).toHaveLength(2);
    expect(recent[0].invoice_no).toBe('INV-002'); // Sept 22
    expect(recent[0].customer_name).toBe('Jane Smith');
    expect(recent[1].invoice_no).toBe('INV-001'); // Sept 20
    expect(recent[1].status).toBe('partial');
  });

  it('filters low stock products where current_stock <= threshold', () => {
    const lowStock = getLowStockProducts(sampleProducts, sampleCategories, 10);
    expect(lowStock).toHaveLength(1);
    expect(lowStock[0].name).toBe('Item A');
    expect(lowStock[0].current_stock).toBe(8);
  });
});
