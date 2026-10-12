import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT 
        p.id,
        p.name,
        p.category_id,
        COALESCE(c.name, 'Uncategorized') AS category_name,
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

export async function POST(request: NextRequest) {
  let client;
  try {
    const body = await request.json();
    const { name, category_id, default_unit, cost_price, selling_price, initial_stock } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Product name is required' }, { status: 400 });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    // Verify category exists if provided, otherwise null
    let validCatId = null;
    if (category_id) {
      const catCheck = await client.query('SELECT id FROM categories WHERE id = $1', [Number(category_id)]);
      if (catCheck.rows.length > 0) {
        validCatId = Number(category_id);
      }
    }

    const costNum = Number(cost_price || 0);
    const sellNum = Number(selling_price || 0);
    const stockNum = Number(initial_stock || 0);
    const unitStr = default_unit || 'Piece';

    const result = await client.query(
      `INSERT INTO products (name, category_id, default_unit, cost_price, selling_price, current_stock, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id, name, category_id, default_unit, cost_price::float, selling_price::float, current_stock::float, created_at`,
      [
        name.trim(),
        validCatId,
        unitStr,
        costNum,
        sellNum,
        stockNum,
      ]
    );

    const product = result.rows[0];

    // If initial stock was provided, log a purchase record for audit trail
    if (stockNum > 0) {
      await client.query(
        `INSERT INTO purchases (product_id, unit_type, quantity, multiplier, unit_cost, total_investment, purchase_date)
         VALUES ($1, $2, $3, 1, $4, $5, NOW())`,
        [
          product.id,
          unitStr,
          stockNum,
          costNum,
          Number((stockNum * costNum).toFixed(2)),
        ]
      );
    }

    await client.query('COMMIT');

    return NextResponse.json({ success: true, product });
  } catch (error: any) {
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
    }
    console.error('Error creating product:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create product' },
      { status: 500 }
    );
  } finally {
    if (client) {
      client.release();
    }
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, category_id, default_unit, cost_price, selling_price, current_stock } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Product ID is required' }, { status: 400 });
    }

    // Verify category if provided
    let validCatId = undefined;
    if (category_id !== undefined) {
      if (category_id === null) {
        validCatId = null;
      } else {
        const catCheck = await pool.query('SELECT id FROM categories WHERE id = $1', [Number(category_id)]);
        validCatId = catCheck.rows.length > 0 ? Number(category_id) : null;
      }
    }

    const result = await pool.query(
      `UPDATE products 
       SET 
         name = COALESCE($2, name),
         category_id = CASE WHEN $3::boolean THEN $4::int ELSE category_id END,
         default_unit = COALESCE($5, default_unit),
         cost_price = COALESCE($6, cost_price),
         selling_price = COALESCE($7, selling_price),
         current_stock = COALESCE($8, current_stock)
       WHERE id = $1
       RETURNING id, name, category_id, default_unit, cost_price::float, selling_price::float, current_stock::float, created_at`,
      [
        Number(id),
        name ? name.trim() : null,
        category_id !== undefined,
        validCatId,
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

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get('id');
    const body = request.headers.get('content-type')?.includes('application/json')
      ? await request.json().catch(() => ({}))
      : {};
    const id = Number(idParam || body.id);

    if (!id) {
      return NextResponse.json({ success: false, error: 'Product ID is required' }, { status: 400 });
    }

    await pool.query('DELETE FROM products WHERE id = $1', [id]);
    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete product' },
      { status: 500 }
    );
  }
}
