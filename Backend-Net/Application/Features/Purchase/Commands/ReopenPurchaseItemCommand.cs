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

namespace Application.Features.Purchase.Commands
{
    // Undo a short close: the written-off units are owed again, e.g. the supplier changed their mind. Anything that arrived on
    // the line while it was closed was received as excess and stays excess - it is already in quarantine under that custody.
    public class ReopenPurchaseItemCommand : IRequest<ResponseDto>
    {
        public int PurchaseItemId { get; set; }
    }

    public class ReopenPurchaseItemCommandValidator : AbstractValidator<ReopenPurchaseItemCommand>
    {
        public ReopenPurchaseItemCommandValidator()
        {
            RuleFor(x => x.PurchaseItemId).GreaterThan(0).WithMessage(Validation.RequiredMessage("آیتم خرید"));
        }
    }

    public class ReopenPurchaseItemCommandHandler : IRequestHandler<ReopenPurchaseItemCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IPurchaseReturnCalculationService _purchaseReturnCalculationService;
        private readonly IUnitOfWork _unitOfWork;

        public ReopenPurchaseItemCommandHandler(IWMSDbContext context, IPurchaseReturnCalculationService purchaseReturnCalculationService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _purchaseReturnCalculationService = purchaseReturnCalculationService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(ReopenPurchaseItemCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var purchase = await PurchaseItemLines.LoadPurchaseAsync(_context, request.PurchaseItemId, cancellationToken);
            var item = purchase.Items.First(x => x.Id == request.PurchaseItemId);

            if (purchase.Status == PurchaseStatusEnum.CANCELLED)
                throw new ValidationCustomException("قلمِ خرید لغوشده قابل بازگشایی نیست.");

            if (item.ShortClosedQuantity == 0)
                throw new ValidationCustomException("این قلم بسته نشده است.");

            var now = DateTime.Now;
            item.ShortClosedQuantity = 0;
            item.ShortClosedAt = null;
            await PartyLedger.PurchaseItemReopenedAsync(_context, item, now, cancellationToken);

            purchase.Status = _purchaseReturnCalculationService.RecomputePurchaseStatus(purchase);
            purchase.UpdatedAt = now;

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = PurchaseItemLines.Result(purchase, item);
            res.Message = "قلم دوباره باز شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
