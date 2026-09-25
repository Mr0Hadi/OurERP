using Application.Common.Ledger;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.InventoryCosting;
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
    // Registers one decision against a claim's remaining quantity, expressed as a list of effects
    // (goods in / goods out / money in / money out) rather than a single closed decision type.
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
            RuleFor(x => x.Composition).Must(c => c.HasAnyEffect() || c.WriteOff)
                .WithMessage("تصمیم باید حداقل شامل یک اثر (ورود کالا، خروج کالا یا وجه) یا بخشش صریح (writeOff) باشد.");
            RuleFor(x => x.Composition).Must(c => !(c.WriteOff && c.HasAnyEffect()))
                .WithMessage("بخشش (writeOff) یعنی بستن بخشی از ادعا بدون هیچ اثر؛ همراه با اثر مجاز نیست.");
            RuleFor(x => x.Composition).Must(c => (c.GoodsRelease?.Count ?? 0) == 0 && (c.GoodsScrap?.Count ?? 0) == 0)
                .WithMessage("مرجوعی فروش قرنطینه ندارد؛ آزادسازی و اسقاط فقط در مرجوعی خرید معنا دارد.");

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
            // Method must be a defined member: an undefined integer (e.g. the removed STORE_CREDIT = 5)
            // would otherwise bind and persist, since no rule below reads anything but MIXED.
            RuleFor(x => x.Composition.MoneyIn!.Method).IsInEnum()
                .WithMessage("روش پرداخت نامعتبر است.")
                .When(x => x.Composition.MoneyIn != null);
            RuleFor(x => x.Composition.MoneyOut!.Method).IsInEnum()
                .WithMessage("روش پرداخت نامعتبر است.")
                .When(x => x.Composition.MoneyOut != null);
            RuleForEach(x => x.Composition.MoneyIn!.Parts)
                .ChildRules(part => part.RuleFor(p => p.Method).IsInEnum().WithMessage("روش پرداخت نامعتبر است."))
                .When(x => x.Composition.MoneyIn?.Parts != null);
            RuleForEach(x => x.Composition.MoneyOut!.Parts)
                .ChildRules(part => part.RuleFor(p => p.Method).IsInEnum().WithMessage("روش پرداخت نامعتبر است."))
                .When(x => x.Composition.MoneyOut?.Parts != null);
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
                throw new ValidationCustomException(ReturnLifecycleRules.NotEditableMessage(saleReturn.Status));

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
                if (ReturnEffectDirections.IsGoods(effect.Direction))
                    effect.ProductId ??= claim.ProductId;
            }

            // A product id that does not exist used to go unchecked and only surface as a NotFound at
            // the goods round - at the warehouse, long after the decision was accepted.
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

            // Every check above runs before anything below touches tracked state or the cost ledger,
            // so a refused request leaves the loaded graph exactly as it was read.
            var resolution = new Domain.Entities.SaleReturnResolution
            {
                Quantity = request.Composition.Quantity,
                Note = request.Composition.Note,
                CreatedAt = now,
                IsWriteOff = request.Composition.WriteOff,
                Effects = effects,
            };

            claim.Resolutions.Add(resolution);

            // An APPLIED money effect is revenue: MONEY_IN positive, MONEY_OUT negative, at the moment it was
            // paid. RemoveClaimResolution writes the reversing row. A PENDING one writes nothing until
            // ExecuteMoneyEffectCommand records the payment.
            foreach (var money in resolution.Effects.Where(e => e.Direction is ReturnEffectDirectionEnum.MONEY_IN or ReturnEffectDirectionEnum.MONEY_OUT && e.Status == ReturnEffectStatusEnum.APPLIED))
            {
                await _inventoryCostingService.RecordSaleReturnMoneyAsync(claim.Product!, money.Direction, money.Amount!.Value, claim.Id, money.AppliedAt ?? now, cancellationToken);
                await PartyLedger.SaleReturnMoneyAsync(_context, saleReturn.Sale!, saleReturn.ReturnNumber, claim.Id, money, reversal: false, money.AppliedAt ?? now, cancellationToken);
            }

            // A resolution with no pending effect settles the claimed quantity immediately; one with a
            // pending effect settles it later, when ExecuteGoodsRoundCommand or ExecuteMoneyEffectCommand
            // clears the last one.
            // ON_ORDER only: an EXCESS claim carries its line id too, but must never settle that line.
            if (claim.OnOrderSaleItemId is int saleItemId && resolution.Effects.All(e => e.Status != ReturnEffectStatusEnum.PENDING))
            {
                var saleItem = saleReturn.Sale!.Items.First(x => x.Id == saleItemId);
                saleItem.SettledQuantity += resolution.Quantity;
            }

            saleReturn.Status = _saleReturnCalculationService.RecomputeReturnStatus(saleReturn);
            saleReturn.UpdatedAt = now;

            var sale = saleReturn.Sale!;
            sale.Status = _saleReturnCalculationService.RecomputeSaleStatus(sale);
            sale.UpdatedAt = now;

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await SaleReturnDetailReader.ReadAsync(_context, _saleReturnCalculationService, saleReturn.Id, cancellationToken);
            res.Message = "تصمیم با موفقیت ثبت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
