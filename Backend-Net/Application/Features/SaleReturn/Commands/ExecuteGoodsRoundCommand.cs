using Application.Common.Contracts.Context;
using Application.Common.Contracts.InventoryCosting;
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
    // A physical receiving/dispatch round against one or more goods effects on a return - the
    // customer physically returning goods (GOODS_IN) or us shipping a replacement (GOODS_OUT).
    // Replaces both ConfirmReturnInspectionCommand and ConfirmReplacementShipmentCommand: goods
    // rounds now target a specific effect explicitly on either side of the movement.
    public class ExecuteGoodsRoundCommand : IRequest<ResponseDto>
    {
        public int SaleReturnId { get; set; }
        public List<GoodsRoundLineDto> Rounds { get; set; } = new();
        public DateTime? Date { get; set; }
        public string? PartyName { get; set; }
        public string? PartyNationalId { get; set; }
        public string? VehiclePlate { get; set; }
        public string? Note { get; set; }
    }

    public class GoodsRoundLineDto
    {
        public int EffectId { get; set; }
        public int Quantity { get; set; }

        /// <summary>GOODS_IN only: which portion of Quantity had a problem on arrival, and what problem.</summary>
        public List<GoodsRoundObservationDto> Observations { get; set; } = new();
    }

    public class GoodsRoundObservationDto
    {
        public ReturnProblemEnum Problem { get; set; }
        public int Quantity { get; set; }
        public string? Note { get; set; }
    }

    public class ExecuteGoodsRoundCommandValidator : AbstractValidator<ExecuteGoodsRoundCommand>
    {
        public ExecuteGoodsRoundCommandValidator()
        {
            RuleFor(x => x.SaleReturnId).GreaterThan(0).WithMessage(Validation.RequiredMessage("مرجوعی"));
            RuleFor(x => x.Rounds).NotEmpty().WithMessage(Validation.RequiredMessage("لیست اثرها"));
            RuleForEach(x => x.Rounds).ChildRules(line =>
            {
                line.RuleFor(l => l.EffectId).GreaterThan(0).WithMessage(Validation.RequiredMessage("اثر"));
                line.RuleFor(l => l.Quantity).GreaterThan(0).WithMessage("مقدار اجرا باید از صفر بیشتر باشد.");
            });
        }
    }

    public class ExecuteGoodsRoundCommandHandler : IRequestHandler<ExecuteGoodsRoundCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly ISaleReturnQueryService _saleReturnQueryService;
        private readonly ISaleReturnCalculationService _saleReturnCalculationService;
        private readonly IProductUnitService _productUnitService;
        private readonly IInventoryCostingService _inventoryCostingService;
        private readonly IUnitOfWork _unitOfWork;

        public ExecuteGoodsRoundCommandHandler(IWMSDbContext context, ISaleReturnQueryService saleReturnQueryService, ISaleReturnCalculationService saleReturnCalculationService, IProductUnitService productUnitService, IInventoryCostingService inventoryCostingService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _saleReturnQueryService = saleReturnQueryService;
            _saleReturnCalculationService = saleReturnCalculationService;
            _productUnitService = productUnitService;
            _inventoryCostingService = inventoryCostingService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(ExecuteGoodsRoundCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var saleReturn = await _saleReturnQueryService
                .WithReturnGraph(_context.SaleReturns.Where(x => x.Id == request.SaleReturnId), includeSaleItems: true)
                .FirstOrDefaultAsync(cancellationToken) ?? throw new NotFoundCustomException("مرجوعی مورد نظر یافت نشد.");

            if (_saleReturnCalculationService.IsTerminal(saleReturn.Status))
                throw new ValidationCustomException("این مرجوعی دیگر قابل ویرایش نیست.");

            var effectsById = saleReturn.Claims
                .SelectMany(c => c.Resolutions.SelectMany(r => r.Effects.Select(e => (claim: c, effect: e))))
                .ToDictionary(x => x.effect.Id);

            var now = request.Date ?? DateTime.Now;

            foreach (var line in request.Rounds)
            {
                if (!effectsById.TryGetValue(line.EffectId, out var found))
                    throw new NotFoundCustomException("اثر مورد نظر یافت نشد.");

                var (claim, effect) = found;

                if (effect.Kind is not (ReturnEffectKindEnum.GOODS_IN or ReturnEffectKindEnum.GOODS_OUT))
                    throw new ValidationCustomException("فقط اثرهای کالایی می‌توانند اجرا شوند.");

                if (line.Quantity > effect.UndoneQuantity)
                    throw new ValidationCustomException("مقدار اجرا از باقیمانده این اثر بیشتر است.");

                var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == (effect.ProductId ?? claim.ProductId), cancellationToken)
                    ?? throw new NotFoundCustomException("کالای مورد نظر یافت نشد.");

                var observations = (line.Observations ?? new()).Where(o => o.Quantity > 0).ToList();
                var healthyQty = effect.Kind == ReturnEffectKindEnum.GOODS_IN ? line.Quantity - observations.Sum(o => o.Quantity) : (int?)null;

                var round = new Domain.Entities.SaleReturnEffectRound
                {
                    Date = now,
                    Quantity = line.Quantity,
                    HealthyQuantity = healthyQty,
                    PartyName = request.PartyName,
                    PartyNationalId = request.PartyNationalId,
                    VehiclePlate = request.VehiclePlate,
                    Note = request.Note,
                    CreatedAt = now,
                };

                foreach (var obs in observations)
                {
                    round.Observations.Add(new Domain.Entities.SaleReturnEffectObservation
                    {
                        Problem = obs.Problem,
                        Quantity = obs.Quantity,
                        Note = obs.Note,
                    });
                }

                effect.History.Add(round);
                effect.DoneQuantity += line.Quantity;

                if (effect.Kind == ReturnEffectKindEnum.GOODS_IN)
                {
                    var restocked = healthyQty ?? line.Quantity;
                    var scrapped = line.Quantity - restocked;
                    product.Stock += restocked;
                    effect.RestockedQuantity = (effect.RestockedQuantity ?? 0) + restocked;

                    if (claim.SaleItemId.HasValue)
                        await _productUnitService.RestoreAsync(claim.SaleItemId.Value, restocked, scrapped, cancellationToken);

                    if (restocked > 0)
                        await _inventoryCostingService.RecordSaleReturnRestockAsync(product, restocked, claim.SaleItemId, now, cancellationToken);
                }
                else // GOODS_OUT: a replacement physically shipped out to the customer.
                {
                    if (line.Quantity > product.Stock)
                        throw new ValidationCustomException($"موجودی «{product.Name}» برای این ارسال کافی نیست.");

                    product.Stock -= line.Quantity;

                    if (claim.SaleItemId.HasValue)
                        await _productUnitService.ConsumeAsync(product, line.Quantity, claim.SaleItemId.Value, null, cancellationToken);

                    await _inventoryCostingService.RecordReplacementShippedToCustomerAsync(product, line.Quantity, claim.SaleItemId, now, cancellationToken);
                }

                if (effect.DoneQuantity >= effect.Quantity)
                {
                    effect.Status = ReturnEffectStatusEnum.APPLIED;
                    effect.AppliedAt = now;

                    var resolution = claim.Resolutions.First(r => r.Effects.Contains(effect));
                    if (resolution.Effects.All(e => e.Status != ReturnEffectStatusEnum.PENDING) && claim.SaleItemId.HasValue)
                    {
                        var saleItem = saleReturn.Sale!.Items.First(x => x.Id == claim.SaleItemId.Value);
                        saleItem.SettledQuantity += resolution.Quantity;
                    }
                }
            }

            saleReturn.Status = _saleReturnCalculationService.RecomputeReturnStatus(saleReturn);
            saleReturn.UpdatedAt = now;

            var sale = saleReturn.Sale!;
            sale.Status = _saleReturnCalculationService.RecomputeSaleStatus(sale);
            sale.UpdatedAt = now;

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = new { ReturnStatus = saleReturn.Status };
            res.Message = "اجرای مرحله با موفقیت ثبت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
