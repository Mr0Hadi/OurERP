using Application.Common.Audit;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Payments;
using Application.Features.Cheque.Queries;
using Domain.Enums;
using FluentValidation;
using MediatR;

namespace Application.Features.Cheque.Commands
{
    /// <summary>
    /// A cheque bounced (برگشت). The payment it was is taken back - the party owes again, the invoice or installments it
    /// paid owe again, its allocations are removed - and, for a cheque we passed on to a supplier, the customer's cheque
    /// behind it bounces too (ChequeLifecycle). Only a PENDING cheque; a cashed one cannot bounce.
    /// </summary>
    [AuditAction(AuditActionEnum.BounceCheck)]
    public class BounceCheckCommand : IRequest<ResponseDto>
    {
        public int PaymentDetailId { get; set; }

        /// <summary>Now when omitted.</summary>
        public DateTime? BouncedAt { get; set; }

        /// <summary>Why it bounced (کسری موجودی، مغایرت امضا، ...).</summary>
        public string? Note { get; set; }
    }

    public class BounceCheckCommandValidator : AbstractValidator<BounceCheckCommand>
    {
        public BounceCheckCommandValidator()
        {
            RuleFor(x => x.PaymentDetailId).GreaterThan(0).WithMessage("چک نامعتبر است.");
            RuleFor(x => x.Note).MaximumLength(500).WithMessage("توضیح حداکثر ۵۰۰ نویسه است.");
        }
    }

    public class BounceCheckCommandHandler : IRequestHandler<BounceCheckCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IUnitOfWork _unitOfWork;

        public BounceCheckCommandHandler(IWMSDbContext context, IUnitOfWork unitOfWork)
        {
            _context = context;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(BounceCheckCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var cheque = await ChequeLoader.PendingAsync(_context, request.PaymentDetailId, cancellationToken);
            await ChequeLifecycle.BounceAsync(_context, cheque, request.BouncedAt ?? DateTime.Now, request.Note, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await ChequeReader.ReadAsync(_context, cheque.Id, cancellationToken);
            res.Message = "برگشت چک ثبت شد و پرداختش از حساب طرف برگشت.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
