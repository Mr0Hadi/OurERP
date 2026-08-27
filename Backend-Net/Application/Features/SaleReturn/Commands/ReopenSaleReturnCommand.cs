using Application.Common.Contracts.Context;
using Application.Common.Contracts.SaleReturn;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Common.Exceptions;
using Common.Extensions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.SaleReturn.Commands
{
    public class ReopenSaleReturnCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class ReopenSaleReturnCommandValidator : AbstractValidator<ReopenSaleReturnCommand>
    {
        public ReopenSaleReturnCommandValidator()
        {
            RuleFor(x => x.Id).GreaterThan(0).WithMessage(Validation.RequiredMessage("مرجوعی"));
        }
    }

    public class ReopenSaleReturnCommandHandler : IRequestHandler<ReopenSaleReturnCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly ISaleReturnQueryService _saleReturnQueryService;
        private readonly IUnitOfWork _unitOfWork;

        public ReopenSaleReturnCommandHandler(IWMSDbContext context, ISaleReturnQueryService saleReturnQueryService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _saleReturnQueryService = saleReturnQueryService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(ReopenSaleReturnCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var saleReturn = await _saleReturnQueryService.WithReturnGraph(_context.SaleReturns)
                .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken) ?? throw new NotFoundCustomException("مرجوعی مورد نظر یافت نشد.");

            if (saleReturn.Status != ReturnStatusEnum.REJECTED)
                throw new ValidationCustomException("فقط مرجوعی‌های ردشده قابل بازگشایی هستند.");

            // A REJECTED return can only have gotten there while untouched (see Reject's guard), so
            // reopening it always lands back at OPEN - RecomputeReturnStatus's terminal-status
            // short-circuit would just hand REJECTED straight back if called on it here instead.
            saleReturn.Status = ReturnStatusEnum.OPEN;
            saleReturn.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Message = "مرجوعی دوباره برای هماهنگی باز شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
