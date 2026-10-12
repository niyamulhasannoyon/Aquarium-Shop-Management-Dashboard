import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
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
      `SELECT id, name, created_at FROM categories WHERE LOWER(name) = LOWER($1) LIMIT 1`,
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

    return NextResponse.json({ success: true, category: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create category' },
      { status: 500 }
    );
  }
}
