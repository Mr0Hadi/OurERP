/* =============================================================================
   WMS — mock data seed script (test server only)
   =============================================================================

   Rebuilt from scratch against the current schema (2026-09-02) after the
   previous seed script (based on the pre-"effects model" PurchaseReturn/
   SaleReturn shape with PENDING/COORDINATING/RESOLVED status and Item/Decision
   tables) went stale. See CLAUDE.md "Purchase-return specific gaps" /
   "returns-effects-model" for the model this now targets:
   PurchaseReturn/SaleReturn -> *Claim -> *Resolution -> *Effect
   (-> *EffectRound -> *EffectObservation, and *EffectMoneyPart).

   *** DO NOT RUN THIS AGAINST THE LOCAL DEV DATABASE. ***
   This is meant for the test server only.

   PREREQUISITE: run every migration first, or this script will fail on
   missing tables/columns:
       dotnet ef database update --project Infrastructure --startup-project WMS

   -----------------------------------------------------------------------------
   Scope
   -----------------------------------------------------------------------------

   Covers every table in WMSDbContext EXCEPT Users — that table is hand-written
   and intentionally left untouched by this script. Departments/Teams are
   therefore seeded idempotently (insert-if-missing, never deleted/reset) rather
   than wiped with everything else, because hand-written User rows reference
   fixed Department/Team ids (see docs/org-structure-contract.fa.md, which is
   also why Department ids 1-6 below match that contract exactly) and dropping
   the parent rows out from under them would break FK constraints or silently
   orphan the hand-written data. Every Department/Team Head/Deputy FK is left
   NULL and every Purchase/Sale employee-link FK (PurchasingUserId/SalesUserId)
   is left NULL for the same reason — this script never assumes anything about
   what User rows exist.

   Tables seeded: Departments, Teams, ProductCategories, Products, ProductUnits,
   Customers, Suppliers, Purchases, PurchaseItems, PurchaseDrivers,
   PurchaseReceivingNotes, PurchaseReceivingImages, PaymentDetail,
   DocumentAttachments, Sales, SaleItems, SaleDrivers, SaleShippingNotes,
   PurchaseReturns (+Claims/Resolutions/Effects/EffectRounds/
   EffectObservations/EffectMoneyParts), SaleReturns (same shape),
   PosTerminals, InventoryCostLedgerEntries.

   -----------------------------------------------------------------------------
   Design notes / simplifications
   -----------------------------------------------------------------------------

   1. PRODUCT IDENTITY. Same reconciliation as the previous script: ids 1-10
      are the "real" parts referenced by purchase/sale line items (1-3 from the
      product catalogue, 4-10 named by the transaction mocks), ids 11-57 are
      generated filler ("قطعه نمونه i"), giving 57 products total.

   2. Product.Code/BarCode now follow the real generator
      (Infrastructure/Services/ProductCodeService.BuildProductCode):
      Code = '{8-digit Persian date}-{ProductId:D10}', BarCode = digits-only of
      Code (18 chars). ProductUnit.Barcode/BarcodePayload follow
      BuildUnitBarcode the same way (BarCode + 10-digit serial = 28 digits) so
      GET api/Product/ScanBarcode's Parse() resolves these seeded rows exactly
      like it would resolve real generated ones.

   3. PRODUCT UNITS mint one IN_STOCK row per product per unit of Stock (set-
      based, via a numbers/tally CTE) so Product.Stock == COUNT(ProductUnit
      WHERE Status = IN_STOCK) holds from the first row, matching the invariant
      IProductUnitService is supposed to maintain going forward.

   4. PURCHASE/SALE STATUS NUMBERING already matches the current (2026-09-02
      renumbered) PurchaseStatusEnum/SalesStatusEnum exactly (PROFORMA=0 first)
      — this script adds one PROFORMA purchase and one PROFORMA sale beyond
      what the old script had, to exercise that feature.

   5. PURCHASE STATUS is driven purely by ReceivedQuantity vs ordered Quantity
      per item (RecomputePurchaseStatus, decoupled from the return graph as of
      the effects-model rebuild) — PurchaseItem.SettledQuantity is left 0
      throughout since nothing reads it under the current model.

   6. SALE STATUS -> RETURNED is driven by SaleItem.SettledQuantity, bumped by
      return resolutions. Seeded SaleItem.SettledQuantity values reflect
      exactly what the seeded SaleReturn resolutions below settle, so re-running
      the real commands over this data would not change anything.

   7. RETURNS. Four PurchaseReturns and four SaleReturns are hand-authored
      (there's no deterministic mock to copy — the frontend's return mocks are
      100% random) to cover all five ReturnStatusEnum values across the two
      tables (OPEN, IN_PROGRESS, SETTLED, REJECTED on the purchase side;
      SETTLED, IN_PROGRESS, OPEN, CANCELLED on the sale side) and exercise
      every child table, including a MIXED-method money effect (so
      *EffectMoneyParts has rows) and a healthy/defective split inspection (so
      *EffectRounds/*EffectObservations both have rows).

   8. PAYMENT DETAILS. PaymentDetail.PurchaseId1 (the shadow FK EF generated
      because PaymentDetail.PurchaseId is a Guid while Purchase.Id is an int)
      is still NOT NULL even though PaymentDetail.SaleId is nullable — a
      payment row cannot exist without a Purchase reference, even for a sale
      payment (see CLAUDE.md "Known gaps"). This is a pre-existing schema gap,
      not something this script works around: only purchase-side payments are
      seeded, matching the previous script's approach.

   9. INVENTORY COST LEDGER. A full chronological AVCO ledger for every
      purchase/sale event is out of scope for a seed script — instead every
      product gets a single OPENING_BALANCE row at its current Stock/
      PurchasePrice, which is a valid, internally-consistent starting state for
      the ledger (RunningQuantity/RunningInventoryValue/RunningAverageCost all
      agree with Product.Stock/PurchasePrice) without inventing a fake
      transaction history.

   10. OBJECT STORAGE KEYS (DocumentAttachment.ObjectKey, PurchaseReceivingImage
       .ObjectKey) are plausible-looking placeholders, not real uploaded files —
       there is nothing at that key in any real bucket. Fine for exercising the
       schema; GetImageUrl-style re-signing against these keys will simply not
       resolve to a real object.

   Idempotency: aborts if the destructively-reset tables already hold data.
   Set @ResetExisting to 1 to DELETE the contents of every one of those tables
   first (Departments/Teams are never touched either way — see above).
   ============================================================================= */

SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

DECLARE @ResetExisting bit = 0;   -- 1 = wipe the tables in section 1 before seeding

/* ---------------------------------------------------------------------------
   0. Guard
   --------------------------------------------------------------------------- */
