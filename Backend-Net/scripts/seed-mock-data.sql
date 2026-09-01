/* =============================================================================
   WMS — seed script for the frontend's mock data
   =============================================================================

   Loads the React frontend's mock fixtures (under Frontend/src/features) into a
   migrated WMS database.

   PREREQUISITE: run migrations first, or this script will fail on missing tables:
       dotnet ef database update --project Infrastructure --startup-project WMS

   -----------------------------------------------------------------------------
   READ THIS FIRST — what "every mock data" could and could not be reproduced
   -----------------------------------------------------------------------------

   Most of the frontend's mock data is GENERATED AT RUNTIME with Math.random(),
   so it is different on every page load. There is no fixed dataset to copy.
   Concretely, per source file:

     customers/services/mockData.js        3 rows   fully deterministic  -> seeded verbatim
     suppliers/services/mockData.js        3 rows   fully deterministic  -> seeded verbatim
     warehouse/products/.../mockData.js    3 rows   deterministic        -> seeded verbatim
                                          47 rows   generated, random stock only
                                                                        -> seeded, stock made deterministic
     purchases/services/mockData.js        6 rows   deterministic        -> seeded verbatim
                                          20 rows   fully random         -> NOT seeded (see below)
     sales/services/mockData.js            3 rows   deterministic        -> seeded verbatim
                                          20 rows   fully random         -> NOT seeded (see below)
     purchases/.../returns/mockData.js     0 rows   fully random         -> hand-authored equivalent
     sales/.../returns/mockData.js         0 rows   fully random         -> hand-authored equivalent

   The 20 random purchases / 20 random sales are pure volume filler (random
   supplier, random status, random items, random payment). Freezing one arbitrary
   roll of the dice into a seed script would be inventing data, not reproducing
   it, so they are omitted. Everything the frontend actually pins down is here.

   Both returns mock files are 100% random and derive from the random purchases
   and sales, so nothing there could be copied either. Instead, sections 8 and 9
   hand-author a small set of returns that follows the same generator shape AND
   satisfies the backend's invariants (see "consistency" note below) — which the
   random frontend data does not, since it predates the real backend.

   -----------------------------------------------------------------------------
   Deliberate reconciliations (the mock data contradicts itself in places)
   -----------------------------------------------------------------------------

   1. PRODUCT IDENTITY. Three files disagree about what products 1-10 are:
        - products/mockData.js  : ids 1-3 are BRK-1001 / FLT-2022 / SHK-305,
                                  ids 4-50 are generated filler "قطعه نمونه i"
        - purchases/mockData.js : ids 1-10 are real parts, codes BRK-001 ... CLT-010
        - sales/mockData.js     : ids 1-5, same names as purchases, different prices
      Purchase/sale line items reference ids 1-10, so those ids MUST be the real
      parts or the data is nonsense. Resolution: ids 1-3 keep the product
      catalogue's codes/prices (its names already agree with the transactions),
      ids 4-10 are the real parts named by the transaction mocks, and all 47
      generated filler products shift to ids 11-57. Nothing is lost.
      Note this only affects Product rows: PurchaseItem/SaleItem store ProductId
      plus a UnitPrice snapshot, never a product code, so the code mismatch
      between the three files has no effect on the transaction rows.

   2. PRICES. Same product has three different prices across the three files
      (product 1: catalogue 350000 purchase / 450000 retail; purchases mock
      1500000; sales mock 2000000). Products 1-3 keep the catalogue's prices;
      products 4-10 take the purchases mock price as PurchasePrice and the sales
      mock price as RetailPrice (or PurchasePrice * 1.25 for ids 6-10, which the
      sales mock never lists). Line items keep their own snapshot prices exactly
      as the mocks have them, so invoice totals still match the frontend.

   3. STOCK IS NOT RECONCILED WITH TRANSACTIONS. Product.Stock is seeded from the
      catalogue as-is. The frontend never decrements stock for the sales it ships
      or increments it for the purchases it receives, so these numbers do not add
      up against the seeded transactions. Reproducing the mock faithfully and
      making stock arithmetically correct are mutually exclusive here; fidelity
      won. Adjust manually if you need coherent stock.

   4. lowStockThreshold is absent on catalogue products 2 and 3 (undefined in JS).
      Seeded as 10, matching every product that does define it.

   5. The filler products use stock = (index * 17) % 100 instead of
      Math.random() * 100, so re-running this script gives the same database.

   6. PURCHASE 2's TOTAL IS WRONG IN THE MOCK ITSELF. INV-2026-002 declares
      totalAmount 28,500,000, but its own two line items sum to 28,575,000
      (15 x 1,500,000 less 5% = 21,375,000, plus 4 x 1,800,000 = 7,200,000).
      The mock's stated total is off by 75,000. Both numbers are seeded exactly
      as written — the header total and the line items — so the seeded row is a
      faithful copy, inconsistency included. Fix it in the frontend, or update
      Purchases.TotalAmount for id 2 here, if you want them to agree. Every other
      purchase and all three sales reconcile exactly.

   7. PAYMENT DETAILS ARE PURCHASE-ONLY. PaymentDetail.PurchaseId1 (the shadow FK
      EF generated because PaymentDetail.PurchaseId is a Guid while Purchase.Id is
      an int) is NOT NULL, so a payment row cannot exist without a purchase.
      Sale 3's mixed payment therefore cannot be represented and is omitted; its
      Sale.PaymentType is still MIXED. This is the PaymentDetail schema bug
      already recorded in CLAUDE.md, not a seeding choice. Fix the FK to seed it.

   -----------------------------------------------------------------------------
   Consistency with backend invariants
   -----------------------------------------------------------------------------

   Quantities are chosen so the seeded rows are exactly what the calculation
   services would have produced, i.e. running the real commands over this data
   would not change any status:

     - PurchaseItem.ReceivedQuantity / SettledQuantity agree with Purchase.Status
       per IPurchaseReturnCalculationService.RecomputePurchaseStatus.
     - SaleItem.ShippedQuantity follows the frontend's applyShippedQty rule
       (full qty when shipped/delivered, 0 when processing).
     - SaleItem.SettledQuantity equals the sum of that item's non-REPLACEMENT
       return decisions, per AddSaleReturnDecisionCommand.
     - Return statuses match Recompute{Return,Sale,Purchase}Status.

   Idempotency: aborts if the target tables already hold data. Set @ResetExisting
   to 1 to DELETE the contents of every table listed in section 1 first.
   ============================================================================= */

SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

DECLARE @ResetExisting bit = 0;   -- 1 = wipe the tables below before seeding

/* ---------------------------------------------------------------------------
   0. Guard
   --------------------------------------------------------------------------- */
IF @ResetExisting = 0
   AND (EXISTS (SELECT 1 FROM Products)
     OR EXISTS (SELECT 1 FROM Customers)
     OR EXISTS (SELECT 1 FROM Suppliers)
     OR EXISTS (SELECT 1 FROM Purchases)
     OR EXISTS (SELECT 1 FROM Sales))
BEGIN
    RAISERROR (N'Target tables are not empty. Set @ResetExisting = 1 to wipe and reseed, or clear them manually.', 16, 1);
    RETURN;
END;

BEGIN TRANSACTION;

/* ---------------------------------------------------------------------------
   1. Optional reset (child -> parent, so FKs stay satisfied)
   --------------------------------------------------------------------------- */
IF @ResetExisting = 1
BEGIN
    DELETE FROM SaleReturnDecisions;
    DELETE FROM SaleReturnItems;
    DELETE FROM SaleReturnClaims;
    DELETE FROM SaleReturns;
    DELETE FROM PurchaseReturnDecisions;
    DELETE FROM PurchaseReturnItems;
    DELETE FROM PurchaseReturns;
    DELETE FROM PaymentDetail;
    DELETE FROM SaleItems;
    DELETE FROM Sales;
    DELETE FROM PurchaseItems;
    DELETE FROM Purchases;
    DELETE FROM Products;
    DELETE FROM ProductCategories;
    DELETE FROM Customers;
    DELETE FROM Suppliers;
END;

/* ---------------------------------------------------------------------------
   2. Product categories
   The seven categories used by products/mockData.js, in its own array order,
   so category id = (index % 7) + 1 for the generated products in section 3b.
   --------------------------------------------------------------------------- */
SET IDENTITY_INSERT ProductCategories ON;
INSERT INTO ProductCategories (Id, Name, IsActive) VALUES
    (1, N'موتور',             1),
    (2, N'سیستم ترمز',        1),
    (3, N'سیستم تعلیق',       1),
    (4, N'برق و روشنایی',     1),
    (5, N'بدنه',              1),
    (6, N'گیربکس',            1),
    (7, N'سیستم خنک کننده',   1);
SET IDENTITY_INSERT ProductCategories OFF;

