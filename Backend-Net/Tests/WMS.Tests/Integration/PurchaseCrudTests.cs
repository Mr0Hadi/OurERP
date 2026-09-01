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
        [Fact]
        public async Task CreatePurchase_MapsAllFieldsIncludingItems()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 1, stock: 0);
            var supplier = scenario.Supplier;

            var handler = new CreatePurchaseCommandHandler(scope.PurchaseRepository, scope.Db, FakeObjectStorage.Instance, TestMapper.Instance, scope.UnitOfWork);
            await handler.Handle(new CreatePurchaseCommand
            {
                SupplierId = supplier.Id,
                TotalAmount = 5000,
                PaidAmount = 1000,
                PaymentType = PaymentTypeEnum.CASH,
                Status = PurchaseStatusEnum.SHIPPED,
                PaymentDetails = new(),
                InvoiceNumber = "INV-NEW",
                InvoiceDate = DateTime.Now,
                ProductItemList = new()
                {
                    new Application.Features.Purchase.Dtos.CreatePurchaseItemDto { ProductId = scenario.Product.Id, Quantity = 3, UnitPrice = 1000, Discount = 0 },
                },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var purchase = verify.Purchases.Include(x => x.Items).Single(x => x.InvoiceNumber == "INV-NEW");

            // CreatePurchaseCommand.TotalPrice/PaidPrice/ProductItemList are named differently
            // from Purchase.TotalAmount/PaidAmount/Items, so the mapping profile needs explicit
            // ForMember calls for all three - verified here since a missing one would silently
            // zero/empty the field rather than fail loudly.
            Assert.Equal(5000UL, purchase.TotalAmount);
            Assert.Equal(1000UL, purchase.PaidAmount);
            var item = Assert.Single(purchase.Items);
            Assert.Equal(3, item.Quantity);
            Assert.Equal(scenario.Product.Id, item.ProductId);
        }

        [Fact]
        public async Task UpdatePurchase_UnknownId_ThrowsNotFound()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();

            var handler = new UpdatePurchaseCommandHandler(scope.PurchaseRepository, scope.Db, FakeObjectStorage.Instance, scope.UnitOfWork);

            await Assert.ThrowsAsync<NotFoundCustomException>(() => handler.Handle(new UpdatePurchaseCommand
            {
                Id = 999,
                InvoiceNumber = "X",
                InvoiceDate = DateTime.Now,
                SupplierId = 1,
                TotalAmount = 100,
                PaidAmount = 0,
            }, CancellationToken.None));
        }

        [Fact]
        public async Task UpdatePurchase_ExistingId_UpdatesFields()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 5, stock: 0);

            var handler = new UpdatePurchaseCommandHandler(scope.PurchaseRepository, scope.Db, FakeObjectStorage.Instance, scope.UnitOfWork);
            await handler.Handle(new UpdatePurchaseCommand
            {
                Id = scenario.Purchase.Id,
                InvoiceNumber = "UPDATED-INV",
                InvoiceDate = DateTime.Now,
                Status = PurchaseStatusEnum.CANCELLED,
                PaymentType = PaymentTypeEnum.CASH,
                SupplierId = scenario.Supplier.Id,
                TotalAmount = 9999,
                PaidAmount = 100,
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var updated = verify.Purchases.Single(x => x.Id == scenario.Purchase.Id);
            Assert.Equal("UPDATED-INV", updated.InvoiceNumber);
            Assert.Equal(PurchaseStatusEnum.CANCELLED, updated.Status);
            Assert.Equal(9999UL, updated.TotalAmount);
        }

        [Fact]
        public async Task DeletePurchase_SetsIsActiveFalse()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 1, stock: 0);

            var handler = new DeletePurchaseCommandHandler(scope.PurchaseRepository, scope.UnitOfWork);
            await handler.Handle(new DeletePurchaseCommand { Id = scenario.Purchase.Id }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.False(verify.Purchases.Single(x => x.Id == scenario.Purchase.Id).IsActive);
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

            var handler = new CreatePurchaseCommandHandler(scope.PurchaseRepository, scope.Db, FakeObjectStorage.Instance, TestMapper.Instance, scope.UnitOfWork);
            await handler.Handle(new CreatePurchaseCommand
            {
                SupplierId = scenario.Supplier.Id,
                TotalAmount = 5000,
                PaidAmount = 0,
                PaymentType = PaymentTypeEnum.CASH,
                Status = PurchaseStatusEnum.PROFORMA,
                PaymentDetails = new(),
                InvoiceNumber = null,
                ProductItemList = new()
                {
                    new CreatePurchaseItemDto { ProductId = scenario.Product.Id, Quantity = 1, UnitPrice = 5000, Discount = 0 },
                },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var purchase = verify.Purchases.Single(x => x.SupplierId == scenario.Supplier.Id && x.TotalAmount == 5000);
            Assert.Equal(PurchaseStatusEnum.PROFORMA, purchase.Status);
        }

        [Fact]
        public async Task UpdatePurchase_LeavingProforma_WithoutInvoiceNumber_ThrowsValidation()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 1, stock: 0);
            scenario.Purchase.Status = PurchaseStatusEnum.PROFORMA;
            scope.Context.SaveChanges();

            var handler = new UpdatePurchaseCommandHandler(scope.PurchaseRepository, scope.Db, FakeObjectStorage.Instance, scope.UnitOfWork);

            await Assert.ThrowsAsync<ValidationCustomException>(() => handler.Handle(new UpdatePurchaseCommand
            {
                Id = scenario.Purchase.Id,
                InvoiceNumber = "",
                InvoiceDate = DateTime.Now,
                Status = PurchaseStatusEnum.SHIPPED,
                PaymentType = PaymentTypeEnum.CASH,
                SupplierId = scenario.Supplier.Id,
                TotalAmount = 5000,
                PaidAmount = 0,
            }, CancellationToken.None));
        }

        [Fact]
        public async Task UpdatePurchase_LeavingProforma_WithInvoiceNumber_Succeeds()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 1, stock: 0);
            scenario.Purchase.Status = PurchaseStatusEnum.PROFORMA;
            scope.Context.SaveChanges();

            var handler = new UpdatePurchaseCommandHandler(scope.PurchaseRepository, scope.Db, FakeObjectStorage.Instance, scope.UnitOfWork);
            await handler.Handle(new UpdatePurchaseCommand
            {
                Id = scenario.Purchase.Id,
                InvoiceNumber = "SUPPLIER-INV-1",
                InvoiceDate = DateTime.Now,
                Status = PurchaseStatusEnum.SHIPPED,
                PaymentType = PaymentTypeEnum.CASH,
                SupplierId = scenario.Supplier.Id,
                TotalAmount = 5000,
                PaidAmount = 0,
                Attachments = new() { new() { ObjectKey = "receiving/2026/09/fake.jpg" } },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var updated = verify.Purchases.Single(x => x.Id == scenario.Purchase.Id);
            Assert.Equal(PurchaseStatusEnum.SHIPPED, updated.Status);
            Assert.Equal("SUPPLIER-INV-1", updated.InvoiceNumber);
            var attachment = verify.DocumentAttachments.Single(a => a.DocumentKind == DocumentKindEnum.PURCHASE && a.DocumentId == scenario.Purchase.Id);
            Assert.Equal("receiving/2026/09/fake.jpg", attachment.ObjectKey);
        }
    }
}
