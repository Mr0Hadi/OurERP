using Common.Extensions;
using Domain.Entities;
using Domain.Enums;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace WMS.Tests.Support
{
    /// <summary>
    /// Fixture builders. Every entity in this solution declares its strings as non-nullable
    /// without initialisers, so EnsureCreated maps them to NOT NULL columns - these helpers fill
    /// them all in so a test only has to state the part it actually cares about.
    /// </summary>
    public static class Seed
    {
        public static ProductCategory Category(string name = "لوازم خانگی") => new()
        {
            Name = name,
            IsActive = true,
        };

        public static Product Product(ProductCategory category, string name = "کالای تست", int stock = 0, ulong purchasePrice = 1000, ulong retailPrice = 1500)
            => new()
            {
                Name = name,
                Code = "P-" + Guid.NewGuid().ToString("N")[..8],
                BarCode = Generator.GenerateRandomNumber(13),
                Brand = "برند تست",
                Unit = ProductUnitEnum.Number,
                PurchasePrice = purchasePrice,
                RetailPrice = retailPrice,
                WholeSalePrice = retailPrice,
                Tax = 0,
                Stock = stock,
                LowStockThreshold = 1,
                IsActive = true,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now,
                ProductCategory = category,
            };

        public static Customer Customer(string firstName = "علی", string lastName = "رضایی") => new()
        {
            FirstName = firstName,
            LastName = lastName,
            PhoneNumber = "09121234567",
            Address = "تهران",
            PostalCode = "1234567890",
            BalanceType = BalanceTypeEnum.Debtor,
            IsActive = true,
            CreatedAt = DateTime.Now,
            UpdatedAt = DateTime.Now,
        };

        public static Supplier Supplier(string companyName = "شرکت تست") => new()
        {
            CompanyName = companyName,
            FirstName = "رضا",
            LastName = "محمدی",
            Phone = "09121112233",
            Address = "تهران",
            PostalCode = "1234567890",
            IsActive = true,
            CreatedAt = DateTime.Now,
            UpdatedAt = DateTime.Now,
        };

        public static Sale Sale(Customer customer, SalesStatusEnum status, params SaleItem[] items) => new()
        {
            InvoiceNumber = "S-" + Guid.NewGuid().ToString("N")[..8],
            InvoiceDate = DateTime.Now,
            Status = status,
            PaymentType = PaymentTypeEnum.CASH,
            PaidAmount = 0,
            TotalAmount = items.Aggregate(0UL, (sum, i) => sum + (ulong)i.Quantity * i.UnitPrice),
            Items = items.ToList(),
            Customer = customer,
            IsActive = true,
            CreatedAt = DateTime.Now,
            UpdatedAt = DateTime.Now,
        };

        public static SaleItem SaleItem(Product product, int quantity, ulong unitPrice = 1500, int shippedQuantity = 0, int settledQuantity = 0)
            => new()
            {
                Product = product,
                Quantity = quantity,
                UnitPrice = unitPrice,
                Discount = 0,
                ShippedQuantity = shippedQuantity,
                SettledQuantity = settledQuantity,
            };

        public static Purchase Purchase(Supplier supplier, PurchaseStatusEnum status, params PurchaseItem[] items) => new()
        {
            InvoiceNumber = "B-" + Guid.NewGuid().ToString("N")[..8],
            InvoiceDate = DateTime.Now,
            PaymentDate = DateTime.Now,
            Status = status,
            PaymentType = PaymentTypeEnum.CASH,
            PaidAmount = 0,
            TotalAmount = items.Aggregate(0UL, (sum, i) => sum + (ulong)i.Quantity * i.UnitPrice),
            Items = items.ToList(),
            Supplier = supplier,
            IsActive = true,
            CreatedAt = DateTime.Now,
            UpdatedAt = DateTime.Now,
        };

        public static PurchaseItem PurchaseItem(Product product, int quantity, ulong unitPrice = 1000, int receivedQuantity = 0, int settledQuantity = 0)
            => new()
            {
                Product = product,
                Quantity = quantity,
                UnitPrice = unitPrice,
                Discount = 0,
                ReceivedQuantity = receivedQuantity,
                SettledQuantity = settledQuantity,
            };

        public static Department Department(string name = "انبار") => new()
        {
            Name = name,
            IsActive = true,
        };

        public static Team Team(Department department, string name = "تیم انبار") => new()
        {
            Name = name,
            IsActive = true,
            Department = department,
        };

        public static User User(Department department, Team? team, string username = "tester", string password = "Test@1234")
            => new()
            {
                FirstName = "کاربر",
                LastName = "تست",
                Username = username,
                PasswordHash = password.ToHashSHA256(),
                PersonelCode = 1001,
                IsActive = true,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now,
                Department = department,
                Team = team,
            };

        /// <summary>Persists a standalone user (with its own department) for tests that only need
        /// a valid Users.Id to satisfy Sale.SalesUserId/Purchase.PurchasingUserId's FK.</summary>
        public static User PersistedUser(WMSDbContext context, string username = "tester")
        {
            var user = User(Department(), null, username);
            context.Users.Add(user);
            context.SaveChanges();
            return user;
        }

        /// <summary>
        /// A shipped sale: one product with <paramref name="stock"/> units on hand and one sale
        /// line already shipped in full. The starting point for most sale-return tests.
        /// </summary>
        public static SaleScenario ShippedSale(WMSDbContext context, int orderedQuantity = 10, int shippedQuantity = 10, int stock = 100, ulong unitPrice = 1500)
        {
            var category = Category();
            var product = Product(category, stock: stock);
            var customer = Customer();
            var item = SaleItem(product, orderedQuantity, unitPrice, shippedQuantity);
            var sale = Sale(customer, shippedQuantity >= orderedQuantity ? SalesStatusEnum.SHIPPED : SalesStatusEnum.PARTIALLY_DELIVERED, item);

            context.Sales.Add(sale);
            context.SaveChanges();

            // Product.Stock == COUNT(ProductUnit WHERE Status=IN_STOCK) is an invariant the real
            // handlers maintain (see docs/product-code-barcode-invoice-design.fa.md 1.6) - seed
            // matching units so ShipSaleCommandHandler's FIFO consumption has something to consume.
            MintUnits(context, product, stock);

            return new SaleScenario(sale, item, product, customer);
        }

        /// <summary>A purchase sitting at SHIPPED with nothing received yet.</summary>
        public static PurchaseScenario PendingPurchase(WMSDbContext context, int orderedQuantity = 10, int stock = 0, ulong unitPrice = 1000)
        {
            var category = Category();
            var product = Product(category, stock: stock);
            var supplier = Supplier();
            var item = PurchaseItem(product, orderedQuantity, unitPrice);
            var purchase = Purchase(supplier, PurchaseStatusEnum.SHIPPED, item);

            context.Purchases.Add(purchase);
            context.SaveChanges();

            MintUnits(context, product, stock);

            return new PurchaseScenario(purchase, item, product, supplier);
        }

        /// <summary>
        /// Mints <paramref name="count"/> IN_STOCK ProductUnit rows for an already-saved product,
        /// keeping the Stock/ProductUnit invariant true in fixtures. Public so tests that manually
        /// bump Product.Stock (rather than going through a handler) can keep it true too.
        /// </summary>
        public static void MintUnits(WMSDbContext context, Product product, int count)
        {
            if (count <= 0)
                return;

            var nextSerial = context.ProductUnits.Where(x => x.ProductId == product.Id).Select(x => (int?)x.SerialNumber).Max() ?? 0;
            nextSerial++;

            for (var i = 0; i < count; i++)
            {
                var serial = nextSerial + i;
                var barcode = $"{product.Code}-{serial:D10}";
                context.ProductUnits.Add(new ProductUnit
                {
                    ProductId = product.Id,
                    SerialNumber = serial,
                    Barcode = barcode,
                    BarcodePayload = barcode.Replace("-", ""),
                    Status = ProductUnitStatusEnum.IN_STOCK,
                    CreatedAt = DateTime.Now,
                    IsActive = true,
                });
            }

            context.SaveChanges();
        }
    }

    public sealed record SaleScenario(Sale Sale, SaleItem Item, Product Product, Customer Customer);

    public sealed record PurchaseScenario(Purchase Purchase, PurchaseItem Item, Product Product, Supplier Supplier);
}
