using Application.Common.Contracts.Context;
using Application.Common.Contracts.InventoryCosting;
using Application.Common.Contracts.ProductUnit;
using Application.Common.Contracts.SaleReturn;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos.Returns;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Queries;
using Application.Common.Returns;
using Application.Features.SaleReturn.Queries;
using Common.Exceptions;
using Common.Extensions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.SaleReturn.Commands
{
    // A physical receiving/dispatch round against one or more goods effects on a return - goods
    // coming in to us from the customer (GOODS_IN) or going out to them (GOODS_OUT).
    // Replaces both ConfirmReturnInspectionCommand and ConfirmReplacementShipmentCommand: goods
    // rounds now target a specific effect explicitly on either side of the movement.
    public class ExecuteGoodsRoundCommand : IRequest<ResponseDto>
    {
        public int SaleReturnId { get; set; }
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
            RuleFor(x => x.SaleReturnId).GreaterThan(0).WithMessage(Validation.RequiredMessage("مرجوعی"));
            RuleFor(x => x.Rounds).NotEmpty().WithMessage(Validation.RequiredMessage("لیست اثرها"));
            RuleForEach(x => x.Rounds).ChildRules(line =>
            {
                line.RuleFor(l => l.EffectId).GreaterThan(0).WithMessage(Validation.RequiredMessage("اثر"));
                line.RuleFor(l => l.Quantity).GreaterThan(0).WithMessage("مقدار اجرا باید از صفر بیشتر باشد.");
                line.RuleForEach(l => l.Observations).ChildRules(obs =>
                    obs.RuleFor(o => o.Quantity).GreaterThanOrEqualTo(0).WithMessage("مقدار مشاهده نمی‌تواند منفی باشد."));
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
        private readonly ISaleReturnCalculationService _saleReturnCalculationService;
        private readonly IProductUnitService _productUnitService;
        private readonly IInventoryCostingService _inventoryCostingService;
        private readonly IUnitOfWork _unitOfWork;

        public ExecuteGoodsRoundCommandHandler(IWMSDbContext context, ISaleReturnCalculationService saleReturnCalculationService, IProductUnitService productUnitService, IInventoryCostingService inventoryCostingService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _saleReturnCalculationService = saleReturnCalculationService;
            _productUnitService = productUnitService;
            _inventoryCostingService = inventoryCostingService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(ExecuteGoodsRoundCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var saleReturn = await _context.SaleReturns.Where(x => x.Id == request.SaleReturnId)
                .WhereNotDeleted()
                .WithReturnGraph()
                .WithSaleItems()
                .FirstOrDefaultAsync(cancellationToken) ?? throw new NotFoundCustomException("مرجوعی مورد نظر یافت نشد.");

            if (_saleReturnCalculationService.IsTerminal(saleReturn.Status))
                throw new ValidationCustomException(ReturnLifecycleRules.NotEditableMessage(saleReturn.Status));

            var effectsById = saleReturn.Claims
                .SelectMany(c => c.Resolutions.SelectMany(r => r.Effects.Select(e => (claim: c, effect: e))))
                .ToDictionary(x => x.effect.Id);

            // ── Phase 1: validate every line before touching anything. ─────────────────────────────
            // This used to validate and mutate one line at a time, so a refusal on line 2 threw with
            // line 1's stock, AppliedQuantity, units and ledger rows already changed on the tracked
            // graph. Nothing is saved on a throw, but that is only safe as long as nobody ever reuses
            // the context after catching - so the rule is now: all checks first, then all writes.
            var plan = new List<(GoodsRoundLineDto line, Domain.Entities.SaleReturnClaim claim, Domain.Entities.SaleReturnEffect effect, int healthy)>();
            var requestedPerEffect = new Dictionary<int, int>();

            foreach (var line in request.Rounds)
            {
                if (!effectsById.TryGetValue(line.EffectId, out var found))
                    throw new NotFoundCustomException("اثر مورد نظر یافت نشد.");

                var (claim, effect) = found;

                if (effect.Direction is not (ReturnEffectDirectionEnum.GOODS_IN or ReturnEffectDirectionEnum.GOODS_OUT))
                    throw new ValidationCustomException("فقط اثرهای کالایی می‌توانند اجرا شوند.");

                // No quarantine on the sale side: goods leaving come off the shelf, goods arriving have no source.
                if (line.Source.HasValue && !(effect.Direction == ReturnEffectDirectionEnum.GOODS_OUT && line.Source == ProductUnitStatusEnum.IN_STOCK))
                    throw new ValidationCustomException("مرجوعی فروش قرنطینه ندارد؛ منبع دانه‌ها فقط برای خروج کالا و فقط «موجودی» (IN_STOCK) قابل ذکر است.");

                // Summed per effect: the same effect twice in one round is checked as its total.
                requestedPerEffect[effect.Id] = requestedPerEffect.GetValueOrDefault(effect.Id) + line.Quantity;
                if (requestedPerEffect[effect.Id] > effect.RemainingQuantity)
                    throw new ValidationCustomException("مقدار اجرا از باقیمانده این اثر بیشتر است.");

                // Only a customer's own units on their sale line can be scanned coming back; goods arriving without
                // that line create brand-new units, which have no barcode yet.
                var restoresLineUnits = effect.ProductId == claim.ProductId
                    && (claim.OnOrderSaleItemId.HasValue || (claim.OffScopeKind == ReturnOffScopeKindEnum.EXCESS && claim.SaleItemId.HasValue));
                if (effect.Direction == ReturnEffectDirectionEnum.GOODS_IN && !restoresLineUnits && line.ProductUnitBarcodes is { Count: > 0 })
                    throw new ValidationCustomException("این کالای ورودی به قلم فروش مرتبط نیست و دانه‌ی تازه می‌سازد؛ بارکدی برای اسکن ندارد، بارکد نفرستید.");

                var observed = (line.Observations ?? new()).Where(o => o.Quantity > 0).Sum(o => o.Quantity);
                plan.Add((line, claim, effect, line.Quantity - observed));
            }

            var productIds = plan.Select(p => p.effect.ProductId!.Value).Distinct().ToList();
            var products = await _context.Products
                .Where(p => productIds.Contains(p.Id))
                .ToDictionaryAsync(p => p.Id, cancellationToken);

            if (products.Count != productIds.Count)
                throw new NotFoundCustomException("کالای مورد نظر یافت نشد.");

            // Stock is simulated in request order, so an inbound line earlier in the same round still
            // covers an outbound one after it.
            var projectedStock = products.ToDictionary(p => p.Key, p => p.Value.Stock);
            foreach (var (line, _, effect, healthy) in plan)
            {
                var productId = effect.ProductId!.Value;

                if (effect.Direction == ReturnEffectDirectionEnum.GOODS_IN)
                {
                    projectedStock[productId] += healthy;
                }
                else
                {
                    if (products[productId].RequiresUnitTracking && (line.ProductUnitBarcodes?.Count ?? 0) == 0)
                        throw new ValidationCustomException($"کالای «{products[productId].Name}» ردیابی دانه‌ای دارد؛ بارکد دانه‌های خروجی باید اسکن شود.");

                    if (line.Quantity > projectedStock[productId])
                        throw new ValidationCustomException($"موجودی «{products[productId].Name}» برای این ارسال کافی نیست.");
                    projectedStock[productId] -= line.Quantity;
                }
            }

            // ── Phase 2: apply. ────────────────────────────────────────────────────────────────────
            // The same mechanics for every effect, whatever its claim: GOODS_IN raises stock by its healthy
            // units and enters the cost pool at the effect's UnitCost (when omitted, the running average, or the purchase price if that is 0); GOODS_OUT lowers stock, consumes
            // units and leaves the pool at the running average. The only refusals left are
            // ProductUnitService's own DB-state checks, which throw before SaveChanges.
            var now = request.Date ?? DateTime.Now;

            foreach (var (line, claim, effect, healthy) in plan)
            {
                var product = products[effect.ProductId!.Value];
                var isGoodsIn = effect.Direction == ReturnEffectDirectionEnum.GOODS_IN;

                var round = new Domain.Entities.SaleReturnEffectRound
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

                foreach (var obs in (line.Observations ?? new()).Where(o => o.Quantity > 0))
                {
                    round.Observations.Add(new Domain.Entities.SaleReturnEffectObservation
                    {
                        Problem = obs.Problem,
                        Quantity = obs.Quantity,
                        Note = obs.Note,
                    });
                }

                effect.History.Add(round);
                effect.AppliedQuantity += line.Quantity;

                // Which sale line the units belong to - identity only, not a stock or cost rule. Only an
                // ON_ORDER claim's own product has a line; a different product moved on the same claim does not.
                var unitLine = effect.ProductId == claim.ProductId ? claim.OnOrderSaleItemId : null;

                // An EXCESS claim's own product comes back as the excess units recorded on its line (ShipSale ExcessQuantity).
                var excessLine = effect.ProductId == claim.ProductId && claim.OffScopeKind == ReturnOffScopeKindEnum.EXCESS ? claim.SaleItemId : null;

                var movement = new UnitMovementContext(
                    isGoodsIn ? ProductUnitMovementReasonEnum.SALE_RETURN_RECEIVED : ProductUnitMovementReasonEnum.SALE_RETURN_SHIPPED,
                    now, DocumentKindEnum.SALE_RETURN, saleReturn.Id, CustomerId: saleReturn.Sale!.CustomerId, Note: request.Note);

                if (isGoodsIn)
                {
                    var scrapped = line.Quantity - healthy;
                    product.Stock += healthy;
                    effect.RestockedQuantity = (effect.RestockedQuantity ?? 0) + healthy;

                    // With a line, the customer's own SOLD units come back (healthy to IN_STOCK, the rest
                    // SCRAPPED); without one there are no units to restore, so the healthy ones are minted.
                    // Scanned: the observations' barcodes name exactly which of the scanned units are the scrap.
                    var scrapBarcodes = (line.Observations ?? new()).SelectMany(o => o.ProductUnitBarcodes ?? new()).ToList();

                    if (unitLine is int saleItemId)
                        await _productUnitService.RestoreAsync(saleItemId, false, healthy, scrapped, line.ProductUnitBarcodes, scrapBarcodes, movement, cancellationToken);
                    else if (excessLine is int excessSaleItemId)
                        await _productUnitService.RestoreAsync(excessSaleItemId, true, healthy, scrapped, line.ProductUnitBarcodes, scrapBarcodes, movement, cancellationToken);
                    else
                        await _productUnitService.MintAsync(product, healthy, UnitOrigin.None, movement, cancellationToken);

                    if (healthy > 0)
                        await _inventoryCostingService.RecordSaleReturnRestockAsync(product, healthy, effect.UnitCost, unitLine ?? excessLine, now, cancellationToken);
                }
                else
                {
                    product.Stock -= line.Quantity;
                    await _productUnitService.ConsumeAsync(product, line.Quantity, unitLine, unitLine.HasValue ? UnitCustodyReasonEnum.ON_ORDER : null, line.ProductUnitBarcodes, movement, cancellationToken);
                    await _inventoryCostingService.RecordReplacementShippedToCustomerAsync(product, line.Quantity, unitLine, now, cancellationToken);
                }

                if (effect.AppliedQuantity >= effect.Quantity)
                {
                    effect.Status = ReturnEffectStatusEnum.APPLIED;
                    effect.AppliedAt = now;

                    var resolution = claim.Resolutions.First(r => r.Effects.Contains(effect));
                    if (resolution.Effects.All(e => e.Status != ReturnEffectStatusEnum.PENDING) && claim.OnOrderSaleItemId is int settledSaleItemId)
                    {
                        var saleItem = saleReturn.Sale!.Items.First(x => x.Id == settledSaleItemId);
                        saleItem.SettledQuantity += resolution.Quantity;
                    }
                }
            }

            saleReturn.Status = _saleReturnCalculationService.RecomputeReturnStatus(saleReturn);
            saleReturn.UpdatedAt = now;

            var sale = saleReturn.Sale!;
            sale.Status = _saleReturnCalculationService.RecomputeSaleStatus(sale);
            sale.UpdatedAt = now;

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await SaleReturnDetailReader.ReadAsync(_context, _saleReturnCalculationService, saleReturn.Id, cancellationToken);
            res.Message = "اجرای مرحله با موفقیت ثبت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
