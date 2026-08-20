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
    public class RemoveSaleReturnDecisionCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class RemoveSaleReturnDecisionCommandValidator : AbstractValidator<RemoveSaleReturnDecisionCommand>
    {
        public RemoveSaleReturnDecisionCommandValidator()
        {
            RuleFor(x => x.Id).GreaterThan(0).WithMessage(Validation.RequiredMessage("تصمیم"));
        }
    }

    public class RemoveSaleReturnDecisionCommandHandler : IRequestHandler<RemoveSaleReturnDecisionCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly ISaleReturnQueryService _saleReturnQueryService;
        private readonly ISaleReturnCalculationService _saleReturnCalculationService;
        private readonly IUnitOfWork _unitOfWork;

        public RemoveSaleReturnDecisionCommandHandler(IWMSDbContext context, ISaleReturnQueryService saleReturnQueryService, ISaleReturnCalculationService saleReturnCalculationService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _saleReturnQueryService = saleReturnQueryService;
            _saleReturnCalculationService = saleReturnCalculationService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(RemoveSaleReturnDecisionCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var saleReturn = await _saleReturnQueryService.WithReturnGraph(_context.SaleReturns)
                .FirstOrDefaultAsync(x => x.Claims.Any(c => c.InspectionItems.Any(i => i.Decisions.Any(d => d.Id == request.Id))), cancellationToken)
                    ?? throw new NotFoundCustomException("تصمیم مورد نظر یافت نشد.");

            var saleReturnItem = saleReturn.Claims.SelectMany(c => c.InspectionItems).First(i => i.Decisions.Any(d => d.Id == request.Id));
            var decision = saleReturnItem.Decisions.First(d => d.Id == request.Id);

            if (!_saleReturnCalculationService.IsMutable(saleReturn))
                throw new ValidationCustomException("این مرجوعی قابل تغییر نیست.");

            if (decision.Status != SaleReturnDecisionStatusEnum.AWAITING)
                throw new ValidationCustomException("این تصمیم قطعی شده و دیگر قابل حذف نیست.");

            saleReturnItem.Decisions.Remove(decision);

            // No SaleItem.SettledQuantity rollback and no RecomputeSaleStatus: only AWAITING
            // decisions are removable, and AWAITING is only ever a REPLACEMENT, which never
            // settled anything in the first place (see AddSaleReturnDecisionCommand). If final
            // decisions ever become removable, both have to be reinstated here.
            saleReturn.Status = _saleReturnCalculationService.RecomputeReturnStatus(saleReturn);
            saleReturn.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Message = "تصمیم با موفقیت حذف شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
