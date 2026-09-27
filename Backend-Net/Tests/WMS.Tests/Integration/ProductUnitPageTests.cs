using Application.Common.Dtos;
using Application.Features.Product.Commands;
using Application.Features.Product.Dtos;
using Application.Features.Product.Queries;
using Application.Features.Purchase.Commands;
using Application.Features.Purchase.Dtos;
using Common.Exceptions;
using Domain.Enums;
using WMS.Tests.Support;

namespace WMS.Tests.Integration
{
    /// <summary>frontend-requests.fa.md section 4, items 1-3: label print history, unit list filters and fields, the unit summary.</summary>
    public class ProductUnitPageTests
    {
        /// <summary>Ordered 10 at 1,000; 11 arrived, 3 defective. Healthy goods fill the order first: 8 on the shelf, 2 defective on the order and 1 excess in quarantine.</summary>
        private static async Task<PurchaseScenario> Received(TestScope scope)
        {
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 10, stock: 0, unitPrice: 1000);
            await new ReceivePurchaseCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.ProductUnitService, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new ReceivePurchaseCommand
                {
                    PurchaseId = scenario.Purchase.Id,
                    Items = new() { new ReceivePurchaseItemDto { PurchaseItemId = scenario.Item.Id, ArrivedQuantity = 11, Defects = new() { new ReceivingDefectDto { Problem = ReturnProblemEnum.DEFECTIVE, Quantity = 3 } } } },
                }, CancellationToken.None);
            return scenario;
        }

        private static async Task<List<ProductUnitDto>> List(TestScope scope, GetProductUnitListQuery query)
        {
            query.Take = 200;
            var res = await new GetProductUnitListQueryHandler(scope.Db, scope.ProductCodeService).Handle(query, CancellationToken.None);
            return ((IEnumerable<ProductUnitDto>)res.Data!.GetType().GetProperty("ProductUnitList")!.GetValue(res.Data)!).ToList();
        }

        private static Task Print(TestScope scope, IEnumerable<int> ids) =>
            new MarkProductUnitsPrintedCommandHandler(scope.Db, FakeUserContext.WithUserId(), scope.UnitOfWork)
                .Handle(new MarkProductUnitsPrintedCommand { ProductUnitIds = ids.ToList() }, CancellationToken.None);

        [Fact]
        public async Task MarkPrinted_CountsEachPrint_KeepsTheFirstDate_AndEmptiesThePrintQueue()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var s = await Received(scope);
            var ids = scope.Context.ProductUnits.Where(u => u.ProductId == s.Product.Id && u.Status == ProductUnitStatusEnum.IN_STOCK).Take(3).Select(u => u.Id).ToList();

            await Print(scope, ids);
            DateTime? first;
            using (var verify = db.NewContext())
                first = verify.ProductUnits.Single(u => u.Id == ids[0]).FirstPrintedAt;
            await Print(scope, ids.Take(1));

            using var after = db.NewContext();
            var unit = after.ProductUnits.Single(u => u.Id == ids[0]);
            Assert.Equal((2, first), (unit.PrintCount, unit.FirstPrintedAt));
            Assert.NotNull(unit.LastPrintedByUserId);
            Assert.Empty(after.ProductUnitMovements.Where(m => ids.Contains(m.ProductUnitId) && m.OccurredAt >= first)); // not a movement

            var queue = await List(scope, new GetProductUnitListQuery { ProductId = s.Product.Id, LabelState = ProductUnitLabelStateEnum.UNPRINTED });
            Assert.Equal(11 - 3, queue.Count); // 8 shelf + 3 quarantine, minus the 3 printed

            await Assert.ThrowsAsync<NotFoundCustomException>(() => Print(scope, new[] { ids[0], 999_999 }));
        }

        [Fact]
        public async Task List_FiltersBySearchStatusesCustodyAndSupplier_AndShowsWhereQuarantineCameFrom()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var s = await Received(scope);
            var anyUnit = scope.Context.ProductUnits.First(u => u.ProductId == s.Product.Id);

            // A scanner may add or drop the separators: the digits decide.
            var scanned = await List(scope, new GetProductUnitListQuery { Search = anyUnit.BarcodePayload });
            Assert.Equal(anyUnit.Id, Assert.Single(scanned).Id);

            var held = await List(scope, new GetProductUnitListQuery { ProductId = s.Product.Id, Statuses = new() { ProductUnitStatusEnum.QUARANTINED } });
            Assert.Equal(3, held.Count);
            var excess = await List(scope, new GetProductUnitListQuery { ProductId = s.Product.Id, CustodyReason = UnitCustodyReasonEnum.EXCESS });
            Assert.Single(excess);

            var defective = held.First(u => u.CustodyReason == UnitCustodyReasonEnum.ON_ORDER);
            Assert.NotNull(defective.QuarantinedAt);
            Assert.Equal((DocumentKindEnum?)DocumentKindEnum.PURCHASE, defective.QuarantineDocumentKind);
            Assert.Equal(s.Purchase.InvoiceNumber, defective.QuarantineDocumentNumber);
            Assert.Equal(1000m, defective.QuarantineCost);
            Assert.Equal(s.Product.Code, defective.ProductCode);
            Assert.NotNull(defective.LastMovementAt);

            Assert.Equal(11, (await List(scope, new GetProductUnitListQuery { SupplierId = s.Supplier.Id })).Count);
            Assert.Empty(await List(scope, new GetProductUnitListQuery { SupplierId = s.Supplier.Id + 1000 }));
            Assert.Equal(11, (await List(scope, new GetProductUnitListQuery { PurchaseId = s.Purchase.Id })).Count);
        }

        [Fact]
        public async Task BinLocation_IsNormalised_SearchableByPrefix_AndClearedWhenTheUnitLeaves()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var s = await Received(scope);
            var ids = scope.Context.ProductUnits.Where(u => u.ProductId == s.Product.Id && u.Status == ProductUnitStatusEnum.IN_STOCK).OrderBy(u => u.Id).Take(2).Select(u => u.Id).ToList();
            var handler = new SetProductUnitLocationCommandHandler(scope.Db, scope.UnitOfWork);

            await handler.Handle(new SetProductUnitLocationCommand { ProductUnitIds = ids, BinLocation = " a-03 -2 " }, CancellationToken.None);

            var onShelf = await List(scope, new GetProductUnitListQuery { BinLocation = "A-03" });
            Assert.Equal(2, onShelf.Count);
            Assert.All(onShelf, u => Assert.Equal("A-03-2", u.BinLocation));

            // Scrapping one takes it off the shelf.
            await new ApplyProductUnitActionCommandHandler(scope.Db, scope.ProductUnitService, scope.InventoryCostingService, scope.PurchaseReturnCalculation, scope.UnitOfWork)
                .Handle(new ApplyProductUnitActionCommand { Action = ProductUnitActionEnum.SCRAP, Reason = UnitActionReasonEnum.DAMAGED_IN_WAREHOUSE, Note = "شکست", ProductUnitIds = new() { ids[0] } }, CancellationToken.None);

            using (var verify = db.NewContext())
                Assert.Null(verify.ProductUnits.Single(u => u.Id == ids[0]).BinLocation);

            // A unit that is gone cannot be given a shelf; blank clears it.
            await Assert.ThrowsAsync<ValidationCustomException>(() => handler.Handle(new SetProductUnitLocationCommand { ProductUnitIds = new() { ids[0] }, BinLocation = "B-01" }, CancellationToken.None));
            await handler.Handle(new SetProductUnitLocationCommand { ProductUnitIds = new() { ids[1] }, BinLocation = "  " }, CancellationToken.None);
            using var after = db.NewContext();
            Assert.Null(after.ProductUnits.Single(u => u.Id == ids[1]).BinLocation);
        }

        [Fact]
        public async Task Summary_CountsStatuses_QuarantineByReasonWithValue_AndUnprinted()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var s = await Received(scope);

            var res = await new GetProductUnitSummaryQueryHandler(scope.Db).Handle(new GetProductUnitSummaryQuery { ProductId = s.Product.Id }, CancellationToken.None);
            var summary = Assert.IsType<ProductUnitSummaryDto>(res.Data);

            Assert.Equal(8, summary.ByStatus.Single(x => x.Status == ProductUnitStatusEnum.IN_STOCK).Count);
            Assert.Equal(3, summary.ByStatus.Single(x => x.Status == ProductUnitStatusEnum.QUARANTINED).Count);
            var onOrder = summary.QuarantineByReason.Single(x => x.CustodyReason == UnitCustodyReasonEnum.ON_ORDER);
            Assert.Equal((2, 2_000m), (onOrder.Count, onOrder.Value));
            Assert.Equal((1, 0m), (summary.QuarantineByReason.Single(x => x.CustodyReason == UnitCustodyReasonEnum.EXCESS).Count, summary.QuarantineByReason.Single(x => x.CustodyReason == UnitCustodyReasonEnum.EXCESS).Value));
            Assert.Equal(2_000m, summary.QuarantineValue);
            Assert.Equal(11, summary.UnprintedCount);
        }
    }
}