IF @ResetExisting = 0
   AND (EXISTS (SELECT 1 FROM Products)
     OR EXISTS (SELECT 1 FROM Customers)
     OR EXISTS (SELECT 1 FROM Suppliers)
     OR EXISTS (SELECT 1 FROM Purchases)
     OR EXISTS (SELECT 1 FROM Sales)
     OR EXISTS (SELECT 1 FROM PosTerminals))
BEGIN
    RAISERROR (N'Target tables are not empty. Set @ResetExisting = 1 to wipe and reseed, or clear them manually.', 16, 1);
    RETURN;
END;

BEGIN TRANSACTION;

/* ---------------------------------------------------------------------------
   1. Optional reset (child -> parent, so FKs stay satisfied). Departments and
      Teams are deliberately NOT included - see header note 0/scope.
   --------------------------------------------------------------------------- */
IF @ResetExisting = 1
BEGIN
    DELETE FROM SaleReturnEffectMoneyParts;
    DELETE FROM SaleReturnEffectObservations;
    DELETE FROM SaleReturnEffectRounds;
    DELETE FROM SaleReturnEffects;
    DELETE FROM SaleReturnResolutions;
    DELETE FROM SaleReturnClaims;
    DELETE FROM SaleReturns;

    DELETE FROM PurchaseReturnEffectMoneyParts;
    DELETE FROM PurchaseReturnEffectObservations;
    DELETE FROM PurchaseReturnEffectRounds;
    DELETE FROM PurchaseReturnEffects;
    DELETE FROM PurchaseReturnResolutions;
    DELETE FROM PurchaseReturnClaims;
    DELETE FROM PurchaseReturns;

    DELETE FROM PurchaseReceivingImages;
    DELETE FROM DocumentAttachments;
    DELETE FROM PaymentDetail;

    DELETE FROM SaleShippingNotes;
    DELETE FROM SaleDrivers;
    DELETE FROM SaleItems;
    DELETE FROM Sales;

    DELETE FROM PurchaseReceivingNotes;
    DELETE FROM PurchaseDrivers;
    DELETE FROM PurchaseItems;
    DELETE FROM Purchases;

    DELETE FROM InventoryCostLedgerEntries;
    DELETE FROM ProductUnits;
    DELETE FROM Products;
    DELETE FROM ProductCategories;

    DELETE FROM Customers;
    DELETE FROM Suppliers;
    DELETE FROM PosTerminals;
END;

/* ---------------------------------------------------------------------------
   2. Departments / Teams — idempotent, never reset (see header note 0).
   Ids match docs/org-structure-contract.fa.md so hand-written User rows can
   safely reference them.
   --------------------------------------------------------------------------- */
SET IDENTITY_INSERT Departments ON;
INSERT INTO Departments (Id, Name, IsActive, HeadId, DeputyId)
SELECT v.Id, v.Name, 1, NULL, NULL
FROM (VALUES
    (1, N'ادمین کل'),
    (2, N'واحد تامین'),
    (3, N'واحد فروش'),
    (4, N'واحد انبارداری'),
    (5, N'واحد حسابداری'),
    (6, N'واحد فناوری')
) AS v(Id, Name)
WHERE NOT EXISTS (SELECT 1 FROM Departments d WHERE d.Id = v.Id);
SET IDENTITY_INSERT Departments OFF;

SET IDENTITY_INSERT Teams ON;
INSERT INTO Teams (Id, Name, IsActive, DepartmentId, HeadId, DeputyId)
SELECT v.Id, v.Name, 1, v.DepartmentId, NULL, NULL
FROM (VALUES
    (1, N'تیم خرید داخلی',    2),
    (2, N'تیم خرید خارجی',    2),
    (3, N'تیم فروش حضوری',    3),
    (4, N'تیم فروش تلفنی',    3),
    (5, N'تیم انبار مرکزی',   4),
    (6, N'تیم حسابداری فروش', 5)
) AS v(Id, Name, DepartmentId)
WHERE NOT EXISTS (SELECT 1 FROM Teams t WHERE t.Id = v.Id);
SET IDENTITY_INSERT Teams OFF;

/* ---------------------------------------------------------------------------
   3. Product categories
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
   4a. Products 1-10 — the real parts referenced by purchase/sale line items.
   Unit is ProductUnitEnum: Hand=0, Number=1, Box=2, Liter=3, Kg=4, Kit=5,
   Package=6, Pair=7. Code/BarCode follow ProductCodeService.BuildProductCode:
   '{8-digit Persian date}-{Id:D10}' / digits-only of that (18 chars).
   --------------------------------------------------------------------------- */
SET IDENTITY_INSERT Products ON;
INSERT INTO Products
    (Id, Name, Code, BarCode, SupplierBarCode, Brand, Unit, PurchasePrice, RetailPrice, WholeSalePrice,
     Tax, Stock, LowStockThreshold, ImageUrl, IsActive, CreatedAt, UpdatedAt, ProductCategoryId)
VALUES
    (1,  N'لنت ترمز جلو',      N'14040115-0000000001', N'140401150000000001', NULL, N'بوش',   0,  350000,  450000,  420000, 9,  45, 10, N'', 1, '2024-01-10T08:00:00', '2024-06-15T12:00:00', 2),
    (2,  N'فیلتر روغن',        N'14040115-0000000002', N'140401150000000002', NULL, N'مان',   1,   90000,  120000,  105000, 9, 120, 10, N'', 1, '2024-01-10T08:00:00', '2024-06-15T12:00:00', 1),
    (3,  N'کمک فنر جلو',       N'14040115-0000000003', N'140401150000000003', NULL, N'ساکس',  1, 1500000, 1850000, 1700000, 9,   8, 10, N'', 1, '2024-01-10T08:00:00', '2024-06-15T12:00:00', 3),
    (4,  N'لامپ هدلایت H4',    N'14040115-0000000004', N'140401150000000004', NULL, N'بوش',   1,  240000,  400000,  360000, 9,  60, 10, N'', 1, '2024-01-10T08:00:00', '2024-06-15T12:00:00', 4),
    (5,  N'باتری ۶۰ آمپر',     N'14040115-0000000005', N'140401150000000005', NULL, N'دنسو',  1, 4500000, 6000000, 5400000, 9,  25, 10, N'', 1, '2024-01-10T08:00:00', '2024-06-15T12:00:00', 4),
    (6,  N'کاسه چرخ عقب',      N'14040115-0000000006', N'140401150000000006', NULL, N'لنکر',  1,  800000, 1000000,  900000, 9,  40, 10, N'', 1, '2024-01-10T08:00:00', '2024-06-15T12:00:00', 2),
    (7,  N'فیلتر هوای موتور',  N'14040115-0000000007', N'140401150000000007', NULL, N'مان',   1,  425000,  530000,  480000, 9,  75, 10, N'', 1, '2024-01-10T08:00:00', '2024-06-15T12:00:00', 1),
    (8,  N'کمک فنر عقب',       N'14040115-0000000008', N'140401150000000008', NULL, N'ساکس',  1, 1850000, 2310000, 2080000, 9,  18, 10, N'', 1, '2024-01-10T08:00:00', '2024-06-15T12:00:00', 3),
    (9,  N'یاتاقان شاتون',     N'14040115-0000000009', N'140401150000000009', NULL, N'ماله',  1, 1420000, 1780000, 1600000, 9,  32, 10, N'', 1, '2024-01-10T08:00:00', '2024-06-15T12:00:00', 1),
    (10, N'کلاچ کامل',         N'14040115-0000000010', N'140401150000000010', NULL, N'تویس',  0, 5500000, 6880000, 6190000, 9,  12, 10, N'', 1, '2024-01-10T08:00:00', '2024-06-15T12:00:00', 6);

