using Application.Common.Audit;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Payments;
using Application.Features.Cheque.Queries;
using Common.Exceptions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Cheque.Commands
{
    /// <summary>
    /// A cheque cleared (وصول). Received: deposited into one of our bank accounts, which then shows the money on CashedAt.
    /// Issued: cleared out of the account it was drawn on. A cheque we passed on to a supplier: the supplier cashed it - no
    /// account of ours moves. Only a PENDING cheque. Nothing on the party's account moves - the payment already did.
    /// </summary>
    [AuditAction(AuditActionEnum.CashCheck)]
    public class CashCheckCommand : IRequest<ResponseDto>
    {
        public int PaymentDetailId { get; set; }

        /// <summary>
        /// The bank account the money went into (received) or out of (issued). Optional when the row already names one; ignored
        /// for a cheque passed on to a supplier.
        /// </summary>
        public int? BankAccountId { get; set; }

        /// <summary>Now when omitted.</summary>
        public DateTime? CashedAt { get; set; }
    }

    public class CashCheckCommandValidator : AbstractValidator<CashCheckCommand>
    {
        public CashCheckCommandValidator()
        {
            RuleFor(x => x.PaymentDetailId).GreaterThan(0).WithMessage("چک نامعتبر است.");
        }
    }

    public class CashCheckCommandHandler : IRequestHandler<CashCheckCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IUnitOfWork _unitOfWork;

        public CashCheckCommandHandler(IWMSDbContext context, IUnitOfWork unitOfWork)
        {
            _context = context;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(CashCheckCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var cheque = await ChequeLoader.PendingAsync(_context, request.PaymentDetailId, cancellationToken);

            if (cheque.EndorsedFromPaymentDetailId == null)
            {
                var accountId = request.BankAccountId ?? cheque.BankAccountId
                    ?? throw new ValidationCustomException(cheque.Direction == PaymentDirectionEnum.IN
                        ? "حساب بانکی‌ای را که چک به آن واریز شد انتخاب کنید."
                        : "حساب بانکی‌ای را که چک از آن پاس شد انتخاب کنید.");
                await BankAccountChecks.EnsureActiveAsync(_context, accountId, cancellationToken);
                cheque.BankAccountId = accountId;
            }

            cheque.CheckStatus = PaymentCheckStatusEnum.CASHED;
            cheque.CheckStatusChangedAt = request.CashedAt ?? DateTime.Now;
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await ChequeReader.ReadAsync(_context, cheque.Id, cancellationToken);
            res.Message = "وصول چک ثبت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
