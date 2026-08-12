using Application.Common.Contracts.Context;
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
    // Backs the warehouse inspection screen: for one sale, every claim across its active returns
    // still waiting (fully or partially) to be physically inspected. The sale-side counterpart of
    // GetPurchaseReceivingInfoQuery.
    public class GetSaleReturnInspectionInfoQuery : IRequest<ResponseDto>
    {
        public int SaleId { get; set; }
    }

    public class GetSaleReturnInspectionInfoQueryHandler : IRequestHandler<GetSaleReturnInspectionInfoQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public GetSaleReturnInspectionInfoQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        public async Task<ResponseDto> Handle(GetSaleReturnInspectionInfoQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var sale = await _context.Sales
                .Include(x => x.Customer)
                .FirstOrDefaultAsync(x => x.Id == request.SaleId, cancellationToken) ?? throw new NotFoundCustomException("فروش مورد نظر یافت نشد.");

            var activeReturns = await _context.SaleReturns
                .Where(x => x.SaleId == request.SaleId)
                .WhereActive()
                .WithReturnGraph()
                .ToListAsync(cancellationToken);

            res.Data = new SaleReturnInspectionInfoDto
            {
                SaleId = sale.Id,
                InvoiceNumber = sale.InvoiceNumber,
                CustomerId = sale.CustomerId,
                CustomerName = sale.Customer.FirstName + " " + sale.Customer.LastName,
                Claims = activeReturns.SelectMany(r => r.Claims.Select(c => new SaleReturnInspectionClaimInfoDto
                {
                    SaleReturnId = r.Id,
                    ReturnNumber = r.ReturnNumber,
                    SaleReturnClaimId = c.Id,
                    SaleItemId = c.SaleItemId,
                    ProductId = c.ProductId,
                    ProductCode = c.Product!.Code,
                    ProductName = c.Product.Name,
                    Unit = c.Product.Unit.GetDescription(),
                    Reason = c.Reason,
                    ClaimedQuantity = c.ClaimedQuantity,
                    InspectedQuantity = c.InspectedQuantity,
                    UninspectedQuantity = c.UninspectedQuantity,
                    ExistingResults = c.InspectionItems.Select(i => new SaleReturnInspectionResultInfoDto
                    {
                        SaleReturnItemId = i.Id,
                        IssueType = i.IssueType,
                        Quantity = i.Quantity,
                        DecidedQuantity = i.DecidedQuantity,
                    }).ToList(),
                })).ToList(),
            };

            res.Message = "اطلاعات بازرسی مرجوعی فروش با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
