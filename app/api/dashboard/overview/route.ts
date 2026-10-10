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
          COALESCE(c.name, 'General Customer') AS customer_name,
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
    console.error('Database connection failed for dashboard API:', error.message);
    
    return NextResponse.json({
      success: true,
      isFallback: true,
      metrics: {
        totalStockInvestment: 0.0,
        totalSalesRevenue: 0.0,
        totalOutstandingDue: 0.0,
        realizedNetProfit: 0.0,
        availableInventoryValuation: 0.0,
      },
      recentSales: [],
      lowStockItems: [],
    });
  }
}
