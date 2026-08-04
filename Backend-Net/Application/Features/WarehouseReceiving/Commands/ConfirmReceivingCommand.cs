using Application.Common.Contracts.Context;
using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.PurchaseReturn;
using Application.Features.WarehouseReceiving.Dtos;
using Common.Exceptions;
using Common.Extensions;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.WarehouseReceiving.Commands
{
    public class ConfirmReceivingCommand : IRequest<ResponseDto>
    {
        public int PurchaseId { get; set; }
        public DateTime? ReceivedDate { get; set; }
        public string? ReceivingNote { get; set; }
        public List<ConfirmReceivingItemDto> ReceivedItems { get; set; }
    }

    public class ConfirmReceivingCommandValidator : AbstractValidator<ConfirmReceivingCommand>
    {
        public ConfirmReceivingCommandValidator()
        {
            RuleFor(x => x.PurchaseId).NotEmpty().WithMessage(Validation.RequiredMessage("خرید"));
            RuleFor(x => x.ReceivedItems).NotNull().WithMessage("اقلام دریافت شده را وارد کنید.");
            RuleForEach(x => x.ReceivedItems).ChildRules(item =>
            {
                //item.RuleFor(i => i.ProductId).GreaterThan(0).WithMessage("شناسه محصول معتبر نیست."); //TODO: should be checked from db.
                item.RuleFor(i => i.ReceivedQty).GreaterThanOrEqualTo(0).WithMessage("تعداد دریافتی نمی‌تواند منفی باشد.");
                item.RuleForEach(i => i.Issues).ChildRules(issue =>
                {
                    issue.RuleFor(j => j.Qty).GreaterThan(0).WithMessage("تعداد مشکل باید بیشتر از صفر باشد.");
                });
            });
        }
    }

    public class ConfirmReceivingCommandHandler : IRequestHandler<ConfirmReceivingCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IPurchaseReturnRepository _purchaseReturnRepository;
        private readonly IUnitOfWork _unitOfWork;

        public ConfirmReceivingCommandHandler(IWMSDbContext context, IPurchaseReturnRepository purchaseReturnRepository, IUnitOfWork unitOfWork)
        {
            _context = context;
            _purchaseReturnRepository = purchaseReturnRepository;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(ConfirmReceivingCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var purchase = await _context.Purchases
                .FirstOrDefaultAsync(x => x.Id == request.PurchaseId && x.IsActive) ?? throw new NotFoundCustomException("خرید مورد نظر یافت نشد.");

            if (purchase.Status == Domain.Enums.PurchaseStatusEnum.CANCELLED)
                throw new ValidationCustomException("این خرید لغو شده است و قابل دریافت نیست.");

            var purchaseReturn = await _context.PurchaseReturns
                .FirstOrDefaultAsync(x => x.PurchaseId == request.PurchaseId && x.IsActive);

            if (purchaseReturn == null)
            {
                var returnCount = await _context.PurchaseReturns.CountAsync(cancellationToken);
                purchaseReturn = new Domain.Entities.PurchaseReturn
                {
                    ReturnNumber = Generator.GenerateReturnNumber(returnCount + 1),
                    ReturnDate = request.ReceivedDate ?? DateTime.Now,
                    Status = Domain.Enums.PurchaseReturnStatusEnum.PENDING,
                    Description = request.ReceivingNote,
                    IsActive = true,
                    CreatedAt = DateTime.Now,
                    UpdatedAt = DateTime.Now,
                    PurchaseId = request.PurchaseId,
                    Items = new List<Domain.Entities.PurchaseReturnItem>(),
                };
                await _purchaseReturnRepository.AddAsync(purchaseReturn);
            }
            else
            {
                if (!string.IsNullOrEmpty(request.ReceivingNote))
                    purchaseReturn.Description = request.ReceivingNote;
            }

            var receivedDate = request.ReceivedDate ?? DateTime.Now;
            var anyReceived = false;
            var anyIssue = false;

            foreach (var receivedItem in request.ReceivedItems ?? new List<ConfirmReceivingItemDto>())
            {
                var purchaseItem = purchase.Items.FirstOrDefault(x => x.ProductId == receivedItem.ProductId)
                    ?? throw new NotFoundCustomException($"محصول {receivedItem.ProductId} در این خرید وجود ندارد.");

                if (receivedItem.ReceivedQty > 0)
                {
                    purchaseItem.ReceivedQuantity += receivedItem.ReceivedQty;
                    purchaseItem.Product.Stock += receivedItem.ReceivedQty;
                    anyReceived = true;
                }

                var issues = receivedItem.Issues ?? new List<ReceivingIssueDto>();
                var grouped = issues
                    .Where(x => x.Qty > 0)
                    .GroupBy(x => x.Type)
                    .ToList();

                foreach (var group in grouped)
                {
                    var qty = group.Sum(x => x.Qty);
                    var note = string.Join("؛ ", group.Select(x => x.Note).Where(n => !string.IsNullOrEmpty(n)));

                    var existingItem = purchaseReturn.Items.FirstOrDefault(x =>
                        x.PurchaseItemId == purchaseItem.Id && x.IssueType == group.Key);

                    if (existingItem != null)
                    {
                        existingItem.Quantity += qty;
                        if (!string.IsNullOrEmpty(note))
                            existingItem.Note = string.IsNullOrEmpty(existingItem.Note) ? note : existingItem.Note + "؛ " + note;
                    }
                    else
                    {
                        purchaseReturn.Items.Add(new Domain.Entities.PurchaseReturnItem
                        {
                            PurchaseItemId = purchaseItem.Id,
                            ProductId = purchaseItem.ProductId,
                            Quantity = qty,
                            UnitPrice = purchaseItem.UnitPrice,
                            IssueType = group.Key,
                            Note = note,
                            Decisions = new List<Domain.Entities.PurchaseReturnDecision>(),
                        });
                    }

                    anyIssue = true;
                }
            }

            if (anyIssue)
            {
                purchaseReturn.ReturnDate = receivedDate;
                purchaseReturn.Status = PurchaseReturnStatusUpdater.RecomputeReturnStatus(purchaseReturn);
                purchaseReturn.UpdatedAt = DateTime.Now;
            }

            if (anyReceived)
            {
                purchase.UpdatedAt = DateTime.Now;
            }

            PurchaseReturnStatusUpdater.ResolveReplacementDecisions(purchase, purchaseReturn);
            purchase.Status = PurchaseReturnStatusUpdater.RecomputePurchaseStatus(purchase, purchaseReturn);
            purchase.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync();

            res.Data = new
            {
                PurchaseId = purchase.Id,
                PurchaseStatus = purchase.Status,
                ReturnId = purchaseReturn.Items.Count > 0 ? purchaseReturn.Id : (int?)null,
                ReturnStatus = purchaseReturn.Items.Count > 0 ? purchaseReturn.Status : (Domain.Enums.PurchaseReturnStatusEnum?)null,
            };
            res.Message = "دریافت با موفقیت ثبت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
