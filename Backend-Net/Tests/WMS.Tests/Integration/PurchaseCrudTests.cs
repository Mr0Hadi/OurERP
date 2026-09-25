using Application.Common.Dtos;
using Application.Features.Purchase.Commands;
using Application.Features.Purchase.Dtos;
using Application.Features.Purchase.Queries;
using Common.Exceptions;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;
using WMS.Tests.Support;

namespace WMS.Tests.Integration
{
    public class PurchaseCrudTests
    {
        private static CreatePurchaseCommandHandler CreateHandler(TestScope scope, int userId) =>
            new(scope.PurchaseRepository, scope.Db, FakeObjectStorage.Instance, TestMapper.Instance, scope.UnitOfWork, FakeUserContext.WithUserId(userId));

        private static UpdatePurchaseCommandHandler UpdateHandler(TestScope scope) =>
            new(scope.Db, FakeObjectStorage.Instance, scope.UnitOfWork);

        /// <summary>The seeded purchase is SHIPPED (an issued invoice); this turns it back into a draft for tests that edit it.</summary>
        private static PurchaseScenario ProformaPurchase(TestScope scope, int orderedQuantity = 5)
        {
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: orderedQuantity, stock: 0);
            scenario.Purchase.Status = PurchaseStatusEnum.PROFORMA;
            scope.Context.SaveChanges();
            return scenario;
        }

        private static UpdatePurchaseCommand UpdateOf(PurchaseScenario scenario, Action<UpdatePurchaseCommand>? change = null)
        {
            var command = new UpdatePurchaseCommand
            {
                Id = scenario.Purchase.Id,
                InvoiceNumber = "",
                Status = PurchaseStatusEnum.PROFORMA,
                PaymentType = PaymentTypeEnum.CASH,
                SupplierId = scenario.Supplier.Id,
                ProductItemList = new()
                {
                    new UpdatePurchaseItemDto { Id = scenario.Item.Id, ProductId = scenario.Product.Id, Quantity = scenario.Item.Quantity, UnitPrice = scenario.Item.UnitPrice },
                },
            };
            change?.Invoke(command);
            return command;
        }

