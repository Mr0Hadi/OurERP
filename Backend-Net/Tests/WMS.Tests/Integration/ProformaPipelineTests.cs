using Application.Features.Sale.Commands;
using Application.Features.Sale.Dtos;
using Application.Features.Sale.Queries;
using Application.Features.WarehouseIssue.Commands;
using Application.Features.WarehouseIssue.Dtos;
using Application.Features.WarehouseIssue.Queries;
using Common.Exceptions;
using Domain.Enums;
using WMS.Tests.Support;

namespace WMS.Tests.Integration
{
    /// <summary>
    /// The proforma approval pipeline (docs/proforma-approval-pipeline.md): DRAFT -> customer approval -> warehouse scan and
    /// reservation -> payment issues the invoice. Problems the warehouse finds go to quarantine and to accounting, never blocking.
    /// </summary>
    public class ProformaPipelineTests
    {
        private static SaleWarehouseIssueInputDto Issue(string barcode, UnitActionReasonEnum reason = UnitActionReasonEnum.DAMAGED_IN_WAREHOUSE) =>
            new() { ProductUnitBarcode = barcode, Reason = reason, Description = "کارتن پاره و بدنه‌ی دستگاه ترک خورده" };

        private static async Task<(MediatR.IMediator Mediator, SaleScenario Scenario, List<string> Barcodes)> SetupAsync(TestScope scope, int stock)
        {
            var user = Seed.PersistedUser(scope.Context);
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 1, shippedQuantity: 0, stock: 0);
            var barcodes = await ProformaFlow.ScannableStockAsync(scope, scenario.Product, stock);
            return (ProformaFlow.Mediator(scope, user.Id), scenario, barcodes);
        }

        [Fact]
        public async Task FullPipeline_ReservesAtTheWarehouse_PaymentIssuesTheInvoice_ShippingTakesTheReservedUnits()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (mediator, scenario, barcodes) = await SetupAsync(scope, stock: 3);

            var sale = await ProformaFlow.CreateAsync(mediator, scenario, quantity: 2);
            Assert.Equal(SaleProformaStageEnum.DRAFT, sale.ProformaStage);
            await Assert.ThrowsAsync<ValidationCustomException>(() => ProformaFlow.CheckAsync(mediator, sale, barcodes.Take(2).ToList()));

            sale = await ProformaFlow.ApproveAsync(mediator, sale);
            Assert.Equal(SaleProformaStageEnum.CUSTOMER_APPROVED, sale.ProformaStage);
            await Assert.ThrowsAsync<ValidationCustomException>(() => mediator.Send(new AddSalePaymentCommand { SaleId = sale.Id, Type = PaymentTypeEnum.CASH, Amount = 1 }, TestContext.Current.CancellationToken));

            sale = await ProformaFlow.CheckAsync(mediator, sale, new() { barcodes[2], barcodes[0] });
            Assert.Equal(SaleProformaStageEnum.WAREHOUSE_CHECKED, sale.ProformaStage);
            Assert.Equal(SalesStatusEnum.PROFORMA, sale.Status);
            var line = sale.Items.Single();
            Assert.Equal(2, line.ReservedQuantity);
            Assert.Equal(1, line.FreeStock);
            Assert.Equal(new[] { SaleProformaEventEnum.CUSTOMER_APPROVED, SaleProformaEventEnum.WAREHOUSE_CHECKED }, sale.ProformaEvents.Select(e => e.Kind));

            sale = Assert.IsType<SaleDto>((await mediator.Send(new AddSalePaymentCommand { SaleId = sale.Id, Type = PaymentTypeEnum.CASH, Amount = 1 }, TestContext.Current.CancellationToken)).Data);
            Assert.Equal(SalesStatusEnum.PROCESSING, sale.Status);
            Assert.False(string.IsNullOrEmpty(sale.InvoiceNumber));

