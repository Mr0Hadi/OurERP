using Application.Features.Purchase.Commands;
using Application.Features.Sale.Commands;
using Application.Features.SaleReturn.Commands;
using Application.Common.Dtos.Returns;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;
using WMS.Tests.Support;
using Application.Features.Purchase.Dtos;
using Application.Features.Sale.Dtos;

namespace WMS.Tests.Integration
{
    // Exercises the exact worked example from the AVCO spec: a later purchase at a different
    // price must never change the cost already booked on an earlier sale, and the moving average
    // only shifts once new inventory is actually received.
    public class InventoryCostingTests
    {
        [Fact]
        public async Task WeightedAverageCost_IsTimeAware_AcrossPurchaseAndSaleRounds()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();

            var category = Seed.Category();
            var product = Seed.Product(category, stock: 0);
            var supplier = Seed.Supplier();
            var customer = Seed.Customer();

            var purchase1Item = Seed.PurchaseItem(product, quantity: 10, unitPrice: 100_000);
            var purchase1 = Seed.Purchase(supplier, PurchaseStatusEnum.SHIPPED, purchase1Item);
            scope.Context.Purchases.Add(purchase1);
            await scope.Context.SaveChangesAsync();

            var receiveHandler = new ReceivePurchaseCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.ProductUnitService, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork);

            await receiveHandler.Handle(new ReceivePurchaseCommand
            {
                PurchaseId = purchase1.Id,
                Items = new() { new ReceivePurchaseItemDto { PurchaseItemId = purchase1Item.Id, ReceivedQuantity = 10 } },
            }, CancellationToken.None);

            var afterFirstReceipt = await scope.Context.InventoryCostLedgerEntries.OrderByDescending(x => x.Id).FirstAsync();
            Assert.Equal(10, afterFirstReceipt.RunningQuantity);
            Assert.Equal(100_000m, afterFirstReceipt.RunningAverageCost);

            var sale1Item = Seed.SaleItem(product, quantity: 5, unitPrice: 150_000);
            var sale1 = Seed.Sale(customer, SalesStatusEnum.PROCESSING, sale1Item);
            scope.Context.Sales.Add(sale1);
            await scope.Context.SaveChangesAsync();

            var shipHandler = new ShipSaleCommandHandler(scope.Db, scope.ProductUnitService, scope.InventoryCostingService, scope.UnitOfWork);

            await shipHandler.Handle(new ShipSaleCommand
            {
                SaleId = sale1.Id,
                Items = new() { new ShipSaleItemDto { SaleItemId = sale1Item.Id, ShippedQuantity = 5 } },
            }, CancellationToken.None);

            var afterFirstSale = await scope.Context.InventoryCostLedgerEntries.OrderByDescending(x => x.Id).FirstAsync();
            Assert.Equal(5, afterFirstSale.RunningQuantity);
            Assert.Equal(100_000m, afterFirstSale.UnitCost); // consumed at the average that existed - not a fresh price
            Assert.Equal(500_000m, -afterFirstSale.InventoryValueDelta);
            Assert.Equal(750_000m, afterFirstSale.RevenueDelta);
            Assert.Equal(250_000m, afterFirstSale.RevenueDelta + afterFirstSale.InventoryValueDelta); // profit

            // A later purchase at a very different price must not touch the sale already booked above.
            var purchase2Item = Seed.PurchaseItem(product, quantity: 10, unitPrice: 200_000);
            var purchase2 = Seed.Purchase(supplier, PurchaseStatusEnum.SHIPPED, purchase2Item);
            scope.Context.Purchases.Add(purchase2);
            await scope.Context.SaveChangesAsync();

            await receiveHandler.Handle(new ReceivePurchaseCommand
            {
                PurchaseId = purchase2.Id,
                Items = new() { new ReceivePurchaseItemDto { PurchaseItemId = purchase2Item.Id, ReceivedQuantity = 10 } },
            }, CancellationToken.None);

            Assert.Equal(100_000m, afterFirstSale.RunningAverageCost); // unchanged by the later purchase

            var afterSecondReceipt = await scope.Context.InventoryCostLedgerEntries.OrderByDescending(x => x.Id).FirstAsync();
            Assert.Equal(15, afterSecondReceipt.RunningQuantity);
            AssertClose(2_500_000m, afterSecondReceipt.RunningInventoryValue);
            AssertClose(166_666.6667m, afterSecondReceipt.RunningAverageCost);

