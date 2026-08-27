using Application.Common.Contracts.Context;
using Application.Common.Contracts.Storage;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.PurchaseReturn.Dtos;
using Common.Exceptions;
using Common.Extensions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.PurchaseReturn.Queries
{
    /// <summary>Backs the warehouse receiving screen: for a purchase, how much of each item is still expected.</summary>
    public class GetPurchaseReceivingInfoQuery : IRequest<ResponseDto>
    {
        public int PurchaseId { get; set; }
    }

    public class GetPurchaseReceivingInfoQueryHandler : IRequestHandler<GetPurchaseReceivingInfoQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IObjectStorageService _objectStorageService;

        public GetPurchaseReceivingInfoQueryHandler(IWMSDbContext context, IObjectStorageService objectStorageService)
        {
            _context = context;
            _objectStorageService = objectStorageService;
        }

        public async Task<ResponseDto> Handle(GetPurchaseReceivingInfoQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var purchase = await _context.Purchases
                .Include(x => x.Supplier)
                .Include(x => x.Items)
                    .ThenInclude(x => x.Product)
                .FirstOrDefaultAsync(x => x.Id == request.PurchaseId, cancellationToken) ?? throw new NotFoundCustomException("خرید مورد نظر یافت نشد.");

            var receivingImages = await _context.PurchaseReceivingImages
                .Where(x => x.PurchaseId == request.PurchaseId)
                .OrderBy(x => x.CreatedAt)
                .ToListAsync(cancellationToken);

            res.Data = new PurchaseReceivingInfoDto
            {
                PurchaseId = purchase.Id,
                InvoiceNumber = purchase.InvoiceNumber,
                InvoiceDate = purchase.InvoiceDate,
                Status = purchase.Status,
                SupplierId = purchase.SupplierId,
                SupplierName = purchase.Supplier.CompanyName,
                ReceivingImages = receivingImages.Select(img => new PurchaseReceivingImageDto
                {
                    Id = img.Id,
                    PurchaseId = img.PurchaseId,
                    PurchaseReturnId = img.PurchaseReturnId,
                    ObjectKey = img.ObjectKey,
                    Url = _objectStorageService.GetPresignedUrl(img.ObjectKey),
                    FileName = img.FileName,
                    Note = img.Note,
                    CreatedAt = img.CreatedAt,
                }).ToList(),
                Items = purchase.Items.Select(item => new PurchaseReceivingItemInfoDto
                {
                    PurchaseItemId = item.Id,
                    ProductId = item.ProductId,
                    ProductCode = item.Product.Code,
                    ProductName = item.Product.Name,
                    Unit = item.Product.Unit.GetDescription(),
                    UnitPrice = item.UnitPrice,
                    OrderedQuantity = item.Quantity,
                    ReceivedQuantity = item.ReceivedQuantity,
                    StillOwedQuantity = Math.Max(0, item.Quantity - item.ReceivedQuantity),
                }).ToList(),
            };

            res.Message = "اطلاعات دریافت خرید با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
