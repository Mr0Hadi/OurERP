using Application.Common.Ledger;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.Storage;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Payments;
using Application.Features.Purchase.Queries;
using Common.Exceptions;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Purchase.Commands
{
    /// <summary>Takes back a payment row recorded by mistake. The row stays, marked VoidedAt, and leaves PaidAmount.</summary>
    public class VoidPurchasePaymentCommand : IRequest<ResponseDto>
    {
        public int PaymentId { get; set; }
    }

    public class VoidPurchasePaymentCommandValidator : AbstractValidator<VoidPurchasePaymentCommand>
    {
        public VoidPurchasePaymentCommandValidator()
        {
            RuleFor(x => x.PaymentId).GreaterThan(0).WithMessage("پرداخت نامعتبر است.");
        }
    }

    public class VoidPurchasePaymentCommandHandler : IRequestHandler<VoidPurchasePaymentCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IObjectStorageService _objectStorageService;
        private readonly IUnitOfWork _unitOfWork;

        public VoidPurchasePaymentCommandHandler(IWMSDbContext context, IObjectStorageService objectStorageService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _objectStorageService = objectStorageService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(VoidPurchasePaymentCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var purchase = await _context.Purchases
                .Include(x => x.PaymentDetails)
                .FirstOrDefaultAsync(x => x.IsActive && x.PaymentDetails.Any(p => p.Id == request.PaymentId), cancellationToken)
                ?? throw new NotFoundCustomException("پرداخت مورد نظر یافت نشد.");

            var payment = purchase.PaymentDetails.First(p => p.Id == request.PaymentId);
            PaymentWriter.Void(payment);
            await PartyLedger.PaymentVoidedAsync(_context, payment, payment.VoidedAt!.Value, cancellationToken);
            purchase.PaidAmount = DocumentPayments.NetPaid(purchase.PaymentDetails, DocumentPayments.PurchaseDirection);
            purchase.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await PurchaseDetailReader.ReadAsync(_context, _objectStorageService, purchase.Id, cancellationToken);
            res.Message = "پرداخت خرید ابطال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
