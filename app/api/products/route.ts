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
        p.current_stock::float AS current_stock,
        p.created_at
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.id ASC
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, category_id, default_unit, cost_price, selling_price, initial_stock } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: 'Product name is required' }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO products (name, category_id, default_unit, cost_price, selling_price, current_stock, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id, name, category_id, default_unit, cost_price::float, selling_price::float, current_stock::float, created_at`,
      [
        name.trim(),
        category_id || null,
        default_unit || 'Piece',
        Number(cost_price || 0),
        Number(selling_price || 0),
        Number(initial_stock || 0),
      ]
    );

    return NextResponse.json({ success: true, product: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create product' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, category_id, default_unit, cost_price, selling_price, current_stock } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Product ID is required' }, { status: 400 });
    }

    const result = await pool.query(
      `UPDATE products 
       SET 
         name = COALESCE($2, name),
         category_id = COALESCE($3, category_id),
         default_unit = COALESCE($4, default_unit),
         cost_price = COALESCE($5, cost_price),
         selling_price = COALESCE($6, selling_price),
         current_stock = COALESCE($7, current_stock)
       WHERE id = $1
       RETURNING id, name, category_id, default_unit, cost_price::float, selling_price::float, current_stock::float, created_at`,
      [
        id,
        name ? name.trim() : null,
        category_id !== undefined ? category_id : null,
        default_unit || null,
        cost_price !== undefined ? Number(cost_price) : null,
        selling_price !== undefined ? Number(selling_price) : null,
        current_stock !== undefined ? Number(current_stock) : null,
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, product: result.rows[0] });
  } catch (error: any) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update product' },
      { status: 500 }
    );
  }
}
