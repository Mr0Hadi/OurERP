using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.PurchaseReceiving.Dtos;
using Application.Features.PurchaseReturn;
using Common.Exceptions;
using Common.Extensions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.PurchaseReceiving.Queries
{
    public class GetReceivePurchaseDetailQuery : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class GetReceivePurchaseDetailQueryHandler : IRequestHandler<GetReceivePurchaseDetailQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public GetReceivePurchaseDetailQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        public async Task<ResponseDto> Handle(GetReceivePurchaseDetailQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var purchase = await _context.Purchases
                .Include(x => x.Supplier)
                .Include(x => x.Items)
                .ThenInclude(x => x.Product)
                .FirstOrDefaultAsync(x => x.Id == request.Id && x.IsActive) ?? throw new NotFoundCustomException("خرید مورد نظر یافت نشد.");

            var purchaseReturn = await _context.PurchaseReturns
                .Include(x => x.Items)
                .ThenInclude(x => x.Decisions)
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
                Items = (purchase.Items ?? new List<Domain.Entities.PurchaseItem>())
                    .Where(i => i.IsActive)
                    .Select(i => new ReceivePurchaseListItemDto
                    {
                        Id = i.Id,
                        ProductId = i.ProductId,
                        ProductCode = i.Product.Code,
                        ProductName = i.Product.Name,
                        Unit = i.Product.Unit.GetDescription(),
                        OrderedQty = i.Quantity,
                        ReceivedQuantity = i.ReceivedQuantity,
                        ReceivableQty = PurchaseReturnStatusUpdater.ComputeReceivableQuantity(i, purchaseReturn),
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
