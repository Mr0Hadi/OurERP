using Application.Common.Contracts.Context;
using Application.Common.Contracts.ProductUnit;
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
    // Unlike PurchaseReturn's ResolveAwaitingReplacements (a heuristic that guesses whether an
    // incoming shipment is a promised replacement), sale-side replacement shipping is an explicit
    // action against a specific decision - the warehouse is the one sending the goods out, so
    // there's nothing to infer. Multi-round-safe (partial shipment allowed, see
    // docs/return-scenarios-guide.fa.md scenario 2.7.6).
    public class ConfirmReplacementShipmentCommand : IRequest<ResponseDto>
    {
        public int SaleReturnDecisionId { get; set; }
        public int ShippedQuantity { get; set; }
        public string? Note { get; set; }
    }

    public class ConfirmReplacementShipmentCommandValidator : AbstractValidator<ConfirmReplacementShipmentCommand>
    {
        public ConfirmReplacementShipmentCommandValidator()
        {
            RuleFor(x => x.SaleReturnDecisionId).GreaterThan(0).WithMessage(Validation.RequiredMessage("تصمیم جایگزینی"));
            RuleFor(x => x.ShippedQuantity).GreaterThan(0).WithMessage("مقدار ارسالی باید از صفر بیشتر باشد.");
        }
    }

    public class ConfirmReplacementShipmentCommandHandler : IRequestHandler<ConfirmReplacementShipmentCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly ISaleReturnCalculationService _saleReturnCalculationService;
        private readonly IProductUnitService _productUnitService;
        private readonly IUnitOfWork _unitOfWork;

        public ConfirmReplacementShipmentCommandHandler(IWMSDbContext context, ISaleReturnCalculationService saleReturnCalculationService, IProductUnitService productUnitService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _saleReturnCalculationService = saleReturnCalculationService;
            _productUnitService = productUnitService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(ConfirmReplacementShipmentCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var saleReturn = await _context.SaleReturns
                .WithReturnGraph()
                .FirstOrDefaultAsync(x => x.Claims.Any(c => c.InspectionItems.Any(i => i.Decisions.Any(d => d.Id == request.SaleReturnDecisionId))), cancellationToken)
                    ?? throw new NotFoundCustomException("تصمیم مورد نظر یافت نشد.");

            var claim = saleReturn.Claims.First(c => c.InspectionItems.Any(i => i.Decisions.Any(d => d.Id == request.SaleReturnDecisionId)));
            var decision = claim.InspectionItems.SelectMany(i => i.Decisions).First(d => d.Id == request.SaleReturnDecisionId);
            var product = claim.Product!;

            if (decision.DecisionType != SaleReturnDecisionTypeEnum.REPLACEMENT)
                throw new ValidationCustomException("این تصمیم از نوع جایگزینی نیست.");

            if (decision.Status != SaleReturnDecisionStatusEnum.AWAITING)
                throw new ValidationCustomException("این تصمیم دیگر منتظر ارسال نیست.");

            if (request.ShippedQuantity > decision.UnshippedReplacementQuantity)
                throw new ValidationCustomException("مقدار ارسالی از باقیمانده‌ی این تصمیم بیشتر است.");

            if (request.ShippedQuantity > product.Stock)
                throw new ValidationCustomException($"موجودی «{product.Name}» برای ارسال جایگزین کافی نیست.");

            var now = DateTime.Now;

            decision.ReplacementShippedQuantity += request.ShippedQuantity;
            product.Stock -= request.ShippedQuantity;
            await _productUnitService.ConsumeAsync(product, request.ShippedQuantity, claim.SaleItemId, null, cancellationToken);

            if (decision.ReplacementShippedQuantity >= decision.Quantity)
            {
                decision.Status = SaleReturnDecisionStatusEnum.RESOLVED;
                decision.ResolvedAt = now;
            }

            // Sale.Status is deliberately not recomputed: shipping a replacement settles nothing
            // into SaleItem.SettledQuantity (the customer is made whole in goods, not money), so
            // RecomputeSaleStatus could only ever return the status the sale already has.
            saleReturn.Status = _saleReturnCalculationService.RecomputeReturnStatus(saleReturn);
            saleReturn.UpdatedAt = now;

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = new { ReturnId = saleReturn.Id, DecisionStatus = decision.Status };
            res.Message = "ارسال کالای جایگزین با موفقیت ثبت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
