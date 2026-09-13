using Application.Common.Contracts.Context;
using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.SaleReturn;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Dtos.Returns;
using Application.Common.Enums;
using Application.Features.SaleReturn.Queries;
using Common.Exceptions;
using Common.Extensions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.SaleReturn.Commands
{
    // A customer claim, recorded immediately (before anything is physically inspected) - unlike
    // PurchaseReturn's old model, but matching PurchaseReturn now too: both sides create a return
    // explicitly, and both allow several returns to be active on the same document at once (see
    // I*ReturnCalculationService.GetOpenClaimQuantity).
    public class CreateSaleReturnCommand : IRequest<ResponseDto>
    {
        public int SaleId { get; set; }
        public DateTime? ReturnDate { get; set; }
        public string? Description { get; set; }
        public int? PreviousReturnId { get; set; }
        public List<CreateReturnClaimDto> Claims { get; set; } = new();
    }

    public class CreateSaleReturnCommandValidator : AbstractValidator<CreateSaleReturnCommand>
    {
        public CreateSaleReturnCommandValidator()
        {
            RuleFor(x => x.SaleId).GreaterThan(0).WithMessage(Validation.RequiredMessage("فروش"));
            RuleFor(x => x.Claims).NotEmpty().WithMessage(Validation.RequiredMessage("لیست ادعاها"));
            RuleForEach(x => x.Claims).ChildRules(claim =>
            {
                claim.RuleFor(c => c.Scope).IsInEnum().WithMessage("دامنه ادعا نامعتبر است.");
                claim.RuleFor(c => c.Problem).IsInEnum().WithMessage("علت ادعا نامعتبر است.");
                claim.RuleFor(c => c.ProductId).GreaterThan(0).WithMessage(Validation.RequiredMessage("کالا"));
                claim.RuleFor(c => c.Quantity).GreaterThan(0).WithMessage("مقدار ادعاشده باید از صفر بیشتر باشد.");
                claim.RuleFor(c => c.OrderLineId).NotNull().WithMessage(Validation.RequiredMessage("آیتم فروش"))
                    .When(c => c.Scope == ReturnClaimScopeEnum.ON_ORDER);
                claim.RuleFor(c => c.OffScopeKind).NotNull().WithMessage("نوع ادعای خارج از سند مشخص نشده است.")
                    .When(c => c.Scope == ReturnClaimScopeEnum.OFF_ORDER);
                // An on-order claim has no off-scope kind; one sent anyway used to be dropped silently.
                claim.RuleFor(c => c.OffScopeKind).Null().WithMessage("ادعای روی قلم سند نمی‌تواند نوع ادعای خارج از سند (offScopeKind) داشته باشد.")
                    .When(c => c.Scope == ReturnClaimScopeEnum.ON_ORDER);
                claim.RuleFor(c => c.OffScopeKind).IsInEnum().WithMessage("نوع ادعای خارج از سند نامعتبر است.")
                    .When(c => c.Scope == ReturnClaimScopeEnum.OFF_ORDER && c.OffScopeKind.HasValue);
                // EXCESS is "more of a line the sale has" - that line prices it, so it must be named.
                claim.RuleFor(c => c.OrderLineId).NotNull().WithMessage("برای ادعای «بیش از مقدار ارسال‌شده» باید قلم فروش مربوط مشخص شود.")
                    .When(c => c.Scope == ReturnClaimScopeEnum.OFF_ORDER && c.OffScopeKind == ReturnOffScopeKindEnum.EXCESS);
                // UNLISTED is a product the sale never listed; a line reference contradicts it and
                // used to be dropped silently.
                claim.RuleFor(c => c.OrderLineId).Null().WithMessage("ادعای «کالای خارج از فاکتور» نمی‌تواند به قلم فروش ارجاع داشته باشد.")
                    .When(c => c.Scope == ReturnClaimScopeEnum.OFF_ORDER && c.OffScopeKind == ReturnOffScopeKindEnum.UNLISTED);
            });
        }
    }

    public class CreateSaleReturnCommandHandler : IRequestHandler<CreateSaleReturnCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly ISaleReturnRepository _saleReturnRepository;
        private readonly ISaleReturnCalculationService _saleReturnCalculationService;
        private readonly IUnitOfWork _unitOfWork;

        public CreateSaleReturnCommandHandler(IWMSDbContext context, ISaleReturnRepository saleReturnRepository, ISaleReturnCalculationService saleReturnCalculationService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _saleReturnRepository = saleReturnRepository;
            _saleReturnCalculationService = saleReturnCalculationService;
            _unitOfWork = unitOfWork;
        }

        private static readonly HashSet<SalesStatusEnum> ClaimableSaleStatuses = new()
        {
            SalesStatusEnum.SHIPPED,
            SalesStatusEnum.PARTIALLY_DELIVERED,
            SalesStatusEnum.DELIVERED,
        };

        public async Task<ResponseDto> Handle(CreateSaleReturnCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var sale = await _context.Sales
                .Include(x => x.Items)
                    .ThenInclude(x => x.Product)
                .FirstOrDefaultAsync(x => x.Id == request.SaleId, cancellationToken) ?? throw new NotFoundCustomException("فروش مورد نظر یافت نشد.");

            if (!ClaimableSaleStatuses.Contains(sale.Status))
                throw new ValidationCustomException("فقط فروش‌های ارسال‌شده یا تحویل‌شده قابل مرجوع کردن هستند.");

            var activeReturns = await _saleReturnRepository.GetActiveBySaleIdAsync(request.SaleId, cancellationToken);
            var saleItems = sale.Items.ToDictionary(x => x.Id);

            // Every claim that names a line - ON_ORDER and EXCESS alike - must name a line of this
            // sale, for the same product. The quota and the EXCESS price are both read off that line,
            // while a later GOODS_IN round adds stock to claim.ProductId - so a claim naming line A
            // with product B would restore A's units while crediting B's stock.
            foreach (var claimReq in request.Claims.Where(c => c.OrderLineId.HasValue))
            {
                if (!saleItems.TryGetValue(claimReq.OrderLineId!.Value, out var saleItem))
                    throw new NotFoundCustomException("آیتم فروش مورد نظر یافت نشد.");

                if (claimReq.ProductId != saleItem.ProductId)
                    throw new ValidationCustomException($"کالای ادعاشده با کالای قلم فروش «{saleItem.Product.Name}» مطابقت ندارد.");

                // EXCESS is priced at its order line. A different client price used to be overwritten
                // silently, so the form showed one number and the server stored another.
                if (claimReq.Scope == ReturnClaimScopeEnum.OFF_ORDER && claimReq.OffScopeKind == ReturnOffScopeKindEnum.EXCESS && claimReq.UnitPrice != saleItem.UnitPrice)
                    throw new ValidationCustomException($"قیمت واحد ادعای «بیش از مقدار ارسال‌شده» باید با قیمت واحد قلم فروش «{saleItem.Product.Name}» یعنی {saleItem.UnitPrice} ریال برابر باشد.");
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
            // beyond what the line shipped, so they are never counted against it.
            var onOrderClaimsPerItem = request.Claims
                .Where(c => c.Scope == ReturnClaimScopeEnum.ON_ORDER)
                .GroupBy(c => c.OrderLineId!.Value);

            foreach (var claimsOnItem in onOrderClaimsPerItem)
            {
                var saleItem = saleItems[claimsOnItem.Key];
                var requestedQty = claimsOnItem.Sum(c => c.Quantity);
                var claimable = _saleReturnCalculationService.GetClaimableQuantity(saleItem, activeReturns);
                if (requestedQty > claimable)
                    throw new ValidationCustomException($"مقدار ادعاشده برای «{saleItem.Product.Name}» از باقیمانده قابل مرجوع کردن این قلم بیشتر است.");
            }

            // PreviousReturnId was a pure client-supplied pass-through: nothing checked that it
            // pointed at a return on this same document, or that it existed at all. A cycle is not
            // reachable here - a brand-new row cannot yet be anyone's target.
            if (request.PreviousReturnId.HasValue)
            {
                var previousBelongsToDocument = await _context.SaleReturns
                    .AnyAsync(x => x.Id == request.PreviousReturnId.Value && x.SaleId == request.SaleId, cancellationToken);

                if (!previousBelongsToDocument)
                    throw new ValidationCustomException("مرجوعی قبلی انتخاب‌شده معتبر نیست.");
            }

            var now = DateTime.Now;
            var returnDate = request.ReturnDate ?? now;
            // Deliberately counts soft-deleted returns too, so a deleted return never frees up its number.
            var returnCount = await _context.SaleReturns.CountAsync(cancellationToken);

            var saleReturn = new Domain.Entities.SaleReturn
            {
                ReturnNumber = Generator.GenerateSaleReturnNumber(returnCount + 1),
                SaleId = request.SaleId,
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

                saleReturn.Claims.Add(new Domain.Entities.SaleReturnClaim
                {
                    Scope = claimReq.Scope,
                    OffScopeKind = claimReq.Scope == ReturnClaimScopeEnum.OFF_ORDER ? claimReq.OffScopeKind : null,
                    // The validator guarantees this is set for ON_ORDER and EXCESS and null for UNLISTED.
                    SaleItemId = claimReq.OrderLineId,
                    ProductId = claimReq.ProductId,
                    // EXCESS is priced at its order line's unit price (a different client value is a 400
                    // above, so the two are equal here) - the server's copy, so the
                    // client cannot price the same goods differently from the sale they came from.
                    // ON_ORDER and UNLISTED keep the client's price (ON_ORDER may carry a net price).
                    UnitPrice = isExcess ? saleItems[claimReq.OrderLineId!.Value].UnitPrice : claimReq.UnitPrice,
                    Quantity = claimReq.Quantity,
                    Problem = claimReq.Problem,
                    Note = claimReq.Note,
                    CreatedAt = now,
                });
            }

            await _saleReturnRepository.AddAsync(saleReturn, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await SaleReturnDetailReader.ReadAsync(_context, _saleReturnCalculationService, saleReturn.Id, cancellationToken);
            res.Message = "درخواست مرجوعی با موفقیت ثبت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
