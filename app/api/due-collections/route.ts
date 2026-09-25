import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET /api/due-collections?customer_id=123
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customer_id');

    let sql = `
      SELECT 
        dc.id, 
        dc.customer_id, 
        c.name AS customer_name,
        c.phone AS customer_phone,
        dc.amount_paid::float AS amount_paid, 
        dc.note, 
        dc.payment_date
      FROM due_collections dc
      LEFT JOIN customers c ON dc.customer_id = c.id
    `;
    const params: any[] = [];

    if (customerId) {
      sql += ` WHERE dc.customer_id = $1`;
      params.push(customerId);
    }

    sql += ` ORDER BY dc.payment_date DESC LIMIT 50`;

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
  try {
    const body = await request.json();
    const { customer_id, amount_paid, note } = body;

    if (!customer_id || !amount_paid || amount_paid <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid customer ID and payment amount (> 0) are required' },
        { status: 400 }
      );
    }

    // 1. Verify customer exists and check current total_due
    const custRes = await pool.query(
      `SELECT id, name, total_due::float AS total_due FROM customers WHERE id = $1`,
      [customer_id]
    );

    if (custRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    const customer = custRes.rows[0];
    const currentDue = customer.total_due || 0;

    if (amount_paid > currentDue + 0.01) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Amount paid (৳${amount_paid}) cannot exceed total due of ৳${currentDue}` 
        },
        { status: 400 }
      );
    }

    // 2. Insert into due_collections
    // (Trigger trg_due_collections_deduct_customer_due auto-deducts total_due in customers table)
    const insertRes = await pool.query(
      `INSERT INTO due_collections (customer_id, amount_paid, note) 
       VALUES ($1, $2, $3) 
       RETURNING id, customer_id, amount_paid::float AS amount_paid, note, payment_date`,
      [customer_id, amount_paid, note || 'Cash Payment']
    );

    // 3. Fetch updated customer state
    const updatedCustRes = await pool.query(
      `SELECT id, name, phone, address, total_due::float AS total_due FROM customers WHERE id = $1`,
      [customer_id]
    );

    return NextResponse.json({
      success: true,
      message: 'Payment received successfully',
      collection: insertRes.rows[0],
      customer: updatedCustRes.rows[0]
    });
  } catch (error: any) {
    console.error('Error saving due collection:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save due collection' },
      { status: 500 }
    );
  }
}
