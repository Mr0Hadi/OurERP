using Application.Common.Dtos.Returns;
using Application.Features.Purchase.Commands;
using Application.Features.Purchase.Dtos;
using Application.Features.Report.Dtos;
using Application.Features.Report.Queries;
using Common.Exceptions;
using Domain.Enums;
using WMS.Tests.Support;
using PR = Application.Features.PurchaseReturn.Commands;
using SR = Application.Features.SaleReturn.Commands;

namespace WMS.Tests.Integration
{
    /// <summary>
    /// Goods leaving quarantine - returned from a stated source, released into stock, or scrapped - each at the value the unit
    /// entered quarantine with (ProductUnit.QuarantineCost), never a cost sent on the decision; the off-pool balance; scrap as a reported loss; explicit write-off. The first test is the design's combined
    /// scenario (25 arrived, 20 ordered, 10 defective) reconciled unit by unit and rial by rial.
    /// </summary>
    public class QuarantineExitTests
    {
        private static PR.AddClaimResolutionCommandHandler Add(TestScope s) => new(s.Db, s.PurchaseReturnCalculation, s.InventoryCostingService, FakeObjectStorage.Instance, s.UnitOfWork);
        private static PR.ExecuteGoodsRoundCommandHandler Round(TestScope s) => new(s.Db, s.PurchaseReturnCalculation, s.ProductUnitService, s.InventoryCostingService, FakeObjectStorage.Instance, s.UnitOfWork);