/* ---------------------------------------------------------------------------
   3a. Products 1-10 — the real parts referenced by purchase/sale line items
   Unit values are ProductUnitEnum: Hand=0, Number=1, Box=2, Liter=3, Kg=4,
   Kit=5, Package=6, Pair=7.
   --------------------------------------------------------------------------- */
SET IDENTITY_INSERT Products ON;
INSERT INTO Products
    (Id, Name, Code, BarCode, Brand, Unit, PurchasePrice, RetailPrice, WholeSalePrice,
     Tax, Stock, LowStockThreshold, ImageUrl, IsActive, CreatedAt, UpdatedAt, ProductCategoryId)
VALUES
    -- ids 1-3: verbatim from warehouse/products/services/mockData.js
    (1,  N'لنت ترمز جلو',      N'BRK-1001', N'6260000000001', N'بوش',   0,  350000,  450000,  420000, 9,  45, 10, N'', 1, '2024-01-10T08:00:00', '2024-06-15T12:00:00', 2),
    (2,  N'فیلتر روغن',        N'FLT-2022', N'6260000000002', N'مان',   1,   90000,  120000,  105000, 9, 120, 10, N'', 1, '2024-01-10T08:00:00', '2024-06-15T12:00:00', 1),
    (3,  N'کمک فنر جلو',       N'SHK-305',  N'6260000000003', N'ساکس',  1, 1500000, 1850000, 1700000, 9,   8, 10, N'', 1, '2024-01-10T08:00:00', '2024-06-15T12:00:00', 3),
    -- ids 4-10: named by purchases/sales mockData MOCK_PRODUCTS (see note 1)
    (4,  N'لامپ هدلایت H4',    N'LMP-004',  N'6260000000004', N'بوش',   1,  240000,  400000,  360000, 9,  60, 10, N'', 1, '2024-01-10T08:00:00', '2024-06-15T12:00:00', 4),
    (5,  N'باتری ۶۰ آمپر',     N'BAT-005',  N'6260000000005', N'دنسو',  1, 4500000, 6000000, 5400000, 9,  25, 10, N'', 1, '2024-01-10T08:00:00', '2024-06-15T12:00:00', 4),
    (6,  N'کاسه چرخ عقب',      N'BRG-006',  N'6260000000006', N'لنکر',  1,  800000, 1000000,  900000, 9,  40, 10, N'', 1, '2024-01-10T08:00:00', '2024-06-15T12:00:00', 2),
    (7,  N'فیلتر هوای موتور',  N'FLT-007',  N'6260000000007', N'مان',   1,  425000,  530000,  480000, 9,  75, 10, N'', 1, '2024-01-10T08:00:00', '2024-06-15T12:00:00', 1),
    (8,  N'کمک فنر عقب',       N'SHK-008',  N'6260000000008', N'ساکس',  1, 1850000, 2310000, 2080000, 9,  18, 10, N'', 1, '2024-01-10T08:00:00', '2024-06-15T12:00:00', 3),
    (9,  N'یاتاقان شاتون',     N'ENG-009',  N'6260000000009', N'ماله',  1, 1420000, 1780000, 1600000, 9,  32, 10, N'', 1, '2024-01-10T08:00:00', '2024-06-15T12:00:00', 1),
    (10, N'کلاچ کامل',         N'CLT-010',  N'6260000000010', N'تویس',  0, 5500000, 6880000, 6190000, 9,  12, 10, N'', 1, '2024-01-10T08:00:00', '2024-06-15T12:00:00', 6);

/* ---------------------------------------------------------------------------
   3b. Products 11-57 — the catalogue's generateMoreProducts() filler
   All 47 generated products, mirroring the JS generator exactly (same
   brand/category/unit cycling, same price formula), except stock is
   deterministic. The JS loop indexes 4..50; the +7 offset keeps that sequence
   intact while freeing ids 4-10 for the real parts above. Final product count
   is 57 = 3 catalogue + 7 transaction-only parts + 47 filler.
   --------------------------------------------------------------------------- */
DECLARE @i        int = 4;
DECLARE @retail   decimal(20,0);
DECLARE @brandIdx int;
DECLARE @unitIdx  int;

