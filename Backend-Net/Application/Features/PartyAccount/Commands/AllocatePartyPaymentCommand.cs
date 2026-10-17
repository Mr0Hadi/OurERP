using Application.Common.Audit;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Contracts.UserContextService;
using Application.Common.Dtos;
using Application.Common.Enums;
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
    /// Applies an on-account payment (or what is left of it) to one or more invoices of the same party. All or nothing.
    /// Rules: PaymentAllocator. Answers with the payment and its allocations.
    /// </summary>
    [AuditAction(AuditActionEnum.AllocatePartyPayment)]
    public class AllocatePartyPaymentCommand : IRequest<ResponseDto>
    {
        public int PaymentDetailId { get; set; }
        public List<PaymentAllocationInput> Allocations { get; set; } = new();
    }

    public class AllocatePartyPaymentCommandValidator : AbstractValidator<AllocatePartyPaymentCommand>
    {
        public AllocatePartyPaymentCommandValidator()
        {
            RuleFor(x => x.PaymentDetailId).GreaterThan(0).WithMessage("دریافت/پرداخت نامعتبر است.");
            RuleFor(x => x.Allocations).NotEmpty().WithMessage("هیچ فاکتوری برای تخصیص انتخاب نشده است.");
            RuleFor(x => x.Allocations).SetValidator(new PaymentAllocationInputValidator());
        }
    }

    public class AllocatePartyPaymentCommandHandler : IRequestHandler<AllocatePartyPaymentCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IUserContextService _userContextService;
        private readonly IUnitOfWork _unitOfWork;

        public AllocatePartyPaymentCommandHandler(IWMSDbContext context, IUserContextService userContextService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _userContextService = userContextService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(AllocatePartyPaymentCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var payment = await _context.PaymentDetails
                .Include(x => x.Allocations)
                .FirstOrDefaultAsync(x => x.Id == request.PaymentDetailId, cancellationToken)
                ?? throw new NotFoundCustomException("دریافت/پرداخت مورد نظر یافت نشد.");

            var userId = int.TryParse(_userContextService.GetUserId(), out var id) ? id : (int?)null;
            await PaymentAllocator.AllocateAsync(_context, payment, request.Allocations, userId, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await PartyPaymentReader.ReadAsync(_context, payment.Id, cancellationToken);
            res.Message = "مبلغ به فاکتورها تخصیص داده شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
