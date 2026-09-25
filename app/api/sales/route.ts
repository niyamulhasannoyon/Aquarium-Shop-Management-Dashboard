import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  
  try {
    const body = await request.json();
    const {
      isWalkIn,
      customerId,
      walkInName,
      walkInPhone,
      items,
      totalAmount,
      paidAmount,
      dueAmount,
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Cart is empty. Cannot process sale.' },
        { status: 400 }
      );
    }

    if (totalAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Total amount must be greater than zero.' },
        { status: 400 }
      );
    }

    const calculatedDue = Math.max(0, Number((totalAmount - paidAmount).toFixed(2)));

    // Begin atomic transaction
    await client.query('BEGIN');

    let finalCustomerId: number | null = null;
    let customerName = 'Walk-in Customer';
    let customerPhone = '';

    if (isWalkIn) {
      if (calculatedDue > 0) {
        if (!walkInName || !walkInPhone || !walkInName.trim() || !walkInPhone.trim()) {
          await client.query('ROLLBACK');
          return NextResponse.json(
            { success: false, error: 'Customer Name and Phone are required when Walk-in sale has due.' },
            { status: 400 }
          );
        }

        customerName = walkInName.trim();
        customerPhone = walkInPhone.trim();

        // Check if existing customer matches phone number
        const existingCustRes = await client.query(
          `SELECT id, name FROM customers WHERE phone = $1 LIMIT 1`,
          [customerPhone]
        );

        if (existingCustRes.rows.length > 0) {
          finalCustomerId = existingCustRes.rows[0].id;
          customerName = existingCustRes.rows[0].name;
        } else {
          // Insert new customer
          const newCustRes = await client.query(
            `INSERT INTO customers (name, phone) VALUES ($1, $2) RETURNING id`,
            [customerName, customerPhone]
          );
          finalCustomerId = newCustRes.rows[0].id;
        }
      }
    } else {
      if (!customerId) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: 'Please select an existing customer or switch to Walk-in Customer.' },
          { status: 400 }
        );
      }
      finalCustomerId = Number(customerId);
      const custRes = await client.query(`SELECT name, phone FROM customers WHERE id = $1`, [finalCustomerId]);
      if (custRes.rows.length > 0) {
        customerName = custRes.rows[0].name;
        customerPhone = custRes.rows[0].phone;
      }
    }

    // Generate unique Invoice Number
    const dateStr = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(2, 10); // YYMMDDHH
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const invoiceNo = `INV-${dateStr}-${randomSuffix}`;

    // Insert Sale record
    const saleRes = await client.query(
      `INSERT INTO sales (invoice_no, customer_id, total_amount, paid_amount, due_amount)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, invoice_no, sale_date`,
      [invoiceNo, finalCustomerId, totalAmount, paidAmount, calculatedDue]
    );

    const saleId = saleRes.rows[0].id;

    // Process Sale Items and validate stock
    const processedItems = [];

    for (const item of items) {
      const productId = item.productId;
      const unitType = item.unitType || 'Single';
      const multiplier = item.multiplier || (unitType === 'Pair' ? 2 : 1);
      const quantity = Number(item.quantity);
      const stockDeductQty = quantity * multiplier;
      const unitPrice = Number(item.price);
      const subtotal = Number((quantity * unitPrice).toFixed(2));

      // Lock product row for update & check stock
      const prodRes = await client.query(
        `SELECT id, name, current_stock::float AS current_stock, cost_price::float AS cost_price FROM products WHERE id = $1 FOR UPDATE`,
        [productId]
      );

      if (prodRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: `Product ID ${productId} not found.` },
          { status: 400 }
        );
      }

      const product = prodRes.rows[0];

      if (stockDeductQty > product.current_stock) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { 
            success: false, 
            error: `Insufficient stock for "${product.name}". Requested ${stockDeductQty} pcs, but only ${product.current_stock} pcs available.` 
          },
          { status: 400 }
        );
      }

      const costPriceSnapshot = product.cost_price;

      // Insert into sale_items (triggers trg_sale_items_deduct_stock)
      await client.query(
        `INSERT INTO sale_items (sale_id, product_id, unit_type, quantity, multiplier, stock_deduct_qty, unit_price, cost_price_snapshot, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
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

      processedItems.push({
        productId,
        name: product.name,
        unitType,
        quantity,
        multiplier,
        stockDeductQty,
        unitPrice,
        subtotal,
      });
    }

    // Commit Transaction
    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      sale: {
        id: saleId,
        invoiceNo: saleRes.rows[0].invoice_no,
        saleDate: saleRes.rows[0].sale_date,
        customerName,
        customerPhone,
        totalAmount,
        paidAmount,
        dueAmount: calculatedDue,
        items: processedItems,
      }
    });

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error processing sale:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'An error occurred during checkout.' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