WHILE @i <= 50
BEGIN
    SET @retail   = 100000 + @i * 25000;
    SET @brandIdx = @i % 8;
    SET @unitIdx  = @i % 5;

    INSERT INTO Products
        (Id, Name, Code, BarCode, Brand, Unit, PurchasePrice, RetailPrice, WholeSalePrice,
         Tax, Stock, LowStockThreshold, ImageUrl, IsActive, CreatedAt, UpdatedAt, ProductCategoryId)
    VALUES
        (@i + 7,
         N'قطعه نمونه ' + CAST(@i AS nvarchar(10)),
         N'MOCK-' + CAST(@i AS nvarchar(10)),
         N'6260000000' + RIGHT('000' + CAST(@i AS nvarchar(10)), 3),
         CASE @brandIdx WHEN 0 THEN N'بوش'  WHEN 1 THEN N'مان'  WHEN 2 THEN N'ساکس'
                        WHEN 3 THEN N'لنکر' WHEN 4 THEN N'تویس' WHEN 5 THEN N'ماله'
                        WHEN 6 THEN N'دنسو' ELSE N'میتسوبیشی' END,
         CASE @unitIdx  WHEN 0 THEN 1  /* عدد  */ WHEN 1 THEN 6  /* بسته */
                        WHEN 2 THEN 0  /* دست  */ WHEN 3 THEN 7  /* جفت  */
                        ELSE 5 /* کیت */ END,
         CAST(@retail * 0.75 AS decimal(20,0)),
         @retail,
         CAST(@retail * 0.90 AS decimal(20,0)),
         9,
         (@i * 17) % 100,
         10,
         N'',
         1,
         DATEADD(day, @i, '2024-01-01'),
         DATEADD(day, @i, '2024-01-01'),
         (@i % 7) + 1);

    SET @i = @i + 1;
END;
SET IDENTITY_INSERT Products OFF;

/* ---------------------------------------------------------------------------
   4. Customers — verbatim from customers/services/mockData.js
   BalanceType is BalanceTypeEnum: Creditor=0, Debtor=1, Balanced=2.
   The mock's "debit" maps to Debtor(1), "credit" to Creditor(0).
   --------------------------------------------------------------------------- */
SET IDENTITY_INSERT Customers ON;
INSERT INTO Customers
    (Id, FirstName, LastName, PhoneNumber, Address, PostalCode, RefferalCode, CreditLimit,
     Description, Balance, BalanceType, ImageUrl, longitude, latitude, IsActive, CreatedAt, UpdatedAt)
VALUES
    (1, N'علی',    N'محمدی',    N'09121234567', N'تهران، خیابان ولیعصر، پلاک ۱۲',  N'1234567890', N'REF001',  5000000, N'مشتری وفادار',   500000, 1, NULL, 51.389, 35.6892, 1, '2024-01-15T10:30:00', '2024-06-20T14:45:00'),
    (2, N'فاطمه',  N'احمدی',    N'09351234567', N'اصفهان، خیابان چهارباغ، پلاک ۵', N'8134567890', N'',       10000000, N'',              1200000, 1, NULL, 51.666, 32.6539, 1, '2024-02-10T09:15:00', '2024-07-01T11:20:00'),
    (3, N'لیلا',   N'ابراهیمی', N'09371234567', N'همدان، خیابان اکباتان، پلاک ۱۱', N'6514567890', N'REF002',  2000000, N'نیاز به پیگیری', 1100000, 0, NULL, 48.515, 34.799,  1, '2024-03-05T16:00:00', '2024-06-25T10:10:00');
SET IDENTITY_INSERT Customers OFF;

/* ---------------------------------------------------------------------------
   5. Suppliers — verbatim from suppliers/services/mockData.js
   --------------------------------------------------------------------------- */
SET IDENTITY_INSERT Suppliers ON;
INSERT INTO Suppliers
    (Id, CompanyName, FirstName, LastName, Phone, Address, PostalCode,
     Balance, BalanceType, Description, ImageUrl, longitude, latitude, IsActive, CreatedAt, UpdatedAt)
VALUES
    (1, N'ایران قطعه',           N'رضا',  N'تقوی',  N'02112345678', N'تهران، خیابان امیرکبیر، پلاک ۱۲', N'1234567890',  450000, 1, N'', NULL, 51.389,  35.6892, 1, '2024-03-05T16:00:00', '2024-06-25T10:10:00'),
    (2, N'لنت پارس موتور',       N'محمد', N'راد',   N'09121234567', N'کرج، منطقه صنعتی، سوله ۵',        N'8134567890', 1100000, 0, N'', NULL, 50.9915, 35.8327, 1, '2024-03-05T16:00:00', '2024-06-25T10:10:00'),
    (3, N'پخش بلبرینگ مرکزی',    N'حسن',  N'کریمی', N'02198765432', N'تهران، میدان توپخانه',            N'6514567890', 1200000, 1, N'', NULL, 51.423,  35.685,  1, '2024-03-05T16:00:00', '2024-06-25T10:10:00');
