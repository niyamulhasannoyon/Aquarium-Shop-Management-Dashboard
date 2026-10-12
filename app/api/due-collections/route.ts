import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/due-collections?customer_id=123
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customer_id');

    let sql = `
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
    `;
    const params: any[] = [];

    if (customerId) {
      sql += ` WHERE dc.customer_id = $1`;
      params.push(Number(customerId));
    }

    sql += ` ORDER BY dc.payment_date DESC, dc.id DESC`;

    const result = await pool.query(sql, params);
    return NextResponse.json({ success: true, collections: result.rows });
  } catch (error: any) {
    console.error('Error fetching due collections:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch due collections' },
      { status: 500 }
    );
  }
}

// POST /api/due-collections
// Body: { customer_id: number, amount_paid: number, note: string }
export async function POST(request: NextRequest) {
  let client;
  try {
    const body = await request.json();
    const { customer_id, customerId, amount_paid, amountPaid, amount, note } = body;

    const parsedCustomerId = Number(customer_id || customerId);
    const parsedAmount = Number(amount_paid ?? amountPaid ?? amount ?? 0);

    if (!parsedCustomerId || parsedAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid customer ID and positive payment amount are required' },
        { status: 400 }
      );
    }

    client = await pool.connect();
    await client.query('BEGIN');

    // 1. Verify customer exists
    const custRes = await client.query(
      `SELECT id, name, total_due::float AS total_due FROM customers WHERE id = $1 FOR UPDATE`,
      [parsedCustomerId]
    );

    if (custRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    // 2. Insert into due_collections
    // (Trigger trg_due_collections_deduct_customer_due auto-deducts total_due in customers table)
    const insertRes = await client.query(
      `INSERT INTO due_collections (customer_id, amount_paid, note, payment_date) 
       VALUES ($1, $2, $3, NOW()) 
       RETURNING id, customer_id, amount_paid::float AS amount_paid, note, payment_date`,
      [parsedCustomerId, parsedAmount, note || 'Cash Payment']
    );

    // 3. Fetch updated customer state
    const updatedCustRes = await client.query(
      `SELECT id, name, phone, address, total_due::float AS total_due FROM customers WHERE id = $1`,
      [parsedCustomerId]
    );

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      message: 'Payment received successfully',
      collection: insertRes.rows[0],
      customer: updatedCustRes.rows[0],
    });
  } catch (error: any) {
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
    }
    console.error('Error processing due collection:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process payment' },
      { status: 500 }
    );
  } finally {
    if (client) {
      client.release();
    }
  }
}
