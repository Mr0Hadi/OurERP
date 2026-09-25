using Application.Common.Ledger;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.Storage;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Payments;
using Application.Features.Purchase.Queries;
using Common.Exceptions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Purchase.Commands
{
    /// <summary>
    /// Records money moving on a purchase, in any status - a prepayment on a proforma included (it does not issue the
    /// invoice; a purchase leaves PROFORMA when the supplier's invoice is recorded). Direction defaults to OUT (we pay);
    /// IN is money the supplier gives back. PaidAmount is recomputed from the rows.
    /// </summary>
    public class AddPurchasePaymentCommand : PaymentInput, IRequest<ResponseDto>
    {
        public int PurchaseId { get; set; }

        /// <summary>OUT (default) = we pay the supplier; IN = the supplier refunds us.</summary>
        public PaymentDirectionEnum? Direction { get; set; }
    }

    public class AddPurchasePaymentCommandValidator : AbstractValidator<AddPurchasePaymentCommand>
    {
        public AddPurchasePaymentCommandValidator()
        {
            Include(new PaymentInputValidator());
            RuleFor(x => x.PurchaseId).GreaterThan(0).WithMessage("خرید نامعتبر است.");
            RuleFor(x => x.Direction).IsInEnum().When(x => x.Direction.HasValue).WithMessage("جهت پرداخت نامعتبر است.");
        }
    }

    public class AddPurchasePaymentCommandHandler : IRequestHandler<AddPurchasePaymentCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IObjectStorageService _objectStorageService;
        private readonly IUnitOfWork _unitOfWork;

        public AddPurchasePaymentCommandHandler(IWMSDbContext context, IObjectStorageService objectStorageService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _objectStorageService = objectStorageService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(AddPurchasePaymentCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var purchase = await _context.Purchases
                .Include(x => x.PaymentDetails)
                .FirstOrDefaultAsync(x => x.Id == request.PurchaseId && x.IsActive, cancellationToken)
                ?? throw new NotFoundCustomException("خرید مورد نظر یافت نشد.");

            var direction = request.Direction ?? DocumentPayments.PurchaseDirection;
            if (purchase.Status == PurchaseStatusEnum.CANCELLED && direction == DocumentPayments.PurchaseDirection)
                throw new ValidationCustomException("خرید لغوشده پرداخت تازه نمی‌پذیرد؛ فقط پول برگشتی تامین‌کننده ثبت می‌شود.");

            var payment = PaymentWriter.NewRow(request, direction);
            purchase.PaymentDetails.Add(payment);
            await PartyLedger.PurchasePaymentAsync(_context, purchase, payment, cancellationToken);
            purchase.PaidAmount = DocumentPayments.NetPaid(purchase.PaymentDetails, DocumentPayments.PurchaseDirection);
            purchase.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await PurchaseDetailReader.ReadAsync(_context, _objectStorageService, purchase.Id, cancellationToken);
            res.Message = "پرداخت خرید با موفقیت ثبت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