SET IDENTITY_INSERT Suppliers OFF;

/* ---------------------------------------------------------------------------
   6. Purchases — the 6 deterministic rows of purchases/services/mockData.js
   Status is PurchaseStatusEnum: PROFORMA=0, PENDING=1, SHIPPED=2,
   PARTIALLY_RECEIVED=3, RECEIVED=4, CANCELLED=5.
   PaymentType is PaymentTypeEnum: CASH=0, CREDIT=1, CHECK=2, TRANSFER=3, MIXED=4.
   The mock has no payment date; InvoiceDate is reused for the NOT NULL column.
   --------------------------------------------------------------------------- */
SET IDENTITY_INSERT Purchases ON;
INSERT INTO Purchases
    (Id, InvoiceNumber, InvoiceDate, PaymentDate, Status, PaymentType, PaidAmount, TotalAmount,
     Description, SupplierId, IsActive, CreatedAt, UpdatedAt)
VALUES
    (1, N'INV-2026-001', '2026-03-15', '2026-03-15', 4, 0, 45000000, 45000000, N'خرید لوازم یدکی موتور',              1, 1, '2026-06-04T10:30:00', '2026-06-04T10:30:00'),
    (2, N'INV-2026-002', '2026-03-20', '2026-03-20', 2, 1,        0, 28500000, N'خرید لنت و دیسک ترمز',               2, 1, '2026-06-09T14:15:00', '2026-06-09T14:15:00'),
    (3, N'INV-2026-003', '2026-03-25', '2026-03-25', 3, 2, 50000000, 50000000, N'خرید یاتاقان و بلبرینگ',             3, 1, '2026-06-14T09:45:00', '2026-06-14T09:45:00'),
    (4, N'INV-2026-004', '2026-03-28', '2026-03-28', 1, 3, 35000000, 35000000, N'خرید فیلترها و روغن موتور',          1, 1, '2026-06-17T11:20:00', '2026-06-17T11:20:00'),
    (5, N'INV-2026-005', '2026-04-01', '2026-04-01', 4, 4, 60000000, 82500000, N'خرید کلاچ و دیسک کلاچ - پرداخت ترکیبی', 2, 1, '2026-06-20T16:00:00', '2026-06-20T16:00:00'),
    (6, N'INV-2026-006', '2026-04-02', '2026-04-02', 5, 1,        0, 24000000, N'خرید لامپ - لغو شده به دلیل عدم موجودی', 1, 1, '2026-06-21T08:30:00', '2026-06-21T13:45:00');
SET IDENTITY_INSERT Purchases OFF;

/* Purchase line items. Ids are explicit because PurchaseReturnItem rows in
   section 8 reference them. ReceivedQuantity/SettledQuantity are set to the
   values RecomputePurchaseStatus would require for each purchase's status:
     P1 RECEIVED           -> item 1 is 18 received + 2 settled by refund = 20 ordered
     P2 SHIPPED            -> nothing received yet
     P3 PARTIALLY_RECEIVED -> item 5 short by 10, which is the open issue in section 8
     P4 PENDING            -> nothing received yet
     P5 RECEIVED           -> fully received
     P6 CANCELLED          -> nothing received                                       */
SET IDENTITY_INSERT PurchaseItems ON;
INSERT INTO PurchaseItems (Id, PurchaseId, ProductId, Quantity, UnitPrice, Discount, ReceivedQuantity, SettledQuantity) VALUES
    (1,  1,  1,  20, 1500000,  0, 18, 2),
    (2,  1,  2,  50,  300000,  0, 50, 0),
    (3,  2,  1,  15, 1500000,  5,  0, 0),
    (4,  2,  3,   4, 1800000,  0,  0, 0),
    (5,  3,  6,  30,  800000, 10, 20, 0),
    (6,  3,  9,  20, 1420000,  0, 20, 0),
    (7,  4,  2,  60,  300000,  0,  0, 0),
    (8,  4,  7,  40,  425000,  0,  0, 0),
    (9,  5, 10,  15, 5500000,  0, 15, 0),
    (10, 6,  4, 100,  240000,  0,  0, 0);
