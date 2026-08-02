using Application.Common.Contracts.Context;
using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.PurchaseReceiving.Dtos;
using Common.Exceptions;
using Common.Extensions;
using Domain.Entities;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.PurchaseReceiving.Commands
{
    public class RegisterDiscrepanciesCommand : IRequest<ResponseDto>
    {
        public int PurchaseId { get; set; }
        public List<RegisterDiscrepancyItemDto> Items { get; set; }
    }

    public class RegisterDiscrepanciesCommandValidator : AbstractValidator<RegisterDiscrepanciesCommand>
    {
        public RegisterDiscrepanciesCommandValidator()
        {
            RuleFor(x => x.PurchaseId).GreaterThan(0).WithMessage(Validation.RequiredMessage("خرید"));
            RuleFor(x => x.Items).NotEmpty().WithMessage(Validation.RequiredMessage("لیست مشکلات"));
            RuleForEach(x => x.Items).ChildRules(items =>
            {
                items.RuleFor(i => i.PurchaseItemId).GreaterThan(0).WithMessage(Validation.RequiredMessage("قلم خرید"));
                items.RuleFor(i => i.Quantity).GreaterThan(0).WithMessage("تعداد مشکل باید بیشتر از صفر باشد.");
            });
        }
    }

    public class RegisterDiscrepanciesCommandHandler : IRequestHandler<RegisterDiscrepanciesCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IPurchaseReceiptRepository _purchaseReceiptRepository;
        private readonly IUnitOfWork _unitOfWork;

        public RegisterDiscrepanciesCommandHandler(IWMSDbContext context, IPurchaseReceiptRepository purchaseReceiptRepository, IUnitOfWork unitOfWork)
        {
            _context = context;
            _purchaseReceiptRepository = purchaseReceiptRepository;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(RegisterDiscrepanciesCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var purchase = await _context.Purchases
                .Include(x => x.Items)
                .FirstOrDefaultAsync(x => x.Id == request.PurchaseId) ?? throw new NotFoundCustomException("خرید مورد نظر یافت نشد.");

            if (purchase.Status == PurchaseStatusEnum.CANCELLED)
                throw new ValidationCustomException("خرید لغوشده قابل تغییر نیست.");

            var receipt = await _purchaseReceiptRepository.GetByPurchaseIdAsync(purchase.Id)
                ?? throw new ValidationCustomException("برای این خرید هنوز رسید دریافت ثبت نشده است.");

            if (receipt.Status == PurchaseReceiptStatusEnum.COMPLETED)
                throw new ValidationCustomException("رسید خرید تکمیل‌شده قابل تغییر نیست.");

            var created = new List<ReceiptDiscrepancy>();
            foreach (var item in request.Items)
            {
                var purchaseItem = purchase.Items.FirstOrDefault(x => x.Id == item.PurchaseItemId)
                    ?? throw new ValidationCustomException("یکی از اقلام خرید یافت نشد.");

                var receiptItem = receipt.Items.FirstOrDefault(x => x.PurchaseItemId == item.PurchaseItemId)
                    ?? throw new ValidationCustomException("قلم خرید در رسید دریافت ثبت نشده است.");

                var discrepancy = new ReceiptDiscrepancy
                {
                    PurchaseReceiptId = receipt.Id,
                    PurchaseReceiptItemId = receiptItem.Id,
                    Quantity = item.Quantity,
                    DiscrepancyType = item.DiscrepancyType,
                    Reason = item.Reason,
                    Status = DiscrepancyStatusEnum.UNDECIDED,
                    CreatedAt = DateTime.Now,
                    UpdatedAt = DateTime.Now,
                };

                created.Add(discrepancy);
                _context.Set<ReceiptDiscrepancy>().Add(discrepancy);
            }

            var allDiscrepancies = await _context.Set<ReceiptDiscrepancy>()
                .Where(x => x.PurchaseReceiptId == receipt.Id)
                .ToListAsync();
            allDiscrepancies.AddRange(created);

            PurchaseReceivingStatusUpdater.UpdateStatuses(receipt, purchase, allDiscrepancies);

            await _unitOfWork.SaveChangesAsync();

            res.Data = new { ReceiptId = receipt.Id, Count = created.Count };
            res.Message = "مغایرت‌ها با موفقیت ثبت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
