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
                .WithReturnGraph()
                .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken) ?? throw new NotFoundCustomException("مرجوعی مورد نظر یافت نشد.");

            if (saleReturn.Status != SaleReturnStatusEnum.REJECTED)
                throw new ValidationCustomException("فقط مرجوعی‌های ردشده قابل بازگشایی هستند.");

            saleReturn.Status = _saleReturnCalculationService.RecomputeReturnStatus(saleReturn);
            saleReturn.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Message = "مرجوعی دوباره برای بازرسی باز شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
