-- ============================================================
--  WMS Mock Data Seed — extracted from frontend mock files
--  Source: ../front/OurERP/web/src/features/*/services/mockData.js
--
--  Tables populated:
--    users          (1 admin row so FK references resolve)
--    suppliers      (3 rows)
--    customers      (3 rows)
--    products       (10 rows from productsMock)
--    stock_movements(10 rows — sets initial stock from mock `stock`)
--    sales          (2 fixed rows from salesMock)
--    sale_items     (4 rows)
--    purchase_orders(6 fixed rows from purchasesMock)
--    purchase_order_items (11 rows)
--
--  NOTE: The frontend mock files also generate random records
--  (generateMoreProducts / generateMoreSales / generateMorePurchases).
--  Those are NON-DETERMINISTIC (Math.random) and were intentionally
--  omitted so this file is reproducible and safe to re-run.
--
--  Receiving mock just re-exports purchase constants, so no rows.
--
--  Run with:  psql "$DATABASE_URL" -f seed/mock_data.sql
-- ============================================================

-- ---------- users (admin) ----------
-- The backend also seeds an admin if the table is empty; this explicit
-- row guarantees FK targets exist. Password = "admin123" (bcrypt).
-- INSERT INTO users (id, full_name, username, password_hash, role, department, is_active)
-- VALUES (1, 'Admin', 'admin',
--         '$2a$10$wWpfWPHXwHBEEpVKEGRfpeu/B2XrQaeqHV2CFC.dlChNdPnXjhcw.',
--         'admin', 'sales', true)
-- ON CONFLICT (id) DO NOTHING;

-- -- ---------- suppliers ----------
-- INSERT INTO suppliers (id, name, contact_name, phone, address, is_active) VALUES
--   (1, 'ایران قطعه', 'رضا تقوی', '02112345678', 'تهران، خیابان امیرکبیر، پلاک ۱۲', true),
--   (2, 'لنت پارس موتور', 'محمد راد', '09121234567', 'کرج، منطقه صنعتی، سوله ۵', true),
--   (3, 'پخش بلبرینگ مرکزی', 'حسن کریمی', '02198765432', 'تهران، میدان توپخانه', true);

-- -- ---------- customers ----------
-- INSERT INTO customers (id, type, full_name, national_id, phone, address, credit_limit, customer_grade, is_active) VALUES
--   (1, 'retail', 'علی محمدی', '1111111111', '09121234567', 'تهران، خیابان ولیعصر، پلاک ۱۲', 0, 1, true),
--   (2, 'retail', 'فاطمه احمدی', '2222222222', '09351234567', 'اصفهان، خیابان چهارباغ، پلاک ۵', 0, 1, true),
--   (3, 'retail', 'لیلا ابراهیمی', '3333333333', '09371234567', 'همدان، خیابان اکباتان، پلاک ۱۱', 0, 1, true);

-- -- ---------- products (productsMock, fixed 10) ----------
-- -- reorder_threshold defaulted to 5 for demo purposes.
-- INSERT INTO products (id, internal_code, supplier_code, barcode, name, brand, category, unit,
--                       reorder_threshold, cost_price, sale_price_retail, sale_price_wholesale, tax, image_url, is_active) VALUES
--   (1,  'BRK-1001', 'BRK-1001', '6260000000001', 'لنت ترمز جلو',   'بوش',     'سیستم ترمز',     'دست', 5, 350000, 450000, 420000, 9, '', true),
--   (2,  'FLT-2022', 'FLT-2022', '6260000000002', 'فیلتر روغن',     'مان',     'موتور',          'عدد', 5, 90000,  120000, 105000, 9, '', true),
--   (3,  'SHK-305',  'SHK-305',  '6260000000003', 'کمک فنر جلو',    'ساکس',    'سیستم تعلیق',    'عدد', 5, 1500000,1850000,1700000,9, '', true),
--   (4,  'LMP-755',  'LMP-755',  '6260000000004', 'لامپ هدلایت H4', 'فیلیپس',  'برق و روشنایی',  'جفت', 5, 65000,  89000,  75000,  0, '', true),
--   (5,  'BTY-755',  'BTY-755',  '6260000000005', 'باتری ۶۰ آمپر',  'سپاهان باتری','برق و روشنایی','عدد', 5, 2800000,3250000,3100000,9, '', true),
--   (6,  'BRK-220',  'BRK-220',  '6260000000006', 'کاسه چرخ عقب',   'لنکر',    'سیستم ترمز',     'عدد', 5, 550000, 680000, 620000, 9, '', true),
--   (7,  'FLT-415',  'FLT-415',  '6260000000007', 'فیلتر هوای موتور','تویس',    'موتور',          'عدد', 5, 70000,  95000,  85000,  9, '', true),
--   (8,  'SHK-190',  'SHK-190',  '6260000000008', 'کمک فنر عقب',    'مونرو',   'سیستم تعلیق',    'عدد', 5, 1100000,1420000,1300000,9, '', true),
--   (9,  'BRG-006',  'BRG-006',  '6260000000009', 'یاتاقان شاتون',  'ماله',     'موتور',          'دست', 5, 700000, 890000, 800000, 9, '', true),
--   (10, 'CLT-884',  'CLT-884',  '6260000000010', 'کلاچ کامل',      'لوك',      'گیربکس',         'کیت', 5, 2200000,2750000,2500000,9, '', true);

-- -- ---------- stock_movements (initial stock from mock `stock`) ----------
-- -- Each product gets one 'purchase_in' movement equal to its mock stock.
-- INSERT INTO stock_movements (product_id, quantity, movement_type, reference_id, reference_type, performed_by) VALUES
--   (1,  45, 'purchase_in', NULL, 'seed', (SELECT id FROM users ORDER BY id LIMIT 1)),
--   (2,  120,'purchase_in', NULL, 'seed', (SELECT id FROM users ORDER BY id LIMIT 1)),
--   (3,  8,  'purchase_in', NULL, 'seed', (SELECT id FROM users ORDER BY id LIMIT 1)),
--   (4,  0,  'purchase_in', NULL, 'seed', (SELECT id FROM users ORDER BY id LIMIT 1)),
--   (5,  15, 'purchase_in', NULL, 'seed', (SELECT id FROM users ORDER BY id LIMIT 1)),
--   (6,  22, 'purchase_in', NULL, 'seed', (SELECT id FROM users ORDER BY id LIMIT 1)),
--   (7,  60, 'purchase_in', NULL, 'seed', (SELECT id FROM users ORDER BY id LIMIT 1)),
--   (8,  3,  'purchase_in', NULL, 'seed', (SELECT id FROM users ORDER BY id LIMIT 1)),
--   (9,  0,  'purchase_in', NULL, 'seed', (SELECT id FROM users ORDER BY id LIMIT 1)),
--   (10, 5,  'purchase_in', NULL, 'seed', (SELECT id FROM users ORDER BY id LIMIT 1));

-- -- ---------- sales (salesMock, 2 fixed) ----------
-- INSERT INTO sales (id, customer_id, invoice_number, invoice_date, status, payment_type, paid_amount, total_amount, check_number, transfer_ref, created_by) VALUES
--   (1, 1, 'SALE-2026-001', '2026-06-04', 'delivered',   'cash',    45000000, 45000000, NULL, NULL, (SELECT id FROM users ORDER BY id LIMIT 1)),
--   (2, 2, 'SALE-2026-002', '2026-06-09', 'processing',  'credit',  0,        28500000, NULL, NULL, (SELECT id FROM users ORDER BY id LIMIT 1));

-- INSERT INTO sale_items (sale_id, product_id, product_code, product_name, unit, qty, unit_price, discount, line_total) VALUES
--   (1, 1,  'BRK-1001', 'لنت ترمز جلو', 'دست', 10, 2000000, 0, 20000000),
--   (1, 2,  'FLT-2022', 'فیلتر روغن',   'عدد', 50, 500000,  0, 25000000),
--   (2, 1,  'BRK-1001', 'لنت ترمز جلو', 'دست', 10, 1900000, 5, 18050000),
--   (2, 3,  'SHK-305',  'کمک فنر جلو',  'عدد', 3,  3500000, 0, 10500000);

-- ---------- purchase_orders (purchasesMock, 6 fixed) ----------
-- INSERT INTO purchase_orders (id, supplier_id, status, expected_delivery_date, supplier_invoice_number, notes, created_by) VALUES
--   (1, 1, 'received',           '2026-03-15', 'INV-2026-001', 'خرید لوازم یدکی موتور',     (SELECT id FROM users ORDER BY id LIMIT 1)),
--   (2, 2, 'shipped',            '2026-03-20', 'INV-2026-002', 'خرید لنت و دیسک ترمز',       (SELECT id FROM users ORDER BY id LIMIT 1)),
--   (3, 3, 'partially_received', '2026-03-25', 'INV-2026-003', 'خرید یاتاقان و بلبرینگ',     (SELECT id FROM users ORDER BY id LIMIT 1)),
--   (4, 1, 'pending',            '2026-03-28', 'INV-2026-004', 'خرید فیلترها و روغن موتور',   (SELECT id FROM users ORDER BY id LIMIT 1)),
--   (5, 2, 'received',           '2026-04-01', 'INV-2026-005', 'خرید کلاچ و دیسک کلاچ',       (SELECT id FROM users ORDER BY id LIMIT 1)),
--   (6, 1, 'cancelled',          '2026-04-02', 'INV-2026-006', 'خرید لامپ - لغو شده',         (SELECT id FROM users ORDER BY id LIMIT 1));

-- INSERT INTO purchase_order_items (purchase_order_id, product_id, ordered_quantity, unit_price, received_quantity, discrepancy_note) VALUES
--   -- PO 1 (received -> received_qty = ordered)
--   (1, 1, 20, 1500000, 20, NULL),
--   (1, 2, 50, 300000,  50, NULL),
--   -- PO 2 (shipped -> not yet received)
--   (2, 1, 15, 1500000, NULL, NULL),
--   (2, 3, 4,  1800000, NULL, NULL),
--   -- PO 3 (partially_received -> half received)
--   (3, 6, 30, 800000,  15,  'تحویل ناقص'),
--   (3, 9, 20, 1420000, 10,  'تحویل ناقص'),
--   -- PO 4 (pending)
--   (4, 2, 60, 300000,  NULL, NULL),
--   (4, 7, 40, 425000,  NULL, NULL),
--   -- PO 5 (received)
--   (5, 10, 15, 5500000, 15, NULL),
--   -- PO 6 (cancelled)
--   (6, 4, 100, 240000,  NULL, NULL);

-- -- ---------- reset sequences so future auto-ids don't collide ----------
SELECT setval(pg_get_serial_sequence('users', 'id'),             (SELECT COALESCE(MAX(id),1) FROM users));
SELECT setval(pg_get_serial_sequence('suppliers', 'id'),         (SELECT COALESCE(MAX(id),1) FROM suppliers));
SELECT setval(pg_get_serial_sequence('customers', 'id'),         (SELECT COALESCE(MAX(id),1) FROM customers));
SELECT setval(pg_get_serial_sequence('products', 'id'),          (SELECT COALESCE(MAX(id),1) FROM products));
SELECT setval(pg_get_serial_sequence('sales', 'id'),             (SELECT COALESCE(MAX(id),1) FROM sales));
SELECT setval(pg_get_serial_sequence('purchase_orders', 'id'),   (SELECT COALESCE(MAX(id),1) FROM purchase_orders));
SELECT setval(pg_get_serial_sequence('sale_items', 'id'),         (SELECT COALESCE(MAX(id),1) FROM sale_items));
SELECT setval(pg_get_serial_sequence('purchase_order_items','id'),(SELECT COALESCE(MAX(id),1) FROM purchase_order_items));
SELECT setval(pg_get_serial_sequence('stock_movements', 'id'),    (SELECT COALESCE(MAX(id),1) FROM stock_movements));
