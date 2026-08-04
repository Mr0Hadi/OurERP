using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.PurchaseReceiving.Dtos;
using Application.Features.PurchaseReturn;
using Common.Exceptions;
using Common.Extensions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.WarehouseReceiving.Queries
{
    public class GetWarehouseReceiveDetailQuery : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class GetReceivePurchaseDetailQueryHandler : IRequestHandler<GetWarehouseReceiveDetailQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public GetReceivePurchaseDetailQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        public async Task<ResponseDto> Handle(GetWarehouseReceiveDetailQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var purchase = await _context.Purchases
                .Include(x => x.Supplier)
                .FirstOrDefaultAsync(x => x.Id == request.Id && x.IsActive) ?? throw new NotFoundCustomException("خرید مورد نظر یافت نشد.");

            var purchaseReturn = await _context.PurchaseReturns
                .Include(x => x.Items)
                .FirstOrDefaultAsync(x => x.PurchaseId == request.Id && x.IsActive);

            res.Data = new ReceivePurchaseListDto
            {
                Id = purchase.Id,
                InvoiceNumber = purchase.InvoiceNumber,
                InvoiceDate = purchase.InvoiceDate,
                Status = purchase.Status,
                SupplierId = purchase.SupplierId,
                SupplierName = purchase.Supplier.CompanyName,
                TotalAmount = purchase.TotalAmount,
                PaidAmount = purchase.PaidAmount,
                PaymentType = purchase.PaymentType,
                PaymentDetails = purchase.PaymentDetails,
                Items = purchase.Items
                    .Select(i => new ReceivePurchaseListItemDto
                    {
                        Id = i.Id,
                        ProductId = i.ProductId,
                        Product = i.Product,
                        OrderedQuantity = i.Quantity,
                        ReceivedQuantity = i.ReceivedQuantity,
                        UnitPrice = i.UnitPrice,
                        Discount = i.Discount,
                    }).ToList(),
            };

            res.Message = "جزئیات خرید قابل دریافت با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
