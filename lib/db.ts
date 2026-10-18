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
