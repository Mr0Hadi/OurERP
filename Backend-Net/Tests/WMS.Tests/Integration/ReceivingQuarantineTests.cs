using Application.Common.Dtos.Returns;
using Application.Features.Product.Commands;
using Application.Features.Purchase.Commands;
using Application.Features.Purchase.Dtos;
using Application.Features.Report.Dtos;
using Application.Features.Report.Queries;
using Common.Exceptions;
using Domain.Enums;
using WMS.Tests.Support;
using PR = Application.Features.PurchaseReturn.Commands;

namespace WMS.Tests.Integration
{
    /// <summary>
    /// Receiving by physical count: the healthy-first allocation into stock / quarantined-on-order / quarantined-excess, unlisted
    /// goods, the discrepancy rows, the off-pool ledger value, the off-order claim quota read from CustodyReason, and quick-create.
    /// </summary>
    public class ReceivingQuarantineTests
    {
        private static ReceivePurchaseCommandHandler Receive(TestScope scope) =>
            new(scope.Db, scope.PurchaseReturnCalculation, scope.ProductUnitService, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork);

        private static PR.CreatePurchaseReturnCommandHandler CreateReturn(TestScope scope) =>
            new(scope.Db, scope.PurchaseReturnRepository, scope.PurchaseReturnCalculation, FakeObjectStorage.Instance, scope.UnitOfWork);

        private static CreateReturnClaimDto ExcessClaim(PurchaseScenario scenario, int quantity) => new()
        {
            Scope = ReturnClaimScopeEnum.OFF_ORDER,
            OffScopeKind = ReturnOffScopeKindEnum.EXCESS,
            OrderLineId = scenario.Item.Id,
            ProductId = scenario.Product.Id,
            UnitPrice = scenario.Item.UnitPrice,
            Quantity = quantity,
            Problem = ReturnProblemEnum.OVER_SHIPPED,
        };

        [Fact]
        public async Task TwentyFiveArrived_TwentyOwed_TenDefective_AllocatesHealthyFirst()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 20, stock: 0, unitPrice: 1000);

            await Receive(scope).Handle(new ReceivePurchaseCommand
            {
                PurchaseId = scenario.Purchase.Id,
                Items = new()
                {
                    new ReceivePurchaseItemDto
                    {
                        PurchaseItemId = scenario.Item.Id,
                        ArrivedQuantity = 25,
                        Defects = new()
                        {
                            new ReceivingDefectDto { Problem = ReturnProblemEnum.DEFECTIVE, Quantity = 6, Note = "خط تولید" },
                            new ReceivingDefectDto { Problem = ReturnProblemEnum.DAMAGED_IN_TRANSIT, Quantity = 4 },
                        },
                    },
                },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var item = verify.PurchaseItems.Single(x => x.Id == scenario.Item.Id);
            var units = verify.ProductUnits.Where(u => u.ProductId == scenario.Product.Id).ToList();

            // h = min(15, 20) = 15, d = min(10, 5) = 5, excess = 25 - 15 - 5 = 5
            Assert.Equal(20, item.ReceivedQuantity);
            Assert.Equal(15, verify.Products.Single(x => x.Id == scenario.Product.Id).Stock);
            Assert.Equal(15, units.Count(u => u.Status == ProductUnitStatusEnum.IN_STOCK && u.CustodyReason == UnitCustodyReasonEnum.ON_ORDER));
            Assert.Equal(5, units.Count(u => u.Status == ProductUnitStatusEnum.QUARANTINED && u.CustodyReason == UnitCustodyReasonEnum.ON_ORDER && u.PurchaseItemId == scenario.Item.Id));
            Assert.Equal(5, units.Count(u => u.Status == ProductUnitStatusEnum.QUARANTINED && u.CustodyReason == UnitCustodyReasonEnum.EXCESS && u.PurchaseItemId == scenario.Item.Id));
            Assert.All(units, u => Assert.Equal(scenario.Purchase.Id, u.PurchaseId));
            Assert.Equal(PurchaseStatusEnum.RECEIVED, verify.Purchases.Single().Status);

            var net = 1000m * (100 - scenario.Item.Discount) / 100;
            Assert.Equal(15 * net, verify.InventoryCostLedgerEntries.Single(x => x.EventType == InventoryCostEventTypeEnum.PURCHASE_RECEIVED).InventoryValueDelta);
            var held = verify.InventoryCostLedgerEntries.Single(x => x.EventType == InventoryCostEventTypeEnum.PURCHASE_RECEIVED_QUARANTINED);
            Assert.Equal(5 * net, held.OffPoolValueDelta);
            Assert.Equal(0, held.QuantityDelta);
            Assert.Equal(15, held.RunningQuantity); // the sellable pool is untouched by quarantine

            // The line's defective share fills in the order the rows were sent: DEFECTIVE 6 -> 5 on order + 1 excess, DAMAGED 4 -> excess.
            var rows = verify.PurchaseReceivingDiscrepancies.ToList();
            Assert.Equal(5, rows.Single(r => r.CustodyReason == UnitCustodyReasonEnum.ON_ORDER && r.Problem == ReturnProblemEnum.DEFECTIVE).Quantity);
            Assert.Equal("خط تولید", rows.Single(r => r.CustodyReason == UnitCustodyReasonEnum.ON_ORDER).Note);
            Assert.Equal(1, rows.Single(r => r.CustodyReason == UnitCustodyReasonEnum.EXCESS && r.Problem == ReturnProblemEnum.DEFECTIVE).Quantity);
            Assert.Equal(4, rows.Single(r => r.CustodyReason == UnitCustodyReasonEnum.EXCESS && r.Problem == ReturnProblemEnum.DAMAGED_IN_TRANSIT).Quantity);
            Assert.DoesNotContain(rows, r => r.Problem == ReturnProblemEnum.OVER_SHIPPED); // every excess unit was defective
        }

        [Fact]
        public async Task HealthyExcess_IsQuarantined_AndRecordedAsOverShipped()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 5, stock: 0);

