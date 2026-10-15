import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

async function fetchFullDatabaseState(clientOrPool: any) {
  const [catRes, prodRes, custRes, salesRes, itemsRes, purchRes, dueRes] = await Promise.all([
    clientOrPool.query(`
      SELECT 
        c.id,
        c.name,
        c.created_at,
        COUNT(p.id)::int AS product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id
      GROUP BY c.id, c.name, c.created_at
      ORDER BY c.id ASC
    `),
    clientOrPool.query(`
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
    `),
    clientOrPool.query(`
      SELECT 
        id, 
        name, 
        phone, 
        address, 
        total_due::float AS total_due,
        created_at
      FROM customers
      ORDER BY name ASC
    `),
    clientOrPool.query(`
      SELECT 
        s.id,
        s.invoice_no,
        s.customer_id,
        s.total_amount::float AS total_amount,
        s.paid_amount::float AS paid_amount,
        s.due_amount::float AS due_amount,
        s.sale_date,
        COALESCE(c.name, 'General Customer') AS customer_name,
        COALESCE(c.phone, '') AS customer_phone
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      ORDER BY s.sale_date DESC, s.id DESC
    `),
    clientOrPool.query(`
      SELECT 
        si.id,
        si.sale_id,
        si.product_id,
        si.unit_type,
        si.quantity::float AS quantity,
        si.multiplier,
        si.stock_deduct_qty::float AS stock_deduct_qty,
        si.unit_price::float AS unit_price,
        si.cost_price_snapshot::float AS cost_price_snapshot,
        si.subtotal::float AS subtotal
      FROM sale_items si
      ORDER BY si.id ASC
    `),
    clientOrPool.query(`
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
    `),
    clientOrPool.query(`
      SELECT 
        dc.id, 
        dc.customer_id, 
        COALESCE(c.name, 'Customer') AS customer_name,
        COALESCE(c.phone, '') AS customer_phone,
        dc.amount_paid::float AS amount_paid, 
        dc.note, 
        dc.payment_date
      FROM due_collections dc
      LEFT JOIN customers c ON dc.customer_id = c.id
      ORDER BY dc.payment_date DESC, dc.id DESC
    `),
  ]);

  return {
    categories: catRes.rows,
    products: prodRes.rows,
    customers: custRes.rows,
    sales: salesRes.rows,
    sale_items: itemsRes.rows,
    purchases: purchRes.rows,
    due_collections: dueRes.rows,
  };
}

