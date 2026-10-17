using Application.Common.Audit;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.UnitOfWork;
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
    /// Takes one allocation back: the invoice owes that amount again and the payment has it unallocated again. Nothing on
    /// the party's account moves. A sale the allocation issued stays issued (leaving PROFORMA is one-way).
    /// </summary>
    [AuditAction(AuditActionEnum.RemovePartyPaymentAllocation)]
    public class RemovePartyPaymentAllocationCommand : IRequest<ResponseDto>
    {
        public int AllocationId { get; set; }
    }

    public class RemovePartyPaymentAllocationCommandValidator : AbstractValidator<RemovePartyPaymentAllocationCommand>
    {
        public RemovePartyPaymentAllocationCommandValidator()
        {
            RuleFor(x => x.AllocationId).GreaterThan(0).WithMessage("تخصیص نامعتبر است.");
        }
    }

    public class RemovePartyPaymentAllocationCommandHandler : IRequestHandler<RemovePartyPaymentAllocationCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IUnitOfWork _unitOfWork;

        public RemovePartyPaymentAllocationCommandHandler(IWMSDbContext context, IUnitOfWork unitOfWork)
        {
            _context = context;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(RemovePartyPaymentAllocationCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var allocation = await _context.PaymentAllocations.FirstOrDefaultAsync(x => x.Id == request.AllocationId, cancellationToken)
                ?? throw new NotFoundCustomException("تخصیص مورد نظر یافت نشد.");

            await PaymentAllocator.RemoveAsync(_context, allocation, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await PartyPaymentReader.ReadAsync(_context, allocation.PaymentDetailId, cancellationToken);
            res.Message = "تخصیص حذف شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
