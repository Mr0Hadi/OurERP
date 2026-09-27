using Application.Common.Dtos.Returns;
using Application.Features.Purchase.Commands;
using Application.Features.Purchase.Dtos;
using Application.Features.PurchaseReturn.Dtos;
using Application.Features.PurchaseReturn.Queries;
using Application.Features.Report.Dtos;
using Application.Features.Report.Queries;
using Application.Features.Sale.Commands;
using Application.Features.Sale.Dtos;
using Application.Features.SaleReturn.Dtos;
using Domain.Enums;
using WMS.Tests.Support;
using PR = Application.Features.PurchaseReturn.Commands;
using SR = Application.Features.SaleReturn.Commands;
using SRQ = Application.Features.SaleReturn.Queries;

namespace WMS.Tests.Integration
{
    /// <summary>
    /// frontend-requests.fa.md section 3 item 10: defective goods a customer brings back are held in quarantine (custody
    /// CUSTOMER_RETURN) instead of being scrapped on arrival, and each way out - back to the supplier, scrap - moves exactly the value
    /// they came back with. The sale report reverses cost of goods sold when goods come back, so no unit is costed twice.
    ///
    /// Every test runs one unit through the whole chain: bought at 700 on a purchase line, sold at 1,000, brought back.
    /// </summary>
    public class CustomerReturnQuarantineTests
    {
        private const ulong Cost = 700;
        private const ulong Price = 1000;

        private sealed record Chain(PurchaseScenario Purchase, Domain.Entities.Sale Sale, Domain.Entities.SaleItem SaleItem);

        /// <summary>Bought <paramref name="quantity"/> at 700, sold one at 1,000 and shipped it.</summary>
        private static async Task<Chain> BoughtAndSold(TestScope scope, int quantity = 1)
        {
            var purchase = Seed.PendingPurchase(scope.Context, orderedQuantity: quantity, stock: 0, unitPrice: Cost);
            await new ReceivePurchaseCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.ProductUnitService, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new ReceivePurchaseCommand
                {
                    PurchaseId = purchase.Purchase.Id,
                    Items = new() { new ReceivePurchaseItemDto { PurchaseItemId = purchase.Item.Id, ArrivedQuantity = quantity } },
                }, CancellationToken.None);

            var saleItem = Seed.SaleItem(purchase.Product, 1, Price);
            var sale = Seed.Sale(Seed.Customer(), SalesStatusEnum.PROCESSING, saleItem);
            scope.Context.Sales.Add(sale);
            scope.Context.SaveChanges();
            await Ship(scope, sale, saleItem);

            return new Chain(purchase, sale, saleItem);
        }

        private static Task Ship(TestScope scope, Domain.Entities.Sale sale, Domain.Entities.SaleItem item) =>
            new ShipSaleCommandHandler(scope.Db, scope.ProductUnitService, scope.InventoryCostingService, scope.UnitOfWork)
                .Handle(new ShipSaleCommand { SaleId = sale.Id, Items = new() { new ShipSaleItemDto { SaleItemId = item.Id, ShippedQuantity = 1 } } }, CancellationToken.None);

        /// <summary>The customer brings the unit back for a refund; the warehouse finds it <paramref name="defective"/> or not.</summary>
        private static async Task<int> CustomerReturns(TestScope scope, Chain chain, bool defective)
        {
            await new SR.CreateSaleReturnCommandHandler(scope.Db, scope.SaleReturnRepository, scope.SaleReturnCalculation, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new SR.CreateSaleReturnCommand
                {
                    SaleId = chain.Sale.Id,
                    Claims = new()
                    {
                        new CreateReturnClaimDto
                        {
                            Scope = ReturnClaimScopeEnum.ON_ORDER,
                            OrderLineId = chain.SaleItem.Id,
                            ProductId = chain.Purchase.Product.Id,
                            UnitPrice = Price,
                            Quantity = 1,
                            Problem = ReturnProblemEnum.DEFECTIVE,
                        },
                    },
                }, CancellationToken.None);
            var saleReturn = scope.Context.SaleReturns.OrderByDescending(r => r.Id).First();
            var claimId = scope.Context.SaleReturnClaims.Single(c => c.SaleReturnId == saleReturn.Id).Id;

            await new SR.AddClaimResolutionCommandHandler(scope.Db, scope.SaleReturnCalculation, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new SR.AddClaimResolutionCommand
                {
                    ClaimId = claimId,
                    Composition = new EffectCompositionDto
                    {
                        Quantity = 1,
                        GoodsIn = new() { new GoodsEffectDto { Quantity = 1, UnitPrice = Price, UnitCost = Cost } },
                        MoneyOut = new MoneyEffectDto { Method = ReturnPaymentMethodEnum.CASH, Amount = Price, PaidAt = DateTime.Now },
                    },
                }, CancellationToken.None);

            var effectId = scope.Context.SaleReturnEffects.Where(e => e.Direction == ReturnEffectDirectionEnum.GOODS_IN).OrderByDescending(e => e.Id).First().Id;
            await new SR.ExecuteGoodsRoundCommandHandler(scope.Db, scope.SaleReturnCalculation, scope.ProductUnitService, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new SR.ExecuteGoodsRoundCommand
                {
                    SaleReturnId = saleReturn.Id,
                    Rounds = new()
                    {
                        new GoodsRoundLineDto
                        {
                            EffectId = effectId,
                            Quantity = 1,
                            Observations = defective ? new() { new GoodsRoundObservationDto { Problem = ReturnProblemEnum.DEFECTIVE, Quantity = 1 } } : null,
                        },
                    },
                }, CancellationToken.None);

            return saleReturn.Id;
        }

