using Application.Common.Contracts.Context;
using Application.Common.Contracts.InventoryCosting;
using Application.Common.Contracts.ProductUnit;
using Application.Common.Contracts.PurchaseReturn;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Common.Exceptions;
using Common.Extensions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.PurchaseReturn.Commands
{
    // A physical receiving/dispatch round against one or more goods effects on a return - the
    // supplier sending a replacement (GOODS_IN) or us physically returning goods (GOODS_OUT).
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

    public class GoodsRoundLineDto
    {
        public int EffectId { get; set; }
        public int Quantity { get; set; }

        /// <summary>GOODS_IN only: which portion of Quantity had a problem on arrival, and what problem.</summary>
        public List<GoodsRoundObservationDto> Observations { get; set; } = new();
    }

    public class GoodsRoundObservationDto
    {
        public ReturnProblemEnum Problem { get; set; }
        public int Quantity { get; set; }
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
            });
        }
    }

    public class ExecuteGoodsRoundCommandHandler : IRequestHandler<ExecuteGoodsRoundCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IPurchaseReturnQueryService _purchaseReturnQueryService;
        private readonly IPurchaseReturnCalculationService _purchaseReturnCalculationService;
        private readonly IProductUnitService _productUnitService;
        private readonly IInventoryCostingService _inventoryCostingService;
        private readonly IUnitOfWork _unitOfWork;

        public ExecuteGoodsRoundCommandHandler(IWMSDbContext context, IPurchaseReturnQueryService purchaseReturnQueryService, IPurchaseReturnCalculationService purchaseReturnCalculationService, IProductUnitService productUnitService, IInventoryCostingService inventoryCostingService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _purchaseReturnQueryService = purchaseReturnQueryService;
            _purchaseReturnCalculationService = purchaseReturnCalculationService;
            _productUnitService = productUnitService;
            _inventoryCostingService = inventoryCostingService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(ExecuteGoodsRoundCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var purchaseReturn = await _purchaseReturnQueryService
                .WithReturnGraph(_context.PurchaseReturns.Where(x => x.Id == request.PurchaseReturnId), includePurchaseItems: true)
                .FirstOrDefaultAsync(cancellationToken) ?? throw new NotFoundCustomException("مرجوعی مورد نظر یافت نشد.");

            if (_purchaseReturnCalculationService.IsTerminal(purchaseReturn.Status))
                throw new ValidationCustomException("این مرجوعی دیگر قابل ویرایش نیست.");

            var effectsById = purchaseReturn.Claims
                .SelectMany(c => c.Resolutions.SelectMany(r => r.Effects.Select(e => (claim: c, effect: e))))
                .ToDictionary(x => x.effect.Id);

            var now = request.Date ?? DateTime.Now;

            foreach (var line in request.Rounds)
            {
                if (!effectsById.TryGetValue(line.EffectId, out var found))
                    throw new NotFoundCustomException("اثر مورد نظر یافت نشد.");

                var (claim, effect) = found;

                if (effect.Kind is not (ReturnEffectKindEnum.GOODS_IN or ReturnEffectKindEnum.GOODS_OUT))
                    throw new ValidationCustomException("فقط اثرهای کالایی می‌توانند اجرا شوند.");

                if (line.Quantity > effect.UndoneQuantity)
                    throw new ValidationCustomException("مقدار اجرا از باقیمانده این اثر بیشتر است.");

                var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == (effect.ProductId ?? claim.ProductId), cancellationToken)
                    ?? throw new NotFoundCustomException("کالای مورد نظر یافت نشد.");

                var observations = (line.Observations ?? new()).Where(o => o.Quantity > 0).ToList();
                var healthyQty = effect.Kind == ReturnEffectKindEnum.GOODS_IN ? line.Quantity - observations.Sum(o => o.Quantity) : (int?)null;

                var round = new Domain.Entities.PurchaseReturnEffectRound
                {
                    Date = now,
                    Quantity = line.Quantity,
                    HealthyQuantity = healthyQty,
                    PartyName = request.PartyName,
                    PartyNationalId = request.PartyNationalId,
                    VehiclePlate = request.VehiclePlate,
                    Note = request.Note,
                    CreatedAt = now,
                };

                foreach (var obs in observations)
                {
                    round.Observations.Add(new Domain.Entities.PurchaseReturnEffectObservation
                    {
                        Problem = obs.Problem,
                        Quantity = obs.Quantity,
                        Note = obs.Note,
                    });
                }

                effect.History.Add(round);
                effect.DoneQuantity += line.Quantity;

                if (effect.Kind == ReturnEffectKindEnum.GOODS_IN)
                {
                    var restocked = healthyQty ?? line.Quantity;
                    product.Stock += restocked;
                    effect.RestockedQuantity = (effect.RestockedQuantity ?? 0) + restocked;

                    // The supplier physically sending a replacement is a return-side event, not a
                    // normal receiving round - it never touches PurchaseItem.ReceivedQuantity.
                    await _productUnitService.MintAsync(product, restocked, claim.PurchaseItemId, cancellationToken);

                    if (restocked > 0)
                        await _inventoryCostingService.RecordPurchaseReturnReplacementReceivedAsync(product, restocked, claim.PurchaseItemId, now, cancellationToken);
                }
                else // GOODS_OUT: goods physically leaving us back to the supplier.
                {
                    if (line.Quantity > product.Stock)
                        throw new ValidationCustomException($"موجودی «{product.Name}» برای این عودت کافی نیست.");

                    product.Stock -= line.Quantity;
                    await _inventoryCostingService.RecordPurchaseReturnShippedToSupplierAsync(product, line.Quantity, now, cancellationToken);

                    // No existing IProductUnitService method fits "goods leaving to a supplier"
                    // (ConsumeAsync marks units SOLD, which is the wrong status here) - flip the
                    // oldest IN_STOCK units for this product directly.
                    var unitsToReturn = await _context.ProductUnits
                        .Where(u => u.ProductId == product.Id && u.Status == ProductUnitStatusEnum.IN_STOCK)
                        .OrderBy(u => u.SerialNumber)
                        .Take(line.Quantity)
                        .ToListAsync(cancellationToken);

                    foreach (var unit in unitsToReturn)
                        unit.Status = ProductUnitStatusEnum.RETURNED_TO_SUPPLIER;
                }

                if (effect.DoneQuantity >= effect.Quantity)
                {
                    effect.Status = ReturnEffectStatusEnum.APPLIED;
                    effect.AppliedAt = now;

                    var resolution = claim.Resolutions.First(r => r.Effects.Contains(effect));
                    if (resolution.Effects.All(e => e.Status != ReturnEffectStatusEnum.PENDING) && claim.PurchaseItemId.HasValue)
                    {
                        var purchaseItem = purchaseReturn.Purchase!.Items.First(x => x.Id == claim.PurchaseItemId.Value);
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

            res.Data = new { ReturnStatus = purchaseReturn.Status };
            res.Message = "اجرای مرحله با موفقیت ثبت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
