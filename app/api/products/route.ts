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
        GREATEST(0, p.cost_price)::float AS cost_price,
        GREATEST(0, p.selling_price)::float AS selling_price,
        GREATEST(0, p.current_stock)::float AS current_stock,
        p.created_at,
        COALESCE(p.is_deleted, false) AS is_deleted
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE COALESCE(p.is_deleted, false) = false
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
    if (!validCatId && body.category_name) {
      const nameCheck = await client.query('SELECT id FROM categories WHERE LOWER(name) = LOWER($1)', [String(body.category_name).trim()]);
      if (nameCheck.rows.length > 0) {
        validCatId = nameCheck.rows[0].id;
      }
    }

    const costNum = Math.max(0, Number(cost_price || 0));
    const sellNum = Math.max(0, Number(selling_price || 0));
    const stockNum = Math.max(0, Number(initial_stock || 0));
    const unitStr = default_unit || 'Piece';

    // Insert product (if stockNum > 0, start with 0 because purchases trigger will increment it)
    const result = await client.query(
      `INSERT INTO products (name, category_id, default_unit, cost_price, selling_price, current_stock, created_at)
       VALUES ($1, $2, $3, $4, $5, 0, NOW())
       RETURNING id, name, category_id, default_unit, GREATEST(0, cost_price)::float AS cost_price, GREATEST(0, selling_price)::float AS selling_price, GREATEST(0, current_stock)::float AS current_stock, created_at`,
      [
        name.trim(),
        validCatId,
        unitStr,
        costNum,
        sellNum,
      ]
    );

    const product = result.rows[0];

    // If initial stock was provided, log a purchase record for audit trail
    // Trigger trg_purchases_increment_stock will auto-increment product current_stock to stockNum
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

    const finalProdRes = await client.query(
      `SELECT 
         p.id, 
         p.name, 
         p.category_id, 
         COALESCE(c.name, 'Uncategorized') AS category_name, 
         p.default_unit, 
         GREATEST(0, p.cost_price)::float AS cost_price, 
         GREATEST(0, p.selling_price)::float AS selling_price, 
         GREATEST(0, p.current_stock)::float AS current_stock, 
         p.created_at
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = $1`,
      [product.id]
    );

    await client.query('COMMIT');

    const finalProduct = finalProdRes.rows[0] || { ...product, current_stock: stockNum };
    return NextResponse.json({ success: true, product: finalProduct });
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
        if (catCheck.rows.length > 0) {
          validCatId = Number(category_id);
        } else if (body.category_name) {
          const nameCheck = await pool.query('SELECT id FROM categories WHERE LOWER(name) = LOWER($1)', [String(body.category_name).trim()]);
          validCatId = nameCheck.rows.length > 0 ? nameCheck.rows[0].id : null;
        } else {
          validCatId = null;
        }
      }
    }

    const result = await pool.query(
      `UPDATE products 
       SET 
         name = COALESCE($2, name),
         category_id = CASE WHEN $3::boolean THEN $4::int ELSE category_id END,
         default_unit = COALESCE($5, default_unit),
         cost_price = GREATEST(0, COALESCE($6, cost_price)),
         selling_price = GREATEST(0, COALESCE($7, selling_price)),
         current_stock = GREATEST(0, COALESCE($8, current_stock))
       WHERE id = $1 AND COALESCE(is_deleted, false) = false
       RETURNING id, name, category_id, default_unit, GREATEST(0, cost_price)::float AS cost_price, GREATEST(0, selling_price)::float AS selling_price, GREATEST(0, current_stock)::float AS current_stock, created_at`,
      [
        Number(id),
        name ? name.trim() : null,
        category_id !== undefined,
        validCatId,
        default_unit || null,
        cost_price !== undefined ? Math.max(0, Number(cost_price)) : null,
        selling_price !== undefined ? Math.max(0, Number(selling_price)) : null,
        current_stock !== undefined ? Math.max(0, Number(current_stock)) : null,
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    const catNameRes = await pool.query(
      `SELECT COALESCE(name, 'Uncategorized') as category_name FROM categories WHERE id = $1`,
      [result.rows[0].category_id]
    );

    const productWithCat = {
      ...result.rows[0],
      category_name: catNameRes.rows[0]?.category_name || 'Uncategorized',
    };

    return NextResponse.json({ success: true, product: productWithCat });
  } catch (error: any) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update product' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  let client;
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

    client = await pool.connect();
    await client.query('BEGIN');

    // 1. Verify product exists
    const prodRes = await client.query(
      `SELECT id, name, category_id, current_stock FROM products WHERE id = $1`,
      [id]
    );

    if (prodRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    const productToDelete = prodRes.rows[0];

    // 2. Check for historical sale references in sale_items
    const salesCheck = await client.query(
      `SELECT COUNT(*)::int AS count FROM sale_items WHERE product_id = $1`,
      [id]
    );
    const salesCount = salesCheck.rows[0]?.count || 0;

    let deleteMode = 'hard';

    if (salesCount > 0) {
      // Product has historical sales!
      // In accordance with retail accounting standards, soft-delete to preserve
      // sales invoice integrity, financial reporting, and avoid foreign key constraint failure.
      await client.query(
        `UPDATE products SET is_deleted = TRUE, current_stock = 0 WHERE id = $1`,
        [id]
      );
      deleteMode = 'soft';
    } else {
      // Product has never been sold. Safely clean up associated purchase records, then delete row.
      await client.query(
        `DELETE FROM purchases WHERE product_id = $1`,
        [id]
      );
      await client.query(
        `DELETE FROM products WHERE id = $1`,
        [id]
      );
      deleteMode = 'hard';
    }

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      deletedId: id,
      product: productToDelete,
      mode: deleteMode,
      message: `Product "${productToDelete.name}" successfully deleted.`,
    });
  } catch (error: any) {
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
    }
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete product' },
      { status: 500 }
    );
  } finally {
    if (client) {
      client.release();
    }
  }
}
