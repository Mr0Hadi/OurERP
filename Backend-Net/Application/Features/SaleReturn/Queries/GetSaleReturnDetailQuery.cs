using Application.Common.Contracts.Context;
using Application.Common.Contracts.SaleReturn;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.SaleReturn.Dtos;
using Common.Exceptions;
using Common.Extensions;
using Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.SaleReturn.Queries
{
    public class GetSaleReturnDetailQuery : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class GetSaleReturnDetailQueryHandler : IRequestHandler<GetSaleReturnDetailQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly ISaleReturnQueryService _saleReturnQueryService;
        private readonly ISaleReturnCalculationService _saleReturnCalculationService;

        public GetSaleReturnDetailQueryHandler(IWMSDbContext context, ISaleReturnQueryService saleReturnQueryService, ISaleReturnCalculationService saleReturnCalculationService)
        {
            _context = context;
            _saleReturnQueryService = saleReturnQueryService;
            _saleReturnCalculationService = saleReturnCalculationService;
        }

        public async Task<ResponseDto> Handle(GetSaleReturnDetailQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var saleReturn = await _saleReturnQueryService.WithReturnGraph(_context.SaleReturns)
                .Include(x => x.Sale!)
                    .ThenInclude(x => x.Customer)
                .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken) ?? throw new NotFoundCustomException("مرجوعی مورد نظر یافت نشد.");

            // Cancel, reject and delete all share one rule; the DTO keeps three flags because the
            // frontend renders three buttons.
            var isPreInspection = _saleReturnCalculationService.IsPreInspection(saleReturn);
            var totalAmount = (UInt64)saleReturn.Claims.Sum(c => (long)c.ClaimedQuantity * (long)c.UnitPrice);
            var finalizedRefundAmount = (UInt64)saleReturn.Claims
                .SelectMany(c => c.InspectionItems)
                .SelectMany(i => i.Decisions)
                .Where(d => d.DecisionType == SaleReturnDecisionTypeEnum.REFUND && d.Status == SaleReturnDecisionStatusEnum.RESOLVED)
                .Sum(d => (long)(d.RefundAmount ?? 0));

            res.Data = new SaleReturnDetailDto
            {
                Id = saleReturn.Id,
                ReturnNumber = saleReturn.ReturnNumber,
                RequestDate = saleReturn.RequestDate,
                SaleId = saleReturn.SaleId,
                SaleInvoiceNumber = saleReturn.Sale!.InvoiceNumber,
                CustomerId = saleReturn.Sale!.CustomerId,
                CustomerName = saleReturn.Sale!.Customer.FirstName + " " + saleReturn.Sale!.Customer.LastName,
                Description = saleReturn.Description,
                CreatedAt = saleReturn.CreatedAt,
                UpdatedAt = saleReturn.UpdatedAt,
                Status = saleReturn.Status,
                TotalAmount = totalAmount,
                FinalizedRefundAmount = finalizedRefundAmount,
                TotalQuantity = saleReturn.ClaimedQuantity,
                InspectedQuantity = saleReturn.InspectedQuantity,
                AllocatedQuantity = saleReturn.DecidedQuantity,
                CanDelete = isPreInspection,
                CanCancel = isPreInspection,
                CanReject = isPreInspection,
                CanReopen = saleReturn.Status == SaleReturnStatusEnum.REJECTED,
                Claims = saleReturn.Claims.Select(c => new SaleReturnClaimDto
                {
                    Id = c.Id,
                    SaleReturnId = c.SaleReturnId,
                    SaleItemId = c.SaleItemId,
                    ProductId = c.ProductId,
                    ProductCode = c.Product!.Code,
                    ProductName = c.Product.Name,
                    Unit = c.Product.Unit.GetDescription(),
                    UnitPrice = c.UnitPrice,
                    Reason = c.Reason,
                    ClaimedQuantity = c.ClaimedQuantity,
                    InspectedQuantity = c.InspectedQuantity,
                    UninspectedQuantity = c.UninspectedQuantity,
                    LineTotal = (UInt64)c.ClaimedQuantity * c.UnitPrice,
                    Note = c.Note,
                    CreatedAt = c.CreatedAt,
                    InspectionItems = c.InspectionItems.Select(i => new SaleReturnItemDto
                    {
                        Id = i.Id,
                        SaleReturnClaimId = i.SaleReturnClaimId,
                        IssueType = i.IssueType,
                        Quantity = i.Quantity,
                        AllocatedQuantity = i.DecidedQuantity,
                        RemainingQuantity = i.UndecidedQuantity,
                        Note = i.Note,
                        CreatedAt = i.CreatedAt,
                        Decisions = i.Decisions.Select(d => new SaleReturnDecisionDto
                        {
                            Id = d.Id,
                            SaleReturnItemId = d.SaleReturnItemId,
                            DecisionType = d.DecisionType,
                            Quantity = d.Quantity,
                            RefundAmount = d.RefundAmount,
                            Status = d.Status,
                            ReplacementShippedQuantity = d.ReplacementShippedQuantity,
                            Note = d.Note,
                            CreatedAt = d.CreatedAt,
                            ResolvedAt = d.ResolvedAt,
                        }).ToList(),
                    }).ToList(),
                }).ToList(),
            };

            res.Message = "اطلاعات مرجوعی فروش با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