/* ---------------------------------------------------------------------------
   4b. Products 11-57 — 47 generated filler products, same brand/category/unit
   cycling and price formula as the old catalogue generator, but with
   deterministic stock (index-based, not random) so re-running this script
   gives the same database.
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
        (Id, Name, Code, BarCode, SupplierBarCode, Brand, Unit, PurchasePrice, RetailPrice, WholeSalePrice,
         Tax, Stock, LowStockThreshold, ImageUrl, IsActive, CreatedAt, UpdatedAt, ProductCategoryId)
    VALUES
        (@i + 7,
         N'قطعه نمونه ' + CAST(@i AS nvarchar(10)),
         N'14040201-' + RIGHT('0000000000' + CAST(@i + 7 AS nvarchar(10)), 10),
         N'14040201' + RIGHT('0000000000' + CAST(@i + 7 AS nvarchar(10)), 10),
         NULL,
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
   5. Product units — one IN_STOCK row per unit of Stock, set-based via a
   tally CTE. Barcode/BarcodePayload follow ProductCodeService.BuildUnitBarcode
   ('{Code}-{Serial:D10}' / digits-only of that, 28 chars) exactly, so
   GET api/Product/ScanBarcode resolves these rows like real minted ones.
   ProductUnitStatusEnum: IN_STOCK=1.
   --------------------------------------------------------------------------- */
;WITH Tally AS (
    SELECT TOP (200) ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS n
    FROM sys.all_objects a CROSS JOIN sys.all_objects b
)
INSERT INTO ProductUnits (ProductId, SerialNumber, Barcode, BarcodePayload, Status, PurchaseItemId, SaleItemId, CreatedAt, SoldAt, IsActive)
SELECT
    p.Id,
    t.n,
    p.Code + '-' + RIGHT('0000000000' + CAST(t.n AS varchar(10)), 10),
    p.BarCode + RIGHT('0000000000' + CAST(t.n AS varchar(10)), 10),
    1,
    NULL,
    NULL,
    p.CreatedAt,
    NULL,
    1
FROM Products p
JOIN Tally t ON t.n <= p.Stock;

/* ---------------------------------------------------------------------------
   6. Customers — BalanceType is BalanceTypeEnum: Creditor=0, Debtor=1,
   Balanced=2.
   --------------------------------------------------------------------------- */
SET IDENTITY_INSERT Customers ON;
INSERT INTO Customers
    (Id, FirstName, LastName, PhoneNumber, Address, PostalCode, RefferalCode, CreditLimit,
     EconomicCode, NationalId, RegistrationNumber, Province, City,
     Description, Balance, BalanceType, ImageUrl, longitude, latitude, IsActive, CreatedAt, UpdatedAt)
VALUES
    (1, N'علی',    N'محمدی',    N'09121234567', N'تهران، خیابان ولیعصر، پلاک ۱۲',  N'1234567890', N'REF001', 5000000,  NULL,         N'0012345678', NULL,          N'تهران',   N'تهران',   N'مشتری وفادار',   500000,  1, NULL, 51.389, 35.6892, 1, '2024-01-15T10:30:00', '2024-06-20T14:45:00'),
    (2, N'فاطمه',  N'احمدی',    N'09351234567', N'اصفهان، خیابان چهارباغ، پلاک ۵', N'8134567890', N'',       10000000, N'14009988776', N'0098765432', N'123456',     N'اصفهان',  N'اصفهان',  N'',                1200000, 1, NULL, 51.666, 32.6539, 1, '2024-02-10T09:15:00', '2024-07-01T11:20:00'),
    (3, N'لیلا',   N'ابراهیمی', N'09371234567', N'همدان، خیابان اکباتان، پلاک ۱۱', N'6514567890', N'REF002', 2000000,  NULL,         NULL,          NULL,          N'همدان',   N'همدان',   N'نیاز به پیگیری', 1100000, 0, NULL, 48.515, 34.799,  1, '2024-03-05T16:00:00', '2024-06-25T10:10:00');
SET IDENTITY_INSERT Customers OFF;

/* ---------------------------------------------------------------------------
   7. Suppliers
   --------------------------------------------------------------------------- */
SET IDENTITY_INSERT Suppliers ON;
INSERT INTO Suppliers
    (Id, CompanyName, FirstName, LastName, Phone, Address, PostalCode,
     EconomicCode, NationalId, RegistrationNumber, Province, City,
     Balance, BalanceType, Description, ImageUrl, longitude, latitude, IsActive, CreatedAt, UpdatedAt)
VALUES
    (1, N'ایران قطعه',        N'رضا',  N'تقوی',  N'02112345678', N'تهران، خیابان امیرکبیر، پلاک ۱۲', N'1234567890', N'14007712345', N'10861234567', N'54321', N'تهران', N'تهران', 450000,  1, N'', NULL, 51.389,  35.6892, 1, '2024-03-05T16:00:00', '2024-06-25T10:10:00'),
    (2, N'لنت پارس موتور',    N'محمد', N'راد',   N'09121234567', N'کرج، منطقه صنعتی، سوله ۵',        N'8134567890', NULL,           NULL,           NULL,     N'البرز', N'کرج',   1100000, 0, N'', NULL, 50.9915, 35.8327, 1, '2024-03-05T16:00:00', '2024-06-25T10:10:00'),
    (3, N'پخش بلبرینگ مرکزی', N'حسن',  N'کریمی', N'02198765432', N'تهران، میدان توپخانه',            N'6514567890', NULL,           NULL,           NULL,     N'تهران', N'تهران', 1200000, 1, N'', NULL, 51.423,  35.685,  1, '2024-03-05T16:00:00', '2024-06-25T10:10:00');
