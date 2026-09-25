using Application.Common.Dtos.Returns;
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
    /// Buying the extra goods instead of releasing them for free: AcceptPurchaseExcess puts quarantined EXCESS/UNLISTED units on
    /// the order, so what we pay for them is also what they cost when sold. The old path (a return resolution releasing at the
    /// units' own value, 0, plus a MONEY_OUT) left the money in purchase spend and the goods in the pool at 0.
    /// </summary>
    public class PurchaseExcessAcceptedTests
    {
        private static ReceivePurchaseCommandHandler Receive(TestScope s) =>
            new(s.Db, s.PurchaseReturnCalculation, s.ProductUnitService, s.InventoryCostingService, FakeObjectStorage.Instance, s.UnitOfWork);

        private static AcceptPurchaseExcessCommandHandler Accept(TestScope s) =>
            new(s.Db, s.PurchaseReturnCalculation, s.ProductUnitService, s.InventoryCostingService, s.UnitOfWork);

        private static List<T> Periods<T>(object data) => (List<T>)data.GetType().GetProperty("Periods")!.GetValue(data)!;

        private static Task ReceiveAsync(TestScope scope, PurchaseScenario s, int arrived) =>
            Receive(scope).Handle(new ReceivePurchaseCommand
            {
                PurchaseId = s.Purchase.Id,
                Items = new() { new ReceivePurchaseItemDto { PurchaseItemId = s.Item.Id, ArrivedQuantity = arrived } },
            }, CancellationToken.None);

        [Fact]
        public async Task ExcessOnALine_BecomesASupplementLine_AtTheLinePrice()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var s = Seed.PendingPurchase(scope.Context, orderedQuantity: 10, stock: 0, unitPrice: 1000);
            var totalBefore = s.Purchase.TotalAmount;
            await ReceiveAsync(scope, s, 15); // 10 on the order, 5 excess held at 0

            await Accept(scope).Handle(new AcceptPurchaseExcessCommand
            {
                PurchaseId = s.Purchase.Id,
                Items = new() { new AcceptPurchaseExcessItemDto { PurchaseItemId = s.Item.Id, Quantity = 5 } },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            // The issued invoice is supplemented, never edited: the ordered line is exactly as it was, and the accepted
            // excess is a new line pointing back at it, at the same price.
            var item = verify.PurchaseItems.Single(x => x.Id == s.Item.Id);
            Assert.Equal((10, 10, 0), (item.Quantity, item.ReceivedQuantity, item.StillOwedQuantity));
            Assert.False(item.IsSupplement);
            var supplement = verify.PurchaseItems.Single(x => x.PurchaseId == s.Purchase.Id && x.Id != s.Item.Id);
            Assert.True(supplement.IsSupplement);
            Assert.Equal(s.Item.Id, supplement.SupplementOfPurchaseItemId);
            Assert.Equal((5, 5, 0, item.UnitPrice, item.Discount), (supplement.Quantity, supplement.ReceivedQuantity, supplement.StillOwedQuantity, supplement.UnitPrice, supplement.Discount));
            Assert.Equal(PurchaseStatusEnum.RECEIVED, verify.Purchases.Single().Status);
            Assert.Equal(totalBefore + 5_000, verify.Purchases.Single().TotalAmount);

            // Units: on the shelf, no longer excess; the 5 accepted ones now belong to the supplement line.
            var units = verify.ProductUnits.Where(u => u.ProductId == s.Product.Id).ToList();
            Assert.Equal(15, units.Count(u => u.Status == ProductUnitStatusEnum.IN_STOCK));
            Assert.DoesNotContain(units, u => u.Status == ProductUnitStatusEnum.QUARANTINED);
            Assert.All(units, u => Assert.Equal(UnitCustodyReasonEnum.ON_ORDER, u.CustodyReason));
            Assert.Equal(10, units.Count(u => u.PurchaseItemId == s.Item.Id));
            Assert.Equal(5, units.Count(u => u.PurchaseItemId == supplement.Id));
            Assert.Equal(15, verify.Products.Single(p => p.Id == s.Product.Id).Stock);
            Assert.Equal(5, verify.ProductUnitMovements.Count(m => m.Reason == ProductUnitMovementReasonEnum.PURCHASE_EXCESS_ACCEPTED));

            // Rials: all 15 in the pool at 1,000 - the whole point. Releasing them for free would have given an average of 666.
            var ledger = verify.InventoryCostLedgerEntries.Where(x => x.ProductId == s.Product.Id).OrderBy(x => x.Id).ToList();
            Assert.Equal(15, ledger.Last().RunningQuantity);
            Assert.Equal(15_000m, ledger.Last().RunningInventoryValue);
            Assert.Equal(1_000m, ledger.Last().RunningAverageCost);
            Assert.Equal(0m, ledger.Sum(x => x.OffPoolValueDelta));

            var report = Periods<PurchaseReportPeriodDto>((await new GetPurchaseReportQueryHandler(scope.Db).Handle(new GetPurchaseReportQuery(), CancellationToken.None)).Data!);
            Assert.Equal(15_000m, report.Sum(p => p.TotalReceivedValue));
        }

        [Fact]
        public async Task SupplementLine_InheritsTheOrderedLinesTax_AndTheInvoiceGrowsTaxInclusive()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var s = Seed.PendingPurchase(scope.Context, orderedQuantity: 4, stock: 0, unitPrice: 1000);
            // The invoice was issued at 10%; the product's rate has changed to 5% since.
            s.Item.TaxPercent = 10;
            s.Product.Tax = 5;
            scope.Context.SaveChanges();
            var totalBefore = s.Purchase.TotalAmount;
            await ReceiveAsync(scope, s, 6);

            await Accept(scope).Handle(new AcceptPurchaseExcessCommand
            {
                PurchaseId = s.Purchase.Id,
                Items = new() { new AcceptPurchaseExcessItemDto { PurchaseItemId = s.Item.Id, Quantity = 2 } },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var supplement = verify.PurchaseItems.Single(x => x.PurchaseId == s.Purchase.Id && x.IsSupplement);
            Assert.Equal(10, supplement.TaxPercent);
            Assert.Equal((2_000UL, 200UL, 2_200UL), (supplement.NetAmount, supplement.TaxAmount, supplement.TotalAmount));
            Assert.Equal(totalBefore + 2_200, verify.Purchases.Single().TotalAmount);

            // The cost pool takes the net price only - tax is not part of what the goods cost.
            var accepted = verify.InventoryCostLedgerEntries.Single(x => x.EventType == InventoryCostEventTypeEnum.PURCHASE_EXCESS_ACCEPTED);
            Assert.Equal(2_000m, accepted.InventoryValueDelta);
        }

        [Fact]
        public async Task ExcessOnALine_IsBoughtAtTheLinesNetPrice()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var s = Seed.PendingPurchase(scope.Context, orderedQuantity: 4, stock: 0, unitPrice: 1000);
            s.Item.Discount = 25;
            scope.Context.SaveChanges();
            var totalBefore = s.Purchase.TotalAmount;
            await ReceiveAsync(scope, s, 6);

            await Accept(scope).Handle(new AcceptPurchaseExcessCommand
            {
                PurchaseId = s.Purchase.Id,
                Items = new() { new AcceptPurchaseExcessItemDto { PurchaseItemId = s.Item.Id, Quantity = 2 } },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var accepted = verify.InventoryCostLedgerEntries.Single(x => x.EventType == InventoryCostEventTypeEnum.PURCHASE_EXCESS_ACCEPTED);
            Assert.Equal(1_500m, accepted.InventoryValueDelta); // 2 x 750, not 2 x 1000
            Assert.Equal(750m, verify.InventoryCostLedgerEntries.OrderBy(x => x.Id).Last().RunningAverageCost);
            Assert.Equal(totalBefore + 1_500, verify.Purchases.Single().TotalAmount);
        }

        [Fact]
        public async Task UnlistedGoods_GetTheirOwnLine_AtTheInvoicePrice()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var s = Seed.PendingPurchase(scope.Context, orderedQuantity: 5, stock: 0, unitPrice: 1000);
            var valve = Seed.Product(s.Product.ProductCategory!, name: "شیر فلکه");
            scope.Context.Products.Add(valve);
            scope.Context.SaveChanges();

            await Receive(scope).Handle(new ReceivePurchaseCommand
            {
                PurchaseId = s.Purchase.Id,
                UnlistedItems = new() { new ReceivePurchaseUnlistedItemDto { ProductId = valve.Id, ArrivedQuantity = 4 } },
            }, CancellationToken.None);

            await Accept(scope).Handle(new AcceptPurchaseExcessCommand
            {
                PurchaseId = s.Purchase.Id,
                Items = new() { new AcceptPurchaseExcessItemDto { ProductId = valve.Id, Quantity = 3, UnitPrice = 2000 } },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var line = verify.PurchaseItems.Single(x => x.ProductId == valve.Id);
            Assert.Equal((3, 3, 2_000ul, 0), (line.Quantity, line.ReceivedQuantity, line.UnitPrice, line.Discount));

            var units = verify.ProductUnits.Where(u => u.ProductId == valve.Id).ToList();
            Assert.Equal(3, units.Count(u => u.Status == ProductUnitStatusEnum.IN_STOCK && u.CustodyReason == UnitCustodyReasonEnum.ON_ORDER && u.PurchaseItemId == line.Id));
            Assert.Equal(1, units.Count(u => u.Status == ProductUnitStatusEnum.QUARANTINED)); // the fourth was not bought
            Assert.Equal(3, verify.Products.Single(p => p.Id == valve.Id).Stock);
            Assert.Equal(6_000m, verify.InventoryCostLedgerEntries.Where(x => x.ProductId == valve.Id).Sum(x => x.InventoryValueDelta));
        }

        [Fact]
        public async Task MoreThanIsHeld_OrReservedByAnOpenClaim_IsRefused()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var s = Seed.PendingPurchase(scope.Context, orderedQuantity: 5, stock: 0, unitPrice: 1000);
            await ReceiveAsync(scope, s, 8); // 3 excess

            await Assert.ThrowsAsync<ValidationCustomException>(() => Accept(scope).Handle(new AcceptPurchaseExcessCommand
            {
                PurchaseId = s.Purchase.Id,
                Items = new() { new AcceptPurchaseExcessItemDto { PurchaseItemId = s.Item.Id, Quantity = 4 } },
            }, CancellationToken.None));

            // Two of the three are claimed back from the supplier: only one is left to buy.
            await new PR.CreatePurchaseReturnCommandHandler(scope.Db, scope.PurchaseReturnRepository, scope.PurchaseReturnCalculation, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new PR.CreatePurchaseReturnCommand
                {
                    PurchaseId = s.Purchase.Id,
                    Claims = new()
                    {
                        new CreateReturnClaimDto
                        {
                            Scope = ReturnClaimScopeEnum.OFF_ORDER,
                            OffScopeKind = ReturnOffScopeKindEnum.EXCESS,
                            OrderLineId = s.Item.Id,
                            ProductId = s.Product.Id,
                            UnitPrice = s.Item.UnitPrice,
                            Quantity = 2,
                            Problem = ReturnProblemEnum.OVER_SHIPPED,
                        },
                    },
                }, CancellationToken.None);

            await Assert.ThrowsAsync<ValidationCustomException>(() => Accept(scope).Handle(new AcceptPurchaseExcessCommand
            {
                PurchaseId = s.Purchase.Id,
                Items = new() { new AcceptPurchaseExcessItemDto { PurchaseItemId = s.Item.Id, Quantity = 2 } },
            }, CancellationToken.None));

            await Accept(scope).Handle(new AcceptPurchaseExcessCommand
            {
                PurchaseId = s.Purchase.Id,
                Items = new() { new AcceptPurchaseExcessItemDto { PurchaseItemId = s.Item.Id, Quantity = 1 } },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Equal(6, verify.Products.Single(p => p.Id == s.Product.Id).Stock);
            Assert.Equal(2, verify.ProductUnits.Count(u => u.ProductId == s.Product.Id && u.Status == ProductUnitStatusEnum.QUARANTINED));
        }

        [Fact]
        public async Task ARefusedRequest_MovesNothing()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var s = Seed.PendingPurchase(scope.Context, orderedQuantity: 5, stock: 0, unitPrice: 1000);
            var valve = Seed.Product(s.Product.ProductCategory!, name: "شیر فلکه");
            scope.Context.Products.Add(valve);
            scope.Context.SaveChanges();
            await ReceiveAsync(scope, s, 7); // 2 excess

            // The first line is fine, the second is not: neither may be applied.
            await Assert.ThrowsAsync<ValidationCustomException>(() => Accept(scope).Handle(new AcceptPurchaseExcessCommand
            {
                PurchaseId = s.Purchase.Id,
                Items = new()
                {
                    new AcceptPurchaseExcessItemDto { PurchaseItemId = s.Item.Id, Quantity = 2 },
                    new AcceptPurchaseExcessItemDto { ProductId = valve.Id, Quantity = 1, UnitPrice = 500 },
                },
            }, CancellationToken.None));

            using var verify = db.NewContext();
            Assert.Equal(5, verify.Products.Single(p => p.Id == s.Product.Id).Stock);
            Assert.Equal(2, verify.ProductUnits.Count(u => u.ProductId == s.Product.Id && u.Status == ProductUnitStatusEnum.QUARANTINED));
            Assert.Single(verify.PurchaseItems);
            Assert.DoesNotContain(verify.InventoryCostLedgerEntries, x => x.EventType == InventoryCostEventTypeEnum.PURCHASE_EXCESS_ACCEPTED);
        }
    }
}