export async function GET() {
  try {
    const data = await fetchFullDatabaseState(pool);
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...data,
    });
  } catch (error: any) {
    console.error('Error in GET /api/sync:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to sync data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  let client;
  try {
    const body = await request.json();
    const {
      products = [],
      customers = [],
      purchases = [],
      sales = [],
      sale_items = [],
      due_collections = [],
    } = body;

    client = await pool.connect();
    await client.query('BEGIN');

    // 1. Migrate any local customers not in DB
    const dbCustRes = await client.query('SELECT id, name, phone FROM customers');
    const dbCustMap = new Map<string, number>();
    for (const c of dbCustRes.rows) {
      dbCustMap.set(c.name.toLowerCase().trim(), c.id);
      if (c.phone) dbCustMap.set(c.phone.trim(), c.id);
    }

    const localToDbCustId = new Map<number, number>();
    for (const lc of customers) {
      const matchId = dbCustMap.get(lc.name?.toLowerCase().trim()) || (lc.phone ? dbCustMap.get(lc.phone.trim()) : undefined);
      if (matchId) {
        localToDbCustId.set(lc.id, matchId);
      } else if (lc.name && lc.name.trim()) {
        const ins = await client.query(
          `INSERT INTO customers (name, phone, address, total_due, created_at)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [
            lc.name.trim(),
            lc.phone || '',
            lc.address || '',
            Number(lc.total_due || 0),
            lc.created_at || new Date().toISOString(),
          ]
        );
        const newId = ins.rows[0].id;
        dbCustMap.set(lc.name.toLowerCase().trim(), newId);
        localToDbCustId.set(lc.id, newId);
      }
    }

    // 2. Migrate any local products not in DB
    const dbProdRes = await client.query('SELECT id, name FROM products');
    const dbProdMap = new Map<string, number>();
    for (const p of dbProdRes.rows) {
      dbProdMap.set(p.name.toLowerCase().trim(), p.id);
    }

    const localToDbProdId = new Map<number, number>();
    for (const lp of products) {
      if (!lp.name || !lp.name.trim()) continue;
      const matchId = dbProdMap.get(lp.name.toLowerCase().trim());
      if (matchId) {
        localToDbProdId.set(lp.id, matchId);
      } else {
        const ins = await client.query(
          `INSERT INTO products (name, category_id, default_unit, cost_price, selling_price, current_stock, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
          [
            lp.name.trim(),
            lp.category_id || null,
            lp.default_unit || 'piece',
            Number(lp.cost_price || 0),
            Number(lp.selling_price || 0),
            Number(lp.current_stock || 0),
            lp.created_at || new Date().toISOString(),
          ]
        );
        const newId = ins.rows[0].id;
        dbProdMap.set(lp.name.toLowerCase().trim(), newId);
        localToDbProdId.set(lp.id, newId);
      }
    }

    // 3. Migrate purchases if not in DB
    const dbPurchRes = await client.query('SELECT id, product_id, purchase_date FROM purchases');
    for (const lp of purchases) {
      const targetProdId = localToDbProdId.get(lp.product_id) || lp.product_id;
      const prodExists = Array.from(dbProdMap.values()).includes(targetProdId);
      if (!prodExists) continue;

      const alreadyExists = dbPurchRes.rows.some(
        (dp: any) => dp.product_id === targetProdId && Math.abs(new Date(dp.purchase_date).getTime() - new Date(lp.purchase_date).getTime()) < 5000
      );

      if (!alreadyExists) {
        await client.query(
          `INSERT INTO purchases (product_id, unit_type, quantity, multiplier, unit_cost, total_investment, purchase_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            targetProdId,
            lp.unit_type || 'piece',
            Number(lp.quantity || 0),
            Number(lp.multiplier || 1),
            Number(lp.unit_cost || 0),
            Number(lp.total_investment || 0),
            lp.purchase_date || new Date().toISOString(),
          ]
        );
      }
    }

    // 4. Migrate sales and sale_items if not in DB
    const dbSalesRes = await client.query('SELECT id, invoice_no FROM sales');
    const existingInvoices = new Set(dbSalesRes.rows.map((s: any) => s.invoice_no));

    for (const ls of sales) {
      if (!ls.invoice_no || existingInvoices.has(ls.invoice_no)) continue;

      const targetCustId = ls.customer_id ? (localToDbCustId.get(ls.customer_id) || ls.customer_id) : null;
      const saleIns = await client.query(
        `INSERT INTO sales (invoice_no, customer_id, total_amount, paid_amount, due_amount, sale_date)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [
          ls.invoice_no,
          targetCustId,
          Number(ls.total_amount || 0),
          Number(ls.paid_amount || 0),
          Number(ls.due_amount || 0),
          ls.sale_date || new Date().toISOString(),
        ]
      );
      const newSaleId = saleIns.rows[0].id;
      existingInvoices.add(ls.invoice_no);

      const itemsForSale = sale_items.filter((si: any) => si.sale_id === ls.id);
      for (const it of itemsForSale) {
        const prodId = localToDbProdId.get(it.product_id) || it.product_id;
        await client.query(
          `INSERT INTO sale_items (sale_id, product_id, unit_type, quantity, multiplier, stock_deduct_qty, unit_price, cost_price_snapshot, subtotal)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            newSaleId,
            prodId,
            it.unit_type || 'piece',
            Number(it.quantity || 1),
            Number(it.multiplier || 1),
            Number(it.stock_deduct_qty || 1),
            Number(it.unit_price || 0),
            Number(it.cost_price_snapshot || 0),
            Number(it.subtotal || 0),
          ]
        );
      }
    }

    // 5. Migrate due collections if not in DB
    const dbDueRes = await client.query('SELECT id, customer_id, payment_date FROM due_collections');
    for (const ld of due_collections) {
      const targetCustId = localToDbCustId.get(ld.customer_id) || ld.customer_id;
      const alreadyExists = dbDueRes.rows.some(
        (dd: any) => dd.customer_id === targetCustId && Math.abs(new Date(dd.payment_date).getTime() - new Date(ld.payment_date).getTime()) < 5000
      );
      if (!alreadyExists && targetCustId) {
        await client.query(
          `INSERT INTO due_collections (customer_id, amount_paid, note, payment_date)
           VALUES ($1, $2, $3, $4)`,
          [
            targetCustId,
            Number(ld.amount_paid || 0),
            ld.note || 'Cash Payment',
            ld.payment_date || new Date().toISOString(),
          ]
        );
      }
    }

    await client.query('COMMIT');

    const freshState = await fetchFullDatabaseState(client);
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...freshState,
    });
  } catch (error: any) {
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
    }
    console.error('Error in POST /api/sync:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to sync client data' },
      { status: 500 }
    );
  } finally {
    if (client) {
      client.release();
    }
  }
}