SET IDENTITY_INSERT Suppliers OFF;

/* ---------------------------------------------------------------------------
   8. Purchases — Status is PurchaseStatusEnum: PROFORMA=0, PENDING=1,
   SHIPPED=2, PARTIALLY_RECEIVED=3, RECEIVED=4, CANCELLED=5.
   PaymentType is PaymentTypeEnum: CASH=0, CREDIT=1, CHECK=2, TRANSFER=3, MIXED=4.
   PurchasingUserId left NULL throughout (see header note 0).
   --------------------------------------------------------------------------- */
SET IDENTITY_INSERT Purchases ON;
INSERT INTO Purchases
    (Id, InvoiceNumber, InvoiceDate, PaymentDate, Status, PaymentType, PaidAmount, TotalAmount,
     Description, SupplierId, PurchasingUserId, IsActive, CreatedAt, UpdatedAt)
VALUES
    (1, N'INV-2026-001',      '2026-03-15', '2026-03-15', 4, 0, 45000000, 45000000, N'خرید لوازم یدکی موتور',                    1, NULL, 1, '2026-06-04T10:30:00', '2026-06-04T10:30:00'),
    (2, N'INV-2026-002',      '2026-03-20', '2026-03-20', 2, 1,        0, 28500000, N'خرید لنت و دیسک ترمز',                     2, NULL, 1, '2026-06-09T14:15:00', '2026-06-09T14:15:00'),
    (3, N'INV-2026-003',      '2026-03-25', '2026-03-25', 3, 2, 50000000, 50000000, N'خرید یاتاقان و بلبرینگ',                   3, NULL, 1, '2026-06-14T09:45:00', '2026-06-14T09:45:00'),
    (4, N'INV-2026-004',      '2026-03-28', '2026-03-28', 1, 3, 35000000, 35000000, N'خرید فیلترها و روغن موتور',                1, NULL, 1, '2026-06-17T11:20:00', '2026-06-17T11:20:00'),
    (5, N'INV-2026-005',      '2026-04-01', '2026-04-01', 4, 4, 60000000, 82500000, N'خرید کلاچ و دیسک کلاچ - پرداخت ترکیبی',    2, NULL, 1, '2026-06-20T16:00:00', '2026-06-20T16:00:00'),
    (6, N'INV-2026-006',      '2026-04-02', '2026-04-02', 5, 1,        0, 24000000, N'خرید لامپ - لغو شده به دلیل عدم موجودی',   1, NULL, 1, '2026-06-21T08:30:00', '2026-06-21T13:45:00'),
    (7, N'PRO-2026-0001',     '2026-07-01', '2026-07-01', 0, 0,        0,  8500000, N'پیش‌فاکتور خرید فیلتر هوا - در انتظار تایید نهایی', 3, NULL, 1, '2026-07-01T09:00:00', '2026-07-01T09:00:00');
SET IDENTITY_INSERT Purchases OFF;

/* Purchase line items. Ids are explicit because PurchaseReturnClaim rows in
   section 15 reference them. Under the current model Purchase.Status is
   driven purely by ReceivedQuantity vs Quantity per item (no more coupling to
   the return graph) - values below are chosen so RecomputePurchaseStatus would
   reproduce the headers above exactly. SettledQuantity is left 0 throughout;
   nothing reads it under the current model (see header note 5).            */
SET IDENTITY_INSERT PurchaseItems ON;
INSERT INTO PurchaseItems (Id, PurchaseId, ProductId, Quantity, UnitPrice, Discount, ReceivedQuantity, SettledQuantity) VALUES
    (1,  1,  1,  20, 1500000,  0, 20, 0),
    (2,  1,  2,  50,  300000,  0, 50, 0),
    (3,  2,  1,  15, 1500000,  5,  0, 0),
    (4,  2,  3,   4, 1800000,  0,  0, 0),
    (5,  3,  6,  30,  800000, 10, 20, 0),
    (6,  3,  9,  20, 1420000,  0, 20, 0),
    (7,  4,  2,  60,  300000,  0,  0, 0),
    (8,  4,  7,  40,  425000,  0,  0, 0),
    (9,  5, 10,  15, 5500000,  0, 15, 0),
    (10, 6,  4, 100,  240000,  0,  0, 0),
    (11, 7,  7,  20,  425000,  0,  0, 0);
SET IDENTITY_INSERT PurchaseItems OFF;

/* ---------------------------------------------------------------------------
   9. Purchase drivers / receiving notes — history rows on the two purchases
   that have actually been (at least partially) received.
   --------------------------------------------------------------------------- */
SET IDENTITY_INSERT PurchaseDrivers ON;
INSERT INTO PurchaseDrivers (Id, PurchaseId, DriverFullName, DriverPhoneNumber, VehiclePlate, CreatedAt) VALUES
    (1, 1, N'حسین رضایی', N'09123334455', N'12ایران345-67', '2026-06-04T10:15:00'),
    (2, 3, N'کریم نوری',  N'09121112233', N'34ایران221-11', '2026-06-14T09:30:00');
SET IDENTITY_INSERT PurchaseDrivers OFF;

SET IDENTITY_INSERT PurchaseReceivingNotes ON;
INSERT INTO PurchaseReceivingNotes (Id, PurchaseId, Note, CreatedAt) VALUES
    (1, 1, N'تحویل کامل و بدون مشکل',                     '2026-06-04T10:15:00'),
    (2, 3, N'کسری در تعداد کاسه چرخ گزارش شد',            '2026-06-14T09:30:00');
SET IDENTITY_INSERT PurchaseReceivingNotes OFF;

/* PurchaseReceivingImages are no longer return-linked at write time (always
   PurchaseReturnId = NULL now - see returns-effects-model rebuild), so both
   rows below leave it NULL even though purchase 3 does have an open return. */
SET IDENTITY_INSERT PurchaseReceivingImages ON;
INSERT INTO PurchaseReceivingImages (Id, PurchaseId, PurchaseReturnId, ObjectKey, FileName, Note, CreatedAt) VALUES
    (1, 1, NULL, N'purchases/2026/06/receiving-1-pallet.jpg',        N'pallet.jpg', N'عکس محموله در بدو ورود', '2026-06-04T10:15:00'),
    (2, 3, NULL, N'purchases/2026/06/receiving-3-carton-damage.jpg', N'carton.jpg', N'کارتن آسیب‌دیده',        '2026-06-14T09:30:00');
SET IDENTITY_INSERT PurchaseReceivingImages OFF;

