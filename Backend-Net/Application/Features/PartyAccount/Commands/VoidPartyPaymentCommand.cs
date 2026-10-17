using Application.Common.Audit;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Ledger;
using Application.Common.Payments;
using Application.Features.PartyAccount.Queries;
using Common.Exceptions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.PartyAccount.Commands
{
    /// <summary>
    /// Voids an on-account payment recorded by mistake: VoidedAt is stamped, a REVERSAL row takes it off the party's account,
    /// and it leaves its cash box / bank account. Refused while any of it is allocated - remove the allocations first, so
    /// no invoice silently becomes unpaid. A payment on an invoice is voided from the invoice (Void{Sale,Purchase}Payment).
    /// </summary>
    [AuditAction(AuditActionEnum.VoidPartyPayment)]
    public class VoidPartyPaymentCommand : IRequest<ResponseDto>
    {
        public int PaymentDetailId { get; set; }
    }

    public class VoidPartyPaymentCommandValidator : AbstractValidator<VoidPartyPaymentCommand>
    {
        public VoidPartyPaymentCommandValidator()
        {
            RuleFor(x => x.PaymentDetailId).GreaterThan(0).WithMessage("دریافت/پرداخت نامعتبر است.");
        }
    }

    public class VoidPartyPaymentCommandHandler : IRequestHandler<VoidPartyPaymentCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IUnitOfWork _unitOfWork;

        public VoidPartyPaymentCommandHandler(IWMSDbContext context, IUnitOfWork unitOfWork)
        {
            _context = context;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(VoidPartyPaymentCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var payment = await _context.PaymentDetails
                .Include(x => x.Allocations)
                .FirstOrDefaultAsync(x => x.Id == request.PaymentDetailId && (x.CustomerId != null || x.SupplierId != null), cancellationToken)
                ?? throw new NotFoundCustomException("دریافت/پرداخت علی‌الحساب مورد نظر یافت نشد.");

            if (payment.Allocations.Any(a => a.VoidedAt == null))
                throw new ValidationCustomException("بخشی از این مبلغ به فاکتور تخصیص داده شده است؛ ابتدا تخصیص‌ها را حذف کنید.");

            PaymentWriter.Void(payment);
            await PartyLedger.PaymentVoidedAsync(_context, payment, payment.VoidedAt!.Value, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await PartyPaymentReader.ReadAsync(_context, payment.Id, cancellationToken);
            res.Message = "دریافت/پرداخت علی‌الحساب ابطال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
