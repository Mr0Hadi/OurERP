using Application.Common.Dtos.Returns;
using Application.Features.Purchase.Commands;
using Application.Features.Purchase.Dtos;
using Application.Features.PurchaseReturn.Dtos;
using Application.Features.Report.Dtos;
using Application.Features.Report.Queries;
using Application.Features.SaleReturn.Dtos;
using Common.Exceptions;
using Domain.Enums;
using WMS.Tests.Support;
using PR = Application.Features.PurchaseReturn.Commands;
using SR = Application.Features.SaleReturn.Commands;

namespace WMS.Tests.Integration
{
    /// <summary>
    /// The effect model through the real handlers: the balance rule (a floor, on UnitPrice), and one set of
    /// mechanics for every claim - GOODS_IN raises stock at its UnitCost (or the running average),
    /// GOODS_OUT lowers it at the running average, and money effects write ledger rows that the sale
    /// report reads as revenue (sale side) and the purchase report as spend (purchase side).
    /// </summary>
    public class ReturnEffectModelTests
    {
        // ─── fixtures ─────────────────────────────────────────────────────────────────────────────

        private static PR.AddClaimResolutionCommandHandler PAdd(TestScope s) => new(s.Db, s.PurchaseReturnCalculation, s.InventoryCostingService, FakeObjectStorage.Instance, s.UnitOfWork);
        private static PR.RemoveClaimResolutionCommandHandler PRemove(TestScope s) => new(s.Db, s.PurchaseReturnCalculation, s.InventoryCostingService, FakeObjectStorage.Instance, s.UnitOfWork);
        private static PR.ExecuteGoodsRoundCommandHandler PRound(TestScope s) => new(s.Db, s.PurchaseReturnCalculation, s.ProductUnitService, s.InventoryCostingService, FakeObjectStorage.Instance, s.UnitOfWork);
        private static SR.AddClaimResolutionCommandHandler SAdd(TestScope s) => new(s.Db, s.SaleReturnCalculation, s.InventoryCostingService, s.UnitOfWork);
        private static SR.RemoveClaimResolutionCommandHandler SRemove(TestScope s) => new(s.Db, s.SaleReturnCalculation, s.InventoryCostingService, s.UnitOfWork);
        private static SR.ExecuteGoodsRoundCommandHandler SRound(TestScope s) => new(s.Db, s.SaleReturnCalculation, s.ProductUnitService, s.InventoryCostingService, s.UnitOfWork);

