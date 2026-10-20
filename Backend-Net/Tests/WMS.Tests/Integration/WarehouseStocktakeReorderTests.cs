using Application.Common.Contracts.ProductUnit;
using Application.Common.Settings;
using Application.Common.Warehouses;
using Application.Features.Purchase.Commands;
using Application.Features.Reorder.Commands;
using Application.Features.Reorder.Dtos;
using Application.Features.Reorder.Queries;
using Application.Features.Setting.Commands;
using Application.Features.Setting.Queries;
using Application.Features.Stocktaking;
using Application.Features.Stocktaking.Commands;
using Application.Features.Stocktaking.Dtos;
using Application.Features.Warehousing.Commands;
using Application.Features.Warehousing.Dtos;
using Application.Features.Warehousing.Queries;
using Common.Exceptions;
using Domain.Entities;
using Domain.Enums;
using MediatR;
using WMS.Tests.Support;

namespace WMS.Tests.Integration
{
    /// <summary>
    /// GAP-08 (warehouses behind a switch), GAP-01 (stocktake), GAP-04 (reorder) and the settings moved off appsettings.json.
    /// </summary>
    public class WarehouseStocktakeReorderTests
    {
        private static IMediator Mediator(TestScope scope) => ProformaFlow.Mediator(scope, Seed.PersistedUser(scope.Context).Id);

        private static Task SetAsync(IMediator mediator, SystemSettingDefinition setting, string value) =>
            mediator.Send(new UpdateSystemSettingsCommand { Settings = new() { new() { Key = setting.Key, Value = value } } });

        private static async Task<WarehouseDto> SecondWarehouseAsync(IMediator mediator) =>
            Assert.IsType<WarehouseDto>((await mediator.Send(new CreateWarehouseCommand { Code = "shop", Name = "فروشگاه" })).Data);

        private static async Task<(Product Product, List<string> Barcodes)> StockAsync(TestScope scope, int count)
        {
            var product = Seed.Product(Seed.Category(), stock: 0);
            scope.Context.Products.Add(product);
            scope.Context.SaveChanges();
            return (product, await ProformaFlow.ScannableStockAsync(scope, product, count));
        }

        // ---------------- GAP-08 ----------------

        [Fact]
        public async Task EveryUnit_LivesInTheDefaultWarehouse_AndARequestedWarehouseIsIgnored_WhileTheSwitchIsOff()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = Mediator(scope);
            var (_, barcodes) = await StockAsync(scope, 2);
            var shop = await SecondWarehouseAsync(mediator);

            using (var verify = db.NewContext())
                Assert.All(verify.ProductUnits.Where(u => barcodes.Contains(u.Barcode)), u => Assert.Equal(1, u.WarehouseId));
            Assert.Null(await WarehouseScope.ResolveAsync(scope.Context, shop.Id, CancellationToken.None));
            await Assert.ThrowsAsync<ValidationCustomException>(() => mediator.Send(new CreateStockTransferCommand
            {
                FromWarehouseId = 1,
                ToWarehouseId = shop.Id,
                Lines = new() { new() { ProductId = 1, Quantity = 1 } },
            }));

            var flags = Assert.IsType<Dictionary<string, object>>((await mediator.Send(new GetFeatureFlagsQuery())).Data);
            Assert.Equal(false, flags[SystemSettingCatalog.WarehouseMultiWarehouseEnabled.Key]);
        }

        [Fact]
        public async Task ATransfer_TakesUnitsOffTheShelf_UntilReceived_AndAnInTransitOne_CanStillBeFinishedAfterSwitchingOff()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = Mediator(scope);
            var (product, _) = await StockAsync(scope, 5);
            var shop = await SecondWarehouseAsync(mediator);
            await SetAsync(mediator, SystemSettingCatalog.WarehouseMultiWarehouseEnabled, "true");
            Assert.Equal(shop.Id, await WarehouseScope.ResolveAsync(scope.Context, shop.Id, CancellationToken.None));

            var first = Assert.IsType<StockTransferDto>((await mediator.Send(new CreateStockTransferCommand
            {
                FromWarehouseId = 1,
                ToWarehouseId = shop.Id,
                Lines = new() { new() { ProductId = product.Id, Quantity = 2 } },
            })).Data);
            Assert.Equal(StockTransferStatusEnum.IN_TRANSIT, first.Status);
            Assert.Equal(2, first.Products.Single().Quantity);
            Assert.Equal(3, scope.Context.Products.Single(p => p.Id == product.Id).Stock);

