-- ==============================================================================
-- PRODUCTION-READY POSTGRESQL / SUPABASE MIGRATION SCRIPT
-- Project: Retail & Inventory Management System
-- Schema Version: 1.0.0
-- Description: Database initialization script creating core tables (categories,
--              products, purchases, customers, sales, sale_items, due_collections)
--              along with performance indexes and automated stock/ledger triggers.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. TABLE CREATION
-- ------------------------------------------------------------------------------

-- Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products Table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    category_id INT REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR NOT NULL,
    default_unit VARCHAR DEFAULT 'piece',
    cost_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    selling_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    current_stock NUMERIC(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchases Table
CREATE TABLE IF NOT EXISTS purchases (
    id SERIAL PRIMARY KEY,
    product_id INT REFERENCES products(id) ON DELETE CASCADE,
    unit_type VARCHAR NOT NULL,
    quantity NUMERIC(10,2) NOT NULL,
    multiplier INT DEFAULT 1,
    total_pieces_added NUMERIC(10,2) GENERATED ALWAYS AS (quantity * multiplier) STORED,
    unit_cost NUMERIC(10,2) NOT NULL,
    total_investment NUMERIC(10,2) NOT NULL,
    purchase_date TIMESTAMPTZ DEFAULT NOW()
);

-- Customers Table
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    phone VARCHAR NOT NULL,
    address TEXT,
    total_due NUMERIC(10,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sales Table
CREATE TABLE IF NOT EXISTS sales (
    id SERIAL PRIMARY KEY,
    invoice_no VARCHAR UNIQUE NOT NULL,
    customer_id INT REFERENCES customers(id) ON DELETE SET NULL,
    total_amount NUMERIC(10,2) NOT NULL,
    paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    due_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    sale_date TIMESTAMPTZ DEFAULT NOW()
);

-- Sale Items Table
CREATE TABLE IF NOT EXISTS sale_items (
    id SERIAL PRIMARY KEY,
    sale_id INT REFERENCES sales(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id) ON DELETE RESTRICT,
    unit_type VARCHAR NOT NULL,
    quantity NUMERIC(10,2) NOT NULL,
    multiplier INT DEFAULT 1,
    stock_deduct_qty NUMERIC(10,2) NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL,
    cost_price_snapshot NUMERIC(10,2) NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL
);

-- Due Collections Table
CREATE TABLE IF NOT EXISTS due_collections (
    id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customers(id) ON DELETE CASCADE,
    amount_paid NUMERIC(10,2) NOT NULL,
    note TEXT,
    payment_date TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 2. INDEXES FOR FOREIGN KEY LOOKUPS & SEARCH PERFORMANCE
-- ------------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_purchases_product_id ON purchases(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_due_collections_customer_id ON due_collections(customer_id);

-- ------------------------------------------------------------------------------
-- 3. AUTOMATED TRIGGER FUNCTIONS AND TRIGGERS
-- ------------------------------------------------------------------------------

-- Trigger 1: Increment product stock on purchase insertion
CREATE OR REPLACE FUNCTION trg_fn_update_stock_on_purchase()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE products
    SET current_stock = current_stock + NEW.total_pieces_added
    WHERE id = NEW.product_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_purchases_increment_stock ON purchases;
CREATE TRIGGER trg_purchases_increment_stock
AFTER INSERT ON purchases
FOR EACH ROW
EXECUTE FUNCTION trg_fn_update_stock_on_purchase();


-- Trigger 2: Deduct product stock on sale item insertion
CREATE OR REPLACE FUNCTION trg_fn_update_stock_on_sale_item()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE products
    SET current_stock = current_stock - NEW.stock_deduct_qty
    WHERE id = NEW.product_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sale_items_deduct_stock ON sale_items;
CREATE TRIGGER trg_sale_items_deduct_stock
AFTER INSERT ON sale_items
FOR EACH ROW
EXECUTE FUNCTION trg_fn_update_stock_on_sale_item();


-- Trigger 3: Increment customer total_due on sale insertion (if due_amount > 0 and customer_id is NOT NULL)
CREATE OR REPLACE FUNCTION trg_fn_update_customer_due_on_sale()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.due_amount > 0 AND NEW.customer_id IS NOT NULL THEN
        UPDATE customers
        SET total_due = total_due + NEW.due_amount
        WHERE id = NEW.customer_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sales_add_customer_due ON sales;
CREATE TRIGGER trg_sales_add_customer_due
AFTER INSERT ON sales
FOR EACH ROW
EXECUTE FUNCTION trg_fn_update_customer_due_on_sale();


-- Trigger 4: Deduct customer total_due on due collection insertion
CREATE OR REPLACE FUNCTION trg_fn_update_customer_due_on_collection()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.customer_id IS NOT NULL THEN
        UPDATE customers
        SET total_due = total_due - NEW.amount_paid
        WHERE id = NEW.customer_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_due_collections_deduct_customer_due ON due_collections;
CREATE TRIGGER trg_due_collections_deduct_customer_due
AFTER INSERT ON due_collections
FOR EACH ROW
EXECUTE FUNCTION trg_fn_update_customer_due_on_collection();

COMMIT;