        private static async Task<PurchaseScenario> Received(TestScope scope, int ordered, int arrived, int defective, int discountPercent = 0)
        {
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: ordered, stock: 0, unitPrice: 1000);
            if (discountPercent > 0)
            {
                scenario.Item.Discount = discountPercent;
                scope.Context.SaveChanges();
            }
            await new ReceivePurchaseCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.ProductUnitService, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new ReceivePurchaseCommand
                {
                    PurchaseId = scenario.Purchase.Id,
                    Items = new()
                    {
                        new ReceivePurchaseItemDto
                        {
                            PurchaseItemId = scenario.Item.Id,
                            ArrivedQuantity = arrived,
                            Defects = defective > 0 ? new() { new ReceivingDefectDto { Problem = ReturnProblemEnum.DEFECTIVE, Quantity = defective } } : new(),
                        },
                    },
                }, CancellationToken.None);
            return scenario;
        }

        private static async Task<List<int>> CreateReturn(TestScope scope, PurchaseScenario scenario, params CreateReturnClaimDto[] claims)
        {
            await new PR.CreatePurchaseReturnCommandHandler(scope.Db, scope.PurchaseReturnRepository, scope.PurchaseReturnCalculation, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new PR.CreatePurchaseReturnCommand { PurchaseId = scenario.Purchase.Id, Claims = claims.ToList() }, CancellationToken.None);
            return scope.Context.PurchaseReturnClaims.OrderBy(c => c.Id).Select(c => c.Id).ToList();
        }

        private static CreateReturnClaimDto OnOrder(PurchaseScenario s, int quantity) => new()
        {
            Scope = ReturnClaimScopeEnum.ON_ORDER, OrderLineId = s.Item.Id, ProductId = s.Product.Id, UnitPrice = s.Item.UnitPrice, Quantity = quantity, Problem = ReturnProblemEnum.DEFECTIVE,
        };

        private static CreateReturnClaimDto Excess(PurchaseScenario s, int quantity) => new()
        {
            Scope = ReturnClaimScopeEnum.OFF_ORDER, OffScopeKind = ReturnOffScopeKindEnum.EXCESS, OrderLineId = s.Item.Id, ProductId = s.Product.Id, UnitPrice = s.Item.UnitPrice, Quantity = quantity, Problem = ReturnProblemEnum.OVER_SHIPPED,
        };

        private static int EffectId(TestScope scope, int resolutionIndex, ReturnEffectDirectionEnum direction)
        {
            var resolutionId = scope.Context.PurchaseReturnResolutions.OrderBy(r => r.Id).Skip(resolutionIndex).First().Id;
            return scope.Context.PurchaseReturnEffects.Single(e => e.PurchaseReturnResolutionId == resolutionId && e.Direction == direction).Id;
        }

        private static List<T> Periods<T>(object data) => (List<T>)data.GetType().GetProperty("Periods")!.GetValue(data)!;

        [Fact]
        public async Task CombinedScenario_TwentyFiveTwentyTen_ReconcilesEveryUnitAndRial()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var s = await Received(scope, ordered: 20, arrived: 25, defective: 10); // 15 stock, 5 defective on order, 5 excess
            var net = (ulong)(1000m * (100 - s.Item.Discount) / 100);
            var claims = await CreateReturn(scope, s, OnOrder(s, 5), Excess(s, 5));
            var returnId = scope.Context.PurchaseReturns.Single().Id;

            // Supplier's deal: take 7 back; refund 3 later, replace 2; say nothing about 3 of the excess (we scrap them).
            await Add(scope).Handle(new PR.AddClaimResolutionCommand { ClaimId = claims[0], Composition = new EffectCompositionDto
            {
                Quantity = 3,
                GoodsOut = new() { new GoodsEffectDto { Quantity = 3, UnitPrice = 1000, UnitCost = net } },
                MoneyIn = new MoneyEffectDto { Method = ReturnPaymentMethodEnum.TRANSFER, Amount = 3000 }, // pending
            } }, CancellationToken.None);
            await Add(scope).Handle(new PR.AddClaimResolutionCommand { ClaimId = claims[0], Composition = new EffectCompositionDto
            {
                Quantity = 2,
                GoodsOut = new() { new GoodsEffectDto { Quantity = 2, UnitPrice = 1000, UnitCost = net } },
                GoodsIn = new() { new GoodsEffectDto { Quantity = 2, UnitPrice = 1000, UnitCost = net } },
            } }, CancellationToken.None);
            await Add(scope).Handle(new PR.AddClaimResolutionCommand { ClaimId = claims[1], Composition = new EffectCompositionDto
            {
                Quantity = 2,
                GoodsOut = new() { new GoodsEffectDto { Quantity = 2, UnitPrice = 0, UnitCost = 0 } },
            } }, CancellationToken.None);
            await Add(scope).Handle(new PR.AddClaimResolutionCommand { ClaimId = claims[1], Composition = new EffectCompositionDto
            {
                Quantity = 3,
                GoodsScrap = new() { new QuarantineEffectDto { Quantity = 3, UnitCost = 0 } },
            } }, CancellationToken.None);

            await Round(scope).Handle(new PR.ExecuteGoodsRoundCommand
            {
                PurchaseReturnId = returnId,
                Rounds = new()
                {
                    new GoodsRoundLineDto { EffectId = EffectId(scope, 0, ReturnEffectDirectionEnum.GOODS_OUT), Quantity = 3, Source = ProductUnitStatusEnum.QUARANTINED },
                    new GoodsRoundLineDto { EffectId = EffectId(scope, 1, ReturnEffectDirectionEnum.GOODS_OUT), Quantity = 2, Source = ProductUnitStatusEnum.QUARANTINED },
                    new GoodsRoundLineDto { EffectId = EffectId(scope, 2, ReturnEffectDirectionEnum.GOODS_OUT), Quantity = 2, Source = ProductUnitStatusEnum.QUARANTINED },
                    new GoodsRoundLineDto { EffectId = EffectId(scope, 3, ReturnEffectDirectionEnum.GOODS_SCRAP), Quantity = 3 },
                    new GoodsRoundLineDto { EffectId = EffectId(scope, 1, ReturnEffectDirectionEnum.GOODS_IN), Quantity = 2 },
                },
            }, CancellationToken.None);

            using (var mid = db.NewContext())
                Assert.Equal(ReturnStatusEnum.IN_PROGRESS, mid.PurchaseReturns.Single().Status); // the refund has not arrived

            await new PR.ExecuteMoneyEffectCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new PR.ExecuteMoneyEffectCommand { EffectId = EffectId(scope, 0, ReturnEffectDirectionEnum.MONEY_IN) }, CancellationToken.None);

            using var verify = db.NewContext();
            var units = verify.ProductUnits.Where(u => u.ProductId == s.Product.Id).ToList();

            // Units: 25 arrived + 2 replacements = 27 = 17 sellable + 7 returned + 3 scrapped.
            Assert.Equal(27, units.Count);
            Assert.Equal(17, units.Count(u => u.Status == ProductUnitStatusEnum.IN_STOCK));
            Assert.Equal(7, units.Count(u => u.Status == ProductUnitStatusEnum.RETURNED_TO_SUPPLIER));
            Assert.Equal(3, units.Count(u => u.Status == ProductUnitStatusEnum.SCRAPPED));
            Assert.Equal(0, units.Count(u => u.Status == ProductUnitStatusEnum.QUARANTINED));
            Assert.Equal(17, verify.Products.Single(p => p.Id == s.Product.Id).Stock);

            // Rials: the pool holds 17 units at the line price; nothing is left off-pool.
            var ledger = verify.InventoryCostLedgerEntries.Where(x => x.ProductId == s.Product.Id).OrderBy(x => x.Id).ToList();
            Assert.Equal(17, ledger.Last().RunningQuantity);
            Assert.Equal(17m * net, ledger.Last().RunningInventoryValue);
            Assert.Equal(0m, ledger.Sum(x => x.OffPoolValueDelta));

            // Purchase spend: 20 bought, 3 refunded -> 17 net, the same 17 units that sit in stock.
            var purchaseReport = Periods<PurchaseReportPeriodDto>((await new GetPurchaseReportQueryHandler(scope.Db).Handle(new GetPurchaseReportQuery(), CancellationToken.None)).Data!);
            Assert.Equal(20m * net, purchaseReport.Sum(p => p.TotalReceivedValue));
            Assert.Equal(-3000m, purchaseReport.Sum(p => p.ReturnMoneyAmount));

            // Scrapping unpaid excess at an explicit zero is no loss.
            var saleReport = Periods<SaleReportPeriodDto>((await new GetSaleReportQueryHandler(scope.Db).Handle(new GetSaleReportQuery(), CancellationToken.None)).Data!);
            Assert.Equal(0m, saleReport.Sum(p => p.ScrapLoss));

            Assert.Equal(ReturnStatusEnum.SETTLED, verify.PurchaseReturns.Single().Status);
            Assert.Equal(5, verify.PurchaseItems.Single(x => x.Id == s.Item.Id).SettledQuantity);
        }

        [Fact]
        public async Task Release_DefectiveOnOrderAtLinePrice_EntersPoolAndLeavesOffPool()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var s = await Received(scope, ordered: 10, arrived: 10, defective: 2); // 8 stock, 2 defective on order
            var net = (ulong)(1000m * (100 - s.Item.Discount) / 100);
            var claims = await CreateReturn(scope, s, OnOrder(s, 2));

            // Kept as-is: released into stock at what we paid for them.
            await Add(scope).Handle(new PR.AddClaimResolutionCommand { ClaimId = claims[0], Composition = new EffectCompositionDto
            {
                Quantity = 2,
                GoodsRelease = new() { new QuarantineEffectDto { Quantity = 2, UnitCost = net } },
            } }, CancellationToken.None);

            await Round(scope).Handle(new PR.ExecuteGoodsRoundCommand
            {
                PurchaseReturnId = scope.Context.PurchaseReturns.Single().Id,
                Rounds = new() { new GoodsRoundLineDto { EffectId = EffectId(scope, 0, ReturnEffectDirectionEnum.GOODS_RELEASE), Quantity = 2 } },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Equal(10, verify.Products.Single(p => p.Id == s.Product.Id).Stock);
            Assert.Equal(10, verify.ProductUnits.Count(u => u.Status == ProductUnitStatusEnum.IN_STOCK));
            var ledger = verify.InventoryCostLedgerEntries.OrderBy(x => x.Id).ToList();
            Assert.Equal(10m * net, ledger.Last().RunningInventoryValue);
            Assert.Equal(0m, ledger.Sum(x => x.OffPoolValueDelta));
            Assert.Equal(ReturnEffectDirectionEnum.GOODS_RELEASE, verify.PurchaseReturnEffects.Single().Direction);
            Assert.Null(verify.PurchaseReturnEffects.Single().UnitPrice); // an internal movement has no transaction value
        }

        [Fact]
        public async Task Release_ExcessAtExplicitZero_AddsUnitsButNoValue()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var s = await Received(scope, ordered: 5, arrived: 7, defective: 0); // 5 stock, 2 healthy excess
            var claims = await CreateReturn(scope, s, Excess(s, 2));

            await Add(scope).Handle(new PR.AddClaimResolutionCommand { ClaimId = claims[0], Composition = new EffectCompositionDto
            {
                Quantity = 2,
                GoodsRelease = new() { new QuarantineEffectDto { Quantity = 2, UnitCost = 0 } },
            } }, CancellationToken.None);
            await Round(scope).Handle(new PR.ExecuteGoodsRoundCommand
            {
                PurchaseReturnId = scope.Context.PurchaseReturns.Single().Id,
                Rounds = new() { new GoodsRoundLineDto { EffectId = EffectId(scope, 0, ReturnEffectDirectionEnum.GOODS_RELEASE), Quantity = 2, Source = ProductUnitStatusEnum.QUARANTINED } },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var last = verify.InventoryCostLedgerEntries.OrderBy(x => x.Id).Last();
            var net = 1000m * (100 - s.Item.Discount) / 100;
            Assert.Equal(7, last.RunningQuantity);
            Assert.Equal(5 * net, last.RunningInventoryValue); // zero stays zero: the average drops, the value does not grow
        }

        [Fact]
        public async Task GoodsOut_WithoutStatedSource_IsRefused()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var s = await Received(scope, ordered: 10, arrived: 10, defective: 2);
            var claims = await CreateReturn(scope, s, OnOrder(s, 2));

            await Add(scope).Handle(new PR.AddClaimResolutionCommand { ClaimId = claims[0], Composition = new EffectCompositionDto
            {
                Quantity = 2,
                GoodsOut = new() { new GoodsEffectDto { Quantity = 2, UnitPrice = 0 } },
            } }, CancellationToken.None);

            await Assert.ThrowsAsync<ValidationCustomException>(() => Round(scope).Handle(new PR.ExecuteGoodsRoundCommand
            {
                PurchaseReturnId = scope.Context.PurchaseReturns.Single().Id,
                Rounds = new() { new GoodsRoundLineDto { EffectId = EffectId(scope, 0, ReturnEffectDirectionEnum.GOODS_OUT), Quantity = 2 } },
            }, CancellationToken.None));
        }

        [Fact]
        public async Task GoodsOutFromQuarantine_OnOrderClaim_NeverTakesExcessUnits()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var s = await Received(scope, ordered: 10, arrived: 13, defective: 3); // healthy-first: 10 stock, 0 defective on order, 3 excess
            var claims = await CreateReturn(scope, s, OnOrder(s, 1));

            await Add(scope).Handle(new PR.AddClaimResolutionCommand { ClaimId = claims[0], Composition = new EffectCompositionDto
            {
                Quantity = 1,
                GoodsOut = new() { new GoodsEffectDto { Quantity = 1, UnitPrice = 0 } },
            } }, CancellationToken.None);

            await Assert.ThrowsAsync<ValidationCustomException>(() => Round(scope).Handle(new PR.ExecuteGoodsRoundCommand
            {
                PurchaseReturnId = scope.Context.PurchaseReturns.Single().Id,
                Rounds = new() { new GoodsRoundLineDto { EffectId = EffectId(scope, 0, ReturnEffectDirectionEnum.GOODS_OUT), Quantity = 1, Source = ProductUnitStatusEnum.QUARANTINED } },
            }, CancellationToken.None));
        }

        [Fact]
        public async Task Scrap_OfPaidForGoods_IsAReportedLoss()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var s = await Received(scope, ordered: 10, arrived: 10, defective: 2);
            var net = (ulong)(1000m * (100 - s.Item.Discount) / 100);
            var claims = await CreateReturn(scope, s, OnOrder(s, 2));

            await Add(scope).Handle(new PR.AddClaimResolutionCommand { ClaimId = claims[0], Composition = new EffectCompositionDto
            {
                Quantity = 2,
                GoodsScrap = new() { new QuarantineEffectDto { Quantity = 2, UnitCost = net } },
            } }, CancellationToken.None);
            await Round(scope).Handle(new PR.ExecuteGoodsRoundCommand
            {
                PurchaseReturnId = scope.Context.PurchaseReturns.Single().Id,
                Rounds = new() { new GoodsRoundLineDto { EffectId = EffectId(scope, 0, ReturnEffectDirectionEnum.GOODS_SCRAP), Quantity = 2 } },
            }, CancellationToken.None);

            var report = Periods<SaleReportPeriodDto>((await new GetSaleReportQueryHandler(scope.Db).Handle(new GetSaleReportQuery(), CancellationToken.None)).Data!);
            Assert.Equal(2m * net, report.Sum(p => p.ScrapLoss));
            Assert.Equal(-2m * net, report.Sum(p => p.NetProfit));

            using var verify = db.NewContext();
            Assert.Equal(2, verify.ProductUnits.Count(u => u.Status == ProductUnitStatusEnum.SCRAPPED));
            Assert.Equal(8, verify.Products.Single(p => p.Id == s.Product.Id).Stock);
            Assert.Equal(2, verify.ProductUnitMovements.Count(m => m.Reason == ProductUnitMovementReasonEnum.QUARANTINE_SCRAPPED));
        }

        [Fact]
        public async Task DamagedReplacement_IsHeldInQuarantineOnTheLine_NotDropped()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var s = await Received(scope, ordered: 10, arrived: 10, defective: 0);
            var net = (ulong)(1000m * (100 - s.Item.Discount) / 100);
            var claims = await CreateReturn(scope, s, OnOrder(s, 2));

            await Add(scope).Handle(new PR.AddClaimResolutionCommand { ClaimId = claims[0], Composition = new EffectCompositionDto
            {
                Quantity = 2,
                GoodsOut = new() { new GoodsEffectDto { Quantity = 2, UnitPrice = 1000 } },
                GoodsIn = new() { new GoodsEffectDto { Quantity = 2, UnitPrice = 1000, UnitCost = net } },
            } }, CancellationToken.None);
            await Round(scope).Handle(new PR.ExecuteGoodsRoundCommand
            {
                PurchaseReturnId = scope.Context.PurchaseReturns.Single().Id,
                Rounds = new()
                {
                    new GoodsRoundLineDto { EffectId = EffectId(scope, 0, ReturnEffectDirectionEnum.GOODS_OUT), Quantity = 2, Source = ProductUnitStatusEnum.IN_STOCK },
                    new GoodsRoundLineDto
                    {
                        EffectId = EffectId(scope, 0, ReturnEffectDirectionEnum.GOODS_IN),
                        Quantity = 2,
                        Observations = new() { new GoodsRoundObservationDto { Problem = ReturnProblemEnum.DAMAGED_IN_TRANSIT, Quantity = 1 } },
                    },
                },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Equal(9, verify.Products.Single(p => p.Id == s.Product.Id).Stock);
            var held = verify.ProductUnits.Single(u => u.Status == ProductUnitStatusEnum.QUARANTINED);
            Assert.Equal((UnitCustodyReasonEnum?)UnitCustodyReasonEnum.ON_ORDER, held.CustodyReason);
            Assert.Equal(s.Item.Id, held.PurchaseItemId);
            Assert.Equal((decimal)net, verify.InventoryCostLedgerEntries.Single(x => x.EventType == InventoryCostEventTypeEnum.PURCHASE_RETURN_REPLACEMENT_QUARANTINED).OffPoolValueDelta);
        }

        [Fact]
        public async Task WriteOff_ClosesPartOfTheClaimWithNoEffect_AndSettlesTheLine()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var s = await Received(scope, ordered: 10, arrived: 10, defective: 2);
            var claims = await CreateReturn(scope, s, OnOrder(s, 2));

            await Add(scope).Handle(new PR.AddClaimResolutionCommand { ClaimId = claims[0], Composition = new EffectCompositionDto { Quantity = 2, WriteOff = true } }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.True(verify.PurchaseReturnResolutions.Single().IsWriteOff);
            Assert.Empty(verify.PurchaseReturnEffects);
            Assert.Equal(2, verify.PurchaseItems.Single(x => x.Id == s.Item.Id).SettledQuantity);
            Assert.Equal(ReturnStatusEnum.SETTLED, verify.PurchaseReturns.Single().Status);
        }

        [Fact]
        public async Task Receiving_StampsEachQuarantinedUnitWithTheValueItEnteredWith()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            // Ordered 10, arrived 12, 3 defective, 20% line discount. Healthy-first: 9 healthy -> stock, 1 defective on the
            // order (paid for, held at the NET price 800 - not the 1000 list price), 2 defective excess (never paid for, 0).
            var s = await Received(scope, ordered: 10, arrived: 12, defective: 3, discountPercent: 20);

            using var verify = db.NewContext();
            var units = verify.ProductUnits.Where(u => u.ProductId == s.Product.Id).ToList();
            Assert.Equal(800m, units.Single(u => u.Status == ProductUnitStatusEnum.QUARANTINED && u.CustodyReason == UnitCustodyReasonEnum.ON_ORDER).QuarantineCost);
            Assert.All(units.Where(u => u.CustodyReason == UnitCustodyReasonEnum.EXCESS), u => Assert.Equal(0m, u.QuarantineCost));
            Assert.All(units.Where(u => u.Status == ProductUnitStatusEnum.IN_STOCK), u => Assert.Null(u.QuarantineCost));
        }

        [Fact]
        public async Task Release_IgnoresAnyClientCost_AndMovesTheHeldNetValue()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var s = await Received(scope, ordered: 10, arrived: 10, defective: 2, discountPercent: 20); // 8 stock at 800, 2 held at 800
            var claims = await CreateReturn(scope, s, OnOrder(s, 2));

            // A cost typed by staff (here the gross list price, the old default) must not reach the ledger.
            await Add(scope).Handle(new PR.AddClaimResolutionCommand { ClaimId = claims[0], Composition = new EffectCompositionDto
            {
                Quantity = 2,
                GoodsRelease = new() { new QuarantineEffectDto { Quantity = 2, UnitCost = 1000 } },
            } }, CancellationToken.None);
            await Round(scope).Handle(new PR.ExecuteGoodsRoundCommand
            {
                PurchaseReturnId = scope.Context.PurchaseReturns.Single().Id,
                Rounds = new() { new GoodsRoundLineDto { EffectId = EffectId(scope, 0, ReturnEffectDirectionEnum.GOODS_RELEASE), Quantity = 2 } },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var ledger = verify.InventoryCostLedgerEntries.OrderBy(x => x.Id).ToList();
            Assert.Equal(10m * 800m, ledger.Last().RunningInventoryValue);
            Assert.Equal(0m, ledger.Sum(x => x.OffPoolValueDelta));
            Assert.Null(verify.PurchaseReturnEffects.Single().UnitCost);
        }

        [Fact]
        public async Task ReturnExcessFromQuarantine_WithNoCostSent_LeavesTheQuarantineBalanceAtZero()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var s = await Received(scope, ordered: 5, arrived: 7, defective: 0); // 2 healthy excess, held at 0
            var claims = await CreateReturn(scope, s, Excess(s, 2));

            // No UnitCost at all - what the simplified form sends. The old rule took the running average off-pool here,
            // leaving the quarantine balance negative for goods that were never paid for.
            await Add(scope).Handle(new PR.AddClaimResolutionCommand { ClaimId = claims[0], Composition = new EffectCompositionDto
            {
                Quantity = 2,
                GoodsOut = new() { new GoodsEffectDto { Quantity = 2 } },
            } }, CancellationToken.None);
            await Round(scope).Handle(new PR.ExecuteGoodsRoundCommand
            {
                PurchaseReturnId = scope.Context.PurchaseReturns.Single().Id,
                Rounds = new() { new GoodsRoundLineDto { EffectId = EffectId(scope, 0, ReturnEffectDirectionEnum.GOODS_OUT), Quantity = 2, Source = ProductUnitStatusEnum.QUARANTINED } },
            }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Equal(0m, verify.InventoryCostLedgerEntries.Sum(x => x.OffPoolValueDelta));
            Assert.Equal(2, verify.ProductUnits.Count(u => u.Status == ProductUnitStatusEnum.RETURNED_TO_SUPPLIER));
        }

        [Fact]
        public async Task Scrap_OfGoodsThatAreNotInQuarantine_IsRefusedAtDecision()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var s = await Received(scope, ordered: 10, arrived: 10, defective: 0); // everything on the shelf; the defect is found later
            var claims = await CreateReturn(scope, s, OnOrder(s, 2));

            await Assert.ThrowsAsync<ValidationCustomException>(() => Add(scope).Handle(new PR.AddClaimResolutionCommand { ClaimId = claims[0], Composition = new EffectCompositionDto
            {
                Quantity = 2,
                GoodsScrap = new() { new QuarantineEffectDto { Quantity = 2 } },
            } }, CancellationToken.None));

            using var verify = db.NewContext();
            Assert.Empty(verify.PurchaseReturnResolutions);
        }

        [Fact]
        public async Task Release_OfUnitsAlreadyPromisedToAnotherDecision_IsRefused()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var s = await Received(scope, ordered: 10, arrived: 10, defective: 2); // 2 held for the line
            var claims = await CreateReturn(scope, s, OnOrder(s, 2), OnOrder(s, 2));

            await Add(scope).Handle(new PR.AddClaimResolutionCommand { ClaimId = claims[0], Composition = new EffectCompositionDto
            {
                Quantity = 2,
                GoodsScrap = new() { new QuarantineEffectDto { Quantity = 2 } },
            } }, CancellationToken.None);

            await Assert.ThrowsAsync<ValidationCustomException>(() => Add(scope).Handle(new PR.AddClaimResolutionCommand { ClaimId = claims[1], Composition = new EffectCompositionDto
            {
                Quantity = 1,
                GoodsRelease = new() { new QuarantineEffectDto { Quantity = 1 } },
            } }, CancellationToken.None));
        }

        [Fact]
        public void Validators_WriteOffWithEffect_AndQuarantineSlotsOnSaleSide_AreRefused()
        {
            var purchase = new PR.AddClaimResolutionCommandValidator();
            Assert.False(purchase.Validate(new PR.AddClaimResolutionCommand
            {
                ClaimId = 1,
                Composition = new EffectCompositionDto { Quantity = 1, WriteOff = true, MoneyIn = new MoneyEffectDto { Method = ReturnPaymentMethodEnum.CASH, Amount = 10 } },
            }).IsValid);
            Assert.True(purchase.Validate(new PR.AddClaimResolutionCommand { ClaimId = 1, Composition = new EffectCompositionDto { Quantity = 1, WriteOff = true } }).IsValid);
            Assert.True(purchase.Validate(new PR.AddClaimResolutionCommand { ClaimId = 1, Composition = new EffectCompositionDto { Quantity = 1, GoodsScrap = new() { new QuarantineEffectDto { Quantity = 1 } } } }).IsValid);

            var sale = new SR.AddClaimResolutionCommandValidator();
            Assert.False(sale.Validate(new SR.AddClaimResolutionCommand { ClaimId = 1, Composition = new EffectCompositionDto { Quantity = 1, GoodsRelease = new() { new QuarantineEffectDto { Quantity = 1 } } } }).IsValid);
            Assert.True(sale.Validate(new SR.AddClaimResolutionCommand { ClaimId = 1, Composition = new EffectCompositionDto { Quantity = 1, WriteOff = true } }).IsValid);
        }
    }
}