            await Receive(scope).Handle(new ReceivePurchaseCommand
            {
                PurchaseId = scenario.Purchase.Id,
                Items = new() { new ReceivePurchaseItemDto { PurchaseItemId = scenario.Item.Id, ArrivedQuantity = 7 } },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Equal(5, verify.Products.Single(x => x.Id == scenario.Product.Id).Stock);
            Assert.Equal(2, verify.ProductUnits.Count(u => u.Status == ProductUnitStatusEnum.QUARANTINED && u.CustodyReason == UnitCustodyReasonEnum.EXCESS));
            var row = verify.PurchaseReceivingDiscrepancies.Single();
            Assert.Equal((UnitCustodyReasonEnum.EXCESS, ReturnProblemEnum.OVER_SHIPPED, 2), (row.CustodyReason, row.Problem, row.Quantity));
            Assert.DoesNotContain(verify.InventoryCostLedgerEntries, x => x.EventType == InventoryCostEventTypeEnum.PURCHASE_RECEIVED_QUARANTINED);
        }

        [Fact]
        public async Task UnlistedItems_AreQuarantinedWithoutLineOrValue()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 5, stock: 0);
            var valve = Seed.Product(scenario.Product.ProductCategory!, name: "شیر فلکه");
            scope.Context.Products.Add(valve);
            scope.Context.SaveChanges();

            await Receive(scope).Handle(new ReceivePurchaseCommand
            {
                PurchaseId = scenario.Purchase.Id,
                UnlistedItems = new() { new ReceivePurchaseUnlistedItemDto { ProductId = valve.Id, ArrivedQuantity = 5, Defects = new() { new ReceivingDefectDto { Problem = ReturnProblemEnum.DEFECTIVE, Quantity = 1 } } } },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var units = verify.ProductUnits.Where(u => u.ProductId == valve.Id).ToList();
            Assert.Equal(5, units.Count);
            Assert.All(units, u =>
            {
                Assert.Equal(ProductUnitStatusEnum.QUARANTINED, u.Status);
                Assert.Equal(UnitCustodyReasonEnum.UNLISTED, u.CustodyReason);
                Assert.Null(u.PurchaseItemId);
                Assert.Equal(scenario.Purchase.Id, u.PurchaseId);
            });
            Assert.Equal(0, verify.Products.Single(x => x.Id == valve.Id).Stock);
            Assert.Empty(verify.InventoryCostLedgerEntries.Where(x => x.ProductId == valve.Id));
            Assert.Equal(4, verify.PurchaseReceivingDiscrepancies.Single(r => r.Problem == ReturnProblemEnum.UNLISTED_ITEM).Quantity);
            Assert.Equal(1, verify.PurchaseReceivingDiscrepancies.Single(r => r.Problem == ReturnProblemEnum.DEFECTIVE).Quantity);
        }

        [Fact]
        public async Task UnlistedItem_ThatThePurchaseLists_IsRefused()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 5, stock: 0);

