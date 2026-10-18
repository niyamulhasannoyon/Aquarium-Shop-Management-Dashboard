import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

const FRESH_AQUARIUM_CATEGORIES = [
  'Live Fish (একুরিয়াম মাছ)',
  'Fish Food (মাছের খাবার)',
  'Aquarium Plants (জলজ উদ্ভিদ ও গাছ)',
  'Filters & Aeration (ফিল্টার ও অক্সিজেন)',
  'Water Care & Medicine (ওষুধ ও পানি শোধন)',
  'Aquarium Tanks (একুরিয়াম ট্যাংক)',
  'Lights & Heaters (লাইট ও হিটার)',
  'Soil, Sand & Decor (মাটি, বালি ও শো-পিস)',
  'Accessories & Tools (এক্সেসরিজ ও পাইপ)',
];

async function ensureDefaultCategories(clientOrPool: any) {
  try {
    const existing = await clientOrPool.query('SELECT COUNT(*)::int AS count FROM categories');
    if (existing.rows[0]?.count === 0) {
      for (const catName of FRESH_AQUARIUM_CATEGORIES) {
        await clientOrPool.query(
          `INSERT INTO categories (name, created_at) VALUES ($1, NOW())`,
          [catName]
        );
      }
    }
  } catch (e) {
    console.warn('Could not auto-seed default categories:', e);
  }
}

