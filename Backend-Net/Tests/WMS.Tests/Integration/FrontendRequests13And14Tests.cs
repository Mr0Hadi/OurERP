using Application.Common.Dtos;
using Application.Common.Dtos.Returns;
using Application.Features.Product.Dtos;
using Application.Features.Product.Queries;
using Application.Features.Purchase.Commands;
using Application.Features.Purchase.Dtos;
using Application.Features.Purchase.Queries;
using Application.Features.PurchaseReturn.Dtos;
using Application.Features.Sale.Dtos;
using Application.Features.Sale.Queries;
using Common.Exceptions;
using Domain.Enums;
using MediatR;
using WMS.Tests.Support;
using PR = Application.Features.PurchaseReturn.Commands;
using PRQ = Application.Features.PurchaseReturn.Queries;

namespace WMS.Tests.Integration
{
    /// <summary>
    /// docs/frontend-requests.fa.md sections 13 and 14: rules the frontend had copied from the server, now answered by the server
    /// from the same functions the commands enforce.
    /// </summary>
    public class FrontendRequests13And14Tests
    {
        private static CancellationToken Ct => TestContext.Current.CancellationToken;

        private static async Task<PurchaseScenario> Received(IMediator mediator, TestScope scope, int ordered, int arrived, int defective)
        {
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: ordered, stock: 0, unitPrice: 1000);
            await mediator.Send(new ReceivePurchaseCommand
            {
                PurchaseId = scenario.Purchase.Id,
                Items = new()
                {
                    new ReceivePurchaseItemDto
                    {
                        PurchaseItemId = scenario.Item.Id,
                        ArrivedQuantity = arrived,
                        Defects = defective > 0 ? new() { new ReceivingDefectDto { Problem = ReturnProblemEnum.DAMAGED_IN_TRANSIT, Quantity = defective } } : new(),
                    },
                },
            }, Ct);
            return scenario;
        }

        private static CreateReturnClaimDto OnOrder(PurchaseScenario s, int quantity) => new()
        {
            Scope = ReturnClaimScopeEnum.ON_ORDER, OrderLineId = s.Item.Id, ProductId = s.Product.Id, UnitPrice = s.Item.UnitPrice, Quantity = quantity, Problem = ReturnProblemEnum.DEFECTIVE,
        };

        private static async Task<PurchaseReturnDetailDto> CreateReturn(IMediator mediator, PurchaseScenario s, params CreateReturnClaimDto[] claims) =>
            Assert.IsType<PurchaseReturnDetailDto>((await mediator.Send(new PR.CreatePurchaseReturnCommand { PurchaseId = s.Purchase.Id, Claims = claims.ToList() }, Ct)).Data);

        // ---- 13.1: allowed-action flags on the purchase ----

        [Fact]
        public async Task PurchaseFlags_FollowTheCommands_BeforeAndAfterReceiving()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = ProformaFlow.Mediator(scope, Seed.PersistedUser(scope.Context).Id);
            var s = Seed.PendingPurchase(scope.Context, orderedQuantity: 10);

            var before = await PurchaseDetailReader.ReadAsync(scope.Db, FakeObjectStorage.Instance, s.Purchase.Id, Ct);
            Assert.False(before.CanDelete); // not a proforma
            Assert.True(before.CanCancel);
            Assert.Equal(new[] { PurchaseStatusEnum.PENDING }, before.AllowedStatuses);
            Assert.False(before.CanCreateReturn);
            Assert.False(before.Items.Single().CanClose);
            Assert.False(before.Items.Single().CanReopen);

            // CreatePurchaseReturn refuses the same thing the flag says.
            var refused = await Assert.ThrowsAsync<ValidationCustomException>(() =>
                mediator.Send(new PR.CreatePurchaseReturnCommand { PurchaseId = s.Purchase.Id, Claims = new() { OnOrder(s, 1) } }, Ct));
            Assert.Contains("دریافت نشده", refused.Error);