/* ---------------------------------------------------------------------------
   10. Payment details. Purchase 5's three mixed payments, plus the single
   check/transfer references purchases 3 and 4 carry inline in the mock.
   PurchaseId is the unused Guid column; PurchaseId1 is the real (NOT NULL) FK
   - see header note 8 for why no sale-side payment is seeded here.
   --------------------------------------------------------------------------- */
INSERT INTO PaymentDetail (Id, PurchaseId, PurchaseId1, SaleId, Type, Amount, CheckNumber, TransferRef) VALUES
    (NEWID(), '00000000-0000-0000-0000-000000000000', 3, NULL, 2, 50000000, N'7845612301', NULL),
    (NEWID(), '00000000-0000-0000-0000-000000000000', 4, NULL, 3, 35000000, NULL, N'TRN-98765432'),
    (NEWID(), '00000000-0000-0000-0000-000000000000', 5, NULL, 0, 30000000, NULL, NULL),
    (NEWID(), '00000000-0000-0000-0000-000000000000', 5, NULL, 2, 20000000, N'1234567890', NULL),
    (NEWID(), '00000000-0000-0000-0000-000000000000', 5, NULL, 3, 10000000, NULL, N'TRN-55667788');

/* ---------------------------------------------------------------------------
   11. Document attachments — DocumentKindEnum: PURCHASE=1, SALE=2.
   --------------------------------------------------------------------------- */
SET IDENTITY_INSERT DocumentAttachments ON;
INSERT INTO DocumentAttachments (Id, DocumentKind, DocumentId, ObjectKey, FileName, Note, CreatedAt) VALUES
    (1, 1, 1, N'purchases/2026/06/invoice-1.pdf',  N'invoice-1.pdf',       N'فاکتور اسکن شده',  '2026-06-04T10:30:00'),
    (2, 1, 7, N'purchases/2026/07/proforma-7.pdf', N'proforma-7.pdf',      N'پیش‌فاکتور تامین‌کننده', '2026-07-01T09:00:00'),
    (3, 2, 1, N'sales/2026/06/invoice-1.pdf',      N'sale-invoice-1.pdf',  N'فاکتور فروش اسکن شده', '2026-06-04T10:30:00');
SET IDENTITY_INSERT DocumentAttachments OFF;

/* ---------------------------------------------------------------------------
   12. Sales — Status is SalesStatusEnum: PROFORMA=0, PROCESSING=1,
   PARTIALLY_DELIVERED=2, SHIPPED=3, DELIVERED=4, CANCELLED=5, RETURNED=6.
   SalesUserId left NULL throughout (see header note 0).
   --------------------------------------------------------------------------- */
SET IDENTITY_INSERT Sales ON;
INSERT INTO Sales
    (Id, InvoiceNumber, InvoiceDate, Status, PaymentType, PaidAmount, TotalAmount,
     Description, CustomerId, SalesUserId, IsActive, CreatedAt, UpdatedAt)
VALUES
    (1, N'SALE-2026-001',  '2026-06-04', 4, 0, 45000000, 45000000, N'فروش لوازم یدکی موتور',    1, NULL, 1, '2026-06-04T10:30:00', '2026-06-04T10:30:00'),
    (2, N'SALE-2026-002',  '2026-06-09', 1, 1,        0, 28550000, N'فروش لنت و دیسک ترمز',     2, NULL, 1, '2026-06-09T14:15:00', '2026-06-09T14:15:00'),
    (3, N'SALE-2026-003',  '2026-06-15', 4, 4, 34608000, 34608000, N'فروش باتری و لوازم برقی',  3, NULL, 1, '2026-06-15T11:20:00', '2026-06-15T11:20:00'),
    (4, N'PROFORMA-2026-0001', '2026-07-02', 0, 0, 5000000, 12000000, N'پیش‌فاکتور فروش - در انتظار تسویه کامل', 2, NULL, 1, '2026-07-02T09:30:00', '2026-07-02T09:30:00');
SET IDENTITY_INSERT Sales OFF;

/* Sale line items. ShippedQuantity follows applyShippedQty (full quantity for
   delivered/shipped sales, zero otherwise). SettledQuantity is set to exactly
   what the seeded SaleReturn resolutions in section 17 settle for that item
   (item 1 -> 3+1=4, item 6 -> 2), so nothing here drifts from the return
   graph below - see header note 6.                                          */
SET IDENTITY_INSERT SaleItems ON;
INSERT INTO SaleItems (Id, SaleId, ProductId, Quantity, UnitPrice, Discount, ShippedQuantity, SettledQuantity) VALUES
    (1, 1, 1, 10, 2000000, 0, 10, 4),
    (2, 1, 2, 50,  500000, 0, 50, 0),
    (3, 2, 1, 10, 1900000, 5,  0, 0),
    (4, 2, 3,  3, 3500000, 0,  0, 0),
    (5, 3, 5,  5, 6000000, 0,  5, 0),
    (6, 3, 4, 12,  400000, 4, 12, 2),
    (7, 4, 8,  6, 2310000, 0,  0, 0);
SET IDENTITY_INSERT SaleItems OFF;

/* ---------------------------------------------------------------------------
   13. Sale drivers / shipping notes.
   --------------------------------------------------------------------------- */
SET IDENTITY_INSERT SaleDrivers ON;
INSERT INTO SaleDrivers (Id, SaleId, DriverFullName, DriverPhoneNumber, VehiclePlate, CreatedAt) VALUES
    (1, 1, N'جواد امینی', N'09354445566', N'55ایران778-90', '2026-06-04T10:20:00'),
    (2, 3, N'مریم قاسمی', N'09127778899', N'21ایران456-33', '2026-06-15T11:10:00');
SET IDENTITY_INSERT SaleDrivers OFF;

SET IDENTITY_INSERT SaleShippingNotes ON;
INSERT INTO SaleShippingNotes (Id, SaleId, Note, CreatedAt) VALUES
    (1, 1, N'ارسال کامل طبق فاکتور',            '2026-06-04T10:20:00'),
    (2, 3, N'بسته‌بندی ویژه برای باتری',          '2026-06-15T11:10:00');
SET IDENTITY_INSERT SaleShippingNotes OFF;