async function fetchFullDatabaseState(clientOrPool: any) {
  await ensureDefaultCategories(clientOrPool);

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
      categories = [],
      products = [],
      customers = [],
      purchases = [],
      sales = [],
      sale_items = [],
      due_collections = [],
    } = body;

    client = await pool.connect();
    await client.query('BEGIN');

    // 0. Ensure default categories exist in DB
    await ensureDefaultCategories(client);

    // Synchronize Categories
    const dbCatRes = await client.query('SELECT id, name FROM categories');
    const dbCatMap = new Map<string, number>(); // name lowercase -> id
    const dbCatIdSet = new Set<number>();
    for (const c of dbCatRes.rows) {
      dbCatMap.set(c.name.toLowerCase().trim(), c.id);
      dbCatIdSet.add(c.id);
    }

    const localToDbCatId = new Map<number, number>();
    for (const lc of categories) {
      if (!lc.name || !lc.name.trim()) continue;
      const cleanName = lc.name.trim().toLowerCase();
      const matchId = dbCatMap.get(cleanName) || (dbCatIdSet.has(lc.id) ? lc.id : undefined);

      if (matchId) {
        localToDbCatId.set(lc.id, matchId);
      } else {
        const ins = await client.query(
          `INSERT INTO categories (name, created_at) VALUES ($1, $2) RETURNING id`,
          [lc.name.trim(), lc.created_at || new Date().toISOString()]
        );
        const newId = ins?.rows?.[0]?.id || Math.floor(Math.random() * 100000);
        dbCatMap.set(cleanName, newId);
        dbCatIdSet.add(newId);
        localToDbCatId.set(lc.id, newId);
      }
    }

    // 1. Synchronize Customers
    const dbCustRes = await client.query('SELECT id, name, phone FROM customers');
    const dbCustMap = new Map<string, number>(); // name lowercase -> id
    const dbCustPhoneMap = new Map<string, number>();
    const dbCustIdSet = new Set<number>();
    for (const c of dbCustRes.rows) {
      dbCustMap.set(c.name.toLowerCase().trim(), c.id);
      if (c.phone) dbCustPhoneMap.set(c.phone.trim(), c.id);
      dbCustIdSet.add(c.id);
    }

    const localToDbCustId = new Map<number, number>();
    for (const lc of customers) {
      if (!lc.name || !lc.name.trim()) continue;
      const cleanName = lc.name.trim().toLowerCase();
      const cleanPhone = lc.phone ? lc.phone.trim() : '';

      const matchId =
        (dbCustIdSet.has(lc.id) ? lc.id : undefined) ||
        dbCustMap.get(cleanName) ||
        (cleanPhone ? dbCustPhoneMap.get(cleanPhone) : undefined);

      if (matchId) {
        localToDbCustId.set(lc.id, matchId);
      } else {
        const ins = await client.query(
          `INSERT INTO customers (name, phone, address, total_due, created_at)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [
            lc.name.trim(),
            cleanPhone,
            lc.address || '',
            Number(lc.total_due || 0),
            lc.created_at || new Date().toISOString(),
          ]
        );
        const newId = ins?.rows?.[0]?.id || Math.floor(Math.random() * 100000);
        dbCustMap.set(cleanName, newId);
        if (cleanPhone) dbCustPhoneMap.set(cleanPhone, newId);
        dbCustIdSet.add(newId);
        localToDbCustId.set(lc.id, newId);
      }
    }

    // 2. Synchronize Products
    const dbProdRes = await client.query('SELECT id, name, current_stock FROM products');
    const dbProdMap = new Map<string, number>(); // name lowercase -> id
    const dbProdIdSet = new Set<number>();
    for (const p of dbProdRes.rows) {
      dbProdMap.set(p.name.toLowerCase().trim(), p.id);
      dbProdIdSet.add(p.id);
    }

    const localToDbProdId = new Map<number, number>();
    for (const lp of products) {
      if (!lp.name || !lp.name.trim()) continue;
      const cleanName = lp.name.trim().toLowerCase();

      // Safely resolve category_id to ensure NO foreign key violation
      let targetCatId: number | null = null;
      if (lp.category_id && localToDbCatId.has(lp.category_id)) {
        targetCatId = localToDbCatId.get(lp.category_id)!;
      } else if (lp.category_name && dbCatMap.has(lp.category_name.toLowerCase().trim())) {
        targetCatId = dbCatMap.get(lp.category_name.toLowerCase().trim())!;
      } else if (lp.category_id && dbCatIdSet.has(Number(lp.category_id))) {
        targetCatId = Number(lp.category_id);
      }
      if (targetCatId !== null && !dbCatIdSet.has(targetCatId)) {
        targetCatId = null;
      }

      const matchId = (dbProdIdSet.has(lp.id) ? lp.id : undefined) || dbProdMap.get(cleanName);

      if (matchId) {
        localToDbProdId.set(lp.id, matchId);
        if (targetCatId !== null) {
          await client.query(
            `UPDATE products SET category_id = COALESCE(category_id, $1) WHERE id = $2`,
            [targetCatId, matchId]
          );
        }
      } else {
        const ins = await client.query(
          `INSERT INTO products (name, category_id, default_unit, cost_price, selling_price, current_stock, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
          [
            lp.name.trim(),
            targetCatId,
            lp.default_unit || 'piece',
            Number(lp.cost_price || 0),
            Number(lp.selling_price || 0),
            Number(lp.current_stock || 0),
            lp.created_at || new Date().toISOString(),
          ]
        );
        const newId = ins?.rows?.[0]?.id || Math.floor(Math.random() * 100000);
        dbProdMap.set(cleanName, newId);
        dbProdIdSet.add(newId);
        localToDbProdId.set(lp.id, newId);
      }
    }

    // 3. Synchronize Purchases
    const dbPurchRes = await client.query('SELECT id, product_id, purchase_date, quantity FROM purchases');
    for (const lp of purchases) {
      const targetProdId =
        localToDbProdId.get(lp.product_id) ||
        (lp.product_name ? dbProdMap.get(lp.product_name.toLowerCase().trim()) : undefined) ||
        (dbProdIdSet.has(lp.product_id) ? lp.product_id : undefined);

      if (!targetProdId || !dbProdIdSet.has(targetProdId)) continue;

      const alreadyExists = dbPurchRes.rows.some(
        (dp: any) =>
          dp.product_id === targetProdId &&
          Math.abs(new Date(dp.purchase_date).getTime() - new Date(lp.purchase_date).getTime()) < 10000 &&
          Math.abs(Number(dp.quantity) - Number(lp.quantity)) < 0.01
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

    // 4. Synchronize Sales and Sale Items
    const dbSalesRes = await client.query('SELECT id, invoice_no FROM sales');
    const existingInvoices = new Set(dbSalesRes.rows.map((s: any) => s.invoice_no));

    for (const ls of sales) {
      if (!ls.invoice_no || existingInvoices.has(ls.invoice_no)) continue;

      let targetCustId: number | null = null;
      if (ls.customer_id) {
        targetCustId =
          localToDbCustId.get(ls.customer_id) ||
          (dbCustIdSet.has(ls.customer_id) ? ls.customer_id : null);
      }
      if (!targetCustId && ls.customer_name && dbCustMap.has(ls.customer_name.toLowerCase().trim())) {
        targetCustId = dbCustMap.get(ls.customer_name.toLowerCase().trim())!;
      }

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
      const newSaleId = saleIns?.rows?.[0]?.id || Math.floor(Math.random() * 100000);
      existingInvoices.add(ls.invoice_no);

      const itemsForSale = sale_items.filter((si: any) => si.sale_id === ls.id);
      for (const it of itemsForSale) {
        const prodId =
          localToDbProdId.get(it.product_id) ||
          (it.product_name ? dbProdMap.get(it.product_name.toLowerCase().trim()) : undefined) ||
          (dbProdIdSet.has(it.product_id) ? it.product_id : undefined);

        if (!prodId || !dbProdIdSet.has(prodId)) continue;

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

    // 5. Synchronize Due Collections
    const dbDueRes = await client.query('SELECT id, customer_id, payment_date, amount_paid FROM due_collections');
    for (const ld of due_collections) {
      const targetCustId =
        localToDbCustId.get(ld.customer_id) ||
        (dbCustIdSet.has(ld.customer_id) ? ld.customer_id : null);
      if (!targetCustId || !dbCustIdSet.has(targetCustId)) continue;

      const alreadyExists = dbDueRes.rows.some(
        (dd: any) =>
          dd.customer_id === targetCustId &&
          Math.abs(new Date(dd.payment_date).getTime() - new Date(ld.payment_date).getTime()) < 10000 &&
          Math.abs(Number(dd.amount_paid) - Number(ld.amount_paid)) < 0.01
      );

      if (!alreadyExists) {
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
    client.release();
    client = null;

    const freshState = await fetchFullDatabaseState(pool);
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