SET IDENTITY_INSERT PurchaseItems OFF;

/* Payment details. Purchase 5's three mixed payments, plus the single check /
   transfer references that purchases 3 and 4 carry inline in the mock (the
   Purchase entity has no checkNumber/transferRef columns of its own).
   PurchaseId is the unused Guid column; PurchaseId1 is the real FK. See note 6. */
INSERT INTO PaymentDetail (Id, PurchaseId, PurchaseId1, SaleId, Type, Amount, checkNumber, transferRef) VALUES
    (NEWID(), '00000000-0000-0000-0000-000000000000', 3, NULL, 2, 50000000, N'7845612301', NULL),
    (NEWID(), '00000000-0000-0000-0000-000000000000', 4, NULL, 3, 35000000, NULL, N'TRN-98765432'),
    (NEWID(), '00000000-0000-0000-0000-000000000000', 5, NULL, 0, 30000000, NULL, NULL),
    (NEWID(), '00000000-0000-0000-0000-000000000000', 5, NULL, 2, 20000000, N'1234567890', NULL),
    (NEWID(), '00000000-0000-0000-0000-000000000000', 5, NULL, 3, 10000000, NULL, N'TRN-55667788');

/* ---------------------------------------------------------------------------
   7. Sales — the 3 deterministic rows of sales/services/mockData.js
   Status is SalesStatusEnum: PROFORMA=0, PROCESSING=1, PARTIALLY_DELIVERED=2,
   SHIPPED=3, DELIVERED=4, CANCELLED=5, PENDING=6, RETURNED=7.
   --------------------------------------------------------------------------- */
SET IDENTITY_INSERT Sales ON;
INSERT INTO Sales
    (Id, InvoiceNumber, InvoiceDate, Status, PaymentType, PaidAmount, TotalAmount,
     Description, CustomerId, IsActive, CreatedAt, UpdatedAt)
VALUES
    (1, N'SALE-2026-001', '2026-06-04', 4, 0, 45000000, 45000000, N'فروش لوازم یدکی موتور', 1, 1, '2026-06-04T10:30:00', '2026-06-04T10:30:00'),
    (2, N'SALE-2026-002', '2026-06-09', 1, 1,        0, 28550000, N'فروش لنت و دیسک ترمز',  2, 1, '2026-06-09T14:15:00', '2026-06-09T14:15:00'),
    (3, N'SALE-2026-003', '2026-06-15', 4, 4, 34608000, 34608000, N'فروش باتری و لوازم برقی', 3, 1, '2026-06-15T11:20:00', '2026-06-15T11:20:00');
SET IDENTITY_INSERT Sales OFF;

/* Sale line items. ShippedQuantity follows the mock's applyShippedQty(): full
   quantity for delivered/shipped sales, zero for processing ones.
   SettledQuantity is the sum of each item's non-REPLACEMENT return decisions
   from section 9 (item 1 -> refund 2, item 6 -> store credit 2).              */
SET IDENTITY_INSERT SaleItems ON;
INSERT INTO SaleItems (Id, SaleId, ProductId, Quantity, UnitPrice, Discount, ShippedQuantity, SettledQuantity) VALUES
    (1, 1, 1, 10, 2000000, 0, 10, 2),
    (2, 1, 2, 50,  500000, 0, 50, 0),
    (3, 2, 1, 10, 1900000, 5,  0, 0),
    (4, 2, 3,  3, 3500000, 0,  0, 0),
    (5, 3, 5,  5, 6000000, 0,  5, 0),
    (6, 3, 4, 12,  400000, 4, 12, 2);
SET IDENTITY_INSERT SaleItems OFF;

/* ---------------------------------------------------------------------------
   8. Purchase returns — hand-authored (the mock's are 100% random, see header)
   Status is PurchaseReturnStatusEnum: PENDING=0, COORDINATING=1, RESOLVED=2,
   REJECTED=3, CANCELLED=4.
   IssueType is PurchaseIssueTypeEnum: SHORTAGE=0, DEFECTIVE=1, DAMAGED=2,
   WRONG_ITEM=3, EXPIRED=4, EXCESS=5, OTHER=6.
   DecisionType is PurchaseReturnDecisionTypeEnum: REFUND=0, REPLACEMENT=1,
   CREDIT=2, WRITE_OFF=3.  Decision status: AWAITING=0, RESOLVED=1.
   --------------------------------------------------------------------------- */
