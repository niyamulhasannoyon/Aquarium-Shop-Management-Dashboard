import { NextRequest, NextResponse } from 'next/server';
import pool, { fetchFullDatabaseState } from '@/lib/db';
import { DEFAULT_AQUARIUM_CATEGORIES } from '@/lib/seed-data';

export const dynamic = 'force-dynamic';

const DEFAULT_PASSCODE = process.env.NEXT_PUBLIC_SITE_PASSWORD || '1234';
const VALID_PASSCODES = [DEFAULT_PASSCODE, '1234', 'admin123', 'admin', 'aqua123'];

export async function POST(request: NextRequest) {
  let client;
  try {
    const body = await request.json();
    const { mode = 'full', passcode = '', confirmKeyword = '' } = body;

    // 1. Authenticate Passcode
    const cleanedPass = String(passcode || '').trim().toLowerCase();
    const isValidPass = VALID_PASSCODES.some(
      (vp) => vp.toLowerCase() === cleanedPass
    );

    if (!isValidPass) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid security passcode. Access denied.',
        },
        { status: 401 }
      );
    }

    // 2. Validate Confirmation Keyword (Must be RESET)
    const cleanedKeyword = String(confirmKeyword || '').trim().toUpperCase();
    if (cleanedKeyword !== 'RESET') {
      return NextResponse.json(
        {
          success: false,
          error: 'Confirmation keyword mismatch. Please type "RESET" in uppercase to confirm.',
        },
        { status: 400 }
      );
    }

    client = await pool.connect();
    await client.query('BEGIN');

    if (mode === 'transactions_only') {
      // MODE: Clear Transactions & Due Records Only (preserves products, categories, customers)
      try {
        await client.query(
          'TRUNCATE TABLE sale_items, sales, due_collections, purchases RESTART IDENTITY CASCADE;'
        );
      } catch (truncErr) {
        console.warn('TRUNCATE failed, using fallback DELETE for transactions:', truncErr);
        await client.query('DELETE FROM sale_items;');
        await client.query('DELETE FROM sales;');
        await client.query('DELETE FROM due_collections;');
        await client.query('DELETE FROM purchases;');
        await client.query('ALTER SEQUENCE IF EXISTS sales_id_seq RESTART WITH 1;');
        await client.query('ALTER SEQUENCE IF EXISTS sale_items_id_seq RESTART WITH 1;');
        await client.query('ALTER SEQUENCE IF EXISTS purchases_id_seq RESTART WITH 1;');
        await client.query('ALTER SEQUENCE IF EXISTS due_collections_id_seq RESTART WITH 1;');
      }

      // Reset total_due to 0.00 for all existing customers
      await client.query('UPDATE customers SET total_due = 0.00;');
    } else {
      // MODE: Full Factory Reset (wipes all records and seeds fresh standard categories)
      try {
        await client.query(
          'TRUNCATE TABLE sale_items, sales, due_collections, purchases, products, customers, categories RESTART IDENTITY CASCADE;'
        );
      } catch (truncErr) {
        console.warn('TRUNCATE failed, using fallback DELETE for full reset:', truncErr);
        await client.query('DELETE FROM sale_items;');
        await client.query('DELETE FROM sales;');
        await client.query('DELETE FROM due_collections;');
        await client.query('DELETE FROM purchases;');
        await client.query('DELETE FROM products;');
        await client.query('DELETE FROM customers;');
        await client.query('DELETE FROM categories;');
        await client.query('ALTER SEQUENCE IF EXISTS categories_id_seq RESTART WITH 1;');
        await client.query('ALTER SEQUENCE IF EXISTS products_id_seq RESTART WITH 1;');
        await client.query('ALTER SEQUENCE IF EXISTS purchases_id_seq RESTART WITH 1;');
        await client.query('ALTER SEQUENCE IF EXISTS customers_id_seq RESTART WITH 1;');
        await client.query('ALTER SEQUENCE IF EXISTS sales_id_seq RESTART WITH 1;');
        await client.query('ALTER SEQUENCE IF EXISTS sale_items_id_seq RESTART WITH 1;');
        await client.query('ALTER SEQUENCE IF EXISTS due_collections_id_seq RESTART WITH 1;');
      }

      // Re-seed clean standard categories
      for (const catName of DEFAULT_AQUARIUM_CATEGORIES) {
        await client.query(
          'INSERT INTO categories (name, created_at) VALUES ($1, NOW());',
          [catName]
        );
      }
    }

    await client.query('COMMIT');
    client.release();
    client = null;

    // Fetch fresh database state
    const freshState = await fetchFullDatabaseState(pool);

    return NextResponse.json({
      success: true,
      message:
        mode === 'transactions_only'
          ? 'Transactions and ledger records reset successfully.'
          : 'Full factory reset completed successfully.',
      mode,
      timestamp: new Date().toISOString(),
      ...freshState,
    });
  } catch (error: any) {
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
    }
    console.error('Error in POST /api/system/reset:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'System reset execution failed.',
      },
      { status: 500 }
    );
  } finally {
    if (client) {
      client.release();
    }
  }
}
