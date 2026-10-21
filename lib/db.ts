import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgres://niyamulhasan@localhost:5432/niloy_friend_shop';

// Use a global pool instance in development to avoid exhausting PostgreSQL connections during hot reloading
const globalForPg = globalThis as unknown as { pgPool?: Pool; pgConnectionString?: string };

const isRemote =
  !connectionString.includes('localhost') &&
  !connectionString.includes('127.0.0.1');

// If connection string has changed (e.g. from local to Supabase), recreate pool
if (globalForPg.pgPool && globalForPg.pgConnectionString !== connectionString) {
  globalForPg.pgPool.end().catch(() => {});
  globalForPg.pgPool = undefined;
}

const pool =
  globalForPg.pgPool ??
  new Pool({
    connectionString,
    ssl: isRemote ? { rejectUnauthorized: false } : undefined,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

pool.on('error', (err) => {
  console.error('Unexpected error on idle pg client pool:', err.message);
});

if (process.env.NODE_ENV !== 'production') {
  globalForPg.pgPool = pool;
  globalForPg.pgConnectionString = connectionString;
}

export default pool;

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  // console.log('executed query', { text, duration, rows: res.rowCount });
  return res;
}

/**
 * Automatically cleans up duplicate categories by name in PostgreSQL.
 * Reassigns products from duplicate categories to the lowest id with the same name,
 * and deletes extraneous duplicate category rows.
 */
export async function cleanupDuplicateCategories(clientOrPool: any) {
  try {
    // 1. Reassign products pointing to duplicate categories to the lowest id with the same name
    await clientOrPool.query(`
      UPDATE products p
      SET category_id = c_min.min_id
      FROM (
        SELECT id, MIN(id) OVER (PARTITION BY LOWER(TRIM(name))) AS min_id
        FROM categories
      ) c_min
      WHERE p.category_id = c_min.id AND c_min.id <> c_min.min_id
    `);

    // 2. Delete duplicate category rows keeping only the row with the lowest id
    await clientOrPool.query(`
      DELETE FROM categories
      WHERE id IN (
        SELECT id FROM (
          SELECT id, ROW_NUMBER() OVER (PARTITION BY LOWER(TRIM(name)) ORDER BY id ASC) as rn
          FROM categories
        ) t WHERE t.rn > 1
      )
    `);
  } catch (e) {
    // Silently continue if table is not yet created or inaccessible
  }
}

/**
 * Fetch complete database snapshot with categories deduplicated
 */
export async function fetchFullDatabaseState(clientOrPool: any) {
  await cleanupDuplicateCategories(clientOrPool);

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
        GREATEST(0, p.cost_price)::float AS cost_price,
        GREATEST(0, p.selling_price)::float AS selling_price,
        GREATEST(0, p.current_stock)::float AS current_stock,
        p.created_at,
        COALESCE(p.is_deleted, false) AS is_deleted
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE COALESCE(p.is_deleted, false) = false
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
        COALESCE(pr.name, 'Product') AS product_name,
        si.unit_type,
        si.quantity::float AS quantity,
        si.multiplier,
        si.stock_deduct_qty::float AS stock_deduct_qty,
        si.unit_price::float AS unit_price,
        si.cost_price_snapshot::float AS cost_price_snapshot,
        si.subtotal::float AS subtotal
      FROM sale_items si
      LEFT JOIN products pr ON si.product_id = pr.id
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
