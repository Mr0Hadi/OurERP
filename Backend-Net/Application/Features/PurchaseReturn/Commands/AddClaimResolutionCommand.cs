using Application.Common.Ledger;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.InventoryCosting;
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
    // Registers one decision against a claim's remaining quantity, expressed as a list of effects
    // (goods in / goods out / money in / money out) rather than a single closed decision type.
    // Replaces AddPurchaseReturnDecisionCommand.
    public class AddClaimResolutionCommand : IRequest<ResponseDto>
    {
        public int ClaimId { get; set; }
        public EffectCompositionDto Composition { get; set; } = new();
    }

    public class AddClaimResolutionCommandValidator : AbstractValidator<AddClaimResolutionCommand>
    {
        public AddClaimResolutionCommandValidator()
        {
            ClassLevelCascadeMode = CascadeMode.Stop;
            RuleFor(x => x.Composition).NotNull().WithMessage(Validation.RequiredMessage("ترکیب اثرها"));
            RuleFor(x => x.ClaimId).GreaterThan(0).WithMessage(Validation.RequiredMessage("ادعا"));
            RuleFor(x => x.Composition.Quantity).GreaterThan(0).WithMessage("مقدار تصمیم باید از صفر بیشتر باشد.");
            RuleFor(x => x.Composition).Must(c => c.HasAnyEffect() || c.WriteOff)
                .WithMessage("تصمیم باید حداقل شامل یک اثر (ورود، خروج، آزادسازی یا اسقاط کالا، یا وجه) یا بخشش صریح (writeOff) باشد.");
            RuleFor(x => x.Composition).Must(c => !(c.WriteOff && c.HasAnyEffect()))
                .WithMessage("بخشش (writeOff) یعنی بستن بخشی از ادعا بدون هیچ اثر؛ همراه با اثر مجاز نیست.");

            // Releasing quarantined goods puts them in stock at the value each unit already carries - 0 for excess and unlisted
            // goods, which is right only when they really are free. Paying for them in the same breath says they are not: the
            // money would land in purchase spend while the goods entered the pool at 0, so the next sale of them would be booked
            // as pure profit. Buying them belongs on the order (AcceptPurchaseExcess), where they enter at the price we pay.
            // A shape rule about one request, deliberately not an inference over history: a release and a later, separate
            // MONEY_OUT are still accepted, because nothing in the data says that money was for those goods.
            RuleFor(x => x.Composition).Must(c => (c.GoodsRelease?.Count ?? 0) == 0 || c.MoneyOut == null)
                .WithMessage("آزادسازی از قرنطینه فقط برای کالایی است که رایگان نزد ما می‌ماند. اگر بابت این کالا به تامین‌کننده پول می‌پردازید، آن را از صفحه‌ی «دریافت کالا» به سفارش اضافه کنید تا با قیمت خودش وارد انبار شود.");

            RuleForEach(x => x.Composition.GoodsRelease).ChildRules(goods =>
            {
                goods.RuleFor(g => g.Source).Must(s => s is null or ProductUnitStatusEnum.QUARANTINED)
                    .WithMessage("آزادسازی فقط از قرنطینه انجام می‌شود.");
                goods.RuleFor(g => g.Quantity).GreaterThan(0).WithMessage("مقدار آزادسازی باید از صفر بیشتر باشد.");
                goods.RuleFor(g => g.ProductId).GreaterThan(0).WithMessage("کالا نامعتبر است.").When(g => g.ProductId.HasValue);
            });
            RuleForEach(x => x.Composition.GoodsScrap).ChildRules(goods =>
            {
                goods.RuleFor(g => g.Source).Must(s => s is null or ProductUnitStatusEnum.QUARANTINED or ProductUnitStatusEnum.IN_STOCK)
                    .WithMessage("اسقاط فقط از قرنطینه (QUARANTINED) یا از موجودی قابل فروش (IN_STOCK) انجام می‌شود.");
                goods.RuleFor(g => g.Quantity).GreaterThan(0).WithMessage("مقدار اسقاط باید از صفر بیشتر باشد.");
                goods.RuleFor(g => g.ProductId).GreaterThan(0).WithMessage("کالا نامعتبر است.").When(g => g.ProductId.HasValue);
            });

            RuleForEach(x => x.Composition.GoodsIn).ChildRules(goods =>
            {
                goods.RuleFor(g => g.Source).Null().WithMessage("کالای ورودی از جایی در انبار برداشته نمی‌شود؛ منبع (source) نفرستید.");
                goods.RuleFor(g => g.Quantity).GreaterThan(0).WithMessage("مقدار کالای وارده باید از صفر بیشتر باشد.");
                goods.RuleFor(g => g.ProductId).GreaterThan(0).WithMessage("کالا نامعتبر است.").When(g => g.ProductId.HasValue);
            });
            RuleForEach(x => x.Composition.GoodsOut).ChildRules(goods =>
            {
                // Stated with the decision, never inferred: shelf stock and quarantine are different goods with different value,
                // and a quarantine source reserves those units from now on.
                goods.RuleFor(g => g.Source).Must(s => s is ProductUnitStatusEnum.IN_STOCK or ProductUnitStatusEnum.QUARANTINED)
                    .WithMessage("برای عودت کالا باید مشخص شود از موجودی (IN_STOCK) برداشته می‌شود یا از قرنطینه (QUARANTINED).");
                goods.RuleFor(g => g.Quantity).GreaterThan(0).WithMessage("مقدار کالای خارجه باید از صفر بیشتر باشد.");
                goods.RuleFor(g => g.ProductId).GreaterThan(0).WithMessage("کالا نامعتبر است.").When(g => g.ProductId.HasValue);
            });

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
            RuleFor(x => x.Composition.MoneyIn!.Amount).GreaterThan(0UL)
                .WithMessage("مبلغ دریافتی باید از صفر بیشتر باشد.")
                .When(x => x.Composition.MoneyIn != null);
            // A MIXED payment whose parts do not add up to the total, or parts smuggled in on a
            // single-method payment (where they were silently dropped), both used to persist.
            RuleFor(x => x.Composition.MoneyIn!)
                .Must(money => money.Parts!.Aggregate(0UL, (sum, p) => sum + p.Amount) == money.Amount)
                .WithMessage("مجموع بخش‌های پرداخت باید برابر مبلغ کل باشد.")
                .When(x => x.Composition.MoneyIn is { Method: ReturnPaymentMethodEnum.MIXED, Parts.Count: > 0 });
            RuleForEach(x => x.Composition.MoneyIn!.Parts)
                .ChildRules(part => part.RuleFor(p => p.Amount).GreaterThan(0UL)
                    .WithMessage("مبلغ هر بخش پرداخت باید از صفر بیشتر باشد."))
                .When(x => x.Composition.MoneyIn?.Parts != null);
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
            RuleFor(x => x.Composition.MoneyOut!.Amount).GreaterThan(0UL)
                .WithMessage("مبلغ پرداختی باید از صفر بیشتر باشد.")
                .When(x => x.Composition.MoneyOut != null);
            RuleForEach(x => x.Composition.MoneyOut!.Parts)
                .ChildRules(part => part.RuleFor(p => p.Amount).GreaterThan(0UL)
                    .WithMessage("مبلغ هر بخش پرداخت باید از صفر بیشتر باشد."))
                .When(x => x.Composition.MoneyOut?.Parts != null);
        }
    }

    public class AddClaimResolutionCommandHandler : IRequestHandler<AddClaimResolutionCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IPurchaseReturnCalculationService _purchaseReturnCalculationService;
        private readonly IInventoryCostingService _inventoryCostingService;
        private readonly IObjectStorageService _objectStorageService;
        private readonly IUnitOfWork _unitOfWork;

        public AddClaimResolutionCommandHandler(IWMSDbContext context, IPurchaseReturnCalculationService purchaseReturnCalculationService, IInventoryCostingService inventoryCostingService, IObjectStorageService objectStorageService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _purchaseReturnCalculationService = purchaseReturnCalculationService;
            _inventoryCostingService = inventoryCostingService;
            _objectStorageService = objectStorageService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(AddClaimResolutionCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var purchaseReturn = await _context.PurchaseReturns.Where(x => x.Claims.Any(c => c.Id == request.ClaimId))
                .WhereNotDeleted()
                .WithReturnGraph()
                .WithPurchaseItems()
                .FirstOrDefaultAsync(cancellationToken) ?? throw new NotFoundCustomException("مرجوعی مورد نظر یافت نشد.");

            if (_purchaseReturnCalculationService.IsTerminal(purchaseReturn.Status) || purchaseReturn.Status == ReturnStatusEnum.SETTLED)
                throw new ValidationCustomException(ReturnLifecycleRules.NotEditableMessage(purchaseReturn.Status));

            var claim = purchaseReturn.Claims.First(x => x.Id == request.ClaimId);

            if (request.Composition.Quantity > claim.RemainingQuantity)
                throw new ValidationCustomException("مقدار تصمیم از باقیمانده ادعا بیشتر است.");

            var now = DateTime.Now;
            var effects = _purchaseReturnCalculationService.ExpandComposition(request.Composition, now);

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

            await EnsureQuarantineCoversAsync(claim, effects, purchaseReturn.PurchaseId, cancellationToken);

            // Every check above runs before anything below touches tracked state or the cost ledger,
            // so a refused request leaves the loaded graph exactly as it was read.
            var resolution = new Domain.Entities.PurchaseReturnResolution
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
                await _inventoryCostingService.RecordPurchaseReturnMoneyAsync(claim.Product!, money.Direction, money.Amount!.Value, claim.Id, money.AppliedAt ?? now, cancellationToken);
                await PartyLedger.PurchaseReturnMoneyAsync(_context, purchaseReturn.Purchase!, purchaseReturn.ReturnNumber, claim.Id, money, reversal: false, money.AppliedAt ?? now, cancellationToken);
            }

            // A resolution with no pending effect settles the claimed quantity immediately; one with a
            // pending effect settles it later, when ExecuteGoodsRoundCommand or ExecuteMoneyEffectCommand
            // clears the last one.
            // ON_ORDER only: an EXCESS claim carries its line id too, but must never settle that line.
            if (claim.OnOrderPurchaseItemId is int purchaseItemId && resolution.Effects.All(e => e.Status != ReturnEffectStatusEnum.PENDING))
            {
                var purchaseItem = purchaseReturn.Purchase!.Items.First(x => x.Id == purchaseItemId);
                purchaseItem.SettledQuantity += resolution.Quantity;
            }

            purchaseReturn.Status = _purchaseReturnCalculationService.RecomputeReturnStatus(purchaseReturn);
            purchaseReturn.UpdatedAt = now;

            var purchase = purchaseReturn.Purchase!;
            purchase.Status = _purchaseReturnCalculationService.RecomputePurchaseStatus(purchase);
            purchase.UpdatedAt = now;

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await PurchaseReturnDetailReader.ReadAsync(_context, _purchaseReturnCalculationService, _objectStorageService, purchaseReturn.Id, cancellationToken);
            res.Message = "تصمیم با موفقیت ثبت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }

        /// <summary>
        /// Every effect that takes units from quarantine - a release, a scrap or a return stated as QUARANTINED - must find them
        /// free when the decision is made: held units of its quarantine group minus what other decisions on this purchase's open
        /// returns already reserve (IPurchaseReturnCalculationService.GetReservedQuarantineQuantity). Checked here, not at the goods
        /// round, so the refusal reaches whoever agreed the deal with the supplier, not the warehouse. An EXCESS/UNLISTED claim
        /// reserved its own quantity when it was created, so its own outstanding part counts as available to it. Shelf-sourced
        /// effects reserve nothing: shelf stock stays sellable and is checked when the round runs.
        /// </summary>
        private async Task EnsureQuarantineCoversAsync(Domain.Entities.PurchaseReturnClaim claim, List<Domain.Entities.PurchaseReturnEffect> effects, int purchaseId, CancellationToken cancellationToken)
        {
            var requested = effects
                .Where(e => e.Source == ProductUnitStatusEnum.QUARANTINED)
                .GroupBy(e => e.ProductId!.Value)
                .ToList();

            if (requested.Count == 0)
                return;

            var openReturns = await _context.PurchaseReturns
                .Where(x => x.PurchaseId == purchaseId)
                .WhereNotDeleted()
                .WhereOpen()
                .WithReturnGraph()
                .AsNoTracking()
                .ToListAsync(cancellationToken);

            foreach (var group in requested)
            {
                var productId = group.Key;
                var sameProduct = productId == claim.ProductId;
                var selection = PurchaseReturnQuarantine.For(claim, sameProduct, purchaseId);

                var held = await _context.ProductUnits.CountAsync(selection.ToFilter(productId), cancellationToken);
                var reserved = _purchaseReturnCalculationService.GetReservedQuarantineQuantity(selection, productId, purchaseId, openReturns);

                // This claim's own reservation is what these effects draw on.
                if (PurchaseReturnQuarantine.IsReservedByClaim(claim, sameProduct))
                    reserved -= Math.Max(0, claim.Quantity - claim.Resolutions.Where(r => r.Effects.All(e => e.Status != ReturnEffectStatusEnum.PENDING)).Sum(r => r.Quantity));

                var available = Math.Max(0, held - Math.Max(0, reserved));
                if (group.Sum(e => e.Quantity) > available)
                    throw new ValidationCustomException(
                        $"در قرنطینه‌ی مربوط به این ادعا {held} دانه هست که {Math.Max(0, reserved)} تای آن برای تصمیم‌های دیگرِ همین خرید رزرو شده؛ فقط {available} دانه آزاد است. "
                        + "اگر کالا روی قفسه است، منبع را «موجودی» (IN_STOCK) بگذارید.");
            }
        }
    }
}