            await mediator.Send(new ReceiveStockTransferCommand { Id = first.Id });
            var perWarehouse = Assert.IsType<List<ProductWarehouseStockDto>>((await mediator.Send(new GetProductWarehouseStockQuery { ProductId = product.Id })).Data);
            Assert.Equal(3, perWarehouse.Single(w => w.WarehouseId == 1).InStock);
            Assert.Equal(2, perWarehouse.Single(w => w.WarehouseId == shop.Id).InStock);
            Assert.Equal(5, scope.Context.Products.Single(p => p.Id == product.Id).Stock);

            var second = Assert.IsType<StockTransferDto>((await mediator.Send(new CreateStockTransferCommand
            {
                FromWarehouseId = shop.Id,
                ToWarehouseId = 1,
                Lines = new() { new() { ProductId = product.Id, Quantity = 1 } },
            })).Data);

            // Switched off with a transfer on the road: nothing moves, nothing is lost, and it can still be finished.
            await SetAsync(mediator, SystemSettingCatalog.WarehouseMultiWarehouseEnabled, "false");
            var cancelled = Assert.IsType<StockTransferDto>((await mediator.Send(new CancelStockTransferCommand { Id = second.Id })).Data);
            Assert.Equal(StockTransferStatusEnum.CANCELLED, cancelled.Status);
            Assert.Equal(2, scope.Context.ProductUnits.Count(u => u.ProductId == product.Id && u.WarehouseId == shop.Id && u.Status == ProductUnitStatusEnum.IN_STOCK));

