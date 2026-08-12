using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.SaleReturn.Dtos;
using Common.Extensions;
using Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.SaleReturn.Queries
{
    // Backs the warehouse outbound-shipping queue: every AWAITING replacement decision, across
    // every sale return, still waiting to be shipped to a customer.
    public class GetReplacementShippingQueueQuery : IRequest<ResponseDto>
    {
        public int? SaleId { get; set; }
    }

    public class GetReplacementShippingQueueQueryHandler : IRequestHandler<GetReplacementShippingQueueQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public GetReplacementShippingQueueQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        public async Task<ResponseDto> Handle(GetReplacementShippingQueueQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var query = _context.SaleReturnDecisions
                .Where(d => d.DecisionType == SaleReturnDecisionTypeEnum.REPLACEMENT && d.Status == SaleReturnDecisionStatusEnum.AWAITING)
                .Include(d => d.SaleReturnItem!)
                    .ThenInclude(i => i.SaleReturnClaim!)
                        .ThenInclude(c => c.Product)
                .Include(d => d.SaleReturnItem!)
                    .ThenInclude(i => i.SaleReturnClaim!)
                        .ThenInclude(c => c.SaleReturn!)
                            .ThenInclude(r => r.Sale!)
                                .ThenInclude(s => s.Customer)
                .AsQueryable();

            if (request.SaleId.HasValue)
            {
                query = query.Where(d => d.SaleReturnItem!.SaleReturnClaim!.SaleReturn!.SaleId == request.SaleId.Value);
            }

            var decisions = await query.ToListAsync(cancellationToken);

            res.Data = decisions.Select(d =>
            {
                var claim = d.SaleReturnItem!.SaleReturnClaim!;
                var saleReturn = claim.SaleReturn!;
                var sale = saleReturn.Sale!;
                var product = claim.Product!;

                return new ReplacementShippingQueueItemDto
                {
                    SaleReturnDecisionId = d.Id,
                    SaleReturnId = saleReturn.Id,
                    ReturnNumber = saleReturn.ReturnNumber,
                    SaleId = sale.Id,
                    SaleInvoiceNumber = sale.InvoiceNumber,
                    CustomerId = sale.CustomerId,
                    CustomerName = sale.Customer.FirstName + " " + sale.Customer.LastName,
                    ProductId = product.Id,
                    ProductCode = product.Code,
                    ProductName = product.Name,
                    Unit = product.Unit.GetDescription(),
                    Quantity = d.Quantity,
                    ShippedQuantity = d.ReplacementShippedQuantity,
                    RemainingQuantity = d.Quantity - d.ReplacementShippedQuantity,
                    CreatedAt = d.CreatedAt,
                };
            }).ToList();

            res.Message = "صف ارسال کالای جایگزین با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
