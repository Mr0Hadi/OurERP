using Application.Common.Contracts.Context;
using Application.Common.Contracts.InventoryCosting;
using Application.Common.Contracts.ProductUnit;
using Application.Common.Contracts.PurchaseReturn;
using Application.Common.Contracts.Storage;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos.Returns;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Queries;
using Application.Common.Returns;
using Application.Features.PurchaseReturn.Queries;
using Common.Exceptions;
using Common.Extensions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.PurchaseReturn.Commands
{
    // A physical round against one or more goods effects on a return: goods coming in from the supplier (GOODS_IN), leaving us
    // back to them (GOODS_OUT), or moving out of quarantine inside the company (GOODS_RELEASE into stock, GOODS_SCRAP).
    // Goods rounds target a specific effect explicitly; where the units come from is stated on the line, never inferred.
    public class ExecuteGoodsRoundCommand : IRequest<ResponseDto>
    {
        public int PurchaseReturnId { get; set; }
        public List<GoodsRoundLineDto> Rounds { get; set; } = new();
        public DateTime? Date { get; set; }
        public string? PartyName { get; set; }
        public string? PartyNationalId { get; set; }
        public string? VehiclePlate { get; set; }
        public string? Note { get; set; }
    }

    public class ExecuteGoodsRoundCommandValidator : AbstractValidator<ExecuteGoodsRoundCommand>
    {
        public ExecuteGoodsRoundCommandValidator()
        {
            RuleFor(x => x.PurchaseReturnId).GreaterThan(0).WithMessage(Validation.RequiredMessage("مرجوعی"));
            RuleFor(x => x.Rounds).NotEmpty().WithMessage(Validation.RequiredMessage("لیست اثرها"));
            RuleForEach(x => x.Rounds).ChildRules(line =>
            {
                line.RuleFor(l => l.EffectId).GreaterThan(0).WithMessage(Validation.RequiredMessage("اثر"));
                line.RuleFor(l => l.Quantity).GreaterThan(0).WithMessage("مقدار اجرا باید از صفر بیشتر باشد.");
                line.RuleFor(l => l.Source).IsInEnum().WithMessage("منبع دانه‌ها نامعتبر است.").When(l => l.Source.HasValue);
                line.RuleForEach(l => l.Observations).ChildRules(obs =>
                {
                    obs.RuleFor(o => o.Quantity).GreaterThanOrEqualTo(0).WithMessage("مقدار مشاهده نمی‌تواند منفی باشد.");
                    obs.RuleFor(o => o.Problem).Must(ObservedProblems.IsObservable).WithMessage(ObservedProblems.NotObservableMessage);
                });
                // Healthy quantity is Quantity minus the observations; more observed than moved made it
                // negative, and that negative number was added straight to Product.Stock.
                line.RuleFor(l => l)
                    .Must(l => (l.Observations ?? new()).Where(o => o.Quantity > 0).Sum(o => o.Quantity) <= l.Quantity)
                    .WithMessage("مجموع مقدار مشاهده‌ها نمی‌تواند از مقدار اجرا بیشتر باشد.");
                line.RuleFor(l => l).Must(GoodsRoundBarcodes.CountsMatch).WithMessage(GoodsRoundBarcodes.CountMismatchMessage);
            });
        }
    }

    public class ExecuteGoodsRoundCommandHandler : IRequestHandler<ExecuteGoodsRoundCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IPurchaseReturnCalculationService _purchaseReturnCalculationService;
        private readonly IProductUnitService _productUnitService;
        private readonly IInventoryCostingService _inventoryCostingService;
        private readonly IObjectStorageService _objectStorageService;
        private readonly IUnitOfWork _unitOfWork;

        public ExecuteGoodsRoundCommandHandler(IWMSDbContext context, IPurchaseReturnCalculationService purchaseReturnCalculationService, IProductUnitService productUnitService, IInventoryCostingService inventoryCostingService, IObjectStorageService objectStorageService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _purchaseReturnCalculationService = purchaseReturnCalculationService;
            _productUnitService = productUnitService;
            _inventoryCostingService = inventoryCostingService;
            _objectStorageService = objectStorageService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(ExecuteGoodsRoundCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var purchaseReturn = await _context.PurchaseReturns.Where(x => x.Id == request.PurchaseReturnId)
                .WhereNotDeleted()
                .WithReturnGraph()
                .WithPurchaseItems()
                .FirstOrDefaultAsync(cancellationToken) ?? throw new NotFoundCustomException("مرجوعی مورد نظر یافت نشد.");

            if (_purchaseReturnCalculationService.IsTerminal(purchaseReturn.Status))
                throw new ValidationCustomException(ReturnLifecycleRules.NotEditableMessage(purchaseReturn.Status));

            var effectsById = purchaseReturn.Claims
                .SelectMany(c => c.Resolutions.SelectMany(r => r.Effects.Select(e => (claim: c, effect: e))))
                .ToDictionary(x => x.effect.Id);

            // ── Phase 1: validate every line before touching anything. ─────────────────────────────
            // This used to validate and mutate one line at a time, so a refusal on line 2 threw with
            // line 1's stock, AppliedQuantity, units and ledger rows already changed on the tracked
            // graph. Nothing is saved on a throw, but that is only safe as long as nobody ever reuses
            // the context after catching - so the rule is now: all checks first, then all writes.
            var plan = new List<(GoodsRoundLineDto line, Domain.Entities.PurchaseReturnClaim claim, Domain.Entities.PurchaseReturnEffect effect, int healthy)>();
            var requestedPerEffect = new Dictionary<int, int>();

            foreach (var line in request.Rounds)
            {
                if (!effectsById.TryGetValue(line.EffectId, out var found))
                    throw new NotFoundCustomException("اثر مورد نظر یافت نشد.");

                var (claim, effect) = found;

                if (!ReturnEffectDirections.IsGoods(effect.Direction))
                    throw new ValidationCustomException("فقط اثرهای کالایی می‌توانند اجرا شوند.");

                // Summed per effect: the same effect twice in one round is checked as its total.
                requestedPerEffect[effect.Id] = requestedPerEffect.GetValueOrDefault(effect.Id) + line.Quantity;
                if (requestedPerEffect[effect.Id] > effect.RemainingQuantity)
                    throw new ValidationCustomException("مقدار اجرا از باقیمانده این اثر بیشتر است.");

                switch (effect.Direction)
                {
                    case ReturnEffectDirectionEnum.GOODS_IN:
                        if (line.Source.HasValue)
                            throw new ValidationCustomException("کالای ورودی از جایی در انبار برداشته نمی‌شود؛ منبع (source) نفرستید.");
                        // A purchase-return GOODS_IN creates brand-new units, which have no barcode to scan yet.
                        if (line.ProductUnitBarcodes is { Count: > 0 })
                            throw new ValidationCustomException("کالای ورودی مرجوعی خرید دانه‌ی تازه می‌سازد و بارکدی برای اسکن ندارد؛ بارکد نفرستید.");
                        break;

                    case ReturnEffectDirectionEnum.GOODS_OUT:
                        // Stated by the warehouse, never inferred: shelf stock and quarantine are different goods with different value.
                        if (line.Source is not (ProductUnitStatusEnum.IN_STOCK or ProductUnitStatusEnum.QUARANTINED))
                            throw new ValidationCustomException("برای عودت کالا باید مشخص شود دانه‌ها از موجودی (IN_STOCK) برداشته می‌شوند یا از قرنطینه (QUARANTINED).");
                        break;

                    case ReturnEffectDirectionEnum.GOODS_RELEASE:
                        if (line.Source is not (null or ProductUnitStatusEnum.QUARANTINED))
                            throw new ValidationCustomException("آزادسازی فقط از قرنطینه انجام می‌شود.");
                        break;

                    default: // GOODS_SCRAP: from quarantine (the default, as before) or from sellable stock - a defect found after receiving.
                        if (line.Source is not (null or ProductUnitStatusEnum.QUARANTINED or ProductUnitStatusEnum.IN_STOCK))
                            throw new ValidationCustomException("اسقاط فقط از قرنطینه (QUARANTINED) یا از موجودی قابل فروش (IN_STOCK) انجام می‌شود.");
                        break;
                }

                var observed = effect.Direction == ReturnEffectDirectionEnum.GOODS_IN
                    ? (line.Observations ?? new()).Where(o => o.Quantity > 0).Sum(o => o.Quantity)
                    : 0;
                plan.Add((line, claim, effect, line.Quantity - observed));
            }

            var productIds = plan.Select(p => p.effect.ProductId!.Value).Distinct().ToList();
            var products = await _context.Products
                .Where(p => productIds.Contains(p.Id))
                .ToDictionaryAsync(p => p.Id, cancellationToken);

            if (products.Count != productIds.Count)
                throw new NotFoundCustomException("کالای مورد نظر یافت نشد.");

            // Sellable stock is simulated in request order, so an inbound line earlier in the same round still covers an outbound
            // one after it. Quarantine shortfalls are caught by ProductUnitService against the units themselves.
            var projectedStock = products.ToDictionary(p => p.Key, p => p.Value.Stock);
            foreach (var (line, _, effect, healthy) in plan)
            {
                var productId = effect.ProductId!.Value;

                // Goods leaving the company, from either source: a tracked product must be scanned.
                if (effect.Direction == ReturnEffectDirectionEnum.GOODS_OUT && products[productId].RequiresUnitTracking && (line.ProductUnitBarcodes?.Count ?? 0) == 0)
                    throw new ValidationCustomException($"کالای «{products[productId].Name}» ردیابی دانه‌ای دارد؛ بارکد دانه‌های خروجی باید اسکن شود.");

                switch (effect.Direction)
                {
                    case ReturnEffectDirectionEnum.GOODS_IN:
                        projectedStock[productId] += healthy;
                        break;
                    case ReturnEffectDirectionEnum.GOODS_RELEASE:
                        projectedStock[productId] += line.Quantity;
                        break;
                    case ReturnEffectDirectionEnum.GOODS_OUT when line.Source == ProductUnitStatusEnum.IN_STOCK:
                        if (line.Quantity > projectedStock[productId])
                            throw new ValidationCustomException($"موجودی «{products[productId].Name}» برای این عودت کافی نیست.");
                        projectedStock[productId] -= line.Quantity;
                        break;
                    case ReturnEffectDirectionEnum.GOODS_SCRAP when line.Source == ProductUnitStatusEnum.IN_STOCK:
                        if (line.Quantity > projectedStock[productId])
                            throw new ValidationCustomException($"موجودی «{products[productId].Name}» برای این اسقاط کافی نیست.");
                        projectedStock[productId] -= line.Quantity;
                        break;
                }
            }

            // ── Phase 2: apply. ────────────────────────────────────────────────────────────────────
            // One rule per direction, whatever the claim:
            //   GOODS_IN       healthy -> stock + pool at UnitCost; damaged part -> quarantine, value off-pool at UnitCost
            //   GOODS_OUT      IN_STOCK: stock - and pool out at the average; QUARANTINED: off-pool out at the units' held value
            //   GOODS_RELEASE  quarantine -> stock + pool at the units' held value, off-pool out
            //   GOODS_SCRAP    QUARANTINED (default): scrapped, off-pool out = reported loss at the units' held value;
            //                  IN_STOCK: stock - and pool out at the average = reported loss (a defect found on the shelf)
            // GOODS_IN UnitCost omitted: running average, else Product.PurchasePrice. Leaving quarantine never reads a cost from the
            // decision: each unit carries the value it entered with (ProductUnit.QuarantineCost). The only refusals left are
            // ProductUnitService's own unit-state checks, which throw before SaveChanges.
            var now = request.Date ?? DateTime.Now;
            var supplierId = purchaseReturn.Purchase!.SupplierId;

            foreach (var (line, claim, effect, healthy) in plan)
            {
                var product = products[effect.ProductId!.Value];
                var isGoodsIn = effect.Direction == ReturnEffectDirectionEnum.GOODS_IN;

                var round = new Domain.Entities.PurchaseReturnEffectRound
                {
                    Date = now,
                    Quantity = line.Quantity,
                    HealthyQuantity = isGoodsIn ? healthy : null,
                    PartyName = request.PartyName,
                    PartyNationalId = request.PartyNationalId,
                    VehiclePlate = request.VehiclePlate,
                    Note = request.Note,
                    CreatedAt = now,
                };

                foreach (var obs in (line.Observations ?? new()).Where(o => isGoodsIn && o.Quantity > 0))
                {
                    round.Observations.Add(new Domain.Entities.PurchaseReturnEffectObservation
                    {
                        Problem = obs.Problem,
                        Quantity = obs.Quantity,
                        Note = obs.Note,
                    });
                }

                effect.History.Add(round);
                effect.AppliedQuantity += line.Quantity;

                // Which purchase line the units belong to - identity only, not a stock or cost rule. Only an
                // ON_ORDER claim's own product has a line; a different product moved on the same claim does not.
                var sameProduct = effect.ProductId == claim.ProductId;
                var unitLine = sameProduct ? claim.OnOrderPurchaseItemId : null;
                var quarantine = PurchaseReturnQuarantine.For(claim, sameProduct, purchaseReturn.PurchaseId);

                UnitMovementContext Movement(ProductUnitMovementReasonEnum reason) =>
                    new(reason, now, DocumentKindEnum.PURCHASE_RETURN, purchaseReturn.Id, SupplierId: supplierId, Note: request.Note);

                switch (effect.Direction)
                {
                    case ReturnEffectDirectionEnum.GOODS_IN:
                    {
                        var damaged = line.Quantity - healthy;
                        product.Stock += healthy;
                        effect.RestockedQuantity = (effect.RestockedQuantity ?? 0) + healthy;

                        // Goods arriving through a return never touch PurchaseItem.ReceivedQuantity.
                        await _productUnitService.MintAsync(product, healthy,
                            new UnitOrigin(purchaseReturn.PurchaseId, unitLine, unitLine.HasValue ? UnitCustodyReasonEnum.ON_ORDER : null),
                            Movement(ProductUnitMovementReasonEnum.PURCHASE_RETURN_RECEIVED), cancellationToken);
                        if (healthy > 0)
                            await _inventoryCostingService.RecordPurchaseReturnReplacementReceivedAsync(product, healthy, effect.UnitCost, unitLine, now, cancellationToken);

                        // The damaged part is physically here too: held in quarantine under the claim's custody, not dropped, and
                        // carrying the value it entered the off-pool balance with.
                        if (damaged > 0)
                        {
                            var damagedCost = await _inventoryCostingService.RecordPurchaseReturnReplacementQuarantinedAsync(product, damaged, effect.UnitCost, unitLine, now, cancellationToken);
                            await _productUnitService.MintAsync(product, damaged,
                                UnitOrigin.Quarantined(quarantine.PurchaseId, quarantine.PurchaseItemId, quarantine.CustodyReason, damagedCost),
                                Movement(ProductUnitMovementReasonEnum.PURCHASE_RETURN_RECEIVED), cancellationToken);
                        }
                        break;
                    }

                    case ReturnEffectDirectionEnum.GOODS_OUT when line.Source == ProductUnitStatusEnum.IN_STOCK:
                        product.Stock -= line.Quantity;
                        await _inventoryCostingService.RecordPurchaseReturnShippedToSupplierAsync(product, line.Quantity, now, cancellationToken);
                        await _productUnitService.ReturnToSupplierAsync(product, line.Quantity, UnitSelection.InStock(unitLine), line.ProductUnitBarcodes,
                            Movement(ProductUnitMovementReasonEnum.PURCHASE_RETURN_SHIPPED), cancellationToken);
                        break;

                    case ReturnEffectDirectionEnum.GOODS_OUT:
                    {
                        var units = await _productUnitService.ReturnToSupplierAsync(product, line.Quantity, quarantine, line.ProductUnitBarcodes,
                            Movement(ProductUnitMovementReasonEnum.PURCHASE_RETURN_SHIPPED), cancellationToken);
                        await _inventoryCostingService.RecordPurchaseReturnShippedFromQuarantineAsync(product, line.Quantity, HeldValueOf(units), claim.Id, now, cancellationToken);
                        break;
                    }

                    case ReturnEffectDirectionEnum.GOODS_RELEASE:
                    {
                        product.Stock += line.Quantity;
                        var units = await _productUnitService.ReleaseFromQuarantineAsync(product, line.Quantity, quarantine, line.ProductUnitBarcodes,
                            Movement(ProductUnitMovementReasonEnum.QUARANTINE_RELEASED), cancellationToken);
                        await _inventoryCostingService.RecordQuarantineReleasedAsync(product, line.Quantity, HeldValueOf(units), claim.Id, now, cancellationToken);
                        break;
                    }

                    case ReturnEffectDirectionEnum.GOODS_SCRAP when line.Source == ProductUnitStatusEnum.IN_STOCK:
                        product.Stock -= line.Quantity;
                        await _productUnitService.ScrapFromStockAsync(product, line.Quantity, UnitSelection.InStock(unitLine), line.ProductUnitBarcodes,
                            Movement(ProductUnitMovementReasonEnum.STOCK_SCRAPPED), cancellationToken);
                        await _inventoryCostingService.RecordStockScrappedAsync(product, line.Quantity, claim.Id, now, cancellationToken);
                        break;

                    case ReturnEffectDirectionEnum.GOODS_SCRAP:
                    {
                        var units = await _productUnitService.ScrapFromQuarantineAsync(product, line.Quantity, quarantine, line.ProductUnitBarcodes,
                            Movement(ProductUnitMovementReasonEnum.QUARANTINE_SCRAPPED), cancellationToken);
                        await _inventoryCostingService.RecordQuarantineScrappedAsync(product, line.Quantity, HeldValueOf(units), claim.Id, now, cancellationToken);
                        break;
                    }
                }

                if (effect.AppliedQuantity >= effect.Quantity)
                {
                    effect.Status = ReturnEffectStatusEnum.APPLIED;
                    effect.AppliedAt = now;

                    var resolution = claim.Resolutions.First(r => r.Effects.Contains(effect));
                    if (resolution.Effects.All(e => e.Status != ReturnEffectStatusEnum.PENDING) && claim.OnOrderPurchaseItemId is int purchaseItemId)
                    {
                        var purchaseItem = purchaseReturn.Purchase!.Items.First(x => x.Id == purchaseItemId);
                        purchaseItem.SettledQuantity += resolution.Quantity;
                    }
                }
            }

            purchaseReturn.Status = _purchaseReturnCalculationService.RecomputeReturnStatus(purchaseReturn);
            purchaseReturn.UpdatedAt = now;

            var purchase = purchaseReturn.Purchase!;
            purchase.Status = _purchaseReturnCalculationService.RecomputePurchaseStatus(purchase);
            purchase.UpdatedAt = now;

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await PurchaseReturnDetailReader.ReadAsync(_context, _purchaseReturnCalculationService, _objectStorageService, purchaseReturn.Id, cancellationToken);
            res.Message = "اجرای مرحله با موفقیت ثبت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }

        /// <summary>What the moved quarantine units carried off-pool. The migration that added QuarantineCost backfilled every unit
        /// then in quarantine, and MintAsync refuses a quarantined unit without one, so a null here is not expected; it counts as 0.</summary>
        private static decimal HeldValueOf(List<Domain.Entities.ProductUnit> units) => units.Sum(u => u.QuarantineCost ?? 0m);
    }
}
