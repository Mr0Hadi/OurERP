using Application.Common.Contracts.Context;
using Application.Common.Contracts.PurchaseReturn;
using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.Storage;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Dtos.Returns;
using Application.Common.Enums;
using Application.Features.PurchaseReturn.Queries;
using Common.Exceptions;
using Common.Extensions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.PurchaseReturn.Commands
{
    // A reported problem with already-received goods. Created explicitly by the warehouse/purchasing
    // side (mirrors CreateSaleReturnCommand) rather than being auto-created as a side effect of
    // ReceivePurchaseCommand - ReceivePurchaseCommand only ever records received quantity/stock now.
    // Several returns can be active on the same purchase at once, same as sale returns.
    public class CreatePurchaseReturnCommand : IRequest<ResponseDto>
    {
        public int PurchaseId { get; set; }
        public DateTime? ReturnDate { get; set; }
        public string? Description { get; set; }
        public int? PreviousReturnId { get; set; }
        public List<CreateReturnClaimDto> Claims { get; set; } = new();
    }

    public class CreatePurchaseReturnCommandValidator : AbstractValidator<CreatePurchaseReturnCommand>
    {
        public CreatePurchaseReturnCommandValidator()
        {
            RuleFor(x => x.PurchaseId).GreaterThan(0).WithMessage(Validation.RequiredMessage("خرید"));
            RuleFor(x => x.Claims).NotEmpty().WithMessage(Validation.RequiredMessage("لیست ادعاها"));
            RuleForEach(x => x.Claims).ChildRules(claim =>
            {
                claim.RuleFor(c => c.Scope).IsInEnum().WithMessage("دامنه ادعا نامعتبر است.");
                claim.RuleFor(c => c.Problem).IsInEnum().WithMessage("علت ادعا نامعتبر است.");
                claim.RuleFor(c => c.ProductId).GreaterThan(0).WithMessage(Validation.RequiredMessage("کالا"));
                claim.RuleFor(c => c.Quantity).GreaterThan(0).WithMessage("مقدار ادعاشده باید از صفر بیشتر باشد.");
                claim.RuleFor(c => c.OrderLineId).NotNull().WithMessage(Validation.RequiredMessage("آیتم خرید"))
                    .When(c => c.Scope == ReturnClaimScopeEnum.ON_ORDER);
                claim.RuleFor(c => c.OffScopeKind).NotNull().WithMessage("نوع ادعای خارج از سند مشخص نشده است.")
                    .When(c => c.Scope == ReturnClaimScopeEnum.OFF_ORDER);
                // An on-order claim has no off-scope kind; one sent anyway used to be dropped silently.
                claim.RuleFor(c => c.OffScopeKind).Null().WithMessage("ادعای روی قلم سند نمی‌تواند نوع ادعای خارج از سند (offScopeKind) داشته باشد.")
                    .When(c => c.Scope == ReturnClaimScopeEnum.ON_ORDER);
                claim.RuleFor(c => c.OffScopeKind).IsInEnum().WithMessage("نوع ادعای خارج از سند نامعتبر است.")
                    .When(c => c.Scope == ReturnClaimScopeEnum.OFF_ORDER && c.OffScopeKind.HasValue);
                // EXCESS is "more of a line the purchase has" - that line prices it, so it must be named.
                claim.RuleFor(c => c.OrderLineId).NotNull().WithMessage("برای ادعای «بیش از مقدار سفارش» باید قلم خرید مربوط مشخص شود.")
                    .When(c => c.Scope == ReturnClaimScopeEnum.OFF_ORDER && c.OffScopeKind == ReturnOffScopeKindEnum.EXCESS);
                // UNLISTED is a product the purchase never listed; a line reference contradicts it and
                // used to be dropped silently.
                claim.RuleFor(c => c.OrderLineId).Null().WithMessage("ادعای «کالای خارج از سفارش» نمی‌تواند به قلم خرید ارجاع داشته باشد.")
                    .When(c => c.Scope == ReturnClaimScopeEnum.OFF_ORDER && c.OffScopeKind == ReturnOffScopeKindEnum.UNLISTED);
            });
        }
    }

    public class CreatePurchaseReturnCommandHandler : IRequestHandler<CreatePurchaseReturnCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IPurchaseReturnRepository _purchaseReturnRepository;
        private readonly IPurchaseReturnCalculationService _purchaseReturnCalculationService;
        private readonly IObjectStorageService _objectStorageService;
        private readonly IUnitOfWork _unitOfWork;

        public CreatePurchaseReturnCommandHandler(IWMSDbContext context, IPurchaseReturnRepository purchaseReturnRepository, IPurchaseReturnCalculationService purchaseReturnCalculationService, IObjectStorageService objectStorageService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _purchaseReturnRepository = purchaseReturnRepository;
            _purchaseReturnCalculationService = purchaseReturnCalculationService;
            _objectStorageService = objectStorageService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(CreatePurchaseReturnCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var purchase = await _context.Purchases
                .Include(x => x.Items)
                    .ThenInclude(x => x.Product)
                .FirstOrDefaultAsync(x => x.Id == request.PurchaseId, cancellationToken) ?? throw new NotFoundCustomException("خرید مورد نظر یافت نشد.");

            if (purchase.Status == PurchaseStatusEnum.CANCELLED)
                throw new ValidationCustomException("امکان ثبت مرجوعی برای خرید لغوشده وجود ندارد.");

            var activeReturns = await _purchaseReturnRepository.GetActiveByPurchaseIdAsync(request.PurchaseId, cancellationToken);
            var purchaseItems = purchase.Items.ToDictionary(x => x.Id);

            // Every claim that names a line - ON_ORDER and EXCESS alike - must name a line of this
            // purchase, for the same product. The quota and the EXCESS price are both read off that
            // line, while every later goods effect moves stock and units for claim.ProductId, so a
            // claim naming line A with product B would corrupt B's stock.
            foreach (var claimReq in request.Claims.Where(c => c.OrderLineId.HasValue))
            {
                if (!purchaseItems.TryGetValue(claimReq.OrderLineId!.Value, out var purchaseItem))
                    throw new NotFoundCustomException("آیتم خرید مورد نظر یافت نشد.");

                if (claimReq.ProductId != purchaseItem.ProductId)
                    throw new ValidationCustomException($"کالای ادعاشده با کالای قلم خرید «{purchaseItem.Product.Name}» مطابقت ندارد.");

                // EXCESS is priced at its order line. A different client price used to be overwritten
                // silently, so the form showed one number and the server stored another.
                if (claimReq.Scope == ReturnClaimScopeEnum.OFF_ORDER && claimReq.OffScopeKind == ReturnOffScopeKindEnum.EXCESS && claimReq.UnitPrice != purchaseItem.UnitPrice)
                    throw new ValidationCustomException($"قیمت واحد ادعای «بیش از مقدار سفارش» باید با قیمت واحد قلم خرید «{purchaseItem.Product.Name}» یعنی {purchaseItem.UnitPrice} ریال برابر باشد.");
            }

            // A line-less (UNLISTED) claim's product is otherwise unchecked, and a bad id used to
            // surface as an FK failure at SaveChanges - a 500 instead of a 400.
            var offOrderProductIds = request.Claims
                .Where(c => c.Scope == ReturnClaimScopeEnum.OFF_ORDER)
                .Select(c => c.ProductId)
                .Distinct()
                .ToList();

            if (offOrderProductIds.Count > 0)
            {
                var foundCount = await _context.Products.CountAsync(p => offOrderProductIds.Contains(p.Id), cancellationToken);
                if (foundCount != offOrderProductIds.Count)
                    throw new ValidationCustomException("کالای انتخاب‌شده برای ادعای خارج از سند یافت نشد.");
            }

            // Only ON_ORDER claims consume a line's claimable quantity. EXCESS goods are by definition
            // beyond what the line received, so they are never counted against it.
            var onOrderClaimsPerItem = request.Claims
                .Where(c => c.Scope == ReturnClaimScopeEnum.ON_ORDER)
                .GroupBy(c => c.OrderLineId!.Value);

            foreach (var claimsOnItem in onOrderClaimsPerItem)
            {
                var purchaseItem = purchaseItems[claimsOnItem.Key];
                var requestedQty = claimsOnItem.Sum(c => c.Quantity);
                var claimable = _purchaseReturnCalculationService.GetClaimableQuantity(purchaseItem, activeReturns);
                if (requestedQty > claimable)
                    throw new ValidationCustomException($"مقدار ادعاشده برای «{purchaseItem.Product.Name}» از باقیمانده قابل مرجوع کردن این قلم بیشتر است.");
            }

            // OFF_ORDER claims are capped by the goods we actually hold for that reason: quarantined units of this purchase whose
            // CustodyReason matches (EXCESS on the named line, UNLISTED of the product), minus what open claims already reserve.
            // CustodyReason is the only source - the receiving discrepancy rows are never read for this.
            var offOrderClaimGroups = request.Claims
                .Where(c => c.Scope == ReturnClaimScopeEnum.OFF_ORDER && c.OffScopeKind.HasValue)
                .GroupBy(c => new { Kind = c.OffScopeKind!.Value, LineId = c.OffScopeKind == ReturnOffScopeKindEnum.EXCESS ? c.OrderLineId : null, c.ProductId })
                .ToList();

            if (offOrderClaimGroups.Count > 0)
            {
                var held = await _context.ProductUnits
                    .Where(u => u.PurchaseId == request.PurchaseId && u.Status == ProductUnitStatusEnum.QUARANTINED
                        && (u.CustodyReason == UnitCustodyReasonEnum.EXCESS || u.CustodyReason == UnitCustodyReasonEnum.UNLISTED))
                    .GroupBy(u => new { u.CustodyReason, u.PurchaseItemId, u.ProductId })
                    .Select(g => new { g.Key.CustodyReason, g.Key.PurchaseItemId, g.Key.ProductId, Count = g.Count() })
                    .ToListAsync(cancellationToken);

                foreach (var group in offOrderClaimGroups)
                {
                    var isExcess = group.Key.Kind == ReturnOffScopeKindEnum.EXCESS;
                    var available = isExcess
                        ? held.Where(h => h.CustodyReason == UnitCustodyReasonEnum.EXCESS && h.PurchaseItemId == group.Key.LineId).Sum(h => h.Count)
                        : held.Where(h => h.CustodyReason == UnitCustodyReasonEnum.UNLISTED && h.ProductId == group.Key.ProductId).Sum(h => h.Count);

                    var claimable = Math.Max(0, available - _purchaseReturnCalculationService.GetOutstandingOffOrderClaimQuantity(group.Key.Kind, group.Key.LineId, group.Key.ProductId, activeReturns));

                    if (group.Sum(c => c.Quantity) > claimable)
                        throw new ValidationCustomException(isExcess
                            ? $"مقدار ادعای «بیش از مقدار سفارش» از کالای مازادِ در قرنطینه‌ی این قلم ({claimable} عدد قابل ادعا) بیشتر است؛ مازاد باید هنگام دریافت ثبت شده باشد."
                            : $"مقدار ادعای «کالای خارج از سفارش» از کالای خارج از سندِ در قرنطینه‌ی این خرید ({claimable} عدد قابل ادعا) بیشتر است؛ کالا باید هنگام دریافت ثبت شده باشد.");
                }
            }

            // PreviousReturnId was a pure client-supplied pass-through: nothing checked that it
            // pointed at a return on this same document, or that it existed at all. A cycle is not
            // reachable here - a brand-new row cannot yet be anyone's target.
            if (request.PreviousReturnId.HasValue)
            {
                var previousBelongsToDocument = await _context.PurchaseReturns
                    .AnyAsync(x => x.Id == request.PreviousReturnId.Value && x.PurchaseId == request.PurchaseId, cancellationToken);

                if (!previousBelongsToDocument)
                    throw new ValidationCustomException("مرجوعی قبلی انتخاب‌شده معتبر نیست.");
            }

            var now = DateTime.Now;
            var returnDate = request.ReturnDate ?? now;
            // Deliberately counts soft-deleted returns too, so a deleted return never frees up its number.
            var returnCount = await _context.PurchaseReturns.CountAsync(cancellationToken);

            var purchaseReturn = new Domain.Entities.PurchaseReturn
            {
                ReturnNumber = Generator.GenerateReturnNumber(returnCount + 1),
                PurchaseId = request.PurchaseId,
                ReturnDate = returnDate,
                Status = ReturnStatusEnum.OPEN,
                Description = request.Description,
                PreviousReturnId = request.PreviousReturnId,
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now,
            };

            foreach (var claimReq in request.Claims)
            {
                var isExcess = claimReq.Scope == ReturnClaimScopeEnum.OFF_ORDER && claimReq.OffScopeKind == ReturnOffScopeKindEnum.EXCESS;

                purchaseReturn.Claims.Add(new Domain.Entities.PurchaseReturnClaim
                {
                    Scope = claimReq.Scope,
                    OffScopeKind = claimReq.Scope == ReturnClaimScopeEnum.OFF_ORDER ? claimReq.OffScopeKind : null,
                    // The validator guarantees this is set for ON_ORDER and EXCESS and null for UNLISTED.
                    PurchaseItemId = claimReq.OrderLineId,
                    ProductId = claimReq.ProductId,
                    // EXCESS is priced at its order line's unit price (a different client value is a 400
                    // above, so the two are equal here) - the server's copy, so the
                    // client cannot price the same goods differently from the purchase they came on.
                    // ON_ORDER and UNLISTED keep the client's price (ON_ORDER may carry a net price).
                    UnitPrice = isExcess ? purchaseItems[claimReq.OrderLineId!.Value].UnitPrice : claimReq.UnitPrice,
                    Quantity = claimReq.Quantity,
                    Problem = claimReq.Problem,
                    Note = claimReq.Note,
                    CreatedAt = now,
                });
            }

            await _purchaseReturnRepository.AddAsync(purchaseReturn, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await PurchaseReturnDetailReader.ReadAsync(_context, _purchaseReturnCalculationService, _objectStorageService, purchaseReturn.Id, cancellationToken);
            res.Message = "درخواست مرجوعی با موفقیت ثبت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