            var sale2Item = Seed.SaleItem(product, quantity: 5, unitPrice: 250_000);
            var sale2 = Seed.Sale(customer, SalesStatusEnum.PROCESSING, sale2Item);
            scope.Context.Sales.Add(sale2);
            await scope.Context.SaveChangesAsync();

            await shipHandler.Handle(new ShipSaleCommand
            {
                SaleId = sale2.Id,
                Items = new() { new ShipSaleItemDto { SaleItemId = sale2Item.Id, ShippedQuantity = 5 } },
            }, CancellationToken.None);

            var afterSecondSale = await scope.Context.InventoryCostLedgerEntries.OrderByDescending(x => x.Id).FirstAsync();
            AssertClose(166_666.6667m, afterSecondSale.UnitCost);
            AssertClose(833_333.3335m, -afterSecondSale.InventoryValueDelta);
            Assert.Equal(1_250_000m, afterSecondSale.RevenueDelta);
            AssertClose(416_666.6665m, afterSecondSale.RevenueDelta + afterSecondSale.InventoryValueDelta);
        }

        [Fact]
        public async Task SaleReturnRefund_DoesNotDoubleCountAgainstRestock()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();

            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 5, shippedQuantity: 5, stock: 5, unitPrice: 150_000);

            // Give the shipment a known cost by seeding a matching ledger row directly, as if it
            // had gone through ShipSaleCommand at a 100,000 average cost.
            scope.Context.InventoryCostLedgerEntries.Add(new Domain.Entities.InventoryCostLedgerEntry
            {
                ProductId = scenario.Product.Id,
                EventType = InventoryCostEventTypeEnum.SALE_SHIPPED,
                ReferenceType = nameof(Domain.Entities.SaleItem),
                ReferenceId = scenario.Item.Id,
                OccurredAt = DateTime.Now,
                QuantityDelta = -5,
                UnitCost = 100_000m,
                InventoryValueDelta = -500_000m,
                RunningQuantity = 5,
                RunningInventoryValue = 500_000m,
                RunningAverageCost = 100_000m,
                RevenueDelta = 750_000m,
                CreatedAt = DateTime.Now,
            });
            await scope.Context.SaveChangesAsync();

            var claim = new Domain.Entities.SaleReturnClaim
            {
                Scope = ReturnClaimScopeEnum.ON_ORDER,
                SaleItemId = scenario.Item.Id,
                ProductId = scenario.Product.Id,
                UnitPrice = 150_000,
                Quantity = 2,
                Problem = ReturnProblemEnum.DEFECTIVE,
                CreatedAt = DateTime.Now,
            };
            var saleReturn = new Domain.Entities.SaleReturn
            {
                ReturnNumber = "SR-" + Guid.NewGuid().ToString("N")[..8],
                RequestDate = DateTime.Now,
                Status = ReturnStatusEnum.OPEN,
                SaleId = scenario.Sale.Id,
                Claims = new() { claim },
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now,
            };
            scope.Context.SaleReturns.Add(saleReturn);
            await scope.Context.SaveChangesAsync();

            var addHandler = new AddClaimResolutionCommandHandler(scope.Db, scope.SaleReturnQueryService, scope.SaleReturnCalculation, scope.InventoryCostingService, scope.UnitOfWork);

            // A partial refund of 100,000 for 2 damaged units (not the full 300,000 list price) -
            // the amount actually refunded is the only revenue-reversal signal used.
            await addHandler.Handle(new AddClaimResolutionCommand
            {
                ClaimId = claim.Id,
                Composition = new EffectCompositionDto
                {
                    Quantity = 2,
                    Money = new MoneyEffectDto { Kind = ReturnEffectKindEnum.MONEY_OUT, Amount = 100_000, Method = ReturnPaymentMethodEnum.CASH },
                },
            }, CancellationToken.None);

            var refundEntry = await scope.Context.InventoryCostLedgerEntries
                .Where(x => x.EventType == InventoryCostEventTypeEnum.SALE_RETURN_REFUND)
                .SingleAsync();

            Assert.Equal(0, refundEntry.QuantityDelta);
            Assert.Equal(-100_000m, refundEntry.RevenueDelta);
            Assert.Equal(0m, refundEntry.InventoryValueDelta); // no inventory movement - restocking is a separate, independent event
        }

        private static void AssertClose(decimal expected, decimal actual)
        {
            Assert.True(Math.Abs(expected - actual) < 0.01m, $"Expected {expected}, got {actual}");
        }
    }
}
