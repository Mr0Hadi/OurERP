using Application.Common.Contracts.Context;
using Application.Common.Contracts.SaleReturn;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Queries;
using Application.Common.Returns;
using Application.Features.SaleReturn.Queries;
using Common.Exceptions;
using Common.Extensions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.SaleReturn.Commands
{
    public class CancelSaleReturnCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }

        /// <summary>Optional; stored on the return as StatusReason.</summary>
        public string? Reason { get; set; }
    }

    public class CancelSaleReturnCommandValidator : AbstractValidator<CancelSaleReturnCommand>
    {
        public CancelSaleReturnCommandValidator()
        {
            RuleFor(x => x.Id).GreaterThan(0).WithMessage(Validation.RequiredMessage("مرجوعی"));
            RuleFor(x => x.Reason).MaximumLength(ReturnStatusReason.MaxLength).WithMessage(ReturnStatusReason.TooLongMessage);
        }
    }

    public class CancelSaleReturnCommandHandler : IRequestHandler<CancelSaleReturnCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly ISaleReturnCalculationService _saleReturnCalculationService;
        private readonly IUnitOfWork _unitOfWork;

        public CancelSaleReturnCommandHandler(IWMSDbContext context, ISaleReturnCalculationService saleReturnCalculationService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _saleReturnCalculationService = saleReturnCalculationService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(CancelSaleReturnCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var saleReturn = await _context.SaleReturns
                .WhereNotDeleted()
                .WithReturnGraph()
                .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken) ?? throw new NotFoundCustomException("مرجوعی مورد نظر یافت نشد.");

            // One rule for every lifecycle command, and a reason that names what actually blocks it
            // (the status, moved goods, or recorded money) - see ReturnLifecycleRules.
            if (_saleReturnCalculationService.GetLifecycleBlocker(saleReturn, ReturnLifecycleActionEnum.CANCEL) is { } blocker)
                throw new ValidationCustomException(blocker);

            saleReturn.Status = ReturnStatusEnum.CANCELLED;
            saleReturn.StatusReason = ReturnStatusReason.Normalize(request.Reason);
            saleReturn.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await SaleReturnDetailReader.ReadAsync(_context, _saleReturnCalculationService, saleReturn.Id, cancellationToken);
            res.Message = "مرجوعی با موفقیت لغو شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
