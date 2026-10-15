import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgres://niyamulhasan@localhost:5432/niloy_friend_shop';

// Use a global pool instance in development to avoid exhausting PostgreSQL connections during hot reloading
const globalForPg = globalThis as unknown as { pgPool?: Pool };

const isRemote =
  !connectionString.includes('localhost') &&
  !connectionString.includes('127.0.0.1');

const pool =
  globalForPg.pgPool ??
  new Pool({
    connectionString,
    ssl: isRemote ? { rejectUnauthorized: false } : undefined,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPg.pgPool = pool;
}

export default pool;

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  // console.log('executed query', { text, duration, rows: res.rowCount });
  return res;
}
