using Application.Common.Contracts.Context;
using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.SaleReturn;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Common.Exceptions;
using Common.Extensions;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.SaleReturn.Commands
{
    public class DeleteSaleReturnCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class DeleteSaleReturnCommandValidator : AbstractValidator<DeleteSaleReturnCommand>
    {
        public DeleteSaleReturnCommandValidator()
        {
            RuleFor(x => x.Id).GreaterThan(0).WithMessage(Validation.RequiredMessage("مرجوعی"));
        }
    }

    public class DeleteSaleReturnCommandHandler : IRequestHandler<DeleteSaleReturnCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly ISaleReturnQueryService _saleReturnQueryService;
        private readonly ISaleReturnRepository _saleReturnRepository;
        private readonly ISaleReturnCalculationService _saleReturnCalculationService;
        private readonly IUnitOfWork _unitOfWork;

        public DeleteSaleReturnCommandHandler(IWMSDbContext context, ISaleReturnQueryService saleReturnQueryService, ISaleReturnRepository saleReturnRepository, ISaleReturnCalculationService saleReturnCalculationService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _saleReturnQueryService = saleReturnQueryService;
            _saleReturnRepository = saleReturnRepository;
            _saleReturnCalculationService = saleReturnCalculationService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(DeleteSaleReturnCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var saleReturn = await _saleReturnQueryService.WithReturnGraph(_context.SaleReturns)
                .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken) ?? throw new NotFoundCustomException("مرجوعی مورد نظر یافت نشد.");

            if (_saleReturnCalculationService.IsTerminal(saleReturn.Status) || !_saleReturnCalculationService.IsUntouched(saleReturn))
                throw new ValidationCustomException("فقط مرجوعی‌های دست‌نخورده قابل حذف هستند.");

            _saleReturnRepository.Remove(saleReturn);

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Message = "مرجوعی با موفقیت حذف شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