            // Units in the other warehouse stay sellable while off: picking takes them from any warehouse.
            var units = await scope.ProductUnitService.ConsumeAsync(scope.Context.Products.Single(p => p.Id == product.Id), 5, null, null, null,
                new UnitMovementContext(ProductUnitMovementReasonEnum.SALE_SHIPPED, DateTime.Now), CancellationToken.None);
            Assert.Equal(5, units.Count);
        }

        [Fact]
        public async Task TheDefaultWarehouse_CannotBeDeleted_AndOneHoldingStockCannotEither()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = Mediator(scope);
            var shop = await SecondWarehouseAsync(mediator);

            await Assert.ThrowsAsync<ValidationCustomException>(() => mediator.Send(new DeleteWarehouseCommand { Id = 1 }));

            var moved = Assert.IsType<WarehouseDto>((await mediator.Send(new UpdateWarehouseCommand { Id = shop.Id, Code = "SHOP", Name = "فروشگاه", IsDefault = true })).Data);
            Assert.True(moved.IsDefault);
            var list = Assert.IsType<List<WarehouseDto>>((await mediator.Send(new GetWarehouseListQuery())).Data);
            Assert.Single(list, w => w.IsDefault);

            await mediator.Send(new DeleteWarehouseCommand { Id = 1 });
            Assert.False(scope.Context.Warehouses.Single(w => w.Id == 1).IsActive);
        }

        // ---------------- GAP-01 ----------------

        private static async Task<StocktakeDto> StocktakeAsync(IMediator mediator, int productId) =>
            Assert.IsType<StocktakeDto>((await mediator.Send(new CreateStocktakeCommand { Title = "شمارش ماهانه", ProductIds = new() { productId } })).Data);

        [Fact]
        public async Task Stocktake_ByScanning_MarksTheUnitsNotFoundMissing_OnlyWhenApproved()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = Mediator(scope);
            var (product, barcodes) = await StockAsync(scope, 3);

            var stocktake = await StocktakeAsync(mediator, product.Id);
            stocktake = Assert.IsType<StocktakeDto>((await mediator.Send(new ScanStocktakeUnitsCommand { StocktakeId = stocktake.Id, Barcodes = new() { barcodes[0], barcodes[1], barcodes[1], "UNKNOWN-1" } })).Data);

            // Blind while counting (the default): the system quantity is withheld.
            Assert.True(stocktake.IsBlind);
            Assert.Null(stocktake.Lines.Single().SystemQuantity);
            Assert.Equal(2, stocktake.Lines.Single().ScannedCount);
            Assert.Equal(new[] { "UNKNOWN-1" }, stocktake.UnknownBarcodes);

            stocktake = Assert.IsType<StocktakeDto>((await mediator.Send(new SubmitStocktakeCommand { Id = stocktake.Id })).Data);
            var line = stocktake.Lines.Single();
            Assert.Equal(3, line.SystemQuantity);
            Assert.Equal(-1, line.Difference);
            Assert.Equal(new[] { barcodes[2] }, line.MissingBarcodes);
            Assert.Equal(3, scope.Context.Products.Single(p => p.Id == product.Id).Stock);

            stocktake = Assert.IsType<StocktakeDto>((await mediator.Send(new ApproveStocktakeCommand { Id = stocktake.Id })).Data);

            Assert.Equal(StocktakeStatusEnum.APPROVED, stocktake.Status);
            Assert.Equal(1, stocktake.Lines.Single().AppliedMissing);
            using var verify = db.NewContext();
            Assert.Equal(2, verify.Products.Single(p => p.Id == product.Id).Stock);
            Assert.Equal(ProductUnitStatusEnum.SCRAPPED, verify.ProductUnits.Single(u => u.Barcode == barcodes[2]).Status);
            Assert.Equal(2, verify.ProductUnits.Count(u => u.ProductId == product.Id && u.Status == ProductUnitStatusEnum.IN_STOCK));
            Assert.Equal(ProductUnitMovementReasonEnum.STOCKTAKE_ADJUSTMENT,
                verify.ProductUnitMovements.Where(m => m.ProductUnit.Barcode == barcodes[2]).OrderByDescending(m => m.Id).First().Reason);
        }

        [Fact]
        public async Task Stocktake_ByTypedCount_AdjustsByTheDifferenceFromTheSnapshot_EvenIfStockMovedSince()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = Mediator(scope);
            await SetAsync(mediator, SystemSettingCatalog.StocktakeBlindCount, "false");
            var (product, _) = await StockAsync(scope, 5);
            var stocktake = await StocktakeAsync(mediator, product.Id);

            // One sold after the snapshot: the count (taken as of the snapshot) must not see it as missing.
            await scope.ProductUnitService.ConsumeAsync(scope.Context.Products.Single(p => p.Id == product.Id), 1, null, null, null,
                new UnitMovementContext(ProductUnitMovementReasonEnum.SALE_SHIPPED, DateTime.Now), CancellationToken.None);
            scope.Context.Products.Single(p => p.Id == product.Id).Stock -= 1;
            await scope.Context.SaveChangesAsync();

            stocktake = Assert.IsType<StocktakeDto>((await mediator.Send(new CountStocktakeLineCommand { StocktakeId = stocktake.Id, ProductId = product.Id, Quantity = 7 })).Data);
            Assert.False(stocktake.IsBlind);
            Assert.Equal(StocktakeCountModeEnum.MANUAL, stocktake.Lines.Single().CountMode);
            Assert.Equal(2, stocktake.Lines.Single().Difference);

            await mediator.Send(new SubmitStocktakeCommand { Id = stocktake.Id });
            await mediator.Send(new ApproveStocktakeCommand { Id = stocktake.Id });

            using var verify = db.NewContext();
            Assert.Equal(6, verify.Products.Single(p => p.Id == product.Id).Stock);
            Assert.Equal(6, verify.ProductUnits.Count(u => u.ProductId == product.Id && u.Status == ProductUnitStatusEnum.IN_STOCK));
        }

        [Fact]
        public async Task Stocktake_FindsUnitsTheBooksHadInAnotherWarehouse_AndMovesThemHere()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = Mediator(scope);
            var (product, barcodes) = await StockAsync(scope, 2);
            var shop = await SecondWarehouseAsync(mediator);
            var misplaced = scope.Context.ProductUnits.Single(u => u.Barcode == barcodes[1]);
            misplaced.WarehouseId = shop.Id;
            await scope.Context.SaveChangesAsync();

            var stocktake = await StocktakeAsync(mediator, product.Id);
            await mediator.Send(new ScanStocktakeUnitsCommand { StocktakeId = stocktake.Id, Barcodes = barcodes });
            stocktake = Assert.IsType<StocktakeDto>((await mediator.Send(new SubmitStocktakeCommand { Id = stocktake.Id })).Data);
            Assert.Equal(1, stocktake.Lines.Single().RelocatedCount);
            Assert.Equal(0, stocktake.Lines.Single().MissingCount);

            await mediator.Send(new ApproveStocktakeCommand { Id = stocktake.Id });

            using var verify = db.NewContext();
            Assert.Equal(1, verify.ProductUnits.Single(u => u.Barcode == barcodes[1]).WarehouseId);
            Assert.Equal(2, verify.Products.Single(p => p.Id == product.Id).Stock);
        }

        [Fact]
        public async Task TwoOpenStocktakes_OfTheSameProducts_AreRefused()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = Mediator(scope);
            var (product, _) = await StockAsync(scope, 1);
            var first = await StocktakeAsync(mediator, product.Id);

            await Assert.ThrowsAsync<ValidationCustomException>(() => StocktakeAsync(mediator, product.Id));

            await mediator.Send(new CancelStocktakeCommand { Id = first.Id });
            await StocktakeAsync(mediator, product.Id);
        }

        // ---------------- GAP-04 ----------------

        [Fact]
        public async Task Reorder_SuggestsUpToTheTarget_CountingOpenPurchases_AndDraftsStopTheSuggestion()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = Mediator(scope);
            var supplier = Seed.Supplier();
            scope.Context.Suppliers.Add(supplier);
            var product = Seed.Product(Seed.Category(), stock: 0);
            product.LowStockThreshold = 5;
            product.TargetStock = 10;
            product.MinOrderQuantity = 4;
            product.PreferredSupplier = supplier;
            scope.Context.Products.Add(product);
            scope.Context.SaveChanges();
            await ProformaFlow.ScannableStockAsync(scope, product, 2);
            var open = Seed.Purchase(supplier, PurchaseStatusEnum.SHIPPED, Seed.PurchaseItem(product, 3, unitPrice: 900));
            scope.Context.Purchases.Add(open);
            scope.Context.SaveChanges();

            var suggestions = Assert.IsType<List<ReorderSuggestionDto>>((await mediator.Send(new GetReorderSuggestionListQuery())).Data);
            var suggestion = Assert.Single(suggestions);
            Assert.Equal(3, suggestion.OnOrder);
            // Target 10 - (2 + 3) = 5, rounded up to the minimum order of 4 -> 8.
            Assert.Equal(8, suggestion.SuggestedQuantity);
            Assert.Equal(supplier.Id, suggestion.SupplierId);
            Assert.True(suggestion.IsPreferredSupplier);
            Assert.Equal(900UL, suggestion.LastUnitPrice);

            await mediator.Send(new CreatePurchaseDraftsFromReorderCommand
            {
                Lines = new() { new() { ProductId = product.Id, SupplierId = supplier.Id, Quantity = suggestion.SuggestedQuantity, UnitPrice = suggestion.LastUnitPrice } },
            });

            var draft = scope.Context.Purchases.Single(p => p.SupplierId == supplier.Id && p.Status == PurchaseStatusEnum.PROFORMA);
            Assert.Equal(8, scope.Context.PurchaseItems.Single(i => i.PurchaseId == draft.Id).Quantity);
            Assert.Empty(Assert.IsType<List<ReorderSuggestionDto>>((await mediator.Send(new GetReorderSuggestionListQuery())).Data));
        }

        // ---------------- settings moved off appsettings.json ----------------

        [Fact]
        public async Task TheCompanyLetterhead_ComesFromTheSettingsPage()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = Mediator(scope);

            await mediator.Send(new UpdateSystemSettingsCommand
            {
                Settings = new() { new() { Key = SystemSettingCatalog.CompanyName.Key, Value = "شرکت آزمایشی" }, new() { Key = SystemSettingCatalog.CompanyCity.Key, Value = "کرمان" } },
            });

            var company = await SystemSettingValues.CompanyAsync(scope.Context, CancellationToken.None);
            Assert.Equal("شرکت آزمایشی", company.Name);
            Assert.Equal("کرمان", company.City);
            Assert.Null(company.EconomicCode);
            Assert.Equal("ریال", company.Currency);
        }
    }
}
