import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT 
        p.id,
        p.product_id,
        COALESCE(pr.name, 'Unknown Product') AS product_name,
        pr.category_id,
        COALESCE(c.name, 'Uncategorized') AS category_name,
        p.unit_type,
        p.quantity::float AS quantity,
        p.multiplier,
        p.total_pieces_added::float AS total_pieces_added,
        p.unit_cost::float AS unit_cost,
        p.total_investment::float AS total_investment,
        p.purchase_date
      FROM purchases p
      LEFT JOIN products pr ON p.product_id = pr.id
      LEFT JOIN categories c ON pr.category_id = c.id
      ORDER BY p.purchase_date DESC, p.id DESC
    `);

    return NextResponse.json({ success: true, purchases: result.rows });
  } catch (error: any) {
    console.error('Error fetching purchases:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch purchases' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  let client;
  try {
    const body = await request.json();
    const {
      product_id,
      productId,
      unit_type,
      unitType,
      quantity,
      multiplier = 1,
      unit_cost,
      unitCost,
      total_investment,
      totalInvestment,
      purchase_date,
      purchaseDate,
    } = body;

    const prodId = Number(product_id || productId);
    const unitStr = unit_type || unitType || 'piece';
    const qtyNum = Number(quantity || 0);
    const multNum = Number(multiplier || 1);
    const costNum = Number(unit_cost ?? unitCost ?? 0);
    const investNum = Number(
      total_investment ?? totalInvestment ?? (qtyNum * multNum * costNum).toFixed(2)
    );
    const customDate = purchase_date || purchaseDate;

    if (!prodId || qtyNum <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid product ID and positive quantity are required' },
        { status: 400 }
      );
    }

    client = await pool.connect();
    await client.query('BEGIN');

    // 1. Check product exists
    const prodCheck = await client.query('SELECT id, name, cost_price, current_stock FROM products WHERE id = $1', [prodId]);
    if (prodCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    // 2. Insert into purchases (trg_purchases_stock_trigger auto-increments products.current_stock)
    const purchRes = await client.query(
      `INSERT INTO purchases (product_id, unit_type, quantity, multiplier, unit_cost, total_investment, purchase_date)
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7::timestamptz, NOW()))
       RETURNING id, product_id, unit_type, quantity::float AS quantity, multiplier, total_pieces_added::float AS total_pieces_added, unit_cost::float AS unit_cost, total_investment::float AS total_investment, purchase_date`,
      [prodId, unitStr, qtyNum, multNum, costNum, investNum, customDate || null]
    );

    // 3. Update product cost_price if unit_cost is specified (> 0)
    if (costNum > 0) {
      await client.query(`UPDATE products SET cost_price = $1 WHERE id = $2`, [costNum, prodId]);
    }

    // 4. Fetch updated product
    const updatedProdRes = await client.query(
      `SELECT id, name, category_id, default_unit, GREATEST(0, cost_price)::float AS cost_price, GREATEST(0, selling_price)::float AS selling_price, GREATEST(0, current_stock)::float AS current_stock, created_at FROM products WHERE id = $1`,
      [prodId]
    );

    await client.query('COMMIT');

    // Enrich purchase with product_name and category_name for convenience
    const enrichedPurchase = {
      ...purchRes.rows[0],
      product_name: prodCheck.rows[0].name,
    };

    return NextResponse.json({
      success: true,
      purchase: enrichedPurchase,
      product: updatedProdRes.rows[0],
    });
  } catch (error: any) {
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
    }
    console.error('Error creating purchase:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create purchase' },
      { status: 500 }
    );
  } finally {
    if (client) {
      client.release();
    }
  }
}

export async function PUT(request: NextRequest) {
  let client;
  try {
    const body = await request.json();
    const {
      id,
      product_id,
      productId,
      unit_type,
      unitType,
      quantity,
      multiplier = 1,
      unit_cost,
      unitCost,
      total_investment,
      totalInvestment,
      purchase_date,
      purchaseDate,
    } = body;

    const purchId = Number(id);
    const prodId = Number(product_id || productId);
    const unitStr = unit_type || unitType || 'piece';
    const qtyNum = Number(quantity || 0);
    const multNum = Number(multiplier || 1);
    const costNum = Number(unit_cost ?? unitCost ?? 0);
    const investNum = Number(
      total_investment ?? totalInvestment ?? (qtyNum * multNum * costNum).toFixed(2)
    );
    const dateStr = purchase_date || purchaseDate;

    if (!purchId || !prodId || qtyNum <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid purchase ID, product ID and positive quantity are required' },
        { status: 400 }
      );
    }

    client = await pool.connect();
    await client.query('BEGIN');

    // 1. Check existing purchase
    const oldPurch = await client.query('SELECT * FROM purchases WHERE id = $1', [purchId]);
    if (oldPurch.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ success: false, error: 'Purchase not found' }, { status: 404 });
    }

    // 2. Check target product exists
    const prodCheck = await client.query(
      'SELECT id, name, cost_price, current_stock FROM products WHERE id = $1',
      [prodId]
    );
    if (prodCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ success: false, error: 'Target product not found' }, { status: 404 });
    }

    // 3. Update purchases row (trg_purchases_stock_trigger handles products.current_stock)
    const updateRes = await client.query(
      `UPDATE purchases
       SET product_id = $1,
           unit_type = $2,
           quantity = $3,
           multiplier = $4,
           unit_cost = $5,
           total_investment = $6,
           purchase_date = COALESCE($7::timestamptz, purchase_date)
       WHERE id = $8
       RETURNING id, product_id, unit_type, quantity::float AS quantity, multiplier,
                 total_pieces_added::float AS total_pieces_added, unit_cost::float AS unit_cost,
                 total_investment::float AS total_investment, purchase_date`,
      [prodId, unitStr, qtyNum, multNum, costNum, investNum, dateStr || null, purchId]
    );

    // 4. Update target product cost_price if unit_cost is specified (> 0)
    if (costNum > 0) {
      await client.query(`UPDATE products SET cost_price = $1 WHERE id = $2`, [costNum, prodId]);
    }

    // 5. Fetch updated products (both target product and old product if it changed)
    const affectedProductIds = [prodId];
    if (oldPurch.rows[0].product_id !== prodId) {
      affectedProductIds.push(oldPurch.rows[0].product_id);
    }

    const updatedProdsRes = await client.query(
      `SELECT id, name, category_id, default_unit, GREATEST(0, cost_price)::float AS cost_price,
              GREATEST(0, selling_price)::float AS selling_price, GREATEST(0, current_stock)::float AS current_stock, created_at
       FROM products
       WHERE id = ANY($1::int[])`,
      [affectedProductIds]
    );

    await client.query('COMMIT');

    const enrichedPurchase = {
      ...updateRes.rows[0],
      product_name: prodCheck.rows[0].name,
    };

    return NextResponse.json({
      success: true,
      purchase: enrichedPurchase,
      products: updatedProdsRes.rows,
      product: updatedProdsRes.rows.find((p: any) => p.id === prodId),
    });
  } catch (error: any) {
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
    }
    console.error('Error updating purchase:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update purchase' },
      { status: 500 }
    );
  } finally {
    if (client) {
      client.release();
    }
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
      return NextResponse.json({ success: false, error: 'Purchase ID is required' }, { status: 400 });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    const purchCheck = await client.query('SELECT * FROM purchases WHERE id = $1', [id]);
    if (purchCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ success: false, error: 'Purchase not found' }, { status: 404 });
    }
    const oldProductId = purchCheck.rows[0].product_id;

    // Trigger trg_purchases_stock_trigger handles deducting from products.current_stock automatically!
    await client.query('DELETE FROM purchases WHERE id = $1', [id]);

    const updatedProdRes = await client.query(
      `SELECT id, name, category_id, default_unit, GREATEST(0, cost_price)::float AS cost_price,
              GREATEST(0, selling_price)::float AS selling_price, GREATEST(0, current_stock)::float AS current_stock, created_at
       FROM products
       WHERE id = $1`,
      [oldProductId]
    );

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      deletedId: id,
      product: updatedProdRes.rows[0],
    });
  } catch (error: any) {
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
    }
    console.error('Error deleting purchase:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete purchase' },
      { status: 500 }
    );
  } finally {
    if (client) {
      client.release();
    }
  }
}
