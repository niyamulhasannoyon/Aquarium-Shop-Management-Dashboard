import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET /api/customers/[id]/ledger
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const customerId = params.id;

    if (!customerId) {
      return NextResponse.json(
        { success: false, error: 'Customer ID required' },
        { status: 400 }
      );
    }

    // 1. Fetch customer details
    const custRes = await pool.query(
      `SELECT id, name, phone, address, total_due::float AS total_due, created_at FROM customers WHERE id = $1`,
      [customerId]
    );

    if (custRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    const customer = custRes.rows[0];

    // 2. Fetch sales for customer
    const salesRes = await pool.query(
      `SELECT 
        id, 
        invoice_no, 
        total_amount::float AS total_amount, 
        paid_amount::float AS paid_amount, 
        due_amount::float AS due_amount, 
        sale_date 
       FROM sales 
       WHERE customer_id = $1 
       ORDER BY sale_date ASC`,
      [customerId]
    );

    // 3. Fetch due collections for customer
    const colRes = await pool.query(
      `SELECT 
        id, 
        amount_paid::float AS amount_paid, 
        note, 
        payment_date 
       FROM due_collections 
       WHERE customer_id = $1 
       ORDER BY payment_date ASC`,
      [customerId]
    );

    // 4. Combine and compute running balance
    interface RawEvent {
      id: string;
      type: 'sale' | 'collection';
      timestamp: number;
      dateStr: string;
      ref: string;
      amount: number;
      paid: number;
      due_added: number;
      note?: string;
    }

    const events: RawEvent[] = [];

    salesRes.rows.forEach((s: any) => {
      events.push({
        id: `sale-${s.id}`,
        type: 'sale',
        timestamp: new Date(s.sale_date).getTime(),
        dateStr: s.sale_date,
        ref: s.invoice_no,
        amount: s.total_amount,
        paid: s.paid_amount,
        due_added: s.due_amount,
      });
    });

    colRes.rows.forEach((c: any) => {
      events.push({
        id: `col-${c.id}`,
        type: 'collection',
        timestamp: new Date(c.payment_date).getTime(),
        dateStr: c.payment_date,
        ref: `REC-${c.id.toString().padStart(4, '0')}`,
        amount: c.amount_paid,
        paid: c.amount_paid,
        due_added: 0,
        note: c.note,
      });
    });

    // Sort ascending to calculate running balance
    events.sort((a, b) => a.timestamp - b.timestamp);

    let runningBalance = 0;
    const ledger = events.map((e) => {
      if (e.type === 'sale') {
        runningBalance += e.due_added;
      } else {
        runningBalance -= e.paid;
      }
      return {
        id: e.id,
        type: e.type,
        date: e.dateStr,
        reference: e.ref,
        amount: e.amount,
        paid: e.paid,
        due_added: e.due_added,
        payment_method_or_note: e.note,
        running_balance: Math.max(0, Number(runningBalance.toFixed(2))),
      };
    });

    // Reverse for descending timeline view
    ledger.reverse();

    return NextResponse.json({
      success: true,
      customer,
      ledger
    });
  } catch (error: any) {
    console.error('Error fetching customer ledger:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch ledger' },
      { status: 500 }
    );
  }
}
