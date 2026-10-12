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
        p.unit_type,
        p.quantity::float AS quantity,
        p.multiplier,
        p.total_pieces_added::float AS total_pieces_added,
        p.unit_cost::float AS unit_cost,
        p.total_investment::float AS total_investment,
        p.purchase_date
      FROM purchases p
      LEFT JOIN products pr ON p.product_id = pr.id
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
    } = body;

    const prodId = Number(product_id || productId);
    const unitStr = unit_type || unitType || 'piece';
    const qtyNum = Number(quantity || 0);
    const multNum = Number(multiplier || 1);
    const costNum = Number(unit_cost ?? unitCost ?? 0);
    const investNum = Number(
      total_investment ?? totalInvestment ?? (qtyNum * multNum * costNum).toFixed(2)
    );

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

    // 2. Insert into purchases (trg_purchases_increment_stock auto-increments products.current_stock)
    const purchRes = await client.query(
      `INSERT INTO purchases (product_id, unit_type, quantity, multiplier, unit_cost, total_investment, purchase_date)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id, product_id, unit_type, quantity::float AS quantity, multiplier, total_pieces_added::float AS total_pieces_added, unit_cost::float AS unit_cost, total_investment::float AS total_investment, purchase_date`,
      [prodId, unitStr, qtyNum, multNum, costNum, investNum]
    );

    // 3. Update product cost_price if unit_cost is specified (> 0)
    if (costNum > 0) {
      await client.query(`UPDATE products SET cost_price = $1 WHERE id = $2`, [costNum, prodId]);
    }

    // 4. Fetch updated product
    const updatedProdRes = await client.query(
      `SELECT id, name, category_id, default_unit, cost_price::float AS cost_price, selling_price::float AS selling_price, current_stock::float AS current_stock, created_at FROM products WHERE id = $1`,
      [prodId]
    );

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      purchase: purchRes.rows[0],
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