SET IDENTITY_INSERT PurchaseReturns ON;
INSERT INTO PurchaseReturns (Id, ReturnNumber, PurchaseId, ReturnDate, Status, Description, CreatedAt, UpdatedAt) VALUES
    -- PENDING: a shortage reported on purchase 3, no decision registered yet.
    -- This is what keeps purchase 3 at PARTIALLY_RECEIVED.
    (1, N'RET-2026-0001', 3, '2026-06-16', 0, N'کسری در تحویل کاسه چرخ عقب', '2026-06-16T09:00:00', '2026-06-16T09:00:00'),
    -- RESOLVED: 2 damaged units on purchase 1, refunded in full. Because a
    -- resolved return is not "active", it no longer counts as an open issue,
    -- which is why purchase 1 can still be RECEIVED.
    (2, N'RET-2026-0002', 1, '2026-06-06', 2, N'دو عدد لنت آسیب‌دیده در حمل',  '2026-06-06T10:00:00', '2026-06-07T12:00:00');
SET IDENTITY_INSERT PurchaseReturns OFF;

SET IDENTITY_INSERT PurchaseReturnItems ON;
INSERT INTO PurchaseReturnItems (Id, PurchaseReturnId, PurchaseItemId, ProductId, UnitPrice, IssueType, Quantity, Note, CreatedAt) VALUES
    (1, 1, 5, 6,  800000, 0, 10, N'۱۰ عدد از ۳۰ عدد سفارش‌شده نرسید', '2026-06-16T09:00:00'),
    (2, 2, 1, 1, 1500000, 2,  2, N'بسته‌بندی له‌شده',                  '2026-06-06T10:00:00');
SET IDENTITY_INSERT PurchaseReturnItems OFF;

/* Only the resolved return has a decision; the pending one has none by definition. */
SET IDENTITY_INSERT PurchaseReturnDecisions ON;
INSERT INTO PurchaseReturnDecisions (Id, PurchaseReturnItemId, DecisionType, Quantity, RefundAmount, Status, Note, CreatedAt, ResolvedAt) VALUES
    (1, 2, 0, 2, 3000000, 1, N'', '2026-06-07T12:00:00', '2026-06-07T12:00:00');
SET IDENTITY_INSERT PurchaseReturnDecisions OFF;

/* ---------------------------------------------------------------------------
   9. Sale returns — hand-authored (the mock's are 100% random, see header)
   Status is SaleReturnStatusEnum: PENDING_INSPECTION=0, COORDINATING=1,
   RESOLVED=2, REJECTED=3, CANCELLED=4.
   Reason is SalesReturnReasonEnum: DEFECTIVE=0, WRONG_ITEM=1,
   DAMAGED_IN_TRANSIT=2, CHANGED_MIND=3, QUALITY_ISSUE=4, EXCESS_ORDER=5, OTHER=6.
   IssueType is SalesReturnIssueTypeEnum: DEFECTIVE=0, WRONG_ITEM=1,
   DAMAGED_IN_TRANSIT=2, QUALITY_ISSUE=3, OTHER=4 — NULL means inspected healthy.
   DecisionType is SaleReturnDecisionTypeEnum: REFUND=0, REPLACEMENT=1,
   STORE_CREDIT=2, NO_COMPENSATION=3.  Decision status: AWAITING=0, RESOLVED=1.

   Between them these three cover every non-terminal status and both reason axes
   agreeing (return 2) and disagreeing (return 1, where the customer claimed all
   4 were defective but one inspected healthy).
   --------------------------------------------------------------------------- */
SET IDENTITY_INSERT SaleReturns ON;
INSERT INTO SaleReturns (Id, ReturnNumber, SaleId, RequestDate, Status, Description, CreatedAt, UpdatedAt) VALUES
    (1, N'SRET-2026-0001', 1, '2026-06-10', 1, N'ادعای معیوب بودن لنت ترمز',      '2026-06-10T09:00:00', '2026-06-13T15:00:00'),
    (2, N'SRET-2026-0002', 3, '2026-06-18', 2, N'انصراف مشتری از دو عدد لامپ',     '2026-06-18T11:00:00', '2026-06-20T10:00:00'),
    (3, N'SRET-2026-0003', 1, '2026-06-22', 0, N'ادعای ارسال اشتباه فیلتر روغن',   '2026-06-22T14:00:00', '2026-06-22T14:00:00');
SET IDENTITY_INSERT SaleReturns OFF;

