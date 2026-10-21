import { NextRequest, NextResponse } from 'next/server';
import pool, { cleanupDuplicateCategories } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await cleanupDuplicateCategories(pool);

    const result = await pool.query(`
      SELECT 
        c.id,
        c.name,
        c.created_at,
        COUNT(p.id)::int AS product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id
      GROUP BY c.id, c.name, c.created_at
      ORDER BY c.id ASC
    `);
    
    return NextResponse.json({ success: true, categories: result.rows });
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Category name is required' },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();

    // Check if category with same name already exists
    const existing = await pool.query(
      `SELECT c.id, c.name, c.created_at, COUNT(p.id)::int AS product_count 
       FROM categories c 
       LEFT JOIN products p ON c.id = p.category_id 
       WHERE LOWER(c.name) = LOWER($1) 
       GROUP BY c.id, c.name, c.created_at LIMIT 1`,
      [trimmedName]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json({ success: true, category: existing.rows[0] });
    }

    const result = await pool.query(
      `INSERT INTO categories (name, created_at)
       VALUES ($1, NOW())
       RETURNING id, name, created_at`,
      [trimmedName]
    );

    return NextResponse.json({
      success: true,
      category: { ...result.rows[0], product_count: 0 },
    });
  } catch (error: any) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create category' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name } = body;

    if (!id || !name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Category ID and new name are required' },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();

    const result = await pool.query(
      `UPDATE categories 
       SET name = $1 
       WHERE id = $2 
       RETURNING id, name, created_at`,
      [trimmedName, Number(id)]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 });
    }

    const countRes = await pool.query(
      `SELECT COUNT(id)::int AS product_count FROM products WHERE category_id = $1`,
      [Number(id)]
    );

    return NextResponse.json({
      success: true,
      category: {
        ...result.rows[0],
        product_count: countRes.rows[0]?.product_count || 0,
      },
    });
  } catch (error: any) {
    console.error('Error updating category:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update category' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get('id');
    const isAll = searchParams.get('all') === 'true';
    const body = request.headers.get('content-type')?.includes('application/json')
      ? await request.json().catch(() => ({}))
      : {};
    const deleteAll = isAll || body.all === true;

    if (deleteAll) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('UPDATE products SET category_id = NULL');
        await client.query('DELETE FROM categories');
        await client.query("SELECT setval('categories_id_seq', 1, false)").catch(() => {});
        await client.query('COMMIT');
        return NextResponse.json({ success: true, message: 'All categories deleted successfully' });
      } catch (err: any) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    const id = Number(idParam || body.id);

    if (!id) {
      return NextResponse.json({ success: false, error: 'Category ID is required' }, { status: 400 });
    }

    // Set any products under this category to NULL so products are safely preserved
    await pool.query(`UPDATE products SET category_id = NULL WHERE category_id = $1`, [id]);

    const result = await pool.query(`DELETE FROM categories WHERE id = $1 RETURNING id, name`, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, deletedId: id, category: result.rows[0] });
  } catch (error: any) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete category' },
      { status: 500 }
    );
  }
}
