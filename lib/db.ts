import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgres://niyamulhasan@localhost:5432/niloy_friend_shop';

const pool = new Pool({
  connectionString,
});

export default pool;

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  // console.log('executed query', { text, duration, rows: res.rowCount });
  return res;
}