SET IDENTITY_INSERT SaleReturnClaims ON;
INSERT INTO SaleReturnClaims (Id, SaleReturnId, SaleItemId, ProductId, UnitPrice, Reason, ClaimedQuantity, Note, CreatedAt) VALUES
    (1, 1, 1, 1, 2000000, 0, 4, N'مشتری می‌گوید هر چهار عدد معیوب‌اند', '2026-06-10T09:00:00'),
    (2, 2, 6, 4,  400000, 3, 2, N'',                                    '2026-06-18T11:00:00'),
    (3, 3, 2, 2,  500000, 1, 5, N'',                                    '2026-06-22T14:00:00');
SET IDENTITY_INSERT SaleReturnClaims OFF;

/* Inspection results. Return 3 has none — that is what keeps it in
   PENDING_INSPECTION, and also what makes it the only one of the three that is
   still cancellable/rejectable/deletable.
   Return 1: all 4 claimed units inspected, but only 3 were actually defective —
   the 4th came back healthy (NULL) and would have gone back into sellable stock. */
SET IDENTITY_INSERT SaleReturnItems ON;
INSERT INTO SaleReturnItems (Id, SaleReturnClaimId, IssueType, Quantity, Note, CreatedAt) VALUES
    (1, 1,    0, 3, N'سه عدد واقعاً معیوب بود', '2026-06-13T10:00:00'),
    (2, 1, NULL, 1, N'یک عدد سالم بود',         '2026-06-13T10:00:00'),
    (3, 2, NULL, 2, N'هر دو سالم',              '2026-06-19T09:00:00');
SET IDENTITY_INSERT SaleReturnItems OFF;

/* Decisions.
   Return 1 stays COORDINATING: 3 of the 4 inspected units are allocated, and
   one of those allocations is a replacement still awaiting shipment.
   Return 2 is RESOLVED: every inspected unit allocated, every line final.     */
SET IDENTITY_INSERT SaleReturnDecisions ON;
INSERT INTO SaleReturnDecisions
    (Id, SaleReturnItemId, DecisionType, Quantity, RefundAmount, Status, ReplacementShippedQuantity, Note, CreatedAt, ResolvedAt)
VALUES
    (1, 1, 0, 2, 4000000, 1, 0, N'بازگشت وجه دو عدد', '2026-06-13T15:00:00', '2026-06-13T15:00:00'),
    (2, 1, 1, 1,    NULL, 0, 0, N'ارسال یک عدد جایگزین', '2026-06-13T15:00:00', NULL),
    (3, 3, 2, 2,    NULL, 1, 0, N'اعتبار خرید بعدی',   '2026-06-20T10:00:00', '2026-06-20T10:00:00');
SET IDENTITY_INSERT SaleReturnDecisions OFF;

COMMIT TRANSACTION;
GO

/* ---------------------------------------------------------------------------
   Summary
   --------------------------------------------------------------------------- */
SELECT 'ProductCategories' AS TableName, COUNT(*) AS [RowCount] FROM ProductCategories
UNION ALL SELECT 'Products',              COUNT(*) FROM Products
UNION ALL SELECT 'Customers',             COUNT(*) FROM Customers
UNION ALL SELECT 'Suppliers',             COUNT(*) FROM Suppliers
UNION ALL SELECT 'Purchases',             COUNT(*) FROM Purchases
UNION ALL SELECT 'PurchaseItems',         COUNT(*) FROM PurchaseItems
UNION ALL SELECT 'PaymentDetail',         COUNT(*) FROM PaymentDetail
UNION ALL SELECT 'Sales',                 COUNT(*) FROM Sales
UNION ALL SELECT 'SaleItems',             COUNT(*) FROM SaleItems
UNION ALL SELECT 'PurchaseReturns',       COUNT(*) FROM PurchaseReturns
UNION ALL SELECT 'PurchaseReturnItems',   COUNT(*) FROM PurchaseReturnItems
UNION ALL SELECT 'PurchaseReturnDecisions', COUNT(*) FROM PurchaseReturnDecisions
UNION ALL SELECT 'SaleReturns',           COUNT(*) FROM SaleReturns
UNION ALL SELECT 'SaleReturnClaims',      COUNT(*) FROM SaleReturnClaims
UNION ALL SELECT 'SaleReturnItems',       COUNT(*) FROM SaleReturnItems
UNION ALL SELECT 'SaleReturnDecisions',   COUNT(*) FROM SaleReturnDecisions;
GO
