using Application.Common.Contracts.Context;
using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.SaleReturn;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
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
    // PurchaseReturn, which is only ever created after physical receiving. Every call creates a
    // brand-new SaleReturn: several can be active on the same sale at once (see
    // ISaleReturnCalculationService.GetOpenClaimQuantity).
    public class CreateSaleReturnCommand : IRequest<ResponseDto>
    {
        public int SaleId { get; set; }
        public DateTime? RequestDate { get; set; }
        public string? Description { get; set; }
        public List<CreateSaleReturnClaimDto> Claims { get; set; } = new();
    }

    public class CreateSaleReturnClaimDto
    {
        public int SaleItemId { get; set; }
        public SalesReturnReasonEnum Reason { get; set; }
        public int ClaimedQuantity { get; set; }
        public string? Note { get; set; }
    }

    public class CreateSaleReturnCommandValidator : AbstractValidator<CreateSaleReturnCommand>
    {
        public CreateSaleReturnCommandValidator()
        {
            RuleFor(x => x.SaleId).NotNull().WithMessage(Validation.RequiredMessage("فروش"));
            RuleFor(x => x.Claims).NotEmpty().WithMessage(Validation.RequiredMessage("لیست ادعاها"));
            RuleFor(x => x.Claims).Must(claims => claims.Select(c => (c.SaleItemId, c.Reason)).Distinct().Count() == claims.Count)
                .WithMessage("هر ترکیب آیتم فروش و دلیل فقط یک‌بار می‌تواند در یک درخواست ظاهر شود.");
            RuleForEach(x => x.Claims).ChildRules(claim =>
            {
                claim.RuleFor(c => c.SaleItemId).NotNull().WithMessage(Validation.RequiredMessage("آیتم فروش"));
                claim.RuleFor(c => c.Reason).IsInEnum().WithMessage("دلیل ادعا نامعتبر است.");
                claim.RuleFor(c => c.ClaimedQuantity).GreaterThan(0).WithMessage("مقدار ادعاشده باید از صفر بیشتر باشد.");
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

            var requestedPerItem = request.Claims.GroupBy(c => c.SaleItemId).ToDictionary(g => g.Key, g => g.Sum(c => c.ClaimedQuantity));

            foreach (var (saleItemId, requestedQty) in requestedPerItem)
            {
                if (!saleItems.TryGetValue(saleItemId, out var saleItem))
                    throw new NotFoundCustomException("آیتم فروش مورد نظر یافت نشد.");

                var claimable = _saleReturnCalculationService.GetClaimableQuantity(saleItem, activeReturns);
                if (requestedQty > claimable)
                    throw new ValidationCustomException($"مقدار ادعاشده برای «{saleItem.Product.Name}» از باقیمانده قابل مرجوع کردن این قلم بیشتر است.");
            }

            var now = DateTime.Now;
            var requestDate = request.RequestDate ?? now;
            var returnCount = await _context.SaleReturns.CountAsync(cancellationToken);

            var saleReturn = new Domain.Entities.SaleReturn
            {
                ReturnNumber = Generator.GenerateSaleReturnNumber(returnCount + 1),
                SaleId = request.SaleId,
                RequestDate = requestDate,
                Status = SaleReturnStatusEnum.PENDING_INSPECTION,
                Description = request.Description,
                CreatedAt = now,
                UpdatedAt = now,
            };

            foreach (var claimReq in request.Claims)
            {
                var saleItem = saleItems[claimReq.SaleItemId];
                saleReturn.Claims.Add(new Domain.Entities.SaleReturnClaim
                {
                    SaleItemId = claimReq.SaleItemId,
                    ProductId = saleItem.ProductId,
                    UnitPrice = saleItem.UnitPrice,
                    Reason = claimReq.Reason,
                    ClaimedQuantity = claimReq.ClaimedQuantity,
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