        [Fact]
        public async Task CreatePurchase_MapsFields_AndDerivesPaidAmountFromThePaymentRows()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 1, stock: 0);
            var user = Seed.PersistedUser(scope.Context);

            var res = await CreateHandler(scope, user.Id).Handle(new CreatePurchaseCommand
            {
                SupplierId = scenario.Supplier.Id,
                PaymentType = PaymentTypeEnum.CASH,
                Status = PurchaseStatusEnum.SHIPPED,
                PaymentDetails = new() { new PaymentDetailDto { Type = PaymentTypeEnum.CASH, Amount = 1000 } },
                InvoiceNumber = "INV-NEW",
                InvoiceDate = DateTime.Now,
                ProductItemList = new()
                {
                    new CreatePurchaseItemDto { ProductId = scenario.Product.Id, Quantity = 3, UnitPrice = 1000, Discount = 0 },
                },
            }, CancellationToken.None);

            var dto = Assert.IsType<PurchaseDto>(res.Data);
            Assert.Equal(1000UL, dto.PaidAmount);

            using var verify = db.NewContext();
            var purchase = verify.Purchases.Include(x => x.Items).Include(x => x.PaymentDetails).Single(x => x.InvoiceNumber == "INV-NEW");
            Assert.Equal(3000UL, purchase.TotalAmount); // 3 x 1,000, computed by the server
            Assert.Equal(1000UL, purchase.PaidAmount);
            var payment = Assert.Single(purchase.PaymentDetails);
            Assert.Equal(PaymentDirectionEnum.OUT, payment.Direction);
            Assert.Equal(PaymentPurposeEnum.NORMAL, payment.Purpose);
            var item = Assert.Single(purchase.Items);
            Assert.Equal(3, item.Quantity);
            Assert.Equal(scenario.Product.Id, item.ProductId);
        }

        [Fact]
        public async Task CreatePurchase_PersistsPaymentDetails()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 1, stock: 0);
            var user = Seed.PersistedUser(scope.Context);

            await CreateHandler(scope, user.Id).Handle(new CreatePurchaseCommand
            {
                SupplierId = scenario.Supplier.Id,
                PaymentType = PaymentTypeEnum.CHECK,
                Status = PurchaseStatusEnum.SHIPPED,
                PaymentDetails = new()
                {
                    new PaymentDetailDto { Type = PaymentTypeEnum.CHECK, Amount = 5000, PaidAt = new DateTime(2026, 8, 10), CheckNumber = "P-CHK-1" },
                },
                InvoiceNumber = "INV-PAY",
                InvoiceDate = DateTime.Now,
                ProductItemList = new()
                {
                    new CreatePurchaseItemDto { ProductId = scenario.Product.Id, Quantity = 1, UnitPrice = 5000, Discount = 0 },
                },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var purchase = verify.Purchases.Single(x => x.InvoiceNumber == "INV-PAY");
            var payment = Assert.Single(verify.PaymentDetails.Where(x => x.PurchaseId == purchase.Id));
            Assert.Equal(PaymentTypeEnum.CHECK, payment.Type);
            Assert.Equal(5000m, payment.Amount);
            Assert.Equal(new DateTime(2026, 8, 10), payment.PaidAt);
            Assert.Equal("P-CHK-1", payment.CheckNumber);
            Assert.Equal(5000UL, purchase.PaidAmount);
        }

        [Fact]
        public async Task UpdatePurchase_OnAnIssuedPurchase_IsRefused()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 5, stock: 0);

            await Assert.ThrowsAsync<ValidationCustomException>(() => UpdateHandler(scope).Handle(
                UpdateOf(scenario, c => { c.Status = PurchaseStatusEnum.SHIPPED; c.InvoiceNumber = "X"; c.InvoiceDate = DateTime.Now; }),
                CancellationToken.None));
        }

        [Fact]
        public async Task UpdatePurchase_UnknownId_ThrowsNotFound()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();

            await Assert.ThrowsAsync<NotFoundCustomException>(() => UpdateHandler(scope).Handle(new UpdatePurchaseCommand
            {
                Id = 999,
                SupplierId = 1,
            }, CancellationToken.None));
        }

        [Fact]
        public async Task UpdatePurchase_OnAProforma_ReplacesFieldsAndLines()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = ProformaPurchase(scope);
            var other = Seed.Product(scenario.Product.ProductCategory, "کالای دوم");
            scope.Context.Products.Add(other);
            var dropped = Seed.PurchaseItem(scenario.Product, 1);
            scenario.Purchase.Items.Add(dropped);
            scope.Context.SaveChanges();

            var res = await UpdateHandler(scope).Handle(UpdateOf(scenario, c =>
            {
                
                c.Description = "ویرایش پیش‌فاکتور";
                c.ProductItemList = new()
                {
                    new UpdatePurchaseItemDto { Id = scenario.Item.Id, ProductId = scenario.Product.Id, Quantity = 12, UnitPrice = 700, Discount = 5 },
                    new UpdatePurchaseItemDto { ProductId = other.Id, Quantity = 2, UnitPrice = 300 },
                };
            }), CancellationToken.None);

            var dto = Assert.IsType<PurchaseDto>(res.Data);
            // 12 x 700 - 5% = 7,980 plus 2 x 300 = 600, computed by the server from the new lines.
            Assert.Equal(8_580UL, dto.TotalAmount);

            using var verify = db.NewContext();
            var lines = verify.PurchaseItems.Where(i => i.PurchaseId == scenario.Purchase.Id).OrderBy(i => i.Id).ToList();
            Assert.Equal(2, lines.Count);
            Assert.DoesNotContain(lines, l => l.Id == dropped.Id);
            var kept = lines.Single(l => l.Id == scenario.Item.Id);
            Assert.Equal((12, 700UL, 5), (kept.Quantity, kept.UnitPrice, kept.Discount));
            Assert.Contains(lines, l => l.ProductId == other.Id && l.Quantity == 2);
            Assert.Equal("ویرایش پیش‌فاکتور", verify.Purchases.Single(x => x.Id == scenario.Purchase.Id).Description);
        }

        [Fact]
        public async Task UpdatePurchase_UnknownLineId_ThrowsNotFound()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = ProformaPurchase(scope);

            await Assert.ThrowsAsync<NotFoundCustomException>(() => UpdateHandler(scope).Handle(UpdateOf(scenario, c =>
                c.ProductItemList = new() { new UpdatePurchaseItemDto { Id = 99999, ProductId = scenario.Product.Id, Quantity = 1, UnitPrice = 1 } }),
                CancellationToken.None));
        }

        [Fact]
        public async Task UpdatePurchase_LeavingProforma_WithInvoiceNumber_Succeeds_AndLocksIt()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = ProformaPurchase(scope, orderedQuantity: 1);

            await UpdateHandler(scope).Handle(UpdateOf(scenario, c =>
            {
                c.InvoiceNumber = "SUPPLIER-INV-1";
                c.InvoiceDate = DateTime.Now;
                c.Status = PurchaseStatusEnum.SHIPPED;
                c.Attachments = new() { new() { ObjectKey = "receiving/2026/09/fake.jpg" } };
            }), CancellationToken.None);

            using (var verify = db.NewContext())
            {
                var updated = verify.Purchases.Single(x => x.Id == scenario.Purchase.Id);
                Assert.Equal(PurchaseStatusEnum.SHIPPED, updated.Status);
                Assert.Equal("SUPPLIER-INV-1", updated.InvoiceNumber);
                var attachment = verify.DocumentAttachments.Single(a => a.DocumentKind == DocumentKindEnum.PURCHASE && a.DocumentId == scenario.Purchase.Id);
                Assert.Equal("receiving/2026/09/fake.jpg", attachment.ObjectKey);
            }

            using var next = db.NewScope();
            await Assert.ThrowsAsync<ValidationCustomException>(() => UpdateHandler(next).Handle(
                UpdateOf(scenario, c => { c.InvoiceNumber = "SUPPLIER-INV-1"; c.InvoiceDate = DateTime.Now; c.Status = PurchaseStatusEnum.SHIPPED; }),
                CancellationToken.None));
        }

        [Fact]
        public void UpdatePurchaseValidator_LeavingProformaWithoutInvoiceNumber_IsInvalid()
        {
            var result = new UpdatePurchaseCommandValidator().Validate(new UpdatePurchaseCommand
            {
                Id = 1,
                InvoiceNumber = "",
                InvoiceDate = DateTime.Now,
                Status = PurchaseStatusEnum.SHIPPED,
                SupplierId = 1,
                ProductItemList = new() { new UpdatePurchaseItemDto { ProductId = 1, Quantity = 1, UnitPrice = 1 } },
            });

            Assert.False(result.IsValid);
        }

        [Theory]
        [InlineData(PurchaseStatusEnum.PARTIALLY_RECEIVED)]
        [InlineData(PurchaseStatusEnum.RECEIVED)]
        [InlineData(PurchaseStatusEnum.CANCELLED)]
        public void UpdatePurchaseValidator_ComputedOrCancelledStatus_IsInvalid(PurchaseStatusEnum status)
        {
            var result = new UpdatePurchaseCommandValidator().Validate(new UpdatePurchaseCommand
            {
                Id = 1,
                InvoiceNumber = "INV",
                InvoiceDate = DateTime.Now,
                Status = status,
                SupplierId = 1,
                ProductItemList = new() { new UpdatePurchaseItemDto { ProductId = 1, Quantity = 1, UnitPrice = 1 } },
            });

            Assert.False(result.IsValid);
        }

        [Fact]
        public async Task DeletePurchase_Proforma_IsHiddenFromDetailAndList()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = ProformaPurchase(scope, orderedQuantity: 1);

            await new DeletePurchaseCommandHandler(scope.Db, scope.UnitOfWork).Handle(new DeletePurchaseCommand { Id = scenario.Purchase.Id }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.False(verify.Purchases.Single(x => x.Id == scenario.Purchase.Id).IsActive);

            using var read = db.NewScope();
            await Assert.ThrowsAsync<NotFoundCustomException>(() => new GetPurchaseDetailQueryHandler(read.Db, FakeObjectStorage.Instance)
                .Handle(new GetPurchaseDetailQuery { Id = scenario.Purchase.Id }, CancellationToken.None));
            var list = await new GetPurchaseListQueryHandler(read.Db).Handle(new GetPurchaseListQuery(), CancellationToken.None);
            Assert.Empty(((System.Collections.IEnumerable)list.Data!.GetType().GetProperty("PurchaseList")!.GetValue(list.Data)!).Cast<object>());
        }

        [Fact]
        public async Task DeletePurchase_Issued_IsRefused()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 1, stock: 0);

            await Assert.ThrowsAsync<ValidationCustomException>(() => new DeletePurchaseCommandHandler(scope.Db, scope.UnitOfWork)
                .Handle(new DeletePurchaseCommand { Id = scenario.Purchase.Id }, CancellationToken.None));
        }

        [Fact]
        public async Task DeletePurchase_ProformaWithAPrepayment_IsRefused()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = ProformaPurchase(scope, orderedQuantity: 1);
            await new AddPurchasePaymentCommandHandler(scope.Db, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new AddPurchasePaymentCommand { PurchaseId = scenario.Purchase.Id, Type = PaymentTypeEnum.TRANSFER, Amount = 500 }, CancellationToken.None);

            await Assert.ThrowsAsync<ValidationCustomException>(() => new DeletePurchaseCommandHandler(scope.Db, scope.UnitOfWork)
                .Handle(new DeletePurchaseCommand { Id = scenario.Purchase.Id }, CancellationToken.None));
        }

        [Fact]
        public async Task GetPurchaseDetail_ReturnsMappedDto()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 4, stock: 0);

            var handler = new GetPurchaseDetailQueryHandler(scope.Db, FakeObjectStorage.Instance);
            var res = await handler.Handle(new GetPurchaseDetailQuery { Id = scenario.Purchase.Id }, CancellationToken.None);

            var dto = Assert.IsType<PurchaseDto>(res.Data);
            Assert.Equal(scenario.Purchase.InvoiceNumber, dto.InvoiceNumber);
            Assert.Single(dto.Items);
        }

        [Fact]
        public async Task GetPurchaseDetail_UnknownId_ThrowsNotFound()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();

            var handler = new GetPurchaseDetailQueryHandler(scope.Db, FakeObjectStorage.Instance);

            await Assert.ThrowsAsync<NotFoundCustomException>(() => handler.Handle(new GetPurchaseDetailQuery { Id = 999 }, CancellationToken.None));
        }

        private static List<PurchaseListDto> PurchaseListOf(ResponseDto res) =>
            ((System.Collections.IEnumerable)res.Data!.GetType().GetProperty("PurchaseList")!.GetValue(res.Data)!).Cast<PurchaseListDto>().ToList();

        private static Domain.Entities.Purchase AddPurchase(TestScope scope, string supplierName, PurchaseStatusEnum status)
        {
            var purchase = Seed.Purchase(Seed.Supplier(supplierName), status, Seed.PurchaseItem(Seed.Product(Seed.Category()), 1));
            scope.Context.Purchases.Add(purchase);
            scope.Context.SaveChanges();
            return purchase;
        }

        [Fact]
        public async Task GetPurchaseList_Statuses_MatchesAnyOfThem()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var shipped = AddPurchase(scope, "الف", PurchaseStatusEnum.SHIPPED);
            var partial = AddPurchase(scope, "ب", PurchaseStatusEnum.PARTIALLY_RECEIVED);
            AddPurchase(scope, "پ", PurchaseStatusEnum.PROFORMA);
            AddPurchase(scope, "ت", PurchaseStatusEnum.RECEIVED);

            var res = await new GetPurchaseListQueryHandler(scope.Db).Handle(new GetPurchaseListQuery
            {
                Statuses = new() { PurchaseStatusEnum.SHIPPED, PurchaseStatusEnum.PARTIALLY_RECEIVED },
            }, CancellationToken.None);

            Assert.Equal(new[] { shipped.Id, partial.Id }.OrderBy(x => x), PurchaseListOf(res).Select(x => x.Id).OrderBy(x => x));
        }

        [Fact]
        public async Task GetPurchaseList_Search_MatchesInvoiceNumberOrSupplierName()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var bySupplier = AddPurchase(scope, "صنایع فولاد آریا", PurchaseStatusEnum.PENDING);
            var byInvoice = AddPurchase(scope, "شرکت دیگر", PurchaseStatusEnum.PENDING);
            AddPurchase(scope, "شرکت سوم", PurchaseStatusEnum.PENDING);

            var handler = new GetPurchaseListQueryHandler(scope.Db);
            var supplierHit = await handler.Handle(new GetPurchaseListQuery { Search = " فولاد " }, CancellationToken.None);
            var invoiceHit = await handler.Handle(new GetPurchaseListQuery { Search = byInvoice.InvoiceNumber }, CancellationToken.None);

            Assert.Equal(bySupplier.Id, Assert.Single(PurchaseListOf(supplierHit)).Id);
            Assert.Equal(byInvoice.Id, Assert.Single(PurchaseListOf(invoiceHit)).Id);
        }

        [Fact]
        public async Task GetPurchaseList_FiltersByStatus()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            Seed.PendingPurchase(scope.Context, orderedQuantity: 1, stock: 0);

            var handler = new GetPurchaseListQueryHandler(scope.Db);
            var matching = await handler.Handle(new GetPurchaseListQuery { Status = PurchaseStatusEnum.SHIPPED }, CancellationToken.None);
            var nonMatching = await handler.Handle(new GetPurchaseListQuery { Status = PurchaseStatusEnum.RECEIVED }, CancellationToken.None);

            var matchingList = (System.Collections.IEnumerable)matching.Data!.GetType().GetProperty("PurchaseList")!.GetValue(matching.Data)!;
            var nonMatchingList = (System.Collections.IEnumerable)nonMatching.Data!.GetType().GetProperty("PurchaseList")!.GetValue(nonMatching.Data)!;

            Assert.Single(matchingList.Cast<object>());
            Assert.Empty(nonMatchingList.Cast<object>());
        }

        [Fact]
        public async Task CreatePurchase_Proforma_SucceedsWithoutInvoiceNumber()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 1, stock: 0);
            var user = Seed.PersistedUser(scope.Context);

            await CreateHandler(scope, user.Id).Handle(new CreatePurchaseCommand
            {
                SupplierId = scenario.Supplier.Id,
                PaymentType = PaymentTypeEnum.CASH,
                Status = PurchaseStatusEnum.PROFORMA,
                InvoiceNumber = null!,
                ProductItemList = new()
                {
                    new CreatePurchaseItemDto { ProductId = scenario.Product.Id, Quantity = 1, UnitPrice = 5000, Discount = 0 },
                },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var purchase = verify.Purchases.Single(x => x.SupplierId == scenario.Supplier.Id && x.TotalAmount == 5000);
            Assert.Equal(PurchaseStatusEnum.PROFORMA, purchase.Status);
            Assert.Equal(0UL, purchase.PaidAmount);
        }

        [Fact]
        public async Task CreatePurchase_AsProforma_WithoutInvoiceDate_PersistsNull()
        {
            // تاریخ فاکتور در پیش‌فاکتور واقعاً null ذخیره می‌شود، نه 0001-01-01.
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 1, stock: 0);
            var user = Seed.PersistedUser(scope.Context);

            await CreateHandler(scope, user.Id).Handle(new CreatePurchaseCommand
            {
                SupplierId = scenario.Supplier.Id,
                PaymentType = PaymentTypeEnum.CASH,
                Status = PurchaseStatusEnum.PROFORMA,
                InvoiceNumber = "",
                InvoiceDate = null,
                Description = "PROFORMA-NULL-DATE",
                ProductItemList = new()
                {
                    new CreatePurchaseItemDto { ProductId = scenario.Product.Id, Quantity = 1, UnitPrice = 5000, Discount = 0 },
                },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var purchase = verify.Purchases.Single(x => x.Description == "PROFORMA-NULL-DATE");
            Assert.Null(purchase.InvoiceDate);

            using var readScope = db.NewScope();
            var detail = await new GetPurchaseDetailQueryHandler(readScope.Db, FakeObjectStorage.Instance)
                .Handle(new GetPurchaseDetailQuery { Id = purchase.Id }, CancellationToken.None);
            Assert.Null(Assert.IsType<PurchaseDto>(detail.Data).InvoiceDate);
        }

        [Fact]
        public async Task CreatePurchase_PersistsPaymentDate_AndDetailQueryReturnsIt()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 1, stock: 0);
            var user = Seed.PersistedUser(scope.Context);
            var invoiceDate = new DateTime(2026, 8, 1);
            var paymentDate = new DateTime(2026, 8, 31);

            await CreateHandler(scope, user.Id).Handle(new CreatePurchaseCommand
            {
                SupplierId = scenario.Supplier.Id,
                PaymentType = PaymentTypeEnum.CREDIT,
                Status = PurchaseStatusEnum.PENDING,
                InvoiceNumber = "INV-DUE",
                InvoiceDate = invoiceDate,
                PaymentDate = paymentDate,
                ProductItemList = new()
                {
                    new CreatePurchaseItemDto { ProductId = scenario.Product.Id, Quantity = 1, UnitPrice = 5000, Discount = 0 },
                },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var purchase = verify.Purchases.Single(x => x.InvoiceNumber == "INV-DUE");
            Assert.Equal(paymentDate, purchase.PaymentDate);

            using var readScope = db.NewScope();
            var detail = await new GetPurchaseDetailQueryHandler(readScope.Db, FakeObjectStorage.Instance)
                .Handle(new GetPurchaseDetailQuery { Id = purchase.Id }, CancellationToken.None);
            Assert.Equal(paymentDate, Assert.IsType<PurchaseDto>(detail.Data).PaymentDate);
        }

        [Fact]
        public async Task UpdatePurchasePaymentDate_OnAnIssuedPurchase_ChangesOnlyTheDueDate()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 1, stock: 0);
            var newDue = DateTime.Now.Date.AddMonths(2);

            await new UpdatePurchasePaymentDateCommandHandler(scope.Db, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new UpdatePurchasePaymentDateCommand { Id = scenario.Purchase.Id, PaymentDate = newDue }, CancellationToken.None);

            using var verify = db.NewContext();
            var purchase = verify.Purchases.Single(x => x.Id == scenario.Purchase.Id);
            Assert.Equal(newDue, purchase.PaymentDate);
            Assert.Equal(PurchaseStatusEnum.SHIPPED, purchase.Status);
        }

        [Fact]
        public async Task UpdatePurchasePaymentDate_BeforeTheInvoiceDate_IsRefused()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 1, stock: 0);

            await Assert.ThrowsAsync<ValidationCustomException>(() => new UpdatePurchasePaymentDateCommandHandler(scope.Db, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new UpdatePurchasePaymentDateCommand { Id = scenario.Purchase.Id, PaymentDate = scenario.Purchase.InvoiceDate!.Value.AddDays(-1) }, CancellationToken.None));
        }

        // GetPurchaseDetail returns each attachment as { objectKey, url }. Attachments are replaced
        // wholesale, so a frontend that re-sends what it read can easily put the url back into
        // objectKey - the column must still end up holding the bare key. Attachments stay editable
        // after the invoice is issued.
        [Fact]
        public async Task UpdatePurchaseAttachments_OnAnIssuedPurchase_EchoedUrlPersistsTheBareKey()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 1, stock: 0);

            var echoedUrl = FakeObjectStorage.Instance.GetFixedUrl("receiving/2026/09/fake.jpg");
            Assert.StartsWith("http", echoedUrl);

            await new UpdatePurchaseAttachmentsCommandHandler(scope.Db, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new UpdatePurchaseAttachmentsCommand
                {
                    Id = scenario.Purchase.Id,
                    Attachments = new() { new() { ObjectKey = echoedUrl! } },
                }, CancellationToken.None);

            using var verify = db.NewContext();
            var attachment = verify.DocumentAttachments.Single(a => a.DocumentKind == DocumentKindEnum.PURCHASE && a.DocumentId == scenario.Purchase.Id);
            Assert.Equal("receiving/2026/09/fake.jpg", attachment.ObjectKey);
        }

        [Fact]
        public async Task GetPurchaseList_FiltersByPaymentDateRange()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 1, stock: 0);
            scenario.Purchase.PaymentDate = new DateTime(2026, 9, 15);
            await scope.Context.SaveChangesAsync();

            var handler = new GetPurchaseListQueryHandler(scope.Db);
            var inRange = await handler.Handle(new GetPurchaseListQuery { FromPaymentDate = new DateTime(2026, 9, 1), ToPaymentDate = new DateTime(2026, 9, 30) }, CancellationToken.None);
            var outOfRange = await handler.Handle(new GetPurchaseListQuery { FromPaymentDate = new DateTime(2026, 10, 1) }, CancellationToken.None);

            var inList = (System.Collections.IEnumerable)inRange.Data!.GetType().GetProperty("PurchaseList")!.GetValue(inRange.Data)!;
            var outList = (System.Collections.IEnumerable)outOfRange.Data!.GetType().GetProperty("PurchaseList")!.GetValue(outOfRange.Data)!;

            Assert.Single(inList.Cast<object>());
            Assert.Empty(outList.Cast<object>());
        }

        // ---- status ----

        private static ChangePurchaseStatusCommandHandler StatusHandler(TestScope scope) => new(scope.Db, FakeObjectStorage.Instance, scope.UnitOfWork);

        [Fact]
        public async Task ChangePurchaseStatus_LeavingProformaWithoutTheSupplierInvoice_IsRefused()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = ProformaPurchase(scope, orderedQuantity: 1);
            scenario.Purchase.InvoiceNumber = "";
            scope.Context.SaveChanges();

            await Assert.ThrowsAsync<ValidationCustomException>(() => StatusHandler(scope)
                .Handle(new ChangePurchaseStatusCommand { Id = scenario.Purchase.Id, Status = PurchaseStatusEnum.PENDING }, CancellationToken.None));
        }

        [Fact]
        public async Task ChangePurchaseStatus_ProformaWithTheSupplierInvoice_Leaves()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = ProformaPurchase(scope, orderedQuantity: 1);

            var res = await StatusHandler(scope).Handle(new ChangePurchaseStatusCommand { Id = scenario.Purchase.Id, Status = PurchaseStatusEnum.PENDING }, CancellationToken.None);

            Assert.Equal(PurchaseStatusEnum.PENDING, Assert.IsType<PurchaseDto>(res.Data).Status);
        }

        [Fact]
        public async Task ChangePurchaseStatus_CancelAfterReceiving_IsRefused()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 5, stock: 0);
            scenario.Item.ReceivedQuantity = 2;
            scenario.Purchase.Status = PurchaseStatusEnum.PARTIALLY_RECEIVED;
            scope.Context.SaveChanges();

            await Assert.ThrowsAsync<ValidationCustomException>(() => StatusHandler(scope)
                .Handle(new ChangePurchaseStatusCommand { Id = scenario.Purchase.Id, Status = PurchaseStatusEnum.CANCELLED }, CancellationToken.None));
        }

        [Fact]
        public async Task ChangePurchaseStatus_CancelledIsFinal()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 1, stock: 0);

            await StatusHandler(scope).Handle(new ChangePurchaseStatusCommand { Id = scenario.Purchase.Id, Status = PurchaseStatusEnum.CANCELLED }, CancellationToken.None);

            await Assert.ThrowsAsync<ValidationCustomException>(() => StatusHandler(scope)
                .Handle(new ChangePurchaseStatusCommand { Id = scenario.Purchase.Id, Status = PurchaseStatusEnum.SHIPPED }, CancellationToken.None));
        }

        [Theory]
        [InlineData(PurchaseStatusEnum.PROFORMA)]
        [InlineData(PurchaseStatusEnum.PARTIALLY_RECEIVED)]
        [InlineData(PurchaseStatusEnum.RECEIVED)]
        public void ChangePurchaseStatusValidator_NonManualTarget_IsInvalid(PurchaseStatusEnum status)
        {
            Assert.False(new ChangePurchaseStatusCommandValidator().Validate(new ChangePurchaseStatusCommand { Id = 1, Status = status }).IsValid);
        }

        [Fact]
        public async Task ReceivePurchase_OnAProforma_IsRefused()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = ProformaPurchase(scope, orderedQuantity: 2);

            await Assert.ThrowsAsync<ValidationCustomException>(() => new ReceivePurchaseCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.ProductUnitService, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new ReceivePurchaseCommand
                {
                    PurchaseId = scenario.Purchase.Id,
                    Items = new() { new ReceivePurchaseItemDto { PurchaseItemId = scenario.Item.Id, ArrivedQuantity = 2 } },
                }, CancellationToken.None));

            using var verify = db.NewContext();
            Assert.Equal(0, verify.PurchaseItems.Single(i => i.Id == scenario.Item.Id).ReceivedQuantity);
        }

        // ---- payments ----

        private static AddPurchasePaymentCommandHandler AddPayment(TestScope scope) => new(scope.Db, FakeObjectStorage.Instance, scope.UnitOfWork);

        [Fact]
        public async Task AddPurchasePayment_PrepaymentOnAProforma_DoesNotIssueTheInvoice()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = ProformaPurchase(scope, orderedQuantity: 1);

            var res = await AddPayment(scope).Handle(new AddPurchasePaymentCommand { PurchaseId = scenario.Purchase.Id, Type = PaymentTypeEnum.TRANSFER, Amount = 700, TransferRef = "PRE-1" }, CancellationToken.None);

            var dto = Assert.IsType<PurchaseDto>(res.Data);
            Assert.Equal(PurchaseStatusEnum.PROFORMA, dto.Status);
            Assert.Equal(700UL, dto.PaidAmount);
            var row = Assert.Single(dto.PaymentDetails);
            Assert.Equal(PaymentDirectionEnum.OUT, row.Direction);
            Assert.Null(row.VoidedAt);
        }

        [Fact]
        public async Task PurchasePayments_VoidEditAndRefund_KeepPaidAmountEqualToTheRows()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 1, stock: 0);

            var afterFirst = Assert.IsType<PurchaseDto>((await AddPayment(scope).Handle(
                new AddPurchasePaymentCommand { PurchaseId = scenario.Purchase.Id, Type = PaymentTypeEnum.CASH, Amount = 3000 }, CancellationToken.None)).Data);
            var first = afterFirst.PaymentDetails.Single();

            // Edit: the 3000 row is voided and a 2000 row takes its place.
            var afterEdit = Assert.IsType<PurchaseDto>((await new EditPurchasePaymentCommandHandler(scope.Db, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new EditPurchasePaymentCommand { PaymentId = first.Id, Type = PaymentTypeEnum.CHECK, Amount = 2000, CheckNumber = "C-9" }, CancellationToken.None)).Data);
            Assert.Equal(2000UL, afterEdit.PaidAmount);
            Assert.Equal(2, afterEdit.PaymentDetails.Count);
            Assert.NotNull(afterEdit.PaymentDetails.Single(p => p.Id == first.Id).VoidedAt);

            // Refund from the supplier (IN) lowers what we have paid.
            var afterRefund = Assert.IsType<PurchaseDto>((await AddPayment(scope).Handle(
                new AddPurchasePaymentCommand { PurchaseId = scenario.Purchase.Id, Type = PaymentTypeEnum.TRANSFER, Amount = 500, Direction = PaymentDirectionEnum.IN }, CancellationToken.None)).Data);
            Assert.Equal(1500UL, afterRefund.PaidAmount);

            // A refund larger than what was paid is refused.
            await Assert.ThrowsAsync<ValidationCustomException>(() => AddPayment(scope).Handle(
                new AddPurchasePaymentCommand { PurchaseId = scenario.Purchase.Id, Type = PaymentTypeEnum.TRANSFER, Amount = 5000, Direction = PaymentDirectionEnum.IN }, CancellationToken.None));

            // Voiding the corrected 2000 row would leave the 500 refund above what was paid - refused too.
            var corrected = afterRefund.PaymentDetails.Single(p => p.Amount == 2000);
            await Assert.ThrowsAsync<ValidationCustomException>(() => new VoidPurchasePaymentCommandHandler(scope.Db, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new VoidPurchasePaymentCommand { PaymentId = corrected.Id }, CancellationToken.None));

            using var verify = db.NewContext();
            var purchase = verify.Purchases.Include(x => x.PaymentDetails).Single(x => x.Id == scenario.Purchase.Id);
            Assert.Equal(1500UL, purchase.PaidAmount);
            Assert.Equal(3, purchase.PaymentDetails.Count);
        }

        [Fact]
        public async Task VoidPurchasePayment_TwiceIsRefused()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 1, stock: 0);
            var dto = Assert.IsType<PurchaseDto>((await AddPayment(scope).Handle(
                new AddPurchasePaymentCommand { PurchaseId = scenario.Purchase.Id, Type = PaymentTypeEnum.CASH, Amount = 100 }, CancellationToken.None)).Data);
            var voider = new VoidPurchasePaymentCommandHandler(scope.Db, FakeObjectStorage.Instance, scope.UnitOfWork);

            var afterVoid = Assert.IsType<PurchaseDto>((await voider.Handle(new VoidPurchasePaymentCommand { PaymentId = dto.PaymentDetails.Single().Id }, CancellationToken.None)).Data);
            Assert.Equal(0UL, afterVoid.PaidAmount);

            await Assert.ThrowsAsync<ValidationCustomException>(() => voider.Handle(new VoidPurchasePaymentCommand { PaymentId = dto.PaymentDetails.Single().Id }, CancellationToken.None));
        }

        [Fact]
        public async Task AddPurchasePayment_OnACancelledPurchase_AcceptsOnlyTheSupplierRefund()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 1, stock: 0);
            await AddPayment(scope).Handle(new AddPurchasePaymentCommand { PurchaseId = scenario.Purchase.Id, Type = PaymentTypeEnum.CASH, Amount = 1000 }, CancellationToken.None);
            await StatusHandler(scope).Handle(new ChangePurchaseStatusCommand { Id = scenario.Purchase.Id, Status = PurchaseStatusEnum.CANCELLED }, CancellationToken.None);

            await Assert.ThrowsAsync<ValidationCustomException>(() => AddPayment(scope).Handle(
                new AddPurchasePaymentCommand { PurchaseId = scenario.Purchase.Id, Type = PaymentTypeEnum.CASH, Amount = 1 }, CancellationToken.None));

            var refunded = Assert.IsType<PurchaseDto>((await AddPayment(scope).Handle(
                new AddPurchasePaymentCommand { PurchaseId = scenario.Purchase.Id, Type = PaymentTypeEnum.CASH, Amount = 1000, Direction = PaymentDirectionEnum.IN }, CancellationToken.None)).Data);
            Assert.Equal(0UL, refunded.PaidAmount);
        }

        [Theory]
        [InlineData(PaymentTypeEnum.MIXED)]
        [InlineData(PaymentTypeEnum.INSTALLMENT)]
        public void AddPurchasePaymentValidator_NonRowMethod_IsInvalid(PaymentTypeEnum type)
        {
            Assert.False(new AddPurchasePaymentCommandValidator().Validate(new AddPurchasePaymentCommand { PurchaseId = 1, Type = type, Amount = 10 }).IsValid);
        }
    }
}
