import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = Number(params.id);
    if (!id || isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Valid Customer ID required' },
        { status: 400 }
      );
    }

    const res = await pool.query(
      `SELECT id, name, phone, address, total_due::float AS total_due, created_at 
       FROM customers 
       WHERE id = $1`,
      [id]
    );

    if (res.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, customer: res.rows[0] });
  } catch (error: any) {
    console.error('Error fetching customer by id:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch customer' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let client;
  try {
    const id = Number(params.id);
    if (!id || isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Valid Customer ID required' },
        { status: 400 }
      );
    }

    client = await pool.connect();
    await client.query('BEGIN');

    // 1. Verify customer exists
    const custRes = await client.query(
      `SELECT id, name, phone, address, total_due::float AS total_due FROM customers WHERE id = $1`,
      [id]
    );

    if (custRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    const customerToDelete = custRes.rows[0];

    // 2. Unlink historical sales so revenue and items ledger remain intact (customer_id = NULL => Walk-in/General)
    await client.query(
      `UPDATE sales SET customer_id = NULL WHERE customer_id = $1`,
      [id]
    );

    // 3. Remove customer's due collection receipts
    await client.query(
      `DELETE FROM due_collections WHERE customer_id = $1`,
      [id]
    );

    // 4. Delete customer from Khata
    await client.query(
      `DELETE FROM customers WHERE id = $1`,
      [id]
    );

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      deletedId: id,
      customer: customerToDelete,
      message: `Customer "${customerToDelete.name}" successfully deleted.`,
    });
  } catch (error: any) {
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
    }
    console.error('Error deleting customer by id:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete customer' },
      { status: 500 }
    );
  } finally {
    if (client) {
      client.release();
    }
  }
}
