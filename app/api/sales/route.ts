import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const salesRes = await pool.query(`
      SELECT 
        s.id,
        s.invoice_no,
        s.customer_id,
        s.total_amount::float AS total_amount,
        s.paid_amount::float AS paid_amount,
        s.due_amount::float AS due_amount,
        s.sale_date,
        COALESCE(c.name, 'General Customer') AS customer_name,
        COALESCE(c.phone, '') AS customer_phone
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      ORDER BY s.sale_date DESC, s.id DESC
    `);

    const itemsRes = await pool.query(`
      SELECT 
        si.id,
        si.sale_id,
        si.product_id,
        si.unit_type,
        si.quantity::float AS quantity,
        si.multiplier,
        si.stock_deduct_qty::float AS stock_deduct_qty,
        si.unit_price::float AS unit_price,
        si.cost_price_snapshot::float AS cost_price_snapshot,
        si.subtotal::float AS subtotal
      FROM sale_items si
      ORDER BY si.id ASC
    `);

    return NextResponse.json({
      success: true,
      sales: salesRes.rows,
      sale_items: itemsRes.rows,
    });
  } catch (error: any) {
    console.error('Error fetching sales:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch sales' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  let client;
  
  try {
    client = await pool.connect();
    const body = await request.json();
    const {
      isWalkIn,
      customerId,
      customer_id,
      walkInName,
      walkInPhone,
      customerName: bodyCustomerName,
      customerPhone: bodyCustomerPhone,
      new_customer,
      items,
      totalAmount,
      total_amount,
      paidAmount,
      paid_amount,
      dueAmount,
      due_amount,
      sale_date,
    } = body;

    const parsedTotal = Number(totalAmount ?? total_amount ?? 0);
    const parsedPaid = Number(paidAmount ?? paid_amount ?? 0);
    const parsedDue = dueAmount !== undefined ? Number(dueAmount) : due_amount !== undefined ? Number(due_amount) : Math.max(0, Number((parsedTotal - parsedPaid).toFixed(2)));

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Cart is empty. Cannot process sale.' },
        { status: 400 }
      );
    }

    if (parsedTotal <= 0) {
      return NextResponse.json(
        { success: false, error: 'Total amount must be greater than zero.' },
        { status: 400 }
      );
    }

    // Begin atomic transaction
    await client.query('BEGIN');

    let finalCustomerId: number | null = null;
    let customerName = 'General Customer';
    let customerPhone = '';

    const targetCustId = customerId || customer_id;
    const providedName = (walkInName || bodyCustomerName || new_customer?.name || '').trim();
    const providedPhone = (walkInPhone || bodyCustomerPhone || new_customer?.phone || '').trim();

    if (targetCustId) {
      const custRes = await client.query(
        `SELECT id, name, phone FROM customers WHERE id = $1`,
        [Number(targetCustId)]
      );
      if (custRes.rows.length > 0) {
        finalCustomerId = custRes.rows[0].id;
        customerName = custRes.rows[0].name;
        customerPhone = custRes.rows[0].phone || '';
      }
    }

    // If customer was not found by ID, look up or create from provided name/phone
    if (!finalCustomerId && providedName) {
      customerName = providedName;
      customerPhone = providedPhone;

      const isGeneric = ['general customer', 'walk-in customer', 'walk in', 'cash customer', 'সাধারণ খদ্দের', 'ক্যাশ খদ্দের'].includes(
        providedName.toLowerCase()
      );

      if (isGeneric && (isWalkIn || parsedDue === 0)) {
        finalCustomerId = null;
      } else {
        // Check if existing customer matches name or phone number
        let existingCustRes;
        if (customerPhone) {
          existingCustRes = await client.query(
            `SELECT id, name, phone FROM customers WHERE phone = $1 OR LOWER(name) = LOWER($2) LIMIT 1`,
            [customerPhone, customerName]
          );
        } else {
          existingCustRes = await client.query(
            `SELECT id, name, phone FROM customers WHERE LOWER(name) = LOWER($1) LIMIT 1`,
            [customerName]
          );
        }

        if (existingCustRes && existingCustRes.rows.length > 0) {
          finalCustomerId = existingCustRes.rows[0].id;
          customerName = existingCustRes.rows[0].name;
          customerPhone = existingCustRes.rows[0].phone || customerPhone;
        } else if (isWalkIn && parsedDue === 0) {
          finalCustomerId = null;
        } else {
          // Automatically insert new customer
          const newCustRes = await client.query(
            `INSERT INTO customers (name, phone, address, total_due, created_at)
             VALUES ($1, $2, '', 0, NOW())
             RETURNING id, name, phone, address, total_due::float AS total_due, created_at`,
            [customerName, customerPhone]
          );
          finalCustomerId = newCustRes.rows[0].id;
        }
      }
    }

    // Generate unique Invoice Number
    const dateStr = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(2, 10);
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const invoiceNo = body.invoice_no || body.invoiceNo || `INV-${dateStr}-${randomSuffix}`;

    // Insert Sale record
    const saleDateVal = sale_date || new Date().toISOString();
    const saleRes = await client.query(
      `INSERT INTO sales (invoice_no, customer_id, total_amount, paid_amount, due_amount, sale_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, invoice_no, customer_id, total_amount::float AS total_amount, paid_amount::float AS paid_amount, due_amount::float AS due_amount, sale_date`,
      [invoiceNo, finalCustomerId, parsedTotal, parsedPaid, parsedDue, saleDateVal]
    );

    const saleId = saleRes.rows[0].id;

    // Process Sale Items
    const processedItems = [];

    for (const item of items) {
      const productId = Number(item.productId || item.product_id);
      const unitType = item.unitType || item.unit_type || 'Single';
      const multiplier = Number(item.multiplier || (unitType === 'Pair' || unitType === 'জোড়া' ? 2 : 1));
      const quantity = Number(item.quantity || 1);
      const stockDeductQty = Number(item.stock_deduct_qty ?? item.stockDeductQty ?? (quantity * multiplier));
      const unitPrice = Number(item.price ?? item.unit_price ?? item.unitPrice ?? 0);
      const subtotal = Number(item.subtotal ?? (quantity * unitPrice).toFixed(2));

      // Get product info snapshot
      const prodRes = await client.query(
        `SELECT id, name, current_stock::float AS current_stock, cost_price::float AS cost_price FROM products WHERE id = $1 FOR UPDATE`,
        [productId]
      );

      let costPriceSnapshot = 0;
      let prodName = 'Product';

      if (prodRes.rows.length > 0) {
        costPriceSnapshot = Number(prodRes.rows[0].cost_price || 0);
        prodName = prodRes.rows[0].name;
      }

      // Insert into sale_items (triggers trg_sale_items_deduct_stock)
      const itemInsert = await client.query(
        `INSERT INTO sale_items (sale_id, product_id, unit_type, quantity, multiplier, stock_deduct_qty, unit_price, cost_price_snapshot, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, sale_id, product_id, unit_type, quantity::float AS quantity, multiplier, stock_deduct_qty::float AS stock_deduct_qty, unit_price::float AS unit_price, cost_price_snapshot::float AS cost_price_snapshot, subtotal::float AS subtotal`,
        [
          saleId,
          productId,
          unitType,
          quantity,
          multiplier,
          stockDeductQty,
          unitPrice,
          costPriceSnapshot,
          subtotal
        ]
      );

      processedItems.push(itemInsert.rows[0]);
    }

    // Fetch trigger-updated customer record if linked
    let customerData = null;
    if (finalCustomerId) {
      const cRes = await client.query(
        `SELECT id, name, phone, address, total_due::float AS total_due, created_at FROM customers WHERE id = $1`,
        [finalCustomerId]
      );
      if (cRes.rows.length > 0) {
        customerData = cRes.rows[0];
      }
    }

    // Commit Transaction
    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      sale: {
        id: saleId,
        invoice_no: invoiceNo,
        customer_id: finalCustomerId,
        total_amount: parsedTotal,
        paid_amount: parsedPaid,
        due_amount: parsedDue,
        sale_date: saleRes.rows[0].sale_date,
        customer_name: customerName,
        customer_phone: customerPhone,
      },
      customer: customerData,
      sale_items: processedItems,
    });

  } catch (error: any) {
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
    }
    console.error('Error processing sale:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'An error occurred during checkout.' },
      { status: 500 }
    );
  } finally {
    if (client) {
      client.release();
    }
  }
}
