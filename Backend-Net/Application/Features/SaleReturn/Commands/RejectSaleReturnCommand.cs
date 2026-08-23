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
    public class RejectSaleReturnCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class RejectSaleReturnCommandValidator : AbstractValidator<RejectSaleReturnCommand>
    {
        public RejectSaleReturnCommandValidator()
        {
            RuleFor(x => x.Id).GreaterThan(0).WithMessage(Validation.RequiredMessage("مرجوعی"));
        }
    }

    public class RejectSaleReturnCommandHandler : IRequestHandler<RejectSaleReturnCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly ISaleReturnQueryService _saleReturnQueryService;
        private readonly ISaleReturnCalculationService _saleReturnCalculationService;
        private readonly IUnitOfWork _unitOfWork;

        public RejectSaleReturnCommandHandler(IWMSDbContext context, ISaleReturnQueryService saleReturnQueryService, ISaleReturnCalculationService saleReturnCalculationService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _saleReturnQueryService = saleReturnQueryService;
            _saleReturnCalculationService = saleReturnCalculationService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(RejectSaleReturnCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var saleReturn = await _saleReturnQueryService.WithReturnGraph(_context.SaleReturns)
                .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken) ?? throw new NotFoundCustomException("مرجوعی مورد نظر یافت نشد.");

            if (!_saleReturnCalculationService.IsPreInspection(saleReturn))
                throw new ValidationCustomException("فقط مرجوعی‌هایی که هنوز هیچ بازرسی‌ای رویشان انجام نشده قابل رد کردن هستند.");

            saleReturn.Status = SaleReturnStatusEnum.REJECTED;
            saleReturn.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Message = "مرجوعی به‌عنوان رد‌شده ثبت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