/* ---------------------------------------------------------------------------
   14. Purchase returns (effects model).
   ReturnStatusEnum: OPEN=0, IN_PROGRESS=1, SETTLED=2, REJECTED=3, CANCELLED=4.
   ReturnClaimScopeEnum: ON_ORDER=0, OFF_ORDER=1.
   ReturnProblemEnum: WRONG_ITEM_SHIPPED=0, WRONG_ITEM_INVOICED=1,
   WRONG_ITEM_ORDERED=2, SHORT_SHIPPED=3, OVER_SHIPPED=4, WRONG_QTY_INVOICED=5,
   WRONG_QTY_ORDERED=6, DEFECTIVE=7, DAMAGED_IN_TRANSIT=8, QUALITY_ISSUE=9,
   EXPIRED=10, CHANGED_MIND=11, UNLISTED_ITEM=12, OTHER=13.
   ReturnEffectKindEnum: GOODS_IN=0, GOODS_OUT=1, MONEY_OUT=2, MONEY_IN=3.
   ReturnEffectStatusEnum: PENDING=0, APPLIED=1, VOID=2.
   ReturnPaymentMethodEnum: CASH=0, CHECK=1, TRANSFER=2, ON_ACCOUNT=3,
   STORE_CREDIT=4, MIXED=5.

   Four returns, one per non-CANCELLED status:
     PR1 (purchase 3, OPEN)        - shortage claimed, nothing decided yet.
     PR2 (purchase 1, SETTLED)     - 2 damaged units, refunded via a MIXED
                                      (transfer + cash) money effect.
     PR3 (purchase 5, IN_PROGRESS) - 3 wrong items: returned to the supplier
                                      (applied) awaiting a replacement
                                      (still pending) - one resolution, two
                                      effects.
     PR4 (purchase 2, REJECTED)    - a quantity-mismatch claim the supplier
                                      disputed successfully; never resolved.
   --------------------------------------------------------------------------- */
SET IDENTITY_INSERT PurchaseReturns ON;
INSERT INTO PurchaseReturns (Id, ReturnNumber, PurchaseId, ReturnDate, Status, Description, IsActive, PreviousReturnId, CreatedAt, UpdatedAt) VALUES
    (1, N'RET-2026-0001', 3, '2026-06-16', 0, N'کسری در تحویل کاسه چرخ عقب',                 1, NULL, '2026-06-16T09:00:00', '2026-06-16T09:00:00'),
    (2, N'RET-2026-0002', 1, '2026-06-06', 2, N'دو عدد لنت آسیب‌دیده در حمل',                  1, NULL, '2026-06-06T10:00:00', '2026-06-07T12:00:00'),
    (3, N'RET-2026-0003', 5, '2026-06-21', 1, N'سه عدد کلاچ اشتباه ارسال شده بود',             1, NULL, '2026-06-21T09:00:00', '2026-06-22T10:00:00'),
    (4, N'RET-2026-0004', 2, '2026-06-10', 3, N'اختلاف تعداد در فاکتور - توسط تامین‌کننده رد شد', 1, NULL, '2026-06-10T08:00:00', '2026-06-11T09:00:00');
SET IDENTITY_INSERT PurchaseReturns OFF;

SET IDENTITY_INSERT PurchaseReturnClaims ON;
INSERT INTO PurchaseReturnClaims (Id, PurchaseReturnId, Scope, OffScopeKind, PurchaseItemId, ProductId, UnitPrice, Quantity, Problem, Note, CreatedAt) VALUES
    (1, 1, 0, NULL, 5, 6,  800000, 10, 3, N'۱۰ عدد از ۳۰ عدد سفارش‌شده نرسید',    '2026-06-16T09:00:00'),
    (2, 2, 0, NULL, 1, 1, 1500000,  2, 8, N'بسته‌بندی له‌شده',                     '2026-06-06T10:00:00'),
    (3, 3, 0, NULL, 9, 10, 5500000,  3, 0, N'۳ عدد کلاچ اشتباه ارسال شده بود',    '2026-06-21T09:00:00'),
    (4, 4, 0, NULL, 3, 1, 1500000,  2, 5, N'اختلاف تعداد در فاکتور',              '2026-06-10T08:00:00');
SET IDENTITY_INSERT PurchaseReturnClaims OFF;

/* Only claims 2 and 3 have a resolution - claim 1's return is still OPEN,
   claim 4's return was REJECTED before any resolution was registered. */
SET IDENTITY_INSERT PurchaseReturnResolutions ON;
INSERT INTO PurchaseReturnResolutions (Id, PurchaseReturnClaimId, Quantity, Note, CreatedAt) VALUES
    (1, 2, 2, N'بازگشت وجه دو عدد آسیب‌دیده',                  '2026-06-07T12:00:00'),
    (2, 3, 3, N'بازگرداندن قطعات اشتباه و دریافت جایگزین',     '2026-06-21T09:30:00');
SET IDENTITY_INSERT PurchaseReturnResolutions OFF;

SET IDENTITY_INSERT PurchaseReturnEffects ON;
INSERT INTO PurchaseReturnEffects
    (Id, PurchaseReturnResolutionId, Kind, Quantity, DoneQuantity, RestockedQuantity, ProductId,
     Amount, Method, Reference, Note, Status, CreatedAt, AppliedAt) VALUES
    (1, 1, 3, 0, 0, NULL, NULL, 3000000, 5,    NULL, N'بازگشت وجه دو عدد آسیب‌دیده',    1, '2026-06-07T12:00:00', '2026-06-07T12:00:00'),
    (2, 2, 1, 3, 3, NULL, 10,   NULL,    NULL, NULL, N'بازگشت قطعات اشتباه به تامین‌کننده', 1, '2026-06-21T09:30:00', '2026-06-21T09:45:00'),
    (3, 2, 0, 3, 0, NULL, 10,   NULL,    NULL, NULL, N'در انتظار دریافت جایگزین',        0, '2026-06-21T09:30:00', NULL);
SET IDENTITY_INSERT PurchaseReturnEffects OFF;

SET IDENTITY_INSERT PurchaseReturnEffectRounds ON;
INSERT INTO PurchaseReturnEffectRounds (Id, PurchaseReturnEffectId, Date, Quantity, HealthyQuantity, PartyName, PartyNationalId, VehiclePlate, Note, CreatedAt) VALUES
    (1, 2, '2026-06-21T09:45:00', 3, NULL, N'انبار تامین‌کننده', NULL, NULL, N'بازگشت قطعات اشتباه', '2026-06-21T09:45:00');
SET IDENTITY_INSERT PurchaseReturnEffectRounds OFF;

SET IDENTITY_INSERT PurchaseReturnEffectObservations ON;
INSERT INTO PurchaseReturnEffectObservations (Id, PurchaseReturnEffectRoundId, Problem, Quantity, Note) VALUES
    (1, 1, 0, 3, N'بررسی نهایی قبل از ارسال به تامین‌کننده');
SET IDENTITY_INSERT PurchaseReturnEffectObservations OFF;

