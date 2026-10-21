import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock lib/db
vi.mock('@/lib/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/db')>();
  const queryMock = vi.fn();
  const clientMock = {
    query: vi.fn(),
    release: vi.fn(),
  };
  const poolMock = {
    query: queryMock,
    connect: vi.fn().mockResolvedValue(clientMock),
    on: vi.fn(),
    __clientMock: clientMock,
  };
  return {
    ...actual,
    default: poolMock,
    cleanupDuplicateCategories: vi.fn().mockResolvedValue(undefined),
    fetchFullDatabaseState: actual.fetchFullDatabaseState,
    __queryMock: queryMock,
    __clientMock: clientMock,
    __poolMock: poolMock,
  };
});

import pool from '@/lib/db';
import { GET, POST } from '@/app/api/sync/route';

describe('Multi-Device Data Sync Route (/api/sync)', () => {
  const poolMock = pool as any;
  const clientMock = (pool as any).__clientMock;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/sync fetches full database state for any connecting device', async () => {
    // Mock category count check > 0
    poolMock.query.mockImplementation((sql: string) => {
      if (sql.includes('SELECT COUNT(*)::int AS count FROM categories')) {
        return Promise.resolve({ rows: [{ count: 9 }] });
      }
      if (sql.includes('FROM categories c')) {
        return Promise.resolve({
          rows: [
            { id: 1, name: 'Live Fish (একুরিয়াম মাছ)', created_at: '2026-01-01', product_count: 1 },
          ],
        });
      }
      if (sql.includes('FROM products p')) {
        return Promise.resolve({
          rows: [
            {
              id: 10,
              name: 'Gold Fish',
              category_id: 1,
              category_name: 'Live Fish (একুরিয়াম মাছ)',
              default_unit: 'piece',
              cost_price: 50,
              selling_price: 100,
              current_stock: 10,
              created_at: '2026-01-01',
            },
          ],
        });
      }
      if (sql.includes('FROM customers')) {
        return Promise.resolve({
          rows: [
            { id: 5, name: 'Rahim', phone: '01700000000', address: 'Dhaka', total_due: 0, created_at: '2026-01-01' },
          ],
        });
      }
      if (sql.includes('FROM sales s')) {
        return Promise.resolve({
          rows: [
            { id: 1, invoice_no: 'INV-100', customer_id: 5, total_amount: 200, paid_amount: 200, due_amount: 0, sale_date: '2026-01-01', customer_name: 'Rahim', customer_phone: '01700000000' },
          ],
        });
      }
      if (sql.includes('FROM sale_items si')) {
        return Promise.resolve({
          rows: [
            { id: 1, sale_id: 1, product_id: 10, unit_type: 'piece', quantity: 2, multiplier: 1, stock_deduct_qty: 2, unit_price: 100, cost_price_snapshot: 50, subtotal: 200 },
          ],
        });
      }
      if (sql.includes('FROM purchases p')) {
        return Promise.resolve({
          rows: [
            { id: 1, product_id: 10, product_name: 'Gold Fish', unit_type: 'piece', quantity: 10, multiplier: 1, total_pieces_added: 10, unit_cost: 50, total_investment: 500, purchase_date: '2026-01-01' },
          ],
        });
      }
      if (sql.includes('FROM due_collections dc')) {
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    const res = await GET();
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.categories).toHaveLength(1);
    expect(data.categories[0].name).toBe('Live Fish (একুরিয়াম মাছ)');
    expect(data.products).toHaveLength(1);
    expect(data.products[0].name).toBe('Gold Fish');
    expect(data.customers).toHaveLength(1);
    expect(data.sales).toHaveLength(1);
  });

  it('POST /api/sync safely synchronizes offline categories, products, and sales without FK crashes', async () => {
    // Setup client mock queries
    clientMock.query.mockImplementation((sql: string, params?: any[]) => {
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes('SELECT COUNT(*)::int AS count FROM categories')) {
        return Promise.resolve({ rows: [{ count: 9 }] });
      }
      if (sql.includes('SELECT id, name FROM categories')) {
        return Promise.resolve({
          rows: [{ id: 10, name: 'Live Fish (একুরিয়াম মাছ)' }],
        });
      }
      if (sql.includes('SELECT id, name, phone FROM customers')) {
        return Promise.resolve({
          rows: [{ id: 4, name: 'Karim', phone: '01500000000' }],
        });
      }
      if (sql.includes('SELECT id, name, current_stock FROM products')) {
        return Promise.resolve({
          rows: [{ id: 1, name: 'Gold Fish', current_stock: 10 }],
        });
      }
      if (sql.includes('SELECT id, product_id, purchase_date, quantity FROM purchases')) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes('SELECT id, invoice_no FROM sales')) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes('SELECT id, customer_id, payment_date, amount_paid FROM due_collections')) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes('INSERT INTO customers')) {
        return Promise.resolve({ rows: [{ id: 99 }] });
      }
      if (sql.includes('INSERT INTO products')) {
        return Promise.resolve({ rows: [{ id: 2 }] });
      }
      if (sql.includes('INSERT INTO sales')) {
        return Promise.resolve({ rows: [{ id: 101 }] });
      }
      if (sql.includes('INSERT INTO sale_items')) {
        return Promise.resolve({ rows: [{ id: 201 }] });
      }
      if (sql.includes('INSERT INTO purchases')) {
        return Promise.resolve({ rows: [{ id: 301 }] });
      }
      return Promise.resolve({ rows: [] });
    });

    // Mock fetchFullDatabaseState on pool after commit
    poolMock.query.mockImplementation((sql: string) => {
      if (sql.includes('SELECT COUNT(*)::int AS count FROM categories')) {
        return Promise.resolve({ rows: [{ count: 9 }] });
      }
      if (sql.includes('FROM products p')) {
        return Promise.resolve({
          rows: [
            { id: 1, name: 'Gold Fish', current_stock: 10, category_name: 'Live Fish (একুরিয়াম মাছ)' },
            { id: 2, name: 'Angel Fish', current_stock: 5, category_name: 'Live Fish (একুরিয়াম মাছ)' },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    const payload = {
      categories: [{ id: 1, name: 'Live Fish (একুরিয়াম মাছ)' }],
      products: [
        {
          id: 999, // Local ID from client
          name: 'Angel Fish',
          category_id: 1, // Local category ID
          category_name: 'Live Fish (একুরিয়াম মাছ)',
          default_unit: 'piece',
          cost_price: 40,
          selling_price: 80,
          current_stock: 5,
        },
      ],
      customers: [{ id: 99, name: 'New Customer', phone: '01800000000' }],
      sales: [
        {
          id: 500,
          invoice_no: 'INV-NEW-001',
          customer_id: 99,
          total_amount: 160,
          paid_amount: 160,
          due_amount: 0,
        },
      ],
      sale_items: [
        {
          id: 501,
          sale_id: 500,
          product_id: 999,
          unit_type: 'piece',
          quantity: 2,
          multiplier: 1,
          stock_deduct_qty: 2,
          unit_price: 80,
          cost_price_snapshot: 40,
          subtotal: 160,
        },
      ],
      purchases: [],
      due_collections: [],
    };

    const req = new NextRequest('http://localhost:3000/api/sync', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(clientMock.query).toHaveBeenCalledWith('COMMIT');
    expect(clientMock.release).toHaveBeenCalled();
  });
});
