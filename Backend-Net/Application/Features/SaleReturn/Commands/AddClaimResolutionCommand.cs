using Application.Common.Contracts.Context;
using Application.Common.Contracts.InventoryCosting;
using Application.Common.Contracts.SaleReturn;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos.Returns;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Queries;
using Common.Exceptions;
using Common.Extensions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.SaleReturn.Commands
{
    // Registers one decision against a claim's remaining quantity, expressed as a composition of
    // up to three effects (goods in / goods out / money) rather than a single closed decision type.
    // Replaces AddSaleReturnDecisionCommand.
    public class AddClaimResolutionCommand : IRequest<ResponseDto>
    {
        public int ClaimId { get; set; }
        public EffectCompositionDto Composition { get; set; } = new();
    }

    public class AddClaimResolutionCommandValidator : AbstractValidator<AddClaimResolutionCommand>
    {
        public AddClaimResolutionCommandValidator()
        {
            RuleFor(x => x.ClaimId).GreaterThan(0).WithMessage(Validation.RequiredMessage("ادعا"));
            RuleFor(x => x.Composition.Quantity).GreaterThan(0).WithMessage("مقدار تصمیم باید از صفر بیشتر باشد.");
            RuleFor(x => x.Composition).Must(c => (c.GoodsIn?.Count ?? 0) > 0 || (c.GoodsOut?.Count ?? 0) > 0 || c.MoneyIn != null || c.MoneyOut != null)
                .WithMessage("تصمیم باید حداقل شامل یک اثر (ورود کالا، خروج کالا یا وجه) باشد.");

            RuleForEach(x => x.Composition.GoodsIn).ChildRules(goods =>
            {
                goods.RuleFor(g => g.Quantity).GreaterThan(0).WithMessage("مقدار کالای وارده باید از صفر بیشتر باشد.");
                goods.RuleFor(g => g.ProductId).GreaterThan(0).WithMessage("کالای نامعتبر است.").When(g => g.ProductId.HasValue);
            });
            RuleForEach(x => x.Composition.GoodsOut).ChildRules(goods =>
            {
                goods.RuleFor(g => g.Quantity).GreaterThan(0).WithMessage("مقدار کالای خارجه باید از صفر بیشتر باشد.");
                goods.RuleFor(g => g.ProductId).GreaterThan(0).WithMessage("کالای نامعتبر است.").When(g => g.ProductId.HasValue);
            });

            // Direction is structural now (which slot the effect sits in), so there is no direction
            // field left to validate - the old rule on Composition.Money.Direction rejected every
            // money effect whose sender omitted it, because the enum's zero value is GOODS_IN.
            RuleFor(x => x.Composition.MoneyIn!.Parts)
                .Must(parts => parts != null && parts.Count > 0)
                .WithMessage("پرداخت ترکیبی باید حداقل یک بخش داشته باشد.")
                .When(x => x.Composition.MoneyIn != null && x.Composition.MoneyIn.Method == ReturnPaymentMethodEnum.MIXED);
            // A MIXED payment whose parts do not add up to the total, or parts smuggled in on a
            // single-method payment (where they were silently dropped), both used to persist.
            RuleFor(x => x.Composition.MoneyIn!)
                .Must(money => money.Parts!.Aggregate(0UL, (sum, p) => sum + p.Amount) == money.Amount)
                .WithMessage("مجموع بخش‌های پرداخت باید برابر مبلغ کل باشد.")
                .When(x => x.Composition.MoneyIn is { Method: ReturnPaymentMethodEnum.MIXED, Parts.Count: > 0 });
            RuleFor(x => x.Composition.MoneyIn!.Parts)
                .Must(parts => parts == null || parts.Count == 0)
                .WithMessage("بخش‌های پرداخت فقط برای پرداخت ترکیبی مجاز است.")
                .When(x => x.Composition.MoneyIn != null && x.Composition.MoneyIn.Method != ReturnPaymentMethodEnum.MIXED);
            RuleFor(x => x.Composition.MoneyOut!.Parts)
                .Must(parts => parts != null && parts.Count > 0)
                .WithMessage("پرداخت ترکیبی باید حداقل یک بخش داشته باشد.")
                .When(x => x.Composition.MoneyOut != null && x.Composition.MoneyOut.Method == ReturnPaymentMethodEnum.MIXED);
            // A MIXED payment whose parts do not add up to the total, or parts smuggled in on a
            // single-method payment (where they were silently dropped), both used to persist.
            RuleFor(x => x.Composition.MoneyOut!)
                .Must(money => money.Parts!.Aggregate(0UL, (sum, p) => sum + p.Amount) == money.Amount)
                .WithMessage("مجموع بخش‌های پرداخت باید برابر مبلغ کل باشد.")
                .When(x => x.Composition.MoneyOut is { Method: ReturnPaymentMethodEnum.MIXED, Parts.Count: > 0 });
            RuleFor(x => x.Composition.MoneyOut!.Parts)
                .Must(parts => parts == null || parts.Count == 0)
                .WithMessage("بخش‌های پرداخت فقط برای پرداخت ترکیبی مجاز است.")
                .When(x => x.Composition.MoneyOut != null && x.Composition.MoneyOut.Method != ReturnPaymentMethodEnum.MIXED);
        }
    }

    public class AddClaimResolutionCommandHandler : IRequestHandler<AddClaimResolutionCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly ISaleReturnCalculationService _saleReturnCalculationService;
        private readonly IInventoryCostingService _inventoryCostingService;
        private readonly IUnitOfWork _unitOfWork;

        public AddClaimResolutionCommandHandler(IWMSDbContext context, ISaleReturnCalculationService saleReturnCalculationService, IInventoryCostingService inventoryCostingService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _saleReturnCalculationService = saleReturnCalculationService;
            _inventoryCostingService = inventoryCostingService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(AddClaimResolutionCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var saleReturn = await _context.SaleReturns.Where(x => x.Claims.Any(c => c.Id == request.ClaimId))
                .WhereNotDeleted()
                .WithReturnGraph()
                .WithSaleItems()
                .FirstOrDefaultAsync(cancellationToken) ?? throw new NotFoundCustomException("مرجوعی مورد نظر یافت نشد.");

            if (_saleReturnCalculationService.IsTerminal(saleReturn.Status) || saleReturn.Status == ReturnStatusEnum.SETTLED)
                throw new ValidationCustomException("این مرجوعی دیگر قابل ویرایش نیست.");

            var claim = saleReturn.Claims.First(x => x.Id == request.ClaimId);

            if (request.Composition.Quantity > claim.RemainingQuantity)
                throw new ValidationCustomException("مقدار تصمیم از باقیمانده ادعا بیشتر است.");

            var now = DateTime.Now;
            var effects = _saleReturnCalculationService.ExpandComposition(request.Composition, now);

            // ProductId defaults to the claim's own product and is resolved once, here, so every
            // later reader (ExecuteGoodsRound, the read DTOs) sees a non-null value and none of them
            // has to re-apply the default.
            foreach (var effect in effects)
            {
                if (effect.Direction is ReturnEffectDirectionEnum.GOODS_IN or ReturnEffectDirectionEnum.GOODS_OUT)
                    effect.ProductId ??= claim.ProductId;
            }

            // An overridden product (a replacement with a different item) used to go unchecked and
            // only surface as a NotFound at the goods round - i.e. at the warehouse, to the wrong
            // person, long after the decision was accepted.
            var overriddenProductIds = effects
                .Where(e => e.ProductId.HasValue && e.ProductId.Value != claim.ProductId)
                .Select(e => e.ProductId!.Value)
                .Distinct()
                .ToList();

            if (overriddenProductIds.Count > 0)
            {
                var foundCount = await _context.Products
                    .CountAsync(p => overriddenProductIds.Contains(p.Id), cancellationToken);

                if (foundCount != overriddenProductIds.Count)
                    throw new ValidationCustomException("کالای انتخاب‌شده برای اثر یافت نشد.");
            }

            var goodsQtySum = effects.Where(e => e.Direction is ReturnEffectDirectionEnum.GOODS_IN or ReturnEffectDirectionEnum.GOODS_OUT).Sum(e => e.Quantity);
            if (goodsQtySum > request.Composition.Quantity)
                throw new ValidationCustomException("مجموع مقدار کالا در اثرها نمی‌تواند از مقدار تصمیم بیشتر باشد.");

            var resolution = new Domain.Entities.SaleReturnResolution
            {
                Quantity = request.Composition.Quantity,
                Note = request.Composition.Note,
                CreatedAt = now,
                Effects = effects,
            };

            claim.Resolutions.Add(resolution);

            foreach (var moneyOut in resolution.Effects.Where(e => e.Direction == ReturnEffectDirectionEnum.MONEY_OUT && e.Amount.HasValue))
            {
                if (claim.Product != null)
                    await _inventoryCostingService.RecordSaleReturnRefundAsync(claim.Product, moneyOut.Amount!.Value, claim.Id, now, cancellationToken);
            }

            // A resolution with no pending goods effect (money-only, or nothing at all) settles the
            // claimed quantity immediately; one with a pending goods effect settles it later, once
            // ExecuteGoodsRoundCommand brings that effect's AppliedQuantity up to its Quantity.
            if (claim.SaleItemId.HasValue && resolution.Effects.All(e => e.Status != ReturnEffectStatusEnum.PENDING))
            {
                var saleItem = saleReturn.Sale!.Items.First(x => x.Id == claim.SaleItemId.Value);
                saleItem.SettledQuantity += resolution.Quantity;
            }

            saleReturn.Status = _saleReturnCalculationService.RecomputeReturnStatus(saleReturn);
            saleReturn.UpdatedAt = now;

            var sale = saleReturn.Sale!;
            sale.Status = _saleReturnCalculationService.RecomputeSaleStatus(sale);
            sale.UpdatedAt = now;

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = new { ResolutionId = resolution.Id, ReturnStatus = saleReturn.Status };
            res.Message = "تصمیم با موفقیت ثبت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
