using Application.Common.Audit;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Ledger;
using Application.Common.Payments;
using Application.Features.Cheque.Queries;
using Common.Exceptions;
using Domain.Entities;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Cheque.Commands
{
    /// <summary>
    /// A received cheque passed on to a supplier as payment (خرج چک). A new OUT payment row is written - on the given purchase,
    /// or on account to the supplier - carrying the same cheque (number, date, bank, drawer) and pointing back at it
    /// (EndorsedFromPaymentDetailId); the received cheque becomes ENDORSED. No bank account of ours ever moves. From then on the
    /// cheque's fate is recorded on the new row: CashCheck when the supplier cashes it, BounceCheck when it bounces - which takes
    /// back both payments. Only a PENDING received cheque.
    /// </summary>
    [AuditAction(AuditActionEnum.EndorseCheck)]
    public class EndorseCheckCommand : IRequest<ResponseDto>
    {
        public int PaymentDetailId { get; set; }
        public int SupplierId { get; set; }

        /// <summary>Pay this purchase of the supplier with it; omitted = on account.</summary>
        public int? PurchaseId { get; set; }

        /// <summary>Now when omitted.</summary>
        public DateTime? EndorsedAt { get; set; }
        public string? Description { get; set; }
    }

    public class EndorseCheckCommandValidator : AbstractValidator<EndorseCheckCommand>
    {
        public EndorseCheckCommandValidator()
        {
            RuleFor(x => x.PaymentDetailId).GreaterThan(0).WithMessage("چک نامعتبر است.");
            RuleFor(x => x.SupplierId).GreaterThan(0).WithMessage("تامین‌کننده را انتخاب کنید.");
            RuleFor(x => x.Description).MaximumLength(500).WithMessage("شرح حداکثر ۵۰۰ نویسه است.");
        }
    }

    public class EndorseCheckCommandHandler : IRequestHandler<EndorseCheckCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IUnitOfWork _unitOfWork;

        public EndorseCheckCommandHandler(IWMSDbContext context, IUnitOfWork unitOfWork)
        {
            _context = context;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(EndorseCheckCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var received = await ChequeLoader.PendingAsync(_context, request.PaymentDetailId, cancellationToken);
            if (received.Direction != PaymentDirectionEnum.IN)
                throw new ValidationCustomException("فقط چک دریافتی خرج می‌شود.");

            var supplier = await _context.Suppliers.FirstOrDefaultAsync(x => x.Id == request.SupplierId && x.IsActive, cancellationToken)
                ?? throw new NotFoundCustomException("تامین‌کننده‌ی مورد نظر یافت نشد.");

            var at = request.EndorsedAt ?? DateTime.Now;
            var endorsed = new PaymentDetail
            {
                Type = PaymentTypeEnum.CHECK,
                Purpose = PaymentPurposeEnum.NORMAL,
                Direction = PaymentDirectionEnum.OUT,
                Amount = received.Amount,
                PaidAt = at,
                CheckNumber = received.CheckNumber,
                CheckDueDate = received.CheckDueDate,
                CheckBankName = received.CheckBankName,
                CheckDrawerName = received.CheckDrawerName,
                EndorsedFrom = received,
                Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
            };

            if (request.PurchaseId.HasValue)
            {
                var purchase = await _context.Purchases.Include(x => x.PaymentDetails).Include(x => x.PaymentAllocations)
                    .FirstOrDefaultAsync(x => x.Id == request.PurchaseId && x.IsActive, cancellationToken)
                    ?? throw new NotFoundCustomException("خرید مورد نظر یافت نشد.");
                if (purchase.SupplierId != supplier.Id)
                    throw new ValidationCustomException("این خرید مال تامین‌کننده‌ی دیگری است.");
                if (purchase.Status == PurchaseStatusEnum.CANCELLED)
                    throw new ValidationCustomException("خرید لغوشده پرداخت تازه نمی‌پذیرد.");

                purchase.PaymentDetails.Add(endorsed);
                purchase.PaidAmount = DocumentPayments.NetPaid(purchase.PaymentDetails, purchase.PaymentAllocations, DocumentPayments.PurchaseDirection);
                purchase.UpdatedAt = at;
                await PartyLedger.PurchasePaymentAsync(_context, purchase, endorsed, cancellationToken);
            }
            else
            {
                endorsed.SupplierId = supplier.Id;
                await _context.PaymentDetails.AddAsync(endorsed, cancellationToken);
                await PartyLedger.OnAccountPaymentAsync(_context, endorsed, cancellationToken);
            }

            received.CheckStatus = PaymentCheckStatusEnum.ENDORSED;
            received.CheckStatusChangedAt = at;
            received.CheckStatusNote = $"خرج شد به {supplier.CompanyName}";
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await ChequeReader.ReadAsync(_context, endorsed.Id, cancellationToken);
            res.Message = "خرج چک ثبت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
