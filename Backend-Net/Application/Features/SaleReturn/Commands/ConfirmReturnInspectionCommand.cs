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
    // The warehouse-side counterpart of ReceivePurchaseCommand: records what physically came back
    // for one or more claim lines, multi-round-safe. A null IssueType means the inspected
    // quantity was healthy - that portion goes straight back into sellable stock here, not at
    // decision time (mirrors PurchaseReturn: only clean quantity ever touches Product.Stock).
    public class ConfirmReturnInspectionCommand : IRequest<ResponseDto>
    {
        public int SaleReturnId { get; set; }
        public List<ConfirmReturnInspectionClaimDto> Claims { get; set; } = new();
    }

    public class ConfirmReturnInspectionClaimDto
    {
        public int SaleReturnClaimId { get; set; }
        public List<ConfirmReturnInspectionResultDto> Results { get; set; } = new();
    }

    public class ConfirmReturnInspectionResultDto
    {
        public SalesReturnIssueTypeEnum? IssueType { get; set; }
        public int Quantity { get; set; }
        public string? Note { get; set; }
    }

    public class ConfirmReturnInspectionCommandValidator : AbstractValidator<ConfirmReturnInspectionCommand>
    {
        public ConfirmReturnInspectionCommandValidator()
        {
            RuleFor(x => x.SaleReturnId).NotNull().WithMessage(Validation.RequiredMessage("مرجوعی"));
            RuleFor(x => x.Claims).NotEmpty().WithMessage(Validation.RequiredMessage("لیست اقلام بازرسی"));
            RuleFor(x => x.Claims).Must(claims => claims.Select(c => c.SaleReturnClaimId).Distinct().Count() == claims.Count)
                .WithMessage("هر قلم ادعا فقط یک‌بار می‌تواند در یک درخواست بازرسی ظاهر شود.");
            RuleForEach(x => x.Claims).ChildRules(claim =>
            {
                claim.RuleFor(c => c.SaleReturnClaimId).NotNull().WithMessage(Validation.RequiredMessage("قلم ادعا"));
                claim.RuleFor(c => c.Results).NotEmpty().WithMessage("برای هر قلم باید حداقل یک نتیجه‌ی بازرسی وارد شود.");
                claim.RuleForEach(c => c.Results).ChildRules(result =>
                {
                    result.RuleFor(r => r.Quantity).GreaterThan(0).WithMessage("مقدار بازرسی‌شده باید از صفر بیشتر باشد.");
                });
            });
        }
    }

    public class ConfirmReturnInspectionCommandHandler : IRequestHandler<ConfirmReturnInspectionCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly ISaleReturnCalculationService _saleReturnCalculationService;
        private readonly IProductUnitService _productUnitService;
        private readonly IUnitOfWork _unitOfWork;

        public ConfirmReturnInspectionCommandHandler(IWMSDbContext context, ISaleReturnCalculationService saleReturnCalculationService, IProductUnitService productUnitService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _saleReturnCalculationService = saleReturnCalculationService;
            _productUnitService = productUnitService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(ConfirmReturnInspectionCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var saleReturn = await _context.SaleReturns
                .WithReturnGraph()
                .FirstOrDefaultAsync(x => x.Id == request.SaleReturnId, cancellationToken) ?? throw new NotFoundCustomException("مرجوعی مورد نظر یافت نشد.");

            if (!_saleReturnCalculationService.IsMutable(saleReturn))
                throw new ValidationCustomException("این مرجوعی قابل تغییر نیست.");

            var claimsById = saleReturn.Claims.ToDictionary(x => x.Id);

            foreach (var claimReq in request.Claims)
            {
                if (!claimsById.TryGetValue(claimReq.SaleReturnClaimId, out var claim))
                    throw new NotFoundCustomException("قلم ادعا مورد نظر یافت نشد.");

                var requestedQty = claimReq.Results.Sum(r => r.Quantity);

                if (requestedQty > claim.UninspectedQuantity)
                    throw new ValidationCustomException($"مقدار وارد شده برای «{claim.Product!.Name}» از باقیمانده‌ی قابل بازرسی این ادعا بیشتر است.");
            }

            var now = DateTime.Now;

            foreach (var claimReq in request.Claims)
            {
                var claim = claimsById[claimReq.SaleReturnClaimId];
                var healthyQty = 0;
                var scrapQty = 0;

                foreach (var group in claimReq.Results.GroupBy(r => r.IssueType))
                {
                    var qty = group.Sum(r => r.Quantity);
                    var note = string.Join("؛ ", group.Select(r => r.Note).Where(n => !string.IsNullOrWhiteSpace(n)));

                    var existing = claim.InspectionItems.FirstOrDefault(x => x.IssueType == group.Key);
                    if (existing != null)
                    {
                        existing.Quantity += qty;
                        if (!string.IsNullOrEmpty(note))
                            existing.Note = string.IsNullOrEmpty(existing.Note) ? note : existing.Note + "؛ " + note;
                    }
                    else
                    {
                        claim.InspectionItems.Add(new Domain.Entities.SaleReturnItem
                        {
                            IssueType = group.Key,
                            Quantity = qty,
                            Note = string.IsNullOrEmpty(note) ? null : note,
                            CreatedAt = now,
                        });
                    }

                    if (group.Key == null)
                    {
                        claim.Product!.Stock += qty;
                        healthyQty += qty;
                    }
                    else
                    {
                        // Defective/damaged/wrong-item units never return to sellable stock -
                        // their ProductUnit rows are scrapped, not put back IN_STOCK.
                        scrapQty += qty;
                    }
                }

                if (healthyQty > 0 || scrapQty > 0)
                    await _productUnitService.RestoreAsync(claim.SaleItemId, healthyQty, scrapQty, cancellationToken);
            }

            // Sale.Status is deliberately not recomputed here: inspection moves nothing into
            // SaleItem.SettledQuantity, which is the only input RecomputeSaleStatus reads. Only
            // AddSaleReturnDecisionCommand can change it.
            saleReturn.Status = _saleReturnCalculationService.RecomputeReturnStatus(saleReturn);
            saleReturn.UpdatedAt = now;

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = new { ReturnId = saleReturn.Id, ReturnStatus = saleReturn.Status };
            res.Message = "بازرسی با موفقیت ثبت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
