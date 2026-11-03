using Application.Common.Ledger;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.PurchaseReturn;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Common.Exceptions;
using Common.Extensions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Application.Common.Audit;
using Application.Common.Documents;

namespace Application.Features.Purchase.Commands
{
    // "The supplier will not send the rest": the line's still-owed units stop being expected (SAP's "delivery completed",
    // Business Central's / Odoo's short close). Without it a purchase whose supplier never delivers the remainder stays
    // PARTIALLY_RECEIVED forever. Physical only: nothing moves in stock, units or the cost ledger, and no money is inferred -
    // any refund for goods that were paid for and never came is the purchasing staff's to record.
    [AuditAction(AuditActionEnum.ClosePurchaseItem)]
    public class ClosePurchaseItemCommand : IRequest<ResponseDto>
    {
        public int PurchaseItemId { get; set; }
    }

    public class ClosePurchaseItemCommandValidator : AbstractValidator<ClosePurchaseItemCommand>
    {
        public ClosePurchaseItemCommandValidator()
        {
            RuleFor(x => x.PurchaseItemId).GreaterThan(0).WithMessage(Validation.RequiredMessage("آیتم خرید"));
        }
    }

    public class ClosePurchaseItemCommandHandler : IRequestHandler<ClosePurchaseItemCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IPurchaseReturnCalculationService _purchaseReturnCalculationService;
        private readonly IUnitOfWork _unitOfWork;

        public ClosePurchaseItemCommandHandler(IWMSDbContext context, IPurchaseReturnCalculationService purchaseReturnCalculationService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _purchaseReturnCalculationService = purchaseReturnCalculationService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(ClosePurchaseItemCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var purchase = await PurchaseItemLines.LoadPurchaseAsync(_context, request.PurchaseItemId, cancellationToken);
            var item = purchase.Items.First(x => x.Id == request.PurchaseItemId);

            var blocker = PurchaseDocumentRules.CloseItemBlocker(purchase.Status, purchase.Items.Any(i => i.ReceivedQuantity > 0),
                item.ShortClosedQuantity, item.StillOwedQuantity);
            if (blocker != null)
                throw new ValidationCustomException(blocker);

            var missing = item.StillOwedQuantity;

            var now = DateTime.Now;
            item.ShortClosedQuantity = missing;
            item.ShortClosedAt = now;

            // The issued invoice is not edited: the undelivered share comes off what we owe the supplier instead.
            await PartyLedger.PurchaseShortClosedAsync(_context, purchase, item, now, cancellationToken);

            purchase.Status = _purchaseReturnCalculationService.RecomputePurchaseStatus(purchase);
            purchase.UpdatedAt = now;

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = PurchaseItemLines.Result(purchase, item);
            res.Message = $"قلم بسته شد؛ {missing} عدد دیگر از این قلم انتظار نمی‌رود.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }

    internal static class PurchaseItemLines
    {
        public static async Task<Domain.Entities.Purchase> LoadPurchaseAsync(IWMSDbContext context, int purchaseItemId, CancellationToken cancellationToken) =>
            await context.Purchases
                .Include(x => x.Items)
                .FirstOrDefaultAsync(x => x.IsActive && x.Items.Any(i => i.Id == purchaseItemId), cancellationToken)
            ?? throw new NotFoundCustomException("آیتم خرید مورد نظر یافت نشد.");

        public static object Result(Domain.Entities.Purchase purchase, Domain.Entities.PurchaseItem item) => new
        {
            PurchaseId = purchase.Id,
            PurchaseStatus = purchase.Status,
            PurchaseItemId = item.Id,
            item.ReceivedQuantity,
            item.ShortClosedQuantity,
            item.ShortClosedAt,
            item.StillOwedQuantity,
        };
    }
}
