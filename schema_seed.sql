-- Initial Clean Database Setup for Niloy Friend Shop POS

BEGIN;

-- Reset sequences if tables exist
SELECT setval('categories_id_seq', COALESCE((SELECT MAX(id) FROM categories), 1), false);
SELECT setval('products_id_seq', COALESCE((SELECT MAX(id) FROM products), 1), false);
SELECT setval('customers_id_seq', COALESCE((SELECT MAX(id) FROM customers), 1), false);
SELECT setval('purchases_id_seq', COALESCE((SELECT MAX(id) FROM purchases), 1), false);
SELECT setval('sales_id_seq', COALESCE((SELECT MAX(id) FROM sales), 1), false);

COMMIT;
