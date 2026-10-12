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
  try {
    const body = await request.json();
    const { name, phone, address, initial_due } = body;
    
    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Customer name is required' },
        { status: 400 }
      );
    }
    
    const cleanPhone = phone ? phone.trim() : '';
    const cleanAddress = address ? address.trim() : '';
    const initialDueAmount = Number(initial_due) || 0;
    
    const result = await pool.query(
      `INSERT INTO customers (name, phone, address, total_due, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id, name, phone, address, total_due::float AS total_due, created_at`,
      [name.trim(), cleanPhone, cleanAddress, initialDueAmount]
    );
    
    return NextResponse.json({ success: true, customer: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating customer:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create customer' },
      { status: 500 }
    );
  }
}