        /// <summary>A purchase return on the unit's own line, deciding <paramref name="composition"/>, then executing its goods effect.</summary>
        private static async Task SupplierReturn(TestScope scope, Chain chain, EffectCompositionDto composition, ReturnEffectDirectionEnum goods, ProductUnitStatusEnum? source)
        {
            await new PR.CreatePurchaseReturnCommandHandler(scope.Db, scope.PurchaseReturnRepository, scope.PurchaseReturnCalculation, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new PR.CreatePurchaseReturnCommand
                {
                    PurchaseId = chain.Purchase.Purchase.Id,
                    Claims = new()
                    {
                        new CreateReturnClaimDto
                        {
                            Scope = ReturnClaimScopeEnum.ON_ORDER,
                            OrderLineId = chain.Purchase.Item.Id,
                            ProductId = chain.Purchase.Product.Id,
                            UnitPrice = Cost,
                            Quantity = 1,
                            Problem = ReturnProblemEnum.DEFECTIVE,
                        },
                    },
                }, CancellationToken.None);
            var claimId = scope.Context.PurchaseReturnClaims.Single().Id;

            await new PR.AddClaimResolutionCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new PR.AddClaimResolutionCommand { ClaimId = claimId, Composition = composition }, CancellationToken.None);

            await new PR.ExecuteGoodsRoundCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.ProductUnitService, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new PR.ExecuteGoodsRoundCommand
                {
                    PurchaseReturnId = scope.Context.PurchaseReturns.Single().Id,
                    Rounds = new()
                    {
                        new GoodsRoundLineDto
                        {
                            EffectId = scope.Context.PurchaseReturnEffects.Single(e => e.Direction == goods).Id,
                            Quantity = 1,
                            Source = source,
                        },
                    },
                }, CancellationToken.None);
        }

        private static async Task<SaleReportPeriodDto> SaleReportTotal(TestScope scope)
        {
            var res = await new GetSaleReportQueryHandler(scope.Db).Handle(new GetSaleReportQuery
            {
                FromDate = DateTime.Now.AddDays(-1),
                ToDate = DateTime.Now.AddDays(1),
                PeriodType = ReportPeriodTypeEnum.Annual,
            }, CancellationToken.None);
            var periods = (List<SaleReportPeriodDto>)res.Data!.GetType().GetProperty("Periods")!.GetValue(res.Data)!;
            return new SaleReportPeriodDto
            {
                Revenue = periods.Sum(p => p.Revenue),
                CostOfGoodsSold = periods.Sum(p => p.CostOfGoodsSold),
                ScrapLoss = periods.Sum(p => p.ScrapLoss),
                NetProfit = periods.Sum(p => p.NetProfit),
            };
        }

        [Fact]
        public async Task DefectiveCustomerReturn_IsHeldInQuarantine_OnItsPurchaseLine_AtItsCost()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var chain = await BoughtAndSold(scope);

            var saleReturnId = await CustomerReturns(scope, chain, defective: true);

            using var verify = db.NewContext();
            var unit = verify.ProductUnits.Single(u => u.ProductId == chain.Purchase.Product.Id);
            Assert.Equal(ProductUnitStatusEnum.QUARANTINED, unit.Status);
            Assert.Equal(UnitCustodyReasonEnum.CUSTOMER_RETURN, unit.CustodyReason);
            Assert.Equal(Cost, unit.QuarantineCost);
            Assert.Equal(chain.Purchase.Item.Id, unit.PurchaseItemId); // so a purchase return on that line can take it back
            Assert.Equal(0, verify.Products.Single(p => p.Id == chain.Purchase.Product.Id).Stock); // not sellable
            Assert.Equal(700m, verify.InventoryCostLedgerEntries.Single(e => e.EventType == InventoryCostEventTypeEnum.SALE_RETURN_QUARANTINED).OffPoolValueDelta);

            // Refunded and back: no revenue, no cost of goods sold, nothing lost yet.
            var report = await SaleReportTotal(scope);
            Assert.Equal((0m, 0m, 0m, 0m), (report.Revenue, report.CostOfGoodsSold, report.ScrapLoss, report.NetProfit));

            // Visible on both documents.
            var detail = await new SRQ.GetSaleReturnDetailQueryHandler(scope.Db, scope.SaleReturnCalculation, FakeObjectStorage.Instance)
                .Handle(new SRQ.GetSaleReturnDetailQuery { Id = saleReturnId }, CancellationToken.None);
            Assert.Equal(1, Assert.IsType<SaleReturnDetailDto>(detail.Data).QuarantinedQuantity);
            var receiving = await new GetPurchaseReceivingInfoQueryHandler(scope.Db, FakeObjectStorage.Instance, scope.PurchaseReturnCalculation)
                .Handle(new GetPurchaseReceivingInfoQuery { PurchaseId = chain.Purchase.Purchase.Id }, CancellationToken.None);
            Assert.Equal(1, Assert.IsType<PurchaseReceivingInfoDto>(receiving.Data).Items.Single().QuarantinedCustomerReturnQuantity);
        }

        [Fact]
        public async Task QuarantinedCustomerReturn_GoesBackToTheSupplier_AndTheQuarantineBalanceClosesAtZero()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var chain = await BoughtAndSold(scope);
            await CustomerReturns(scope, chain, defective: true);

            await SupplierReturn(scope, chain, new EffectCompositionDto
            {
                Quantity = 1,
                GoodsOut = new() { new GoodsEffectDto { Quantity = 1, UnitPrice = Cost } },
                MoneyIn = new MoneyEffectDto { Method = ReturnPaymentMethodEnum.TRANSFER, Amount = Cost, PaidAt = DateTime.Now },
            }, ReturnEffectDirectionEnum.GOODS_OUT, ProductUnitStatusEnum.QUARANTINED);

            using var verify = db.NewContext();
            Assert.Equal(ProductUnitStatusEnum.RETURNED_TO_SUPPLIER, verify.ProductUnits.Single(u => u.ProductId == chain.Purchase.Product.Id).Status);
            Assert.Equal(0m, verify.InventoryCostLedgerEntries.Where(e => e.ProductId == chain.Purchase.Product.Id).Sum(e => e.OffPoolValueDelta));
            var report = await SaleReportTotal(scope);
            Assert.Equal((0m, 0m, 0m), (report.CostOfGoodsSold, report.ScrapLoss, report.NetProfit));
        }

        [Fact]
        public async Task QuarantinedCustomerReturn_Scrapped_IsOneLossOfItsCost_NotTwo()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var chain = await BoughtAndSold(scope);
            await CustomerReturns(scope, chain, defective: true);

            await SupplierReturn(scope, chain, new EffectCompositionDto
            {
                Quantity = 1,
                GoodsScrap = new() { new QuarantineEffectDto { Quantity = 1 } },
            }, ReturnEffectDirectionEnum.GOODS_SCRAP, null);

            using var verify = db.NewContext();
            Assert.Equal(ProductUnitStatusEnum.SCRAPPED, verify.ProductUnits.Single(u => u.ProductId == chain.Purchase.Product.Id).Status);
            var report = await SaleReportTotal(scope);
            // Before the report reversed cost of goods sold, this was cost 700 AND scrap 700: -1,400 for one unit.
            Assert.Equal((0m, 0m, 700m, -700m), (report.Revenue, report.CostOfGoodsSold, report.ScrapLoss, report.NetProfit));
        }

        [Fact]
        public async Task HealthyCustomerReturn_ResoldOnce_IsCostedOnce()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var chain = await BoughtAndSold(scope);
            await CustomerReturns(scope, chain, defective: false);

            var resaleItem = Seed.SaleItem(chain.Purchase.Product, 1, Price);
            var resale = Seed.Sale(Seed.Customer("مریم", "احمدی"), SalesStatusEnum.PROCESSING, resaleItem);
            scope.Context.Sales.Add(resale);
            scope.Context.SaveChanges();
            await Ship(scope, resale, resaleItem);

            // One unit sold for good, bought at 700 and sold at 1,000. It used to be costed twice: 1,400 and a loss of 400.
            var report = await SaleReportTotal(scope);
            Assert.Equal((1000m, 700m, 300m), (report.Revenue, report.CostOfGoodsSold, report.NetProfit));
        }

        [Fact]
        public async Task DefectiveOffOrderReturn_IsMintedIntoQuarantine_InsteadOfVanishing()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 1, shippedQuantity: 1, stock: 0);
            var other = Seed.Product(Seed.Category("دیگر"), "کالای خارج از فاکتور");
            scope.Context.Products.Add(other);
            scope.Context.SaveChanges();

            await new SR.CreateSaleReturnCommandHandler(scope.Db, scope.SaleReturnRepository, scope.SaleReturnCalculation, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new SR.CreateSaleReturnCommand
                {
                    SaleId = scenario.Sale.Id,
                    Claims = new()
                    {
                        new CreateReturnClaimDto
                        {
                            Scope = ReturnClaimScopeEnum.OFF_ORDER,
                            OffScopeKind = ReturnOffScopeKindEnum.UNLISTED,
                            ProductId = other.Id,
                            UnitPrice = 500,
                            Quantity = 2,
                            Problem = ReturnProblemEnum.UNLISTED_ITEM,
                        },
                    },
                }, CancellationToken.None);
            var saleReturnId = scope.Context.SaleReturns.Single().Id;

            await new SR.AddClaimResolutionCommandHandler(scope.Db, scope.SaleReturnCalculation, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new SR.AddClaimResolutionCommand
                {
                    ClaimId = scope.Context.SaleReturnClaims.Single().Id,
                    Composition = new EffectCompositionDto { Quantity = 2, GoodsIn = new() { new GoodsEffectDto { Quantity = 2, UnitCost = 300 } } },
                }, CancellationToken.None);

            await new SR.ExecuteGoodsRoundCommandHandler(scope.Db, scope.SaleReturnCalculation, scope.ProductUnitService, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new SR.ExecuteGoodsRoundCommand
                {
                    SaleReturnId = saleReturnId,
                    Rounds = new()
                    {
                        new GoodsRoundLineDto
                        {
                            EffectId = scope.Context.SaleReturnEffects.Single().Id,
                            Quantity = 2,
                            Observations = new() { new GoodsRoundObservationDto { Problem = ReturnProblemEnum.DAMAGED_IN_TRANSIT, Quantity = 1 } },
                        },
                    },
                }, CancellationToken.None);

            using var verify = db.NewContext();
            var units = verify.ProductUnits.Where(u => u.ProductId == other.Id).ToList();
            Assert.Equal(2, units.Count);
            Assert.Single(units, u => u.Status == ProductUnitStatusEnum.IN_STOCK);
            var held = Assert.Single(units, u => u.Status == ProductUnitStatusEnum.QUARANTINED);
            Assert.Equal((UnitCustodyReasonEnum?)UnitCustodyReasonEnum.CUSTOMER_RETURN, held.CustodyReason);
            Assert.Equal(300m, held.QuarantineCost);
            Assert.Equal(1, verify.Products.Single(p => p.Id == other.Id).Stock);

            // No purchase line to return it on - it still has a way out: a manual scrap, at the value it came back with.
            await new Application.Features.Product.Commands.ApplyProductUnitActionCommandHandler(scope.Db, scope.ProductUnitService, scope.InventoryCostingService, scope.PurchaseReturnCalculation, scope.UnitOfWork)
                .Handle(new Application.Features.Product.Commands.ApplyProductUnitActionCommand
                {
                    Action = ProductUnitActionEnum.SCRAP,
                    Reason = UnitActionReasonEnum.DEFECT_FOUND,
                    Note = "قابل تعمیر نیست",
                    ProductUnitIds = new() { held.Id },
                }, CancellationToken.None);

            using var after = db.NewContext();
            Assert.Equal(ProductUnitStatusEnum.SCRAPPED, after.ProductUnits.Single(u => u.Id == held.Id).Status);
            Assert.Equal(0m, after.InventoryCostLedgerEntries.Where(e => e.ProductId == other.Id).Sum(e => e.OffPoolValueDelta));
            Assert.Equal(300m, (await SaleReportTotal(scope)).ScrapLoss);
        }
    }
}
