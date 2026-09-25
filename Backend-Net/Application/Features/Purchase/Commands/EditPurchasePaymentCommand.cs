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
    /// <summary>
    /// Corrects a payment row: the old row is voided and a new one with these values takes its place, in one save. The
    /// direction is kept. The response lists both rows, so the correction itself stays visible.
    /// </summary>
    public class EditPurchasePaymentCommand : PaymentInput, IRequest<ResponseDto>
    {
        public int PaymentId { get; set; }
    }

    public class EditPurchasePaymentCommandValidator : AbstractValidator<EditPurchasePaymentCommand>
    {
        public EditPurchasePaymentCommandValidator()
        {
            Include(new PaymentInputValidator());
            RuleFor(x => x.PaymentId).GreaterThan(0).WithMessage("پرداخت نامعتبر است.");
        }
    }

    public class EditPurchasePaymentCommandHandler : IRequestHandler<EditPurchasePaymentCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IObjectStorageService _objectStorageService;
        private readonly IUnitOfWork _unitOfWork;

        public EditPurchasePaymentCommandHandler(IWMSDbContext context, IObjectStorageService objectStorageService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _objectStorageService = objectStorageService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(EditPurchasePaymentCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var purchase = await _context.Purchases
                .Include(x => x.PaymentDetails)
                .FirstOrDefaultAsync(x => x.IsActive && x.PaymentDetails.Any(p => p.Id == request.PaymentId), cancellationToken)
                ?? throw new NotFoundCustomException("پرداخت مورد نظر یافت نشد.");

            var old = purchase.PaymentDetails.First(p => p.Id == request.PaymentId);
            PaymentWriter.Void(old);
            await PartyLedger.PaymentVoidedAsync(_context, old, old.VoidedAt!.Value, cancellationToken);
            var replacement = PaymentWriter.NewRow(request, old.Direction);
            purchase.PaymentDetails.Add(replacement);
            await PartyLedger.PurchasePaymentAsync(_context, purchase, replacement, cancellationToken);
            purchase.PaidAmount = DocumentPayments.NetPaid(purchase.PaymentDetails, DocumentPayments.PurchaseDirection);
            purchase.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await PurchaseDetailReader.ReadAsync(_context, _objectStorageService, purchase.Id, cancellationToken);
            res.Message = "پرداخت خرید اصلاح شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