/* Effect 1's MONEY_IN refund is split across two payment methods. */
SET IDENTITY_INSERT PurchaseReturnEffectMoneyParts ON;
INSERT INTO PurchaseReturnEffectMoneyParts (Id, PurchaseReturnEffectId, Method, Amount, CheckNumber, TransferRef) VALUES
    (1, 1, 2, 2500000, NULL, N'TRN-1122'),
    (2, 1, 0,  500000, NULL, NULL);
SET IDENTITY_INSERT PurchaseReturnEffectMoneyParts OFF;

/* ---------------------------------------------------------------------------
   15. Sale returns (same effects model, mirrored). Four returns:
     SR1 (sale 1, SETTLED)     - 4 claimed defective; inspection found 3
                                  actually defective (refunded, MIXED money
                                  effect) and 1 healthy (restocked) - two
                                  resolutions on one claim.
     SR2 (sale 3, IN_PROGRESS) - 2 defective lamps returned (applied) and a
                                  replacement shipment still pending.
     SR3 (sale 1, OPEN)        - a second, unrelated claim with nothing
                                  decided yet.
     SR4 (sale 2, CANCELLED)   - customer changed their mind before the sale
                                  ever shipped; cancelled before inspection.
   --------------------------------------------------------------------------- */
SET IDENTITY_INSERT SaleReturns ON;
INSERT INTO SaleReturns (Id, ReturnNumber, SaleId, RequestDate, Status, Description, IsActive, PreviousReturnId, SourceEffectId, CreatedAt, UpdatedAt) VALUES
    (1, N'SRET-2026-0001', 1, '2026-06-10', 2, N'ادعای معیوب بودن لنت ترمز',       1, NULL, NULL, '2026-06-10T09:00:00', '2026-06-13T15:00:00'),
    (2, N'SRET-2026-0002', 3, '2026-06-18', 1, N'ادعای معیوب بودن لامپ هدلایت',    1, NULL, NULL, '2026-06-18T11:00:00', '2026-06-19T09:30:00'),
    (3, N'SRET-2026-0003', 1, '2026-06-22', 0, N'ادعای ارسال اشتباه فیلتر روغن',   1, NULL, NULL, '2026-06-22T14:00:00', '2026-06-22T14:00:00'),
    (4, N'SRET-2026-0004', 2, '2026-06-11', 4, N'انصراف مشتری قبل از ارسال',       1, NULL, NULL, '2026-06-11T10:00:00', '2026-06-11T16:00:00');
SET IDENTITY_INSERT SaleReturns OFF;

SET IDENTITY_INSERT SaleReturnClaims ON;
INSERT INTO SaleReturnClaims (Id, SaleReturnId, Scope, OffScopeKind, SaleItemId, ProductId, UnitPrice, Quantity, Problem, Note, CreatedAt) VALUES
    (1, 1, 0, NULL, 1, 1, 2000000, 4, 7,  N'مشتری می‌گوید هر چهار عدد معیوب‌اند', '2026-06-10T09:00:00'),
    (2, 2, 0, NULL, 6, 4,  400000, 2, 7,  N'دو عدد لامپ معیوب گزارش شد',          '2026-06-18T11:00:00'),
    (3, 3, 0, NULL, 2, 2,  500000, 5, 0,  N'ادعای ارسال اشتباه فیلتر روغن',       '2026-06-22T14:00:00'),
    (4, 4, 0, NULL, 3, 1, 1900000, 1, 11, N'مشتری منصرف شد اما هنوز ارسال نشده بود', '2026-06-11T10:00:00');
SET IDENTITY_INSERT SaleReturnClaims OFF;

/* Claim 1 splits into two resolutions (defective portion / healthy portion).
   Claim 2 gets one resolution. Claims 3 and 4 (OPEN / CANCELLED) have none. */
SET IDENTITY_INSERT SaleReturnResolutions ON;
INSERT INTO SaleReturnResolutions (Id, SaleReturnClaimId, Quantity, Note, CreatedAt) VALUES
    (1, 1, 3, N'۳ عدد واقعاً معیوب - بازگشت وجه',       '2026-06-13T15:00:00'),
    (2, 1, 1, N'۱ عدد سالم بود - بازگشت به انبار',        '2026-06-13T15:00:00'),
    (3, 2, 2, N'ارسال جایگزین برای دو عدد معیوب',         '2026-06-18T11:30:00');
SET IDENTITY_INSERT SaleReturnResolutions OFF;

SET IDENTITY_INSERT SaleReturnEffects ON;
INSERT INTO SaleReturnEffects
    (Id, SaleReturnResolutionId, Kind, Quantity, DoneQuantity, RestockedQuantity, ProductId,
     Amount, Method, Reference, Note, Status, CreatedAt, AppliedAt) VALUES
    (1, 1, 0, 3, 3, 0, 1,    NULL,    NULL, NULL, N'دریافت سه عدد معیوب از مشتری', 1, '2026-06-13T15:00:00', '2026-06-13T15:00:00'),
    (2, 1, 2, 0, 0, NULL, NULL, 6000000, 5,    NULL, N'بازگشت وجه سه عدد',           1, '2026-06-13T15:00:00', '2026-06-13T15:00:00'),
    (3, 2, 0, 1, 1, 1, 1,    NULL,    NULL, NULL, N'یک عدد سالم بازگشت به انبار',  1, '2026-06-13T15:00:00', '2026-06-13T15:00:00'),
    (4, 3, 0, 2, 2, 0, 4,    NULL,    NULL, NULL, N'دریافت دو عدد لامپ معیوب',     1, '2026-06-18T11:30:00', '2026-06-18T11:45:00'),
    (5, 3, 1, 2, 0, NULL, 4, NULL,    NULL, NULL, N'در انتظار ارسال جایگزین',      0, '2026-06-18T11:30:00', NULL);
SET IDENTITY_INSERT SaleReturnEffects OFF;

SET IDENTITY_INSERT SaleReturnEffectRounds ON;
INSERT INTO SaleReturnEffectRounds (Id, SaleReturnEffectId, Date, Quantity, HealthyQuantity, PartyName, PartyNationalId, VehiclePlate, Note, CreatedAt) VALUES
    (1, 1, '2026-06-13T15:00:00', 3, 0, N'علی محمدی', NULL, NULL, N'بازرسی: هر سه عدد واقعاً معیوب', '2026-06-13T15:00:00'),
    (2, 3, '2026-06-13T15:00:00', 1, 1, N'علی محمدی', NULL, NULL, N'یک عدد سالم بود',                '2026-06-13T15:00:00'),
    (3, 4, '2026-06-18T11:45:00', 2, 0, N'لیلا ابراهیمی', NULL, NULL, N'هر دو لامپ معیوب بودند',      '2026-06-18T11:45:00');
SET IDENTITY_INSERT SaleReturnEffectRounds OFF;

