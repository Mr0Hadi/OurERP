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
    // A physical receiving/dispatch round against one or more goods effects on a return - goods
    // coming in to us (GOODS_IN) or leaving us back to the supplier (GOODS_OUT).
    // Replaces the purchase side's old implicit receiving-issue path entirely: goods rounds target
    // a specific effect explicitly, there is nothing left to infer.
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
                line.RuleForEach(l => l.Observations).ChildRules(obs =>
                    obs.RuleFor(o => o.Quantity).GreaterThanOrEqualTo(0).WithMessage("مقدار مشاهده نمی‌تواند منفی باشد."));
                // Healthy quantity is Quantity minus the observations; more observed than moved made it
                // negative, and that negative number was added straight to Product.Stock.
                line.RuleFor(l => l)
                    .Must(l => (l.Observations ?? new()).Where(o => o.Quantity > 0).Sum(o => o.Quantity) <= l.Quantity)
                    .WithMessage("مجموع مقدار مشاهده‌ها نمی‌تواند از مقدار اجرا بیشتر باشد.");
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

                if (effect.Direction is not (ReturnEffectDirectionEnum.GOODS_IN or ReturnEffectDirectionEnum.GOODS_OUT))
                    throw new ValidationCustomException("فقط اثرهای کالایی می‌توانند اجرا شوند.");

                // Summed per effect: the same effect twice in one round is checked as its total.
                requestedPerEffect[effect.Id] = requestedPerEffect.GetValueOrDefault(effect.Id) + line.Quantity;
                if (requestedPerEffect[effect.Id] > effect.RemainingQuantity)
                    throw new ValidationCustomException("مقدار اجرا از باقیمانده این اثر بیشتر است.");

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
                    if (line.Quantity > projectedStock[productId])
                        throw new ValidationCustomException($"موجودی «{products[productId].Name}» برای این عودت کافی نیست.");
                    projectedStock[productId] -= line.Quantity;
                }
            }

            // ── Phase 2: apply. ────────────────────────────────────────────────────────────────────
            // The same mechanics for every effect, whatever its claim: GOODS_IN raises stock, mints units
            // and enters the cost pool at the effect's UnitCost (when omitted, the running average, or the purchase price if that is 0); GOODS_OUT lowers stock, consumes
            // units and leaves the pool at the running average. The only refusals left are
            // ProductUnitService's own DB-state checks, which throw before SaveChanges.
            var now = request.Date ?? DateTime.Now;

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

                foreach (var obs in (line.Observations ?? new()).Where(o => o.Quantity > 0))
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
                var unitLine = effect.ProductId == claim.ProductId ? claim.OnOrderPurchaseItemId : null;

                if (isGoodsIn)
                {
                    product.Stock += healthy;
                    effect.RestockedQuantity = (effect.RestockedQuantity ?? 0) + healthy;

                    // Goods arriving through a return never touch PurchaseItem.ReceivedQuantity.
                    await _productUnitService.MintAsync(product, healthy, unitLine, cancellationToken);

                    if (healthy > 0)
                        await _inventoryCostingService.RecordPurchaseReturnReplacementReceivedAsync(product, healthy, effect.UnitCost, unitLine, now, cancellationToken);
                }
                else
                {
                    product.Stock -= line.Quantity;
                    await _inventoryCostingService.RecordPurchaseReturnShippedToSupplierAsync(product, line.Quantity, now, cancellationToken);
                    await _productUnitService.ReturnToSupplierAsync(product, line.Quantity, unitLine, cancellationToken);
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
    }
}
