using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Purchase.Dtos;
using Common.Exceptions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Purchase.Queries
{
    public class GetPurchaseDetailQuery : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class GetPurchaseDetailQueryHandler : IRequestHandler<GetPurchaseDetailQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        public GetPurchaseDetailQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }
        public async Task<ResponseDto> Handle(GetPurchaseDetailQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var purchase = await _context.Purchases
                .Include(x => x.Supplier)
                .Include(x => x.Items).ThenInclude(x => x.Product)
                .Include(x => x.PaymentDetails)
                .FirstOrDefaultAsync(x => x.Id == request.Id) ?? throw new NotFoundCustomException("خرید مورد نظر یافت نشد.");

            res.Data = new PurchaseDto
            {
                Id = purchase.Id,
                InvoiceNumber = purchase.InvoiceNumber,
                InvoiceDate = purchase.InvoiceDate,
                Status = purchase.Status,
                PaymentType = purchase.PaymentType,
                TotalAmount = purchase.TotalAmount,
                PaidAmount = purchase.PaidAmount,
                Description = purchase.Description,
                SupplierId = purchase.SupplierId,
                SupplierName = purchase.Supplier.CompanyName,
                Items = purchase.Items.Select(x => new PurchaseItemDto
                {
                    Id = x.Id,
                    ProductId = x.ProductId,
                    ProductName = x.Product.Name,
                    Quantity = x.Quantity,
                    UnitPrice = x.UnitPrice,
                    Discount = x.Discount
                }).ToList(),
                PaymentDetails = purchase.PaymentDetails.Select(x => new PurchasePaymentDetailDto
                {
                    Type = x.Type,
                    Amount = x.Amount,
                    CheckNumber = x.checkNumber,
                    TransferRef = x.transferRef
                }).ToList()
            };

            res.Message = "اطلاعات خرید با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