            await Assert.ThrowsAsync<ValidationCustomException>(() => Receive(scope).Handle(new ReceivePurchaseCommand
            {
                PurchaseId = scenario.Purchase.Id,
                UnlistedItems = new() { new ReceivePurchaseUnlistedItemDto { ProductId = scenario.Product.Id, ArrivedQuantity = 1 } },
            }, CancellationToken.None));
        }

        [Fact]
        public async Task ExcessClaim_IsCappedByHeldExcess_AcrossOpenReturns()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 5, stock: 0);

            await Receive(scope).Handle(new ReceivePurchaseCommand
            {
                PurchaseId = scenario.Purchase.Id,
                Items = new() { new ReceivePurchaseItemDto { PurchaseItemId = scenario.Item.Id, ArrivedQuantity = 7 } },
            }, CancellationToken.None);

            await Assert.ThrowsAsync<ValidationCustomException>(() => CreateReturn(scope).Handle(new PR.CreatePurchaseReturnCommand { PurchaseId = scenario.Purchase.Id, Claims = new() { ExcessClaim(scenario, 3) } }, CancellationToken.None));

            await CreateReturn(scope).Handle(new PR.CreatePurchaseReturnCommand { PurchaseId = scenario.Purchase.Id, Claims = new() { ExcessClaim(scenario, 2) } }, CancellationToken.None);

            // The first return already reserves both held units.
            await Assert.ThrowsAsync<ValidationCustomException>(() => CreateReturn(scope).Handle(new PR.CreatePurchaseReturnCommand { PurchaseId = scenario.Purchase.Id, Claims = new() { ExcessClaim(scenario, 1) } }, CancellationToken.None));
        }

        [Fact]
        public async Task ReceivingInfo_FreeAndClaimableQuantities_SubtractOpenClaims()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 5, stock: 0);
            var valve = Seed.Product(scenario.Product.ProductCategory!, name: "شیر فلکه");
            scope.Context.Products.Add(valve);
            scope.Context.SaveChanges();

            // 5 ordered, 7 arrived (2 excess on the line) plus 3 unlisted valves.
            await Receive(scope).Handle(new ReceivePurchaseCommand
            {
                PurchaseId = scenario.Purchase.Id,
                Items = new() { new ReceivePurchaseItemDto { PurchaseItemId = scenario.Item.Id, ArrivedQuantity = 7 } },
                UnlistedItems = new() { new ReceivePurchaseUnlistedItemDto { ProductId = valve.Id, ArrivedQuantity = 3 } },
            }, CancellationToken.None);

            await CreateReturn(scope).Handle(new PR.CreatePurchaseReturnCommand
            {
                PurchaseId = scenario.Purchase.Id,
                Claims = new()
                {
                    new CreateReturnClaimDto { Scope = ReturnClaimScopeEnum.ON_ORDER, OrderLineId = scenario.Item.Id, ProductId = scenario.Product.Id, UnitPrice = scenario.Item.UnitPrice, Quantity = 2, Problem = ReturnProblemEnum.DEFECTIVE },
                    ExcessClaim(scenario, 1),
                    new CreateReturnClaimDto { Scope = ReturnClaimScopeEnum.OFF_ORDER, OffScopeKind = ReturnOffScopeKindEnum.UNLISTED, ProductId = valve.Id, UnitPrice = 0, Quantity = 2, Problem = ReturnProblemEnum.UNLISTED_ITEM },
                },
            }, CancellationToken.None);

            using var read = db.NewScope();
            var res = await new Application.Features.PurchaseReturn.Queries.GetPurchaseReceivingInfoQueryHandler(read.Db, FakeObjectStorage.Instance, read.PurchaseReturnCalculation)
                .Handle(new Application.Features.PurchaseReturn.Queries.GetPurchaseReceivingInfoQuery { PurchaseId = scenario.Purchase.Id }, CancellationToken.None);
            var info = (Application.Features.PurchaseReturn.Dtos.PurchaseReceivingInfoDto)res.Data!;

            var line = Assert.Single(info.Items);
            Assert.Equal(2, line.QuarantinedExcessQuantity);
            Assert.Equal(1, line.FreeExcessQuantity);   // 2 held - 1 claimed
            Assert.Equal(3, line.ClaimableQuantity);    // 5 received - 2 claimed
            var unlisted = Assert.Single(info.UnlistedItems);
            Assert.Equal(3, unlisted.QuarantinedQuantity);
            Assert.Equal(1, unlisted.FreeQuantity);     // 3 held - 2 claimed
        }

        [Fact]
        public async Task UnlistedClaim_WithNothingHeld_IsRefused()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 5, stock: 0);
            var other = Seed.Product(scenario.Product.ProductCategory!, name: "کالای دیگر");
            scope.Context.Products.Add(other);
            scope.Context.SaveChanges();

            await Assert.ThrowsAsync<ValidationCustomException>(() => CreateReturn(scope).Handle(new PR.CreatePurchaseReturnCommand
            {
                PurchaseId = scenario.Purchase.Id,
                Claims = new() { new CreateReturnClaimDto { Scope = ReturnClaimScopeEnum.OFF_ORDER, OffScopeKind = ReturnOffScopeKindEnum.UNLISTED, ProductId = other.Id, UnitPrice = 0, Quantity = 1, Problem = ReturnProblemEnum.UNLISTED_ITEM } },
            }, CancellationToken.None));
        }

        [Fact]
        public async Task PurchaseReport_CountsPaidForQuarantinedGoodsAsReceived()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 10, stock: 0, unitPrice: 1000);

            await Receive(scope).Handle(new ReceivePurchaseCommand
            {
                PurchaseId = scenario.Purchase.Id,
                Items = new() { new ReceivePurchaseItemDto { PurchaseItemId = scenario.Item.Id, ArrivedQuantity = 12, Defects = new() { new ReceivingDefectDto { Problem = ReturnProblemEnum.DEFECTIVE, Quantity = 2 } } } },
            }, CancellationToken.None);

            var res = await new GetPurchaseReportQueryHandler(scope.Db).Handle(new GetPurchaseReportQuery(), CancellationToken.None);
            var periods = (List<PurchaseReportPeriodDto>)res.Data!.GetType().GetProperty("Periods")!.GetValue(res.Data)!;

            // 10 bought (all on the line; healthy-first gives 10 healthy, 0 defective on order), 2 excess never paid for.
            var net = 1000m * (100 - scenario.Item.Discount) / 100;
            Assert.Equal(10 * net, periods.Sum(p => p.TotalReceivedValue));
        }

        [Fact]
        public async Task PurchaseReport_IncludesDefectiveOnOrderValue()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 10, stock: 0, unitPrice: 1000);

            await Receive(scope).Handle(new ReceivePurchaseCommand
            {
                PurchaseId = scenario.Purchase.Id,
                Items = new() { new ReceivePurchaseItemDto { PurchaseItemId = scenario.Item.Id, ArrivedQuantity = 10, Defects = new() { new ReceivingDefectDto { Problem = ReturnProblemEnum.DEFECTIVE, Quantity = 2 } } } },
            }, CancellationToken.None);

            var res = await new GetPurchaseReportQueryHandler(scope.Db).Handle(new GetPurchaseReportQuery(), CancellationToken.None);
            var periods = (List<PurchaseReportPeriodDto>)res.Data!.GetType().GetProperty("Periods")!.GetValue(res.Data)!;

            var net = 1000m * (100 - scenario.Item.Discount) / 100;
            Assert.Equal(10 * net, periods.Sum(p => p.TotalReceivedValue)); // 8 into stock + 2 held, all bought
        }

        [Fact]
        public async Task QuickCreate_GoesThroughCreateProduct_AndClearsOnlyWhenCompleted()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var category = Seed.Category();
            scope.Context.ProductCategories.Add(category);
            scope.Context.SaveChanges();

            var command = new CreateProductCommand { Name = "شیر فلکه ۳ اینچ", Unit = ProductUnitEnum.Number, ProductCategoryId = category.Id, IsIncomplete = true };
            Assert.True(new CreateProductCommandValidator().Validate(command).IsValid);
            Assert.False(new CreateProductCommandValidator().Validate(new CreateProductCommand { Name = "x", Unit = ProductUnitEnum.Number, ProductCategoryId = category.Id, IsIncomplete = true, Stock = 3 }).IsValid);

            await new CreateProductCommandHandler(scope.ProductRepository, TestMapper.Instance, scope.ProductCodeService, scope.ProductUnitService, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(command, CancellationToken.None);

            var created = scope.Context.Products.Single(p => p.Name == command.Name);
            Assert.True(created.IsIncomplete);
            Assert.False(created.Code.Length == 32); // the real generated code, not the Guid placeholder

            var update = new UpdateProductCommandHandler(scope.ProductRepository, scope.ProductUnitService, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork);

            // A name fix alone leaves brand and prices empty: still incomplete.
            await update.Handle(new UpdateProductCommand { Id = created.Id, Name = "شیر فلکه ۳ اینچی", Unit = ProductUnitEnum.Number, ProductCategoryId = category.Id }, CancellationToken.None);
            Assert.True(scope.Context.Products.Single(p => p.Id == created.Id).IsIncomplete);

            await update.Handle(new UpdateProductCommand { Id = created.Id, Name = "شیر فلکه ۳ اینچی", Brand = "کیتز", PurchasePrice = 100, RetailPrice = 150, WholeSalePrice = 130, Unit = ProductUnitEnum.Number, ProductCategoryId = category.Id }, CancellationToken.None);
            var completed = scope.Context.Products.Single(p => p.Id == created.Id);
            Assert.False(completed.IsIncomplete);

            // Once complete, brand and prices are required again.
            await Assert.ThrowsAsync<ValidationCustomException>(() => update.Handle(new UpdateProductCommand { Id = created.Id, Name = "شیر", Unit = ProductUnitEnum.Number, ProductCategoryId = category.Id }, CancellationToken.None));
        }
    }
}
