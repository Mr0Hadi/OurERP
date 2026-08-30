using Application.Common.Contracts.Context;
using Application.Common.Contracts.PurchaseReturn;
using Application.Common.Contracts.Repositories;
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
            });
        }
    }

    public class CreatePurchaseReturnCommandHandler : IRequestHandler<CreatePurchaseReturnCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IPurchaseReturnRepository _purchaseReturnRepository;
        private readonly IPurchaseReturnCalculationService _purchaseReturnCalculationService;
        private readonly IUnitOfWork _unitOfWork;

        public CreatePurchaseReturnCommandHandler(IWMSDbContext context, IPurchaseReturnRepository purchaseReturnRepository, IPurchaseReturnCalculationService purchaseReturnCalculationService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _purchaseReturnRepository = purchaseReturnRepository;
            _purchaseReturnCalculationService = purchaseReturnCalculationService;
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

            var onOrderRequestedPerItem = request.Claims
                .Where(c => c.Scope == ReturnClaimScopeEnum.ON_ORDER)
                .GroupBy(c => c.OrderLineId!.Value)
                .ToDictionary(g => g.Key, g => g.Sum(c => c.Quantity));

            foreach (var (purchaseItemId, requestedQty) in onOrderRequestedPerItem)
            {
                if (!purchaseItems.TryGetValue(purchaseItemId, out var purchaseItem))
                    throw new NotFoundCustomException("آیتم خرید مورد نظر یافت نشد.");

                var claimable = _purchaseReturnCalculationService.GetClaimableQuantity(purchaseItem, activeReturns);
                if (requestedQty > claimable)
                    throw new ValidationCustomException($"مقدار ادعاشده برای «{purchaseItem.Product.Name}» از باقیمانده قابل مرجوع کردن این قلم بیشتر است.");
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
                purchaseReturn.Claims.Add(new Domain.Entities.PurchaseReturnClaim
                {
                    Scope = claimReq.Scope,
                    OffScopeKind = claimReq.Scope == ReturnClaimScopeEnum.OFF_ORDER ? claimReq.OffScopeKind : null,
                    PurchaseItemId = claimReq.Scope == ReturnClaimScopeEnum.ON_ORDER ? claimReq.OrderLineId : null,
                    ProductId = claimReq.ProductId,
                    UnitPrice = claimReq.UnitPrice,
                    Quantity = claimReq.Quantity,
                    Problem = claimReq.Problem,
                    Note = claimReq.Note,
                    CreatedAt = now,
                });
            }

            await _purchaseReturnRepository.AddAsync(purchaseReturn, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = new { ReturnId = purchaseReturn.Id, ReturnNumber = purchaseReturn.ReturnNumber, ReturnStatus = purchaseReturn.Status };
            res.Message = "درخواست مرجوعی با موفقیت ثبت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