            await mediator.Send(new ShipSaleCommand { SaleId = sale.Id, Items = new() { new ShipSaleItemDto { SaleItemId = line.Id, ShippedQuantity = 2 } } }, TestContext.Current.CancellationToken);

            using var verify = db.NewContext();
            var units = verify.ProductUnits.Where(u => barcodes.Contains(u.Barcode)).ToDictionary(u => u.Barcode, u => u.Status);
            Assert.Equal(ProductUnitStatusEnum.SOLD, units[barcodes[0]]);
            Assert.Equal(ProductUnitStatusEnum.IN_STOCK, units[barcodes[1]]);
            Assert.Equal(ProductUnitStatusEnum.SOLD, units[barcodes[2]]);
            // Stock dropped at the reservation and not again at shipping.
            Assert.Equal(1, verify.Products.Single(p => p.Id == scenario.Product.Id).Stock);
        }

        [Fact]
        public async Task Approval_ForAStaleRevision_IsRefused()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (mediator, scenario, _) = await SetupAsync(scope, stock: 3);
            var sale = await ProformaFlow.CreateAsync(mediator, scenario, quantity: 1);

            await Assert.ThrowsAsync<ValidationCustomException>(() => mediator.Send(new ApproveSaleProformaCommand { SaleId = sale.Id, Revision = sale.Revision + 1 }, TestContext.Current.CancellationToken));
        }

        [Fact]
        public async Task DamagedUnit_WithAHealthyReplacement_IsQuarantinedAndReported_WhileTheProformaGoesOn()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (mediator, scenario, barcodes) = await SetupAsync(scope, stock: 3);
            var sale = await ProformaFlow.ApproveAsync(mediator, await ProformaFlow.CreateAsync(mediator, scenario, quantity: 2));

            sale = await ProformaFlow.CheckAsync(mediator, sale, new() { barcodes[1], barcodes[2] }, new() { Issue(barcodes[0]) });

            Assert.Equal(SaleProformaStageEnum.WAREHOUSE_CHECKED, sale.ProformaStage);
            var issue = Assert.Single(sale.WarehouseIssues);
            Assert.Equal(barcodes[0], issue.Barcode);
            Assert.Equal(UnitActionReasonEnum.DAMAGED_IN_WAREHOUSE, issue.Reason);
            Assert.Equal(ProductUnitStatusEnum.QUARANTINED, issue.UnitStatus);
            Assert.NotNull(issue.ReportedByUserId);
            Assert.Null(issue.ResolvedAt);

            using var verify = db.NewContext();
            var unit = verify.ProductUnits.Single(u => u.Barcode == barcodes[0]);
            Assert.Equal(UnitCustodyReasonEnum.WAREHOUSE_HOLD, unit.CustodyReason);
            Assert.Equal(0, verify.Products.Single(p => p.Id == scenario.Product.Id).Stock);
            // The movement row carries who reported it, why, and the description.
            var movement = verify.ProductUnitMovements.Single(m => m.ProductUnitId == unit.Id && m.ToStatus == ProductUnitStatusEnum.QUARANTINED);
            Assert.Equal(issue.ReportedByUserId, movement.UserId);
            Assert.Equal(UnitActionReasonEnum.DAMAGED_IN_WAREHOUSE, movement.ActionReason);
            Assert.Equal(DocumentKindEnum.SALE, movement.DocumentKind);

            var list = await mediator.Send(new GetSaleWarehouseIssueListQuery { IsOpen = true }, TestContext.Current.CancellationToken);
            var open = (System.Collections.IEnumerable)list.Data!.GetType().GetProperty("SaleWarehouseIssueList")!.GetValue(list.Data)!;
            Assert.Single(open.Cast<SaleWarehouseIssueDto>());
        }

        [Fact]
        public async Task MissingUnit_WithNoReplacement_IsAShortage_BackToTheCustomer_NothingReserved()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (mediator, scenario, barcodes) = await SetupAsync(scope, stock: 2);
            var sale = await ProformaFlow.ApproveAsync(mediator, await ProformaFlow.CreateAsync(mediator, scenario, quantity: 2));

            sale = await ProformaFlow.CheckAsync(mediator, sale, new() { barcodes[1] }, new() { Issue(barcodes[0], UnitActionReasonEnum.MISSING) });

            Assert.Equal(SaleProformaStageEnum.DRAFT, sale.ProformaStage);
            var shortage = sale.ProformaEvents.Last();
            Assert.Equal(SaleProformaEventEnum.WAREHOUSE_SHORTAGE, shortage.Kind);
            Assert.Contains("1 از 2", shortage.Note);
            Assert.Equal(0, sale.Items.Single().ReservedQuantity);
            Assert.Equal(UnitActionReasonEnum.MISSING, Assert.Single(sale.WarehouseIssues).Reason);

            using var verify = db.NewContext();
            Assert.Equal(ProductUnitStatusEnum.IN_STOCK, verify.ProductUnits.Single(u => u.Barcode == barcodes[1]).Status);
            Assert.Equal(1, verify.Products.Single(p => p.Id == scenario.Product.Id).Stock);
            await Assert.ThrowsAsync<ValidationCustomException>(() => mediator.Send(new AddSalePaymentCommand { SaleId = sale.Id, Type = PaymentTypeEnum.CASH, Amount = 1 }, TestContext.Current.CancellationToken));
        }

        [Fact]
        public async Task EditingQuantity_ReleasesTheLine_AndGoesBackToDraft()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (mediator, scenario, barcodes) = await SetupAsync(scope, stock: 3);
            var sale = await ProformaFlow.ReadyForPaymentAsync(mediator, scenario, barcodes.Take(2).ToList());

            var line = sale.Items.Single();
            sale = Assert.IsType<SaleDto>((await mediator.Send(new UpdateSaleCommand
            {
                Id = sale.Id,
                CustomerId = sale.CustomerId,
                PaymentType = sale.PaymentType,
                Items = new() { new UpdateSaleItemDto { Id = line.Id, ProductId = line.ProductId, Quantity = 3, UnitPrice = line.UnitPrice } },
            }, TestContext.Current.CancellationToken)).Data);

            Assert.Equal(SaleProformaStageEnum.DRAFT, sale.ProformaStage);
            Assert.Equal(1, sale.Revision);
            Assert.Equal(SaleProformaEventEnum.RESET_BY_EDIT, sale.ProformaEvents.Last().Kind);
            Assert.Equal(0, sale.Items.Single().ReservedQuantity);
            Assert.Equal(3, sale.Items.Single().FreeStock);
        }

        [Fact]
        public async Task EditingOnlyThePrice_KeepsTheReservation_AndReapprovalSkipsTheWarehouse()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (mediator, scenario, barcodes) = await SetupAsync(scope, stock: 3);
            var sale = await ProformaFlow.ReadyForPaymentAsync(mediator, scenario, barcodes.Take(2).ToList());

            var line = sale.Items.Single();
            sale = Assert.IsType<SaleDto>((await mediator.Send(new UpdateSaleCommand
            {
                Id = sale.Id,
                CustomerId = sale.CustomerId,
                PaymentType = sale.PaymentType,
                Items = new() { new UpdateSaleItemDto { Id = line.Id, ProductId = line.ProductId, Quantity = line.Quantity, UnitPrice = line.UnitPrice + 500 } },
            }, TestContext.Current.CancellationToken)).Data);

            Assert.Equal(SaleProformaStageEnum.DRAFT, sale.ProformaStage);
            Assert.Equal(2, sale.Items.Single().ReservedQuantity);

            sale = await ProformaFlow.ApproveAsync(mediator, sale);
            Assert.Equal(SaleProformaStageEnum.WAREHOUSE_CHECKED, sale.ProformaStage);
        }

        [Fact]
        public async Task EditingOnlyTheDescription_ChangesNothingApproved()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (mediator, scenario, barcodes) = await SetupAsync(scope, stock: 1);
            var sale = await ProformaFlow.ReadyForPaymentAsync(mediator, scenario, barcodes);

            var line = sale.Items.Single();
            sale = Assert.IsType<SaleDto>((await mediator.Send(new UpdateSaleCommand
            {
                Id = sale.Id,
                CustomerId = sale.CustomerId,
                PaymentType = sale.PaymentType,
                Description = "فقط یادداشت",
                Items = new() { new UpdateSaleItemDto { Id = line.Id, ProductId = line.ProductId, Quantity = line.Quantity, UnitPrice = line.UnitPrice } },
            }, TestContext.Current.CancellationToken)).Data);

            Assert.Equal(SaleProformaStageEnum.WAREHOUSE_CHECKED, sale.ProformaStage);
            Assert.Equal(0, sale.Revision);
        }

        [Fact]
        public async Task ReservedUnits_AreNotFreeForAnotherProforma()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (mediator, scenario, barcodes) = await SetupAsync(scope, stock: 2);
            await ProformaFlow.ReadyForPaymentAsync(mediator, scenario, barcodes.Take(1).ToList());

            // One unit left free: a second proforma for two is refused, one for one is fine...
            await Assert.ThrowsAsync<ValidationCustomException>(() => ProformaFlow.CreateAsync(mediator, scenario, quantity: 2));
            var second = await ProformaFlow.ApproveAsync(mediator, await ProformaFlow.CreateAsync(mediator, scenario, quantity: 1));

            // ...but it cannot scan the unit the first one holds.
            await Assert.ThrowsAsync<ValidationCustomException>(() => ProformaFlow.CheckAsync(mediator, second, new() { barcodes[0] }));
        }

        [Fact]
        public async Task CancellingAndDeleting_PutTheReservedUnitsBack()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (mediator, scenario, barcodes) = await SetupAsync(scope, stock: 2);
            var cancelled = await ProformaFlow.ReadyForPaymentAsync(mediator, scenario, barcodes.Take(1).ToList());
            var deleted = await ProformaFlow.ReadyForPaymentAsync(mediator, scenario, barcodes.Skip(1).ToList());

            await mediator.Send(new ChangeSaleStatusCommand { Id = cancelled.Id, Status = SalesStatusEnum.CANCELLED }, TestContext.Current.CancellationToken);
            await mediator.Send(new DeleteSaleCommand { Id = deleted.Id }, TestContext.Current.CancellationToken);

            using var verify = db.NewContext();
            Assert.All(verify.ProductUnits.Where(u => barcodes.Contains(u.Barcode)), u =>
            {
                Assert.Equal(ProductUnitStatusEnum.IN_STOCK, u.Status);
                Assert.Null(u.SaleItemId);
            });
            Assert.Equal(2, verify.Products.Single(p => p.Id == scenario.Product.Id).Stock);
        }

        [Fact]
        public async Task Accounting_Scrap_BooksTheUnitAsScrapped_AndCannotDecideTwice()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (mediator, scenario, barcodes) = await SetupAsync(scope, stock: 2);
            var sale = await ProformaFlow.ApproveAsync(mediator, await ProformaFlow.CreateAsync(mediator, scenario, quantity: 1));
            sale = await ProformaFlow.CheckAsync(mediator, sale, new() { barcodes[1] }, new() { Issue(barcodes[0]) });
            var issueId = sale.WarehouseIssues.Single().Id;

            var resolved = Assert.IsType<SaleWarehouseIssueDto>((await mediator.Send(new ResolveSaleWarehouseIssueCommand
            {
                Id = issueId,
                Resolution = SaleWarehouseIssueResolutionEnum.SCRAP,
                Note = "قابل تعمیر نیست",
            }, TestContext.Current.CancellationToken)).Data);

            Assert.Equal(ProductUnitStatusEnum.SCRAPPED, resolved.UnitStatus);
            Assert.NotNull(resolved.ResolvedAt);
            await Assert.ThrowsAsync<ValidationCustomException>(() => mediator.Send(new ResolveSaleWarehouseIssueCommand
            {
                Id = issueId,
                Resolution = SaleWarehouseIssueResolutionEnum.RELEASE,
            }, TestContext.Current.CancellationToken));
        }

        [Fact]
        public async Task Accounting_Release_PutsAFoundUnitBackInStock()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (mediator, scenario, barcodes) = await SetupAsync(scope, stock: 2);
            var sale = await ProformaFlow.ApproveAsync(mediator, await ProformaFlow.CreateAsync(mediator, scenario, quantity: 1));
            sale = await ProformaFlow.CheckAsync(mediator, sale, new() { barcodes[1] }, new() { Issue(barcodes[0], UnitActionReasonEnum.MISSING) });

            await mediator.Send(new ResolveSaleWarehouseIssueCommand { Id = sale.WarehouseIssues.Single().Id, Resolution = SaleWarehouseIssueResolutionEnum.RELEASE }, TestContext.Current.CancellationToken);

            using var verify = db.NewContext();
            Assert.Equal(ProductUnitStatusEnum.IN_STOCK, verify.ProductUnits.Single(u => u.Barcode == barcodes[0]).Status);
            Assert.Equal(1, verify.Products.Single(p => p.Id == scenario.Product.Id).Stock);
        }

        [Fact]
        public async Task Accounting_SupplierReturn_WithoutAPurchaseLine_IsRefused()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (mediator, scenario, barcodes) = await SetupAsync(scope, stock: 2);
            var sale = await ProformaFlow.ApproveAsync(mediator, await ProformaFlow.CreateAsync(mediator, scenario, quantity: 1));
            sale = await ProformaFlow.CheckAsync(mediator, sale, new() { barcodes[1] }, new() { Issue(barcodes[0]) });

            await Assert.ThrowsAsync<ValidationCustomException>(() => mediator.Send(new ResolveSaleWarehouseIssueCommand
            {
                Id = sale.WarehouseIssues.Single().Id,
                Resolution = SaleWarehouseIssueResolutionEnum.SUPPLIER_RETURN,
            }, TestContext.Current.CancellationToken));
        }

        [Fact]
        public void WarehouseIssue_WithoutADescription_IsInvalid()
        {
            var result = new CheckSaleWarehouseCommandValidator().Validate(new CheckSaleWarehouseCommand
            {
                SaleId = 1,
                Issues = new() { new SaleWarehouseIssueInputDto { ProductUnitBarcode = "X-1", Reason = UnitActionReasonEnum.DAMAGED_IN_WAREHOUSE, Description = "  " } },
            });

            Assert.False(result.IsValid);
        }

        [Fact]
        public async Task GetSaleList_FiltersByProformaStage()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (mediator, scenario, _) = await SetupAsync(scope, stock: 3);
            var draft = await ProformaFlow.CreateAsync(mediator, scenario, quantity: 1);
            var approved = await ProformaFlow.ApproveAsync(mediator, await ProformaFlow.CreateAsync(mediator, scenario, quantity: 1));

            var res = await mediator.Send(new GetSaleListQuery { ProformaStages = new() { SaleProformaStageEnum.CUSTOMER_APPROVED } }, TestContext.Current.CancellationToken);
            var list = ((System.Collections.IEnumerable)res.Data!.GetType().GetProperty("SaleList")!.GetValue(res.Data)!).Cast<SaleListDto>().ToList();

            Assert.Equal(approved.Id, Assert.Single(list).Id);
            Assert.DoesNotContain(list, x => x.Id == draft.Id);
        }
    }
}
