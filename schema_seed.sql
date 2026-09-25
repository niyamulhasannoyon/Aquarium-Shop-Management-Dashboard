-- Sample Seed Data for Niloy Friend Shop POS

BEGIN;

-- Insert Categories
INSERT INTO categories (id, name) VALUES
(1, 'Footwear - Shoes'),
(2, 'Footwear - Sandals'),
(3, 'Socks & Accessories'),
(4, 'Shoe Care')
ON CONFLICT (id) DO NOTHING;

-- Reset sequence for categories
SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));

-- Insert Sample Products
INSERT INTO products (id, category_id, name, default_unit, cost_price, selling_price, current_stock) VALUES
(1, 1, 'Leather Loafers Black', 'pair', 1200.00, 1850.00, 15.00),
(2, 1, 'Sports Running Shoes Gray', 'pair', 950.00, 1500.00, 20.00),
(3, 1, 'Casual Sneakers White', 'pair', 800.00, 1350.00, 8.00),
(4, 2, 'Formal Leather Sandals Brown', 'pair', 600.00, 950.00, 12.00),
(5, 2, 'Rubber Slide Sandals', 'pair', 150.00, 300.00, 30.00),
(6, 3, 'Cotton Ankle Socks 3-Pack', 'piece', 80.00, 180.00, 50.00),
(7, 3, 'Formal Dress Socks', 'piece', 60.00, 120.00, 40.00),
(8, 4, 'Black Shoe Polish 100g', 'piece', 90.00, 160.00, 25.00),
(9, 4, 'Shoe Brush Wooden', 'piece', 50.00, 100.00, 5.00),
(10, 1, 'Premium Oxfords Tan', 'pair', 2000.00, 3200.00, 4.00)
ON CONFLICT (id) DO NOTHING;

-- Reset sequence for products
SELECT setval('products_id_seq', (SELECT MAX(id) FROM products));

-- Insert Sample Customers
INSERT INTO customers (id, name, phone, address, total_due) VALUES
(1, 'Tanvir Ahmed', '01711223344', 'Dhanmondi, Dhaka', 450.00),
(2, 'Rahim Uddin', '01899887766', 'Mirpur-10, Dhaka', 0.00),
(3, 'Kabir Hossain', '01912345678', 'Uttara, Dhaka', 1200.00)
ON CONFLICT (id) DO NOTHING;

-- Reset sequence for customers
SELECT setval('customers_id_seq', (SELECT MAX(id) FROM customers));

COMMIT;
