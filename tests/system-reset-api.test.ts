import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock lib/db
vi.mock('@/lib/db', () => {
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
  const fetchStateMock = vi.fn().mockResolvedValue({
    categories: [{ id: 1, name: 'Live Fish (একুরিয়াম মাছ)', product_count: 0 }],
    products: [],
    customers: [],
    sales: [],
    sale_items: [],
    purchases: [],
    due_collections: [],
  });
  return {
    default: poolMock,
    query: queryMock,
    fetchFullDatabaseState: fetchStateMock,
    cleanupDuplicateCategories: vi.fn().mockResolvedValue(undefined),
    __fetchStateMock: fetchStateMock,
    __queryMock: queryMock,
    __clientMock: clientMock,
    __poolMock: poolMock,
  };
});

import pool from '@/lib/db';
import { POST } from '@/app/api/system/reset/route';

describe('System Reset API Route (/api/system/reset)', () => {
  const poolMock = pool as any;
  const clientMock = (pool as any).__clientMock;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects reset requests with invalid or missing passcode with 401', async () => {
    const req = new NextRequest('http://localhost:3000/api/system/reset', {
      method: 'POST',
      body: JSON.stringify({
        mode: 'full',
        passcode: 'wrong_pin',
        confirmKeyword: 'RESET',
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Invalid security passcode');
    expect(clientMock.query).not.toHaveBeenCalled();
  });

  it('rejects reset requests with wrong confirmation keyword with 400', async () => {
    const req = new NextRequest('http://localhost:3000/api/system/reset', {
      method: 'POST',
      body: JSON.stringify({
        mode: 'full',
        passcode: '1234',
        confirmKeyword: 'DELETE',
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Confirmation keyword mismatch');
    expect(clientMock.query).not.toHaveBeenCalled();
  });

  it('successfully executes Full Factory Reset (mode: full)', async () => {
    clientMock.query.mockResolvedValue({ rows: [] });
    poolMock.query.mockImplementation((sql: string) => {
      if (sql.includes('SELECT COUNT(*)::int AS count FROM categories')) {
        return Promise.resolve({ rows: [{ count: 9 }] });
      }
      if (sql.includes('FROM categories c')) {
        return Promise.resolve({
          rows: [
            { id: 1, name: 'Live Fish (একুরিয়াম মাছ)', created_at: '2026-01-01', product_count: 0 },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    const req = new NextRequest('http://localhost:3000/api/system/reset', {
      method: 'POST',
      body: JSON.stringify({
        mode: 'full',
        passcode: '1234',
        confirmKeyword: 'RESET',
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.mode).toBe('full');
    expect(data.message).toContain('Full factory reset completed successfully');

    // Verify transaction lifecycle and truncate
    expect(clientMock.query).toHaveBeenCalledWith('BEGIN');
    expect(clientMock.query).toHaveBeenCalledWith(
      expect.stringContaining('TRUNCATE TABLE sale_items, sales, due_collections, purchases, products, customers, categories')
    );
    expect(clientMock.query).toHaveBeenCalledWith('COMMIT');
    expect(clientMock.release).toHaveBeenCalled();
  });

  it('successfully executes Transactions & Ledger Reset (mode: transactions_only)', async () => {
    clientMock.query.mockResolvedValue({ rows: [] });
    poolMock.query.mockImplementation((sql: string) => {
      if (sql.includes('SELECT COUNT(*)::int AS count FROM categories')) {
        return Promise.resolve({ rows: [{ count: 9 }] });
      }
      if (sql.includes('FROM products p')) {
        return Promise.resolve({
          rows: [
            { id: 1, name: 'Guppy', category_id: 1, default_unit: 'piece', cost_price: 30, selling_price: 60, current_stock: 10 },
          ],
        });
      }
      if (sql.includes('FROM customers')) {
        return Promise.resolve({
          rows: [
            { id: 5, name: 'Rahim', phone: '01700000000', total_due: 0 },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    const req = new NextRequest('http://localhost:3000/api/system/reset', {
      method: 'POST',
      body: JSON.stringify({
        mode: 'transactions_only',
        passcode: 'admin123',
        confirmKeyword: 'reset',
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.mode).toBe('transactions_only');
    expect(data.message).toContain('Transactions and ledger records reset successfully');

    // Verify transaction execution
    expect(clientMock.query).toHaveBeenCalledWith('BEGIN');
    expect(clientMock.query).toHaveBeenCalledWith(
      expect.stringContaining('TRUNCATE TABLE sale_items, sales, due_collections, purchases')
    );
    expect(clientMock.query).toHaveBeenCalledWith('UPDATE customers SET total_due = 0.00;');
    expect(clientMock.query).toHaveBeenCalledWith('COMMIT');
    expect(clientMock.release).toHaveBeenCalled();
  });

  it('handles database exceptions with rollback and 500 error response', async () => {
    clientMock.query.mockImplementation((sql: string) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') return Promise.resolve({ rows: [] });
      throw new Error('Database connection terminated abnormally');
    });

    const req = new NextRequest('http://localhost:3000/api/system/reset', {
      method: 'POST',
      body: JSON.stringify({
        mode: 'full',
        passcode: '1234',
        confirmKeyword: 'RESET',
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Database connection terminated abnormally');
    expect(clientMock.query).toHaveBeenCalledWith('ROLLBACK');
    expect(clientMock.release).toHaveBeenCalled();
  });
});
