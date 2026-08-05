using Application.Common.Contracts.Context;
using Application.Common.Contracts.PurchaseReturn;
using Application.Common.Contracts.Repositories;
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
    public class ReceivePurchaseCommand : IRequest<ResponseDto>
    {
        public int PurchaseId { get; set; }
        public DateTime? ReceivedDate { get; set; }
        public string? ReceivingNote { get; set; }
        public List<ReceivePurchaseItemDto> Items { get; set; } = new();
    }

    public class ReceivePurchaseItemDto
    {
        public int PurchaseItemId { get; set; }
        public int ReceivedQuantity { get; set; }
        public List<ReceivePurchaseIssueDto> Issues { get; set; } = new();
    }

    public class ReceivePurchaseIssueDto
    {
        public PurchaseIssueTypeEnum Type { get; set; }
        public int Quantity { get; set; }
        public string? Note { get; set; }
    }

    public class ReceivePurchaseCommandValidator : AbstractValidator<ReceivePurchaseCommand>
    {
        public ReceivePurchaseCommandValidator()
        {
            RuleFor(x => x.PurchaseId).NotNull().WithMessage(Validation.RequiredMessage("خرید"));
            RuleFor(x => x.Items).NotEmpty().WithMessage(Validation.RequiredMessage("لیست اقلام دریافتی"));
            RuleFor(x => x.Items).Must(items => items.Select(i => i.PurchaseItemId).Distinct().Count() == items.Count)
                .WithMessage("هر آیتم خرید فقط یک‌بار می‌تواند در یک درخواست دریافت ظاهر شود.");
            RuleForEach(x => x.Items).ChildRules(item =>
            {
                item.RuleFor(i => i.PurchaseItemId).NotNull().WithMessage(Validation.RequiredMessage("آیتم خرید"));
                item.RuleFor(i => i.ReceivedQuantity).GreaterThanOrEqualTo(0).WithMessage("مقدار دریافتی نمی‌تواند منفی باشد.");
                item.RuleFor(i => i).Must(i => i.ReceivedQuantity > 0 || (i.Issues != null && i.Issues.Any(x => x.Quantity > 0)))
                    .WithMessage("برای هر قلم باید مقدار دریافتی یا حداقل یک مغایرت وارد شود.");
                item.RuleForEach(i => i.Issues).ChildRules(issue =>
                {
                    issue.RuleFor(j => j.Quantity).GreaterThan(0).WithMessage("مقدار مغایرت باید از صفر بیشتر باشد.");
                    issue.RuleFor(j => j.Type).IsInEnum().WithMessage("نوع مغایرت نامعتبر است.");
                });
            });
        }
    }

    public class ReceivePurchaseCommandHandler : IRequestHandler<ReceivePurchaseCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IPurchaseReturnRepository _purchaseReturnRepository;
        private readonly IPurchaseReturnCalculationService _purchaseReturnCalculationService;
        private readonly IUnitOfWork _unitOfWork;

        public ReceivePurchaseCommandHandler(IWMSDbContext context, IPurchaseReturnRepository purchaseReturnRepository, IPurchaseReturnCalculationService purchaseReturnCalculationService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _purchaseReturnRepository = purchaseReturnRepository;
            _purchaseReturnCalculationService = purchaseReturnCalculationService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(ReceivePurchaseCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var purchase = await _context.Purchases
                .Include(x => x.Items)
                .ThenInclude(x => x.Product)
                .FirstOrDefaultAsync(x => x.Id == request.PurchaseId, cancellationToken) ?? throw new NotFoundCustomException("خرید مورد نظر یافت نشد.");

            if (purchase.Status == PurchaseStatusEnum.CANCELLED)
                throw new ValidationCustomException("خرید لغو شده قابل دریافت نیست.");

            var activeReturn = await _purchaseReturnRepository.GetActiveByPurchaseIdAsync(request.PurchaseId, cancellationToken);

            var purchaseItems = purchase.Items.ToDictionary(x => x.Id);

            foreach (var reqItem in request.Items)
            {
                if (!purchaseItems.TryGetValue(reqItem.PurchaseItemId, out var purchaseItem))
                    throw new NotFoundCustomException("آیتم خرید مورد نظر یافت نشد.");

                var nonExcessQty = (reqItem.Issues ?? new()).Where(i => i.Type != PurchaseIssueTypeEnum.EXCESS).Sum(i => i.Quantity);
                var requestedNonExcess = reqItem.ReceivedQuantity + nonExcessQty;
                var receivable = _purchaseReturnCalculationService.GetReceivableQuantity(purchaseItem, activeReturn);

                if (requestedNonExcess > receivable)
                    throw new ValidationCustomException($"مقدار وارد شده برای «{purchaseItem.Product.Name}» از باقیمانده قابل دریافت این قلم بیشتر است.");
            }

            var receivedDate = request.ReceivedDate ?? DateTime.Now;
            var now = DateTime.Now;
            var anyIssueAdded = false;

            foreach (var reqItem in request.Items)
            {
                var purchaseItem = purchaseItems[reqItem.PurchaseItemId];

                if (reqItem.ReceivedQuantity > 0)
                {
                    purchaseItem.ReceivedQuantity += reqItem.ReceivedQuantity;
                    purchaseItem.Product.Stock += reqItem.ReceivedQuantity;
                }

                var issues = (reqItem.Issues ?? new()).Where(i => i.Quantity > 0).ToList();
                if (issues.Count == 0)
                    continue;

                if (activeReturn == null)
                {
                    var returnCount = await _context.PurchaseReturns.CountAsync(cancellationToken);
                    activeReturn = new Domain.Entities.PurchaseReturn
                    {
                        ReturnNumber = Generator.GenerateReturnNumber(returnCount + 1),
                        PurchaseId = request.PurchaseId,
                        ReturnDate = receivedDate,
                        Status = PurchaseReturnStatusEnum.PENDING,
                        Description = request.ReceivingNote,
                        CreatedAt = now,
                        UpdatedAt = now,
                    };
                    await _purchaseReturnRepository.AddAsync(activeReturn);
                }

                foreach (var group in issues.GroupBy(i => i.Type))
                {
                    var qty = group.Sum(i => i.Quantity);
                    var note = string.Join("؛ ", group.Select(i => i.Note).Where(n => !string.IsNullOrWhiteSpace(n)));

                    var existing = activeReturn.Items.FirstOrDefault(x => x.PurchaseItemId == purchaseItem.Id && x.IssueType == group.Key);
                    if (existing != null)
                    {
                        existing.Quantity += qty;
                        if (!string.IsNullOrEmpty(note))
                            existing.Note = string.IsNullOrEmpty(existing.Note) ? note : existing.Note + "؛ " + note;
                    }
                    else
                    {
                        activeReturn.Items.Add(new Domain.Entities.PurchaseReturnItem
                        {
                            PurchaseItemId = purchaseItem.Id,
                            ProductId = purchaseItem.ProductId,
                            UnitPrice = purchaseItem.UnitPrice,
                            IssueType = group.Key,
                            Quantity = qty,
                            Note = string.IsNullOrEmpty(note) ? null : note,
                            CreatedAt = now,
                        });
                    }

                    anyIssueAdded = true;
                }
            }

            if (anyIssueAdded && activeReturn != null)
            {
                activeReturn.ReturnDate = receivedDate;
                activeReturn.UpdatedAt = now;
            }

            _purchaseReturnCalculationService.ResolveAwaitingReplacements(purchase, activeReturn, now);

            if (activeReturn != null)
            {
                activeReturn.Status = _purchaseReturnCalculationService.RecomputeReturnStatus(activeReturn);
                activeReturn.UpdatedAt = now;
            }

            purchase.Status = _purchaseReturnCalculationService.RecomputePurchaseStatus(purchase, activeReturn);
            purchase.UpdatedAt = now;

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = new
            {
                PurchaseId = purchase.Id,
                PurchaseStatus = purchase.Status,
                ReturnId = activeReturn?.Id,
                ReturnStatus = activeReturn?.Status,
            };
            res.Message = "دریافت با موفقیت ثبت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
