using Application.Common.Contracts.Context;
using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.SaleReturn;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Dtos.Returns;
using Application.Common.Enums;
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

            var onOrderRequestedPerItem = request.Claims
                .Where(c => c.Scope == ReturnClaimScopeEnum.ON_ORDER)
                .GroupBy(c => c.OrderLineId!.Value)
                .ToDictionary(g => g.Key, g => g.Sum(c => c.Quantity));

            foreach (var (saleItemId, requestedQty) in onOrderRequestedPerItem)
            {
                if (!saleItems.TryGetValue(saleItemId, out var saleItem))
                    throw new NotFoundCustomException("آیتم فروش مورد نظر یافت نشد.");

                var claimable = _saleReturnCalculationService.GetClaimableQuantity(saleItem, activeReturns);
                if (requestedQty > claimable)
                    throw new ValidationCustomException($"مقدار ادعاشده برای «{saleItem.Product.Name}» از باقیمانده قابل مرجوع کردن این قلم بیشتر است.");
            }

            var now = DateTime.Now;
            var returnDate = request.ReturnDate ?? now;
            // Deliberately counts soft-deleted returns too, so a deleted return never frees up its number.
            var returnCount = await _context.SaleReturns.CountAsync(cancellationToken);

            var saleReturn = new Domain.Entities.SaleReturn
            {
                ReturnNumber = Generator.GenerateSaleReturnNumber(returnCount + 1),
                SaleId = request.SaleId,
                RequestDate = returnDate,
                Status = ReturnStatusEnum.OPEN,
                Description = request.Description,
                PreviousReturnId = request.PreviousReturnId,
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now,
            };

            foreach (var claimReq in request.Claims)
            {
                saleReturn.Claims.Add(new Domain.Entities.SaleReturnClaim
                {
                    Scope = claimReq.Scope,
                    OffScopeKind = claimReq.Scope == ReturnClaimScopeEnum.OFF_ORDER ? claimReq.OffScopeKind : null,
                    SaleItemId = claimReq.Scope == ReturnClaimScopeEnum.ON_ORDER ? claimReq.OrderLineId : null,
                    ProductId = claimReq.ProductId,
                    UnitPrice = claimReq.UnitPrice,
                    Quantity = claimReq.Quantity,
                    Problem = claimReq.Problem,
                    Note = claimReq.Note,
                    CreatedAt = now,
                });
            }

            await _saleReturnRepository.AddAsync(saleReturn, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = new { ReturnId = saleReturn.Id, ReturnNumber = saleReturn.ReturnNumber, ReturnStatus = saleReturn.Status };
            res.Message = "درخواست مرجوعی با موفقیت ثبت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
