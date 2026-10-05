-- Seed Data for Niloy Friend Shop POS (Aquarium Fish & Electronic Products)

BEGIN;

-- Insert Categories
INSERT INTO categories (id, name) VALUES
(1, 'Fish'),
(2, 'Electronic Product')
ON CONFLICT (id) DO NOTHING;

-- Reset sequence for categories
SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));

-- Insert Products
INSERT INTO products (id, category_id, name, default_unit, cost_price, selling_price, current_stock) VALUES
(1, 1, 'Gold fish (গোল্ড ফিশ)', 'pair', 120.00, 200.00, 25.00),
(2, 1, 'Barb (বার্ব)', 'pair', 80.00, 150.00, 30.00),
(3, 1, 'Gorami (গৌরামি)', 'pair', 100.00, 180.00, 3.00),
(4, 1, 'Koi karp (কই কার্প)', 'pair', 150.00, 250.00, 15.00),
(5, 1, 'Komet (কমেট)', 'pair', 90.00, 160.00, 18.00),
(6, 1, 'Tetra (টেট্রা)', 'pair', 70.00, 120.00, 40.00),
(7, 1, 'Jebra (জেব্রা)', 'pair', 60.00, 100.00, 50.00),
(8, 1, 'Renbo shark (রেইনবো শার্ক)', 'pair', 130.00, 220.00, 4.00),
(9, 1, 'Black moly (ব্ল্যাক মলি)', 'pair', 50.00, 90.00, 35.00),
(10, 1, 'White Moly (হোয়াইট মলি)', 'pair', 50.00, 90.00, 30.00),
(11, 1, 'Guppy (গাপ্পি)', 'pair', 40.00, 80.00, 60.00),
(12, 1, 'Perrot (প্যারেট)', 'pair', 350.00, 600.00, 8.00),
(13, 1, 'Angel (অ্যাঞ্জেল)', 'pair', 110.00, 200.00, 22.00),
(14, 2, 'Submersible Filter (সামার্সিবল ফিল্টার)', 'piece', 350.00, 550.00, 15.00),
(15, 2, 'LED Aquarium Light Strip (এলইডি লাইট)', 'piece', 450.00, 750.00, 10.00),
(16, 2, 'Automatic Water Heater 100W (হিটার)', 'piece', 400.00, 650.00, 2.00),
(17, 2, 'Air Pump Dual Outlet (অক্সিজেন পাম্প)', 'piece', 250.00, 420.00, 12.00),
(18, 2, 'Aquarium Wave Maker Pump (ওয়েভ মেকার)', 'piece', 600.00, 950.00, 3.00)
ON CONFLICT (id) DO NOTHING;

-- Reset sequence for products
SELECT setval('products_id_seq', (SELECT MAX(id) FROM products));

-- Insert Sample Customers
INSERT INTO customers (id, name, phone, address, total_due) VALUES
(1, 'Rahim Aquarium World', '01711223344', 'Mirpur-10, Dhaka', 1500.00),
(2, 'Tanvir Ahmed', '01899887766', 'Dhanmondi, Dhaka', 450.00),
(3, 'Kabir Aquarium Hobbyist', '01912345678', 'Uttara, Dhaka', 0.00)
ON CONFLICT (id) DO NOTHING;

-- Reset sequence for customers
SELECT setval('customers_id_seq', (SELECT MAX(id) FROM customers));

COMMIT;