        private static async Task<PurchaseScenario> ReceivedPurchase(TestScope scope, int ordered, int received, ulong unitPrice = 1000)
        {
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: ordered, stock: 0, unitPrice: unitPrice);
            await new ReceivePurchaseCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.ProductUnitService, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new ReceivePurchaseCommand
                {
                    PurchaseId = scenario.Purchase.Id,
                    Items = new() { new ReceivePurchaseItemDto { PurchaseItemId = scenario.Item.Id, ReceivedQuantity = received } },
                }, CancellationToken.None);
            return scenario;
        }

        private static async Task<int> CreatePurchaseClaim(TestScope scope, PurchaseScenario scenario, CreateReturnClaimDto claim)
        {
            var res = await new PR.CreatePurchaseReturnCommandHandler(scope.Db, scope.PurchaseReturnRepository, scope.PurchaseReturnCalculation, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new PR.CreatePurchaseReturnCommand { PurchaseId = scenario.Purchase.Id, Claims = new() { claim } }, CancellationToken.None);
            return Assert.Single(Assert.IsType<PurchaseReturnDetailDto>(res.Data).Claims).Id;
        }

        private static async Task<int> CreateSaleClaim(TestScope scope, SaleScenario scenario, CreateReturnClaimDto claim)
        {
            var res = await new SR.CreateSaleReturnCommandHandler(scope.Db, scope.SaleReturnRepository, scope.SaleReturnCalculation, scope.UnitOfWork)
                .Handle(new SR.CreateSaleReturnCommand { SaleId = scenario.Sale.Id, Claims = new() { claim } }, CancellationToken.None);
            return Assert.Single(Assert.IsType<SaleReturnDetailDto>(res.Data).Claims).Id;
        }

        private static CreateReturnClaimDto OnOrder(int lineId, int productId, ulong unitPrice, int quantity) => new()
        {
            Scope = ReturnClaimScopeEnum.ON_ORDER,
            OrderLineId = lineId,
            ProductId = productId,
            UnitPrice = unitPrice,
            Quantity = quantity,
            Problem = ReturnProblemEnum.DEFECTIVE,
        };

        private static CreateReturnClaimDto Excess(int lineId, int productId, ulong unitPrice, int quantity) => new()
        {
            Scope = ReturnClaimScopeEnum.OFF_ORDER,
            OffScopeKind = ReturnOffScopeKindEnum.EXCESS,
            OrderLineId = lineId,
            ProductId = productId,
            UnitPrice = unitPrice,
            Quantity = quantity,
            Problem = ReturnProblemEnum.OVER_SHIPPED,
        };

        private static object? DataValue(ValidationCustomException ex, string property) =>
            ex.Data.GetType().GetProperty(property)!.GetValue(ex.Data);

        private static int LatestEffectId(TestScope scope, ReturnEffectDirectionEnum direction, bool purchase) => purchase
            ? scope.Context.PurchaseReturnEffects.Where(e => e.Direction == direction).OrderByDescending(e => e.Id).First().Id
            : scope.Context.SaleReturnEffects.Where(e => e.Direction == direction).OrderByDescending(e => e.Id).First().Id;

        // ─── balance ──────────────────────────────────────────────────────────────────────────────

        [Fact]
        public async Task Purchase_GoodsOutWithoutMoney_IsRefusedNamingMoneyInAndAmount_ThenAcceptedWithMoreThanThat()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = await ReceivedPurchase(scope, ordered: 10, received: 7);
            var claimId = await CreatePurchaseClaim(scope, scenario, OnOrder(scenario.Item.Id, scenario.Product.Id, 1000, 3));

            var goodsBack = new List<GoodsEffectDto> { new() { Quantity = 3, UnitPrice = 1000 } };
            var ex = await Assert.ThrowsAsync<ValidationCustomException>(() => PAdd(scope).Handle(new PR.AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto { Quantity = 3, GoodsOut = goodsBack },
            }, CancellationToken.None));

            Assert.Contains("moneyIn", ex.Error);
            Assert.Contains("3000", ex.Error);
            Assert.Equal(ReturnEffectDirectionEnum.MONEY_IN, DataValue(ex, "RequiredDirection"));
            Assert.Equal(3000UL, DataValue(ex, "RequiredAmount"));

            using (var verify = db.NewContext())
                Assert.Empty(verify.PurchaseReturnResolutions);

            // A floor: more than required is accepted.
            await PAdd(scope).Handle(new PR.AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto { Quantity = 3, GoodsOut = goodsBack, MoneyIn = new MoneyEffectDto { Method = ReturnPaymentMethodEnum.CASH, Amount = 3500 } },
            }, CancellationToken.None);

            using var verify2 = db.NewContext();
            Assert.Single(verify2.PurchaseReturnResolutions);
        }

        [Fact]
        public async Task Sale_ItemAtTenReturnedAgainstReplacementWorthFour_RequiresAtLeastSixBack()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 1, shippedQuantity: 1, stock: 5, unitPrice: 10);
            var cheaper = Seed.Product(scenario.Product.ProductCategory!, name: "کالای ارزان‌تر");
            scope.Context.Products.Add(cheaper);
            scope.Context.SaveChanges();

            var claimId = await CreateSaleClaim(scope, scenario, OnOrder(scenario.Item.Id, scenario.Product.Id, 10, 1));

            EffectCompositionDto Swap(MoneyEffectDto? moneyOut) => new()
            {
                Quantity = 1,
                GoodsIn = new() { new GoodsEffectDto { Quantity = 1, UnitPrice = 10 } },
                GoodsOut = new() { new GoodsEffectDto { Quantity = 1, ProductId = cheaper.Id, UnitPrice = 4 } },
                MoneyOut = moneyOut,
            };

            var none = await Assert.ThrowsAsync<ValidationCustomException>(() => SAdd(scope).Handle(new SR.AddClaimResolutionCommand { ClaimId = claimId, Composition = Swap(null) }, CancellationToken.None));
            Assert.Contains("moneyOut", none.Error);
            Assert.Equal(ReturnEffectDirectionEnum.MONEY_OUT, DataValue(none, "RequiredDirection"));
            Assert.Equal(6UL, DataValue(none, "RequiredAmount"));

            await Assert.ThrowsAsync<ValidationCustomException>(() => SAdd(scope).Handle(new SR.AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = Swap(new MoneyEffectDto { Method = ReturnPaymentMethodEnum.CASH, Amount = 5 }),
            }, CancellationToken.None));

            await SAdd(scope).Handle(new SR.AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = Swap(new MoneyEffectDto { Method = ReturnPaymentMethodEnum.CASH, Amount = 7 }),
            }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Equal(3, verify.SaleReturnEffects.Count());
        }

        [Fact]
        public async Task Sale_ZeroBalance_AcceptsMoneyInBothDirections()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 1, shippedQuantity: 1, stock: 5, unitPrice: 10);
            var claimId = await CreateSaleClaim(scope, scenario, OnOrder(scenario.Item.Id, scenario.Product.Id, 10, 1));

            await SAdd(scope).Handle(new SR.AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto
                {
                    Quantity = 1,
                    GoodsIn = new() { new GoodsEffectDto { Quantity = 1, UnitPrice = 10 } },
                    GoodsOut = new() { new GoodsEffectDto { Quantity = 1, UnitPrice = 10 } },
                    MoneyIn = new MoneyEffectDto { Method = ReturnPaymentMethodEnum.CASH, Amount = 3 },
                    MoneyOut = new MoneyEffectDto { Method = ReturnPaymentMethodEnum.CASH, Amount = 2 },
                },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Single(verify.SaleReturnResolutions);
        }

        // ─── claim-level rule that stays: EXCESS is priced at its line ────────────────────────────

        [Fact]
        public async Task Purchase_ExcessClaimPricedDifferentlyFromItsLine_IsRefused()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = await ReceivedPurchase(scope, ordered: 5, received: 5);

            var ex = await Assert.ThrowsAsync<ValidationCustomException>(() => CreatePurchaseClaim(scope, scenario, Excess(scenario.Item.Id, scenario.Product.Id, 777, 2)));
            Assert.Contains("1000", ex.Error);

            using (var verify = db.NewContext())
                Assert.Empty(verify.PurchaseReturns);

            await CreatePurchaseClaim(scope, scenario, Excess(scenario.Item.Id, scenario.Product.Id, 1000, 2));
        }

        [Fact]
        public async Task Sale_ExcessClaimPricedDifferentlyFromItsLine_IsRefused()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 10, shippedQuantity: 10, stock: 0, unitPrice: 1500);

            var ex = await Assert.ThrowsAsync<ValidationCustomException>(() => CreateSaleClaim(scope, scenario, Excess(scenario.Item.Id, scenario.Product.Id, 1200, 2)));
            Assert.Contains("1500", ex.Error);
        }

        // ─── mechanics: identical for every claim ─────────────────────────────────────────────────

        [Fact]
        public async Task Purchase_OffOrderGoods_EnterStockAtTheirUnitCost_AndLeaveAtTheAverage()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = await ReceivedPurchase(scope, ordered: 5, received: 5, unitPrice: 1000);
            var claimId = await CreatePurchaseClaim(scope, scenario, Excess(scenario.Item.Id, scenario.Product.Id, 1000, 4));
            var returnId = scope.Context.PurchaseReturns.Single().Id;

            await PAdd(scope).Handle(new PR.AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto
                {
                    Quantity = 2,
                    GoodsIn = new() { new GoodsEffectDto { Quantity = 2, UnitPrice = 900, UnitCost = 900 } },
                    MoneyOut = new MoneyEffectDto { Method = ReturnPaymentMethodEnum.CASH, Amount = 1800 },
                },
            }, CancellationToken.None);
            await PRound(scope).Handle(new PR.ExecuteGoodsRoundCommand
            {
                PurchaseReturnId = returnId,
                Rounds = new() { new GoodsRoundLineDto { EffectId = LatestEffectId(scope, ReturnEffectDirectionEnum.GOODS_IN, purchase: true), Quantity = 2 } },
            }, CancellationToken.None);

            using (var verify = db.NewContext())
            {
                Assert.Equal(7, verify.Products.Single(p => p.Id == scenario.Product.Id).Stock);
                Assert.Equal(7, verify.ProductUnits.Count(u => u.ProductId == scenario.Product.Id && u.Status == ProductUnitStatusEnum.IN_STOCK));
                var received = verify.InventoryCostLedgerEntries.Single(x => x.EventType == InventoryCostEventTypeEnum.PURCHASE_RETURN_REPLACEMENT_RECEIVED);
                Assert.Equal(2, received.QuantityDelta);
                Assert.Equal(900m, received.UnitCost);
                Assert.Equal(-1800m, verify.InventoryCostLedgerEntries.Single(x => x.EventType == InventoryCostEventTypeEnum.PURCHASE_RETURN_MONEY_OUT).RevenueDelta);
                Assert.Equal(0, verify.PurchaseItems.Single(x => x.Id == scenario.Item.Id).SettledQuantity);
            }

            await PAdd(scope).Handle(new PR.AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto { Quantity = 2, GoodsOut = new() { new GoodsEffectDto { Quantity = 2, UnitPrice = 0 } } },
            }, CancellationToken.None);
            await PRound(scope).Handle(new PR.ExecuteGoodsRoundCommand
            {
                PurchaseReturnId = returnId,
                Rounds = new() { new GoodsRoundLineDto { EffectId = LatestEffectId(scope, ReturnEffectDirectionEnum.GOODS_OUT, purchase: true), Quantity = 2 } },
            }, CancellationToken.None);

            using var after = db.NewContext();
            Assert.Equal(5, after.Products.Single(p => p.Id == scenario.Product.Id).Stock);
            Assert.Equal(2, after.ProductUnits.Count(u => u.Status == ProductUnitStatusEnum.RETURNED_TO_SUPPLIER));
            var shipped = after.InventoryCostLedgerEntries.Single(x => x.EventType == InventoryCostEventTypeEnum.PURCHASE_RETURN_SHIPPED_TO_SUPPLIER);
            Assert.Equal(-2, shipped.QuantityDelta);
            Assert.True(Math.Abs(6800m / 7m - shipped.UnitCost) < 0.01m, $"left at {shipped.UnitCost}, expected the running average");
        }

        [Fact]
        public async Task Sale_GoodsIn_EntersThePoolAtItsUnitCostNotItsPrice_AndTheRefundIsNegativeRevenue()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 5, shippedQuantity: 5, stock: 0, unitPrice: 1500);
            var claimId = await CreateSaleClaim(scope, scenario, OnOrder(scenario.Item.Id, scenario.Product.Id, 1500, 2));

            await SAdd(scope).Handle(new SR.AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto
                {
                    Quantity = 2,
                    GoodsIn = new() { new GoodsEffectDto { Quantity = 2, UnitPrice = 1200, UnitCost = 700 } },
                    MoneyOut = new MoneyEffectDto { Method = ReturnPaymentMethodEnum.CASH, Amount = 2400 },
                },
            }, CancellationToken.None);
            await SRound(scope).Handle(new SR.ExecuteGoodsRoundCommand
            {
                SaleReturnId = scope.Context.SaleReturns.Single().Id,
                Rounds = new() { new GoodsRoundLineDto { EffectId = LatestEffectId(scope, ReturnEffectDirectionEnum.GOODS_IN, purchase: false), Quantity = 2 } },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Equal(2, verify.Products.Single(p => p.Id == scenario.Product.Id).Stock);
            Assert.Equal(3, verify.ProductUnits.Count(u => u.SaleItemId == scenario.Item.Id && u.Status == ProductUnitStatusEnum.SOLD));
            var restock = verify.InventoryCostLedgerEntries.Single(x => x.EventType == InventoryCostEventTypeEnum.SALE_RETURN_RESTOCK);
            Assert.Equal(2, restock.QuantityDelta);
            // The balance used the 1,200 price (hence the 2,400 refund); the pool gets the 700 cost.
            Assert.Equal(700m, restock.UnitCost);
            Assert.Equal(-2400m, verify.InventoryCostLedgerEntries.Single(x => x.EventType == InventoryCostEventTypeEnum.SALE_RETURN_REFUND).RevenueDelta);
        }

        [Fact]
        public async Task Sale_GoodsInWithoutUnitCost_EntersThePoolAtTheRunningAverage()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 5, shippedQuantity: 5, stock: 0, unitPrice: 1500);
            await scope.InventoryCostingService.RecordOpeningBalanceAsync(scenario.Product, 10, 800, DateTime.Now.AddDays(-1), CancellationToken.None);
            await scope.UnitOfWork.SaveChangesAsync(CancellationToken.None);
            var claimId = await CreateSaleClaim(scope, scenario, OnOrder(scenario.Item.Id, scenario.Product.Id, 1500, 1));

            await SAdd(scope).Handle(new SR.AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto
                {
                    Quantity = 1,
                    GoodsIn = new() { new GoodsEffectDto { Quantity = 1, UnitPrice = 1500 } },
                    MoneyOut = new MoneyEffectDto { Method = ReturnPaymentMethodEnum.CASH, Amount = 1500 },
                },
            }, CancellationToken.None);
            await SRound(scope).Handle(new SR.ExecuteGoodsRoundCommand
            {
                SaleReturnId = scope.Context.SaleReturns.Single().Id,
                Rounds = new() { new GoodsRoundLineDto { EffectId = LatestEffectId(scope, ReturnEffectDirectionEnum.GOODS_IN, purchase: false), Quantity = 1 } },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Equal(800m, verify.InventoryCostLedgerEntries.Single(x => x.EventType == InventoryCostEventTypeEnum.SALE_RETURN_RESTOCK).UnitCost);
            Assert.Null(verify.SaleReturnEffects.Single(e => e.Direction == ReturnEffectDirectionEnum.GOODS_IN).UnitCost);
        }

        [Fact]
        public async Task Sale_GoodsInWithoutUnitCost_AndNoCostHistory_EntersThePoolAtThePurchasePrice_NotZero()
        {
            // No ledger rows for the product, so the running average is 0. Entering at 0 would book the
            // unit's whole next sale as profit; the fallback is Product.PurchasePrice, as for opening balances.
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 5, shippedQuantity: 5, stock: 0, unitPrice: 1500);
            var claimId = await CreateSaleClaim(scope, scenario, OnOrder(scenario.Item.Id, scenario.Product.Id, 1500, 1));

            await SAdd(scope).Handle(new SR.AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto
                {
                    Quantity = 1,
                    GoodsIn = new() { new GoodsEffectDto { Quantity = 1, UnitPrice = 1500 } },
                    MoneyOut = new MoneyEffectDto { Method = ReturnPaymentMethodEnum.CASH, Amount = 1500 },
                },
            }, CancellationToken.None);
            await SRound(scope).Handle(new SR.ExecuteGoodsRoundCommand
            {
                SaleReturnId = scope.Context.SaleReturns.Single().Id,
                Rounds = new() { new GoodsRoundLineDto { EffectId = LatestEffectId(scope, ReturnEffectDirectionEnum.GOODS_IN, purchase: false), Quantity = 1 } },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Empty(verify.InventoryCostLedgerEntries.Where(x => x.EventType != InventoryCostEventTypeEnum.SALE_RETURN_RESTOCK && x.QuantityDelta != 0));
            var purchasePrice = verify.Products.Single(p => p.Id == scenario.Product.Id).PurchasePrice;
            Assert.True(purchasePrice > 0);
            Assert.Equal((decimal)purchasePrice, verify.InventoryCostLedgerEntries.Single(x => x.EventType == InventoryCostEventTypeEnum.SALE_RETURN_RESTOCK).UnitCost);
        }

        [Fact]
        public async Task PurchaseReturnMoney_IsPurchaseSpendInThePurchaseReport_AndAbsentFromTheSaleReport()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = await ReceivedPurchase(scope, ordered: 10, received: 7);
            var claimId = await CreatePurchaseClaim(scope, scenario, OnOrder(scenario.Item.Id, scenario.Product.Id, 1000, 3));

            // Goods back to the supplier for our money back.
            await PAdd(scope).Handle(new PR.AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto
                {
                    Quantity = 2,
                    GoodsOut = new() { new GoodsEffectDto { Quantity = 2, UnitPrice = 1000, UnitCost = 1000 } },
                    MoneyIn = new MoneyEffectDto { Method = ReturnPaymentMethodEnum.CASH, Amount = 2000 },
                },
            }, CancellationToken.None);

            var purchaseRes = await new GetPurchaseReportQueryHandler(scope.Db).Handle(new GetPurchaseReportQuery(), CancellationToken.None);
            var purchasePeriods = (List<PurchaseReportPeriodDto>)purchaseRes.Data!.GetType().GetProperty("Periods")!.GetValue(purchaseRes.Data)!;
            Assert.Equal(-2000m, purchasePeriods.Sum(p => p.ReturnMoneyAmount));
            Assert.Equal(7000m, purchasePeriods.Sum(p => p.TotalReceivedValue));

            var saleRes = await new GetSaleReportQueryHandler(scope.Db).Handle(new GetSaleReportQuery(), CancellationToken.None);
            var salePeriods = (List<SaleReportPeriodDto>)saleRes.Data!.GetType().GetProperty("Periods")!.GetValue(saleRes.Data)!;
            Assert.Equal(0m, salePeriods.Sum(p => p.Revenue));
            Assert.Equal(0m, salePeriods.Sum(p => p.NetProfit));
        }

        [Fact]
        public async Task Sale_MoneyIn_IsRevenue_AndRemovingTheResolutionReversesIt()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 2, shippedQuantity: 2, stock: 5, unitPrice: 1500);
            var claimId = await CreateSaleClaim(scope, scenario, OnOrder(scenario.Item.Id, scenario.Product.Id, 1500, 2));

            await SAdd(scope).Handle(new SR.AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto { Quantity = 1, MoneyIn = new MoneyEffectDto { Method = ReturnPaymentMethodEnum.CASH, Amount = 400 } },
            }, CancellationToken.None);

            using (var verify = db.NewContext())
                Assert.Equal(400m, verify.InventoryCostLedgerEntries.Single(x => x.EventType == InventoryCostEventTypeEnum.SALE_RETURN_MONEY_IN).RevenueDelta);

            await SRemove(scope).Handle(new SR.RemoveClaimResolutionCommand { Id = scope.Context.SaleReturnResolutions.Single().Id }, CancellationToken.None);

            using var after = db.NewContext();
            var rows = after.InventoryCostLedgerEntries.Where(x => x.EventType == InventoryCostEventTypeEnum.SALE_RETURN_MONEY_IN).ToList();
            Assert.Equal(2, rows.Count);
            Assert.Equal(0m, rows.Sum(r => r.RevenueDelta));
        }

        [Fact]
        public async Task Purchase_MoneyIn_IsRevenue_AndRemovingTheResolutionReversesIt()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = await ReceivedPurchase(scope, ordered: 10, received: 7);
            var claimId = await CreatePurchaseClaim(scope, scenario, OnOrder(scenario.Item.Id, scenario.Product.Id, 1000, 3));

            await PAdd(scope).Handle(new PR.AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto { Quantity = 1, MoneyIn = new MoneyEffectDto { Method = ReturnPaymentMethodEnum.CASH, Amount = 500 } },
            }, CancellationToken.None);

            using (var verify = db.NewContext())
            {
                var row = verify.InventoryCostLedgerEntries.Single(x => x.EventType == InventoryCostEventTypeEnum.PURCHASE_RETURN_MONEY_IN);
                Assert.Equal(500m, row.RevenueDelta);
                Assert.Equal(0, row.QuantityDelta);
                Assert.Equal(0m, row.InventoryValueDelta);
            }

            await PRemove(scope).Handle(new PR.RemoveClaimResolutionCommand { Id = scope.Context.PurchaseReturnResolutions.Single().Id }, CancellationToken.None);

            using var after = db.NewContext();
            var rows = after.InventoryCostLedgerEntries.Where(x => x.EventType == InventoryCostEventTypeEnum.PURCHASE_RETURN_MONEY_IN).ToList();
            Assert.Equal(2, rows.Count);
            Assert.Equal(0m, rows.Sum(r => r.RevenueDelta));
        }
    }
}
