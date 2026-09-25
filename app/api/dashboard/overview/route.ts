import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const client = await pool.connect();
    try {
      // 1. Total Stock Investment: Sum of all purchases (quantity * unit_cost)
      const investmentRes = await client.query(
        `SELECT COALESCE(SUM(quantity * unit_cost), 0)::float AS total_stock_investment FROM purchases`
      );

      // 2. Total Sales Revenue: Sum of all sales (total_amount)
      const revenueRes = await client.query(
        `SELECT COALESCE(SUM(total_amount), 0)::float AS total_sales_revenue FROM sales`
      );

      // 3. Total Outstanding Due: Sum of total_due across all customers
      const dueRes = await client.query(
        `SELECT COALESCE(SUM(total_due), 0)::float AS total_outstanding_due FROM customers`
      );

      // 4. Realized Net Profit: Sum of (sale_items.unit_price - sale_items.cost_price_snapshot) * sale_items.quantity
      const profitRes = await client.query(
        `SELECT COALESCE(SUM((unit_price - cost_price_snapshot) * quantity), 0)::float AS realized_net_profit FROM sale_items`
      );

      // 5. Available Inventory Valuation: Current sum of (products.current_stock * products.cost_price)
      const valuationRes = await client.query(
        `SELECT COALESCE(SUM(current_stock * cost_price), 0)::float AS available_inventory_valuation FROM products`
      );

      // 6. Last 5 sales invoices
      const recentSalesRes = await client.query(
        `SELECT 
          s.id,
          s.invoice_no,
          s.total_amount::float AS total_amount,
          s.paid_amount::float AS paid_amount,
          s.due_amount::float AS due_amount,
          s.sale_date,
          COALESCE(c.name, 'Walk-in Customer') AS customer_name,
          c.phone AS customer_phone
         FROM sales s
         LEFT JOIN customers c ON s.customer_id = c.id
         ORDER BY s.sale_date DESC
         LIMIT 5`
      );

      // 7. Low stock warning table (stock <= 10)
      const lowStockRes = await client.query(
        `SELECT 
          p.id,
          p.name,
          p.current_stock::float AS current_stock,
          p.default_unit,
          p.cost_price::float AS cost_price,
          p.selling_price::float AS selling_price,
          COALESCE(cat.name, 'Uncategorized') AS category_name
         FROM products p
         LEFT JOIN categories cat ON p.category_id = cat.id
         WHERE p.current_stock <= 10
         ORDER BY p.current_stock ASC`
      );

      const metrics = {
        totalStockInvestment: investmentRes.rows[0]?.total_stock_investment || 0,
        totalSalesRevenue: revenueRes.rows[0]?.total_sales_revenue || 0,
        totalOutstandingDue: dueRes.rows[0]?.total_outstanding_due || 0,
        realizedNetProfit: profitRes.rows[0]?.realized_net_profit || 0,
        availableInventoryValuation: valuationRes.rows[0]?.available_inventory_valuation || 0,
      };

      return NextResponse.json({
        success: true,
        metrics,
        recentSales: recentSalesRes.rows,
        lowStockItems: lowStockRes.rows,
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Database connection failed for dashboard API, returning standard mock data', error.message);
    
    // Graceful fallback to rich sample dataset if DB server is offline
    return NextResponse.json({
      success: true,
      isFallback: true,
      metrics: {
        totalStockInvestment: 234600.0,
        totalSalesRevenue: 34520.0,
        totalOutstandingDue: 8550.0,
        realizedNetProfit: 5485.0,
        availableInventoryValuation: 168430.0,
      },
      recentSales: [
        {
          id: 5,
          invoice_no: 'INV-2026-005',
          customer_name: 'Walk-in Customer',
          total_amount: 1570.0,
          paid_amount: 1570.0,
          due_amount: 0.0,
          sale_date: new Date().toISOString(),
        },
        {
          id: 4,
          invoice_no: 'INV-2026-004',
          customer_name: 'Anika Enterprise',
          total_amount: 6850.0,
          paid_amount: 4000.0,
          due_amount: 2850.0,
          sale_date: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: 3,
          invoice_no: 'INV-2026-003',
          customer_name: 'Tanvir Ahmed',
          total_amount: 3600.0,
          paid_amount: 3600.0,
          due_amount: 0.0,
          sale_date: new Date(Date.now() - 172800000).toISOString(),
        },
        {
          id: 2,
          invoice_no: 'INV-2026-002',
          customer_name: 'Karim General Trading',
          total_amount: 4250.0,
          paid_amount: 3050.0,
          due_amount: 1200.0,
          sale_date: new Date(Date.now() - 259200000).toISOString(),
        },
        {
          id: 1,
          invoice_no: 'INV-2026-001',
          customer_name: 'Rahim Store & Bakers',
          total_amount: 18250.0,
          paid_amount: 13750.0,
          due_amount: 4500.0,
          sale_date: new Date(Date.now() - 345600000).toISOString(),
        },
      ],
      lowStockItems: [
        {
          id: 3,
          name: 'Coca Cola 2.25L Box (6 Bottles)',
          category_name: 'Beverages & Soft Drinks',
          current_stock: 4,
          default_unit: 'box',
          cost_price: 600.0,
          selling_price: 720.0,
        },
        {
          id: 5,
          name: 'Lux Bath Soap 100g (Pack of 4)',
          category_name: 'Personal Care & Hygiene',
          current_stock: 5,
          default_unit: 'pack',
          cost_price: 180.0,
          selling_price: 220.0,
        },
        {
          id: 2,
          name: 'Soybean Oil (5 Liter)',
          category_name: 'Groceries & Foods',
          current_stock: 8,
          default_unit: 'bottle',
          cost_price: 780.0,
          selling_price: 850.0,
        },
      ],
    });
  }
}
