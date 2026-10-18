import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryStr = searchParams.get('q') || '';
    const all = searchParams.get('all') === 'true' || !queryStr.trim();
    
    let sql = `
      SELECT 
        id, 
        name, 
        phone, 
        address, 
        total_due::float AS total_due,
        created_at
      FROM customers
    `;
    const params: any[] = [];
    
    if (queryStr.trim()) {
      sql += ` WHERE name ILIKE $1 OR phone ILIKE $1`;
      params.push(`%${queryStr.trim()}%`);
    }
    
    sql += ` ORDER BY name ASC`;
    if (!all) {
      sql += ` LIMIT 20`;
    }
    
    const result = await pool.query(sql, params);
    return NextResponse.json({ success: true, customers: result.rows });
  } catch (error: any) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  let client;
  try {
    const body = await request.json();
    const { name, phone, address, initial_due } = body;
    
    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Customer name is required' },
        { status: 400 }
      );
    }
    
    const cleanName = name.trim();
    const cleanPhone = phone ? phone.trim() : '';
    const cleanAddress = address ? address.trim() : '';
    const initialDueAmount = Number(initial_due) || 0;

    client = await pool.connect();
    await client.query('BEGIN');

    // Check if customer already exists by phone (if provided) or case-insensitive name
    let existingRes;
    if (cleanPhone) {
      existingRes = await client.query(
        `SELECT id, name, phone, address, total_due::float AS total_due, created_at 
         FROM customers 
         WHERE phone = $1 OR LOWER(name) = LOWER($2) 
         LIMIT 1`,
        [cleanPhone, cleanName]
      );
    } else {
      existingRes = await client.query(
        `SELECT id, name, phone, address, total_due::float AS total_due, created_at 
         FROM customers 
         WHERE LOWER(name) = LOWER($1) 
         LIMIT 1`,
        [cleanName]
      );
    }

    if (existingRes.rows.length > 0) {
      const existing = existingRes.rows[0];
      let updatedTotalDue = existing.total_due;
      let updatedAddress = existing.address;

      if (initialDueAmount > 0 || (cleanAddress && !existing.address)) {
        updatedTotalDue += initialDueAmount;
        updatedAddress = cleanAddress || existing.address;
        
        await client.query(
          `UPDATE customers 
           SET total_due = $1, address = $2 
           WHERE id = $3`,
          [updatedTotalDue, updatedAddress, existing.id]
        );
      }

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        customer: {
          ...existing,
          total_due: updatedTotalDue,
          address: updatedAddress,
        },
        alreadyExists: true,
      });
    }

    const result = await client.query(
      `INSERT INTO customers (name, phone, address, total_due, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id, name, phone, address, total_due::float AS total_due, created_at`,
      [cleanName, cleanPhone, cleanAddress, initialDueAmount]
    );

    await client.query('COMMIT');
    
    return NextResponse.json({ success: true, customer: result.rows[0] });
  } catch (error: any) {
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
    }
    console.error('Error creating customer:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create customer' },
      { status: 500 }
    );
  } finally {
    if (client) {
      client.release();
    }
  }
}

export async function DELETE(request: NextRequest) {
  let client;
  try {
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get('id');
    const body = request.headers.get('content-type')?.includes('application/json')
      ? await request.json().catch(() => ({}))
      : {};
    const id = Number(idParam || body.id);

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Valid Customer ID is required' },
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

    // 4. Delete the customer record from Khata
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
    console.error('Error deleting customer:', error);
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
