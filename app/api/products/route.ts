import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT 
        p.id,
        p.name,
        p.category_id,
        c.name AS category_name,
        p.default_unit,
        p.cost_price::float AS cost_price,
        p.selling_price::float AS selling_price,
        p.current_stock::float AS current_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.name ASC
    `);
    
    return NextResponse.json({ success: true, products: result.rows });
  } catch (error: any) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