            await mediator.Send(new ReceivePurchaseCommand
            {
                PurchaseId = s.Purchase.Id,
                Items = new() { new ReceivePurchaseItemDto { PurchaseItemId = s.Item.Id, ArrivedQuantity = 4 } },
            }, Ct);

            var after = await PurchaseDetailReader.ReadAsync(scope.Db, FakeObjectStorage.Instance, s.Purchase.Id, Ct);
            Assert.False(after.CanCancel);
            Assert.Empty(after.AllowedStatuses); // PARTIALLY_RECEIVED is computed, never chosen
            Assert.True(after.CanCreateReturn);
            Assert.True(after.Items.Single().CanClose);
            await Assert.ThrowsAsync<ValidationCustomException>(() =>
                mediator.Send(new ChangePurchaseStatusCommand { Id = s.Purchase.Id, Status = PurchaseStatusEnum.CANCELLED }, Ct));

            await mediator.Send(new ClosePurchaseItemCommand { PurchaseItemId = s.Item.Id }, Ct);
            var closed = await PurchaseDetailReader.ReadAsync(scope.Db, FakeObjectStorage.Instance, s.Purchase.Id, Ct);
            Assert.False(closed.Items.Single().CanClose);
            Assert.True(closed.Items.Single().CanReopen);
        }

        [Fact]
        public async Task PurchaseFlags_AProformaWithoutInvoiceDataMayOnlyBeDeletedOrCancelled()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var s = Seed.PendingPurchase(scope.Context);
            s.Purchase.Status = PurchaseStatusEnum.PROFORMA;
            s.Purchase.InvoiceNumber = "";
            s.Purchase.InvoiceDate = null;
            scope.Context.SaveChanges();

            var dto = await PurchaseDetailReader.ReadAsync(scope.Db, FakeObjectStorage.Instance, s.Purchase.Id, Ct);
            Assert.True(dto.CanDelete);
            Assert.True(dto.CanCancel);
            Assert.Empty(dto.AllowedStatuses); // leaving PROFORMA needs the supplier's number and date

            s.Purchase.InvoiceNumber = "F-1";
            s.Purchase.InvoiceDate = DateTime.Today;
            scope.Context.SaveChanges();
            dto = await PurchaseDetailReader.ReadAsync(scope.Db, FakeObjectStorage.Instance, s.Purchase.Id, Ct);
            Assert.Equal(new[] { PurchaseStatusEnum.PENDING, PurchaseStatusEnum.SHIPPED }, dto.AllowedStatuses);
        }

        // ---- 13.1: allowed-action flags on the sale ----

        [Fact]
        public async Task SaleFlags_ShippedSale_OffersDeliveredAndReturnOnly()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var s = Seed.ShippedSale(scope.Context, orderedQuantity: 2, shippedQuantity: 2);

            var dto = await SaleDetailReader.ReadAsync(scope.Db, FakeObjectStorage.Instance, scope.SaleReturnCalculation, s.Sale.Id, Ct);
            Assert.False(dto.CanDelete);
            Assert.False(dto.CanCancel);
            Assert.Equal(new[] { SalesStatusEnum.DELIVERED }, dto.AllowedStatuses);
            Assert.True(dto.CanCreateReturn);
        }

        [Fact]
        public async Task SaleFlags_DraftProforma_CanBeDeletedAndCancelledButNotIssued()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var s = Seed.Proforma(scope.Context, stage: SaleProformaStageEnum.DRAFT);

            var dto = await SaleDetailReader.ReadAsync(scope.Db, FakeObjectStorage.Instance, scope.SaleReturnCalculation, s.Sale.Id, Ct);
            Assert.True(dto.CanDelete);
            Assert.True(dto.CanCancel);
            Assert.Empty(dto.AllowedStatuses); // PROCESSING waits for the warehouse check
            Assert.False(dto.CanCreateReturn);
        }

        // ---- 13.2: optimistic concurrency on proforma edits ----

        [Fact]
        public async Task UpdatePurchase_WithAStaleUpdatedAt_Is409_AndWithTheCurrentOneSucceeds()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = ProformaFlow.Mediator(scope, Seed.PersistedUser(scope.Context).Id);
            var s = Seed.PendingPurchase(scope.Context);
            s.Purchase.Status = PurchaseStatusEnum.PROFORMA;
            s.Purchase.UpdatedAt = new DateTime(2026, 10, 1, 10, 0, 0, 123);
            scope.Context.SaveChanges();

            var read = await PurchaseDetailReader.ReadAsync(scope.Db, FakeObjectStorage.Instance, s.Purchase.Id, Ct);
            UpdatePurchaseCommand Edit(DateTime? updatedAt) => new()
            {
                Id = s.Purchase.Id,
                Status = PurchaseStatusEnum.PROFORMA,
                PaymentType = PaymentTypeEnum.CASH,
                SupplierId = s.Supplier.Id,
                Description = "ویرایش",
                UpdatedAt = updatedAt,
                ProductItemList = new() { new UpdatePurchaseItemDto { Id = s.Item.Id, ProductId = s.Product.Id, Quantity = 3, UnitPrice = 1000 } },
            };

            var conflict = await Assert.ThrowsAsync<ConflictCustomException>(() => mediator.Send(Edit(read.UpdatedAt.AddSeconds(-1)), Ct));
            Assert.Equal(409, conflict.StatusCode);

            var saved = Assert.IsType<PurchaseDto>((await mediator.Send(Edit(read.UpdatedAt), Ct)).Data);
            Assert.Equal("ویرایش", saved.Description);
            Assert.True(saved.UpdatedAt > read.UpdatedAt);

            // The copy just used is now stale.
            await Assert.ThrowsAsync<ConflictCustomException>(() => mediator.Send(Edit(read.UpdatedAt), Ct));
        }

        // ---- 13.3 / 14.2: list filters ----

        [Fact]
        public async Task GetPurchaseList_Returnable_KeepsOnlyPurchasesWithSomethingArrived()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = ProformaFlow.Mediator(scope, Seed.PersistedUser(scope.Context).Id);
            var nothing = Seed.PendingPurchase(scope.Context);
            var received = await Received(mediator, scope, ordered: 5, arrived: 5, defective: 0);

            var res = await mediator.Send(new GetPurchaseListQuery { Returnable = true, Take = 50 }, Ct);
            var ids = ((IEnumerable<PurchaseListDto>)res.Data!.GetType().GetProperty("PurchaseList")!.GetValue(res.Data)!).Select(p => p.Id).ToList();

            Assert.Contains(received.Purchase.Id, ids);
            Assert.DoesNotContain(nothing.Purchase.Id, ids);
        }

        [Fact]
        public async Task GetSaleList_Search_MatchesCustomerNameOrInvoiceNumber_AndReturnableFilters()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = ProformaFlow.Mediator(scope);
            var shipped = Seed.ShippedSale(scope.Context, orderedQuantity: 1, shippedQuantity: 1);
            shipped.Customer.FirstName = "مریم";
            shipped.Customer.LastName = "کاظمی";
            shipped.Sale.InvoiceNumber = "INV-77";
            var proforma = Seed.Proforma(scope.Context);
            scope.Context.SaveChanges();

            static List<int> Ids(ResponseDto res) =>
                ((IEnumerable<SaleListDto>)res.Data!.GetType().GetProperty("SaleList")!.GetValue(res.Data)!).Select(s => s.Id).ToList();

            Assert.Equal(new[] { shipped.Sale.Id }, Ids(await mediator.Send(new GetSaleListQuery { Search = "مریم کاظمی", Take = 50 }, Ct)));
            Assert.Equal(new[] { shipped.Sale.Id }, Ids(await mediator.Send(new GetSaleListQuery { Search = "INV-77", Take = 50 }, Ct)));

            var returnable = Ids(await mediator.Send(new GetSaleListQuery { Returnable = true, Take = 50 }, Ct));
            Assert.Contains(shipped.Sale.Id, returnable);
            Assert.DoesNotContain(proforma.Sale.Id, returnable);
        }

        // ---- 13.5: one search box for the item picker ----

        [Fact]
        public async Task GetProductList_Search_FindsByNameCodeOrUnitBarcode_ExactFirst()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = ProformaFlow.Mediator(scope);
            var category = Seed.Category();
            var filter = Seed.Product(category, name: "فیلتر روغن");
            var other = Seed.Product(category, name: "لنت ترمز");
            scope.Context.Products.AddRange(filter, other);
            scope.Context.SaveChanges();
            filter.Code = "14050101-" + filter.Id;
            other.Code = "14050101-" + filter.Id + "9"; // contains the first code as a substring
            scope.Context.SaveChanges();
            Seed.MintUnits(scope.Context, filter, 1);
            var unitBarcode = scope.Context.ProductUnits.Single(u => u.ProductId == filter.Id).Barcode;

            static List<ProductListDto> Rows(ResponseDto res) =>
                ((IEnumerable<ProductListDto>)res.Data!.GetType().GetProperty("ProductList")!.GetValue(res.Data)!).ToList();

            var byName = Rows(await mediator.Send(new GetProductListQuery { Search = "روغن فیلتر", Take = 50 }, Ct));
            Assert.Equal(new[] { filter.Id }, byName.Select(p => p.Id));

            var byCode = Rows(await mediator.Send(new GetProductListQuery { Search = filter.Code, Take = 50 }, Ct));
            Assert.Equal(new[] { filter.Id, other.Id }, byCode.Select(p => p.Id)); // the exact code leads
            Assert.True(byCode[0].IsExactMatch);
            Assert.False(byCode[1].IsExactMatch);

            var byUnit = Rows(await mediator.Send(new GetProductListQuery { Search = unitBarcode, Take = 50 }, Ct));
            Assert.Equal(filter.Id, byUnit.First().Id);
        }

        // ---- 13.4: preview a decision without saving ----

        [Fact]
        public async Task PreviewResolution_ReportsTheServersRefusalAndTheEffects_AndSavesNothing()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = ProformaFlow.Mediator(scope, Seed.PersistedUser(scope.Context).Id);
            var s = await Received(mediator, scope, ordered: 10, arrived: 10, defective: 3);
            var ret = await CreateReturn(mediator, s, OnOrder(s, 3));
            var claimId = ret.Claims.Single().Id;

            var tooMany = Assert.IsType<ResolutionPreviewDto>((await mediator.Send(new PRQ.PreviewClaimResolutionQuery
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto { Quantity = 3, GoodsRelease = new() { new QuarantineEffectDto { Quantity = 5 } } },
            }, Ct)).Data);
            Assert.False(tooMany.IsValid);
            Assert.Contains("آزاد است", tooMany.Errors.Single().Message);
            Assert.Equal(3000UL, tooMany.SuggestedMoneyAmount);

            var badShape = Assert.IsType<ResolutionPreviewDto>((await mediator.Send(new PRQ.PreviewClaimResolutionQuery
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto { Quantity = 0 },
            }, Ct)).Data);
            Assert.False(badShape.IsValid);
            Assert.Equal("quantity", badShape.Errors.Single().Field);

            var ok = Assert.IsType<ResolutionPreviewDto>((await mediator.Send(new PRQ.PreviewClaimResolutionQuery
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto
                {
                    Quantity = 3,
                    GoodsRelease = new() { new QuarantineEffectDto { Quantity = 2 } },
                    MoneyIn = new MoneyEffectDto { Method = ReturnPaymentMethodEnum.CASH, Amount = 1000 },
                },
            }, Ct)).Data);
            Assert.True(ok.IsValid);
            Assert.Empty(ok.Errors);
            Assert.Contains(ok.Effects, e => e.Direction == ReturnEffectDirectionEnum.GOODS_RELEASE && e.Quantity == 2 && e.ProductId == s.Product.Id);
            Assert.Contains(ok.Effects, e => e.Direction == ReturnEffectDirectionEnum.MONEY_IN && e.Amount == 1000 && e.Status == ReturnEffectStatusEnum.PENDING);

            using var verify = db.NewContext();
            Assert.Empty(verify.PurchaseReturnResolutions);
            Assert.Empty(verify.PurchaseReturnEffects);
        }

        // ---- 14.1 / 14.6: receiving info ----

        [Fact]
        public async Task ReceivingInfo_SuggestsClaimsFromQuarantine_ThenListsThemAsOtherReturnClaims()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = ProformaFlow.Mediator(scope, Seed.PersistedUser(scope.Context).Id);
            var s = await Received(mediator, scope, ordered: 10, arrived: 12, defective: 3); // 3 damaged on order, 2 excess (healthy-first: 9 good + ... )

            var info = Assert.IsType<PurchaseReceivingInfoDto>((await mediator.Send(new PRQ.GetPurchaseReceivingInfoQuery { PurchaseId = s.Purchase.Id }, Ct)).Data);
            var item = info.Items.Single();
            var onOrder = info.SuggestedClaims.Single(c => c.Scope == ReturnClaimScopeEnum.ON_ORDER);
            Assert.Equal(item.FreeQuarantinedOnOrderQuantity, onOrder.Quantity);
            Assert.Equal(ReturnProblemEnum.DAMAGED_IN_TRANSIT, onOrder.Problem); // what the warehouse recorded
            Assert.Equal(s.Item.Id, onOrder.OrderLineId);
            if (item.FreeExcessQuantity > 0)
                Assert.Equal(item.FreeExcessQuantity, info.SuggestedClaims.Single(c => c.OffScopeKind == ReturnOffScopeKindEnum.EXCESS).Quantity);
            Assert.Empty(item.OtherReturnClaims);

            // The suggestion is exactly what CreatePurchaseReturn accepts.
            var ret = await CreateReturn(mediator, s, info.SuggestedClaims.ToArray());

            info = Assert.IsType<PurchaseReceivingInfoDto>((await mediator.Send(new PRQ.GetPurchaseReceivingInfoQuery { PurchaseId = s.Purchase.Id }, Ct)).Data);
            Assert.Empty(info.SuggestedClaims); // all of it is claimed now
            var listed = info.Items.Single().OtherReturnClaims;
            Assert.Contains(listed, c => c.ReturnId == ret.Id && c.ReturnNumber == ret.ReturnNumber && c.OffScopeKind == null && c.Quantity == onOrder.Quantity);
        }

        [Fact]
        public async Task SaleDetail_ListsOtherReturnClaimsPerLine_LeavingOutRejectedReturns()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = ProformaFlow.Mediator(scope, Seed.PersistedUser(scope.Context).Id);
            var s = Seed.ShippedSale(scope.Context, orderedQuantity: 5, shippedQuantity: 5);
            CreateReturnClaimDto Claim(int q) => new()
            {
                Scope = ReturnClaimScopeEnum.ON_ORDER, OrderLineId = s.Item.Id, ProductId = s.Product.Id, UnitPrice = s.Item.UnitPrice, Quantity = q, Problem = ReturnProblemEnum.DEFECTIVE,
            };

            var kept = (dynamic)(await mediator.Send(new Application.Features.SaleReturn.Commands.CreateSaleReturnCommand { SaleId = s.Sale.Id, Claims = new() { Claim(2) } }, Ct)).Data!;
            var rejected = (dynamic)(await mediator.Send(new Application.Features.SaleReturn.Commands.CreateSaleReturnCommand { SaleId = s.Sale.Id, Claims = new() { Claim(1) } }, Ct)).Data!;
            await mediator.Send(new Application.Features.SaleReturn.Commands.RejectSaleReturnCommand { Id = (int)rejected.Id }, Ct);

            var dto = await SaleDetailReader.ReadAsync(scope.Db, FakeObjectStorage.Instance, scope.SaleReturnCalculation, s.Sale.Id, Ct);
            var other = Assert.Single(dto.Items.Single().OtherReturnClaims);
            Assert.Equal((int)kept.Id, other.ReturnId);
            Assert.Equal(2, other.Quantity);
        }

        // ---- 14.3 / 14.4 / 14.5: return detail ----

        [Fact]
        public async Task PurchaseReturnDetail_CarriesFreeQuarantine_PendingWork_CanRemove_AndTheBlocker()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = ProformaFlow.Mediator(scope, Seed.PersistedUser(scope.Context).Id);
            var s = await Received(mediator, scope, ordered: 10, arrived: 10, defective: 3);
            var ret = await CreateReturn(mediator, s, OnOrder(s, 3));
            Assert.Equal(3, ret.Claims.Single().FreeQuarantinedQuantity);
            Assert.Null(ret.LifecycleBlocker);
            Assert.Equal(0, ret.PendingWarehouseWork.QuarantineExit);

            var decided = Assert.IsType<PurchaseReturnDetailDto>((await mediator.Send(new PR.AddClaimResolutionCommand
            {
                ClaimId = ret.Claims.Single().Id,
                Composition = new EffectCompositionDto
                {
                    Quantity = 3,
                    GoodsRelease = new() { new QuarantineEffectDto { Quantity = 2 } },
                    GoodsOut = new() { new GoodsEffectDto { Quantity = 1, UnitPrice = 1000, Source = ProductUnitStatusEnum.QUARANTINED } },
                },
            }, Ct)).Data);

            Assert.Equal(2, decided.PendingWarehouseWork.QuarantineExit);
            Assert.Equal(0, decided.PendingWarehouseWork.GoodsIn);
            Assert.Equal(1, decided.PendingWarehouseWork.GoodsOut);
            Assert.True(decided.Claims.Single().Resolutions.Single().CanRemove);

            // Execute the release: goods moved, so the resolution can no longer be removed and the return cannot be cancelled.
            var releaseId = decided.Claims.Single().Resolutions.Single().Effects.Single(e => e.Direction == ReturnEffectDirectionEnum.GOODS_RELEASE).Id;
            var moved = Assert.IsType<PurchaseReturnDetailDto>((await mediator.Send(new PR.ExecuteGoodsRoundCommand
            {
                PurchaseReturnId = ret.Id,
                Rounds = new() { new GoodsRoundLineDto { EffectId = releaseId, Quantity = 2 } },
            }, Ct)).Data);

            Assert.False(moved.Claims.Single().Resolutions.Single().CanRemove);
            Assert.False(moved.CanCancel);
            Assert.NotNull(moved.LifecycleBlocker);
            Assert.Equal(0, moved.PendingWarehouseWork.QuarantineExit);
            await Assert.ThrowsAsync<ValidationCustomException>(() =>
                mediator.Send(new PR.RemoveClaimResolutionCommand { Id = moved.Claims.Single().Resolutions.Single().Id }, Ct));
        }

        [Fact]
        public void ResolutionPreviewField_IsTheRequestPathInCamelCase()
        {
            Assert.Equal("goods[0].quantity", Application.Common.Returns.ResolutionPreview.FieldOf("Composition.Goods[0].Quantity"));
            Assert.Equal("claimId", Application.Common.Returns.ResolutionPreview.FieldOf("ClaimId"));
            Assert.Null(Application.Common.Returns.ResolutionPreview.FieldOf(""));
        }

        [Fact]
        public void DocumentVersion_ComparesToTheMillisecond()
        {
            var at = new DateTime(2026, 10, 1, 10, 0, 0).AddTicks(1234567);
            Application.Common.Documents.DocumentVersion.Ensure(at, at.AddTicks(-at.Ticks % TimeSpan.TicksPerMillisecond), "x");
            Application.Common.Documents.DocumentVersion.Ensure(at, null, "x");
            Assert.Throws<ConflictCustomException>(() => Application.Common.Documents.DocumentVersion.Ensure(at, at.AddMilliseconds(1), "x"));
        }
    }
}
