using Application.Common.Contracts.Context;
using Application.Common.Contracts.SaleReturn;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Queries;
using Application.Features.SaleReturn.Queries;
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
        private readonly ISaleReturnCalculationService _saleReturnCalculationService;
        private readonly IUnitOfWork _unitOfWork;

        public ReopenSaleReturnCommandHandler(IWMSDbContext context, ISaleReturnCalculationService saleReturnCalculationService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _saleReturnCalculationService = saleReturnCalculationService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(ReopenSaleReturnCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var saleReturn = await _context.SaleReturns
                .WhereNotDeleted()
                .WithReturnGraph()
                .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken) ?? throw new NotFoundCustomException("مرجوعی مورد نظر یافت نشد.");

            // One rule for every lifecycle command, and a reason that names what actually blocks it
            // (the status, moved goods, or recorded money) - see ReturnLifecycleRules.
            if (_saleReturnCalculationService.GetLifecycleBlocker(saleReturn, ReturnLifecycleActionEnum.REOPEN) is { } blocker)
                throw new ValidationCustomException(blocker);

            // Step out of REJECTED first - RecomputeReturnStatus hands terminal statuses straight back -
            // then let the graph decide. Not hard-set to OPEN: Reject is legal while a goods resolution
            // is still pending, so a reopened return can legitimately be IN_PROGRESS.
            saleReturn.Status = ReturnStatusEnum.OPEN;
            saleReturn.Status = _saleReturnCalculationService.RecomputeReturnStatus(saleReturn);
            saleReturn.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await SaleReturnDetailReader.ReadAsync(_context, _saleReturnCalculationService, saleReturn.Id, cancellationToken);
            res.Message = "مرجوعی دوباره برای هماهنگی باز شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
