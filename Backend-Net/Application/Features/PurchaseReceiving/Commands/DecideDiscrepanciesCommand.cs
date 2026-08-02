using Application.Common.Contracts.Context;
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
    public class DecideDiscrepanciesCommand : IRequest<ResponseDto>
    {
        public int PurchaseId { get; set; }
        public List<DecideDiscrepancyItemDto> Items { get; set; }
    }

    public class DecideDiscrepanciesCommandValidator : AbstractValidator<DecideDiscrepanciesCommand>
    {
        public DecideDiscrepanciesCommandValidator()
        {
            RuleFor(x => x.PurchaseId).GreaterThan(0).WithMessage(Validation.RequiredMessage("خرید"));
            RuleFor(x => x.Items).NotEmpty().WithMessage(Validation.RequiredMessage("لیست تصمیم‌ها"));
            RuleForEach(x => x.Items).ChildRules(items =>
            {
                items.RuleFor(i => i.DiscrepancyId).GreaterThan(0).WithMessage(Validation.RequiredMessage("مغایرت"));
                items.RuleFor(i => i.Quantity).GreaterThan(0).WithMessage("تعداد تصمیم باید بیشتر از صفر باشد.");
                items.RuleFor(i => i.UnitCost).Must(u => u >= 0).WithMessage("بهای واحد باید بیشتر یا مساوی صفر باشد.");
            });
        }
    }

    public class DecideDiscrepanciesCommandHandler : IRequestHandler<DecideDiscrepanciesCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IUnitOfWork _unitOfWork;

        public DecideDiscrepanciesCommandHandler(IWMSDbContext context, IUnitOfWork unitOfWork)
        {
            _context = context;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(DecideDiscrepanciesCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var purchase = await _context.Purchases
                .FirstOrDefaultAsync(x => x.Id == request.PurchaseId) ?? throw new NotFoundCustomException("خرید مورد نظر یافت نشد.");

            if (purchase.Status == PurchaseStatusEnum.CANCELLED)
                throw new ValidationCustomException("خرید لغوشده قابل تغییر نیست.");

            var receipt = await _context.PurchaseReceipts
                .Include(x => x.Items)
                .ThenInclude(x => x.Discrepancies)
                .ThenInclude(x => x.Decisions)
                .FirstOrDefaultAsync(x => x.PurchaseId == purchase.Id)
                ?? throw new ValidationCustomException("برای این خرید هنوز رسید دریافت ثبت نشده است.");

            var discrepancies = receipt.Items.SelectMany(x => x.Discrepancies).ToList();
            var discrepancyById = discrepancies.ToDictionary(x => x.Id);
            var seen = new HashSet<int>();

            foreach (var item in request.Items)
            {
                if (!discrepancyById.TryGetValue(item.DiscrepancyId, out var discrepancy))
                    throw new NotFoundCustomException("مغایرت مورد نظر یافت نشد.");

                if (!seen.Add(discrepancy.Id))
                    throw new ValidationCustomException("یک مغایرت نمی‌تواند بیش از یک بار در درخواست تصمیم استفاده شود.");

                var decidedQuantity = discrepancy.Decisions.Sum(x => x.Quantity);
                if (decidedQuantity + item.Quantity > discrepancy.Quantity)
                    throw new ValidationCustomException("مجموع تصمیم‌های ثبت‌شده از تعداد مغایرت بیشتر است.");

                discrepancy.Decisions.Add(new DiscrepancyDecision
                {
                    DiscrepancyId = discrepancy.Id,
                    DecisionType = item.DecisionType,
                    Quantity = item.Quantity,
                    UnitCost = item.UnitCost,
                    Note = item.Note,
                    CreatedAt = DateTime.Now,
                });

                discrepancy.Status = decidedQuantity + item.Quantity >= discrepancy.Quantity
                    ? DiscrepancyStatusEnum.DECIDED
                    : DiscrepancyStatusEnum.PARTIAL;
                discrepancy.UpdatedAt = DateTime.Now;
            }

            PurchaseReceivingStatusUpdater.UpdateStatuses(receipt, purchase, discrepancies);

            await _unitOfWork.SaveChangesAsync();

            res.Data = new { Count = request.Items.Count };
            res.Message = "تصمیم‌ها با موفقیت ثبت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