/* Round 2 (the healthy one) has no observation - its HealthyQuantity already
   equals its Quantity, i.e. zero observed problems. */
SET IDENTITY_INSERT SaleReturnEffectObservations ON;
INSERT INTO SaleReturnEffectObservations (Id, SaleReturnEffectRoundId, Problem, Quantity, Note) VALUES
    (1, 1, 7, 3, N''),
    (2, 3, 7, 2, N'');
SET IDENTITY_INSERT SaleReturnEffectObservations OFF;

/* Effect 2's MONEY_OUT refund is split across two payment methods. */
SET IDENTITY_INSERT SaleReturnEffectMoneyParts ON;
INSERT INTO SaleReturnEffectMoneyParts (Id, SaleReturnEffectId, Method, Amount, CheckNumber, TransferRef) VALUES
    (1, 2, 2, 5000000, NULL, N'TRN-9988'),
    (2, 2, 0, 1000000, NULL, NULL);
SET IDENTITY_INSERT SaleReturnEffectMoneyParts OFF;

/* ---------------------------------------------------------------------------
   16. POS terminals — PosVendorEnum: Melli=1, Parsian=2, Samankish=3.
   --------------------------------------------------------------------------- */
SET IDENTITY_INSERT PosTerminals ON;
INSERT INTO PosTerminals (Id, Name, IsActive, Vendor, Host, Port, ComPort, TerminalId, MerchantId) VALUES
    (1, N'صندوق فروشگاه ۱',       1, 1, N'192.168.1.50', 8080, NULL,   N'TERM001', N'MERCH0001'),
    (2, N'صندوق فروشگاه ۲',       1, 2, N'192.168.1.51', 9090, NULL,   N'TERM002', N'MERCH0002'),
    (3, N'صندوق پشتیبان (سریال)', 1, 3, N'localhost',    0,    N'COM3', N'TERM003', N'MERCH0003');
SET IDENTITY_INSERT PosTerminals OFF;

/* ---------------------------------------------------------------------------
   17. Inventory cost ledger — one OPENING_BALANCE row per product at its
   current Stock/PurchasePrice (see header note 9). InventoryCostEventTypeEnum:
   OPENING_BALANCE=0.
   --------------------------------------------------------------------------- */
INSERT INTO InventoryCostLedgerEntries
    (ProductId, EventType, ReferenceType, ReferenceId, OccurredAt, QuantityDelta, UnitCost,
     InventoryValueDelta, RunningQuantity, RunningInventoryValue, RunningAverageCost, RevenueDelta, CreatedAt)
SELECT
    p.Id,
    0,
    NULL,
    NULL,
    p.CreatedAt,
    p.Stock,
    p.PurchasePrice,
    p.Stock * p.PurchasePrice,
    p.Stock,
    p.Stock * p.PurchasePrice,
    p.PurchasePrice,
    0,
    p.CreatedAt
FROM Products p;

COMMIT TRANSACTION;
GO

/* ---------------------------------------------------------------------------
   Summary
   --------------------------------------------------------------------------- */
SELECT 'Departments' AS TableName, COUNT(*) AS [RowCount] FROM Departments
UNION ALL SELECT 'Teams',                          COUNT(*) FROM Teams
UNION ALL SELECT 'ProductCategories',               COUNT(*) FROM ProductCategories
UNION ALL SELECT 'Products',                        COUNT(*) FROM Products
UNION ALL SELECT 'ProductUnits',                    COUNT(*) FROM ProductUnits
UNION ALL SELECT 'Customers',                       COUNT(*) FROM Customers
UNION ALL SELECT 'Suppliers',                       COUNT(*) FROM Suppliers
UNION ALL SELECT 'Purchases',                       COUNT(*) FROM Purchases
UNION ALL SELECT 'PurchaseItems',                   COUNT(*) FROM PurchaseItems
UNION ALL SELECT 'PurchaseDrivers',                 COUNT(*) FROM PurchaseDrivers
UNION ALL SELECT 'PurchaseReceivingNotes',          COUNT(*) FROM PurchaseReceivingNotes
UNION ALL SELECT 'PurchaseReceivingImages',         COUNT(*) FROM PurchaseReceivingImages
UNION ALL SELECT 'PaymentDetail',                   COUNT(*) FROM PaymentDetail
UNION ALL SELECT 'DocumentAttachments',              COUNT(*) FROM DocumentAttachments
UNION ALL SELECT 'Sales',                           COUNT(*) FROM Sales
UNION ALL SELECT 'SaleItems',                       COUNT(*) FROM SaleItems
UNION ALL SELECT 'SaleDrivers',                     COUNT(*) FROM SaleDrivers
UNION ALL SELECT 'SaleShippingNotes',               COUNT(*) FROM SaleShippingNotes
UNION ALL SELECT 'PurchaseReturns',                 COUNT(*) FROM PurchaseReturns
UNION ALL SELECT 'PurchaseReturnClaims',            COUNT(*) FROM PurchaseReturnClaims
UNION ALL SELECT 'PurchaseReturnResolutions',       COUNT(*) FROM PurchaseReturnResolutions
UNION ALL SELECT 'PurchaseReturnEffects',           COUNT(*) FROM PurchaseReturnEffects
UNION ALL SELECT 'PurchaseReturnEffectRounds',      COUNT(*) FROM PurchaseReturnEffectRounds
UNION ALL SELECT 'PurchaseReturnEffectObservations',COUNT(*) FROM PurchaseReturnEffectObservations
UNION ALL SELECT 'PurchaseReturnEffectMoneyParts',  COUNT(*) FROM PurchaseReturnEffectMoneyParts
UNION ALL SELECT 'SaleReturns',                     COUNT(*) FROM SaleReturns
UNION ALL SELECT 'SaleReturnClaims',                COUNT(*) FROM SaleReturnClaims
UNION ALL SELECT 'SaleReturnResolutions',           COUNT(*) FROM SaleReturnResolutions
UNION ALL SELECT 'SaleReturnEffects',               COUNT(*) FROM SaleReturnEffects
UNION ALL SELECT 'SaleReturnEffectRounds',          COUNT(*) FROM SaleReturnEffectRounds
UNION ALL SELECT 'SaleReturnEffectObservations',    COUNT(*) FROM SaleReturnEffectObservations
UNION ALL SELECT 'SaleReturnEffectMoneyParts',      COUNT(*) FROM SaleReturnEffectMoneyParts
UNION ALL SELECT 'PosTerminals',                    COUNT(*) FROM PosTerminals
UNION ALL SELECT 'InventoryCostLedgerEntries',      COUNT(*) FROM InventoryCostLedgerEntries;
GO
