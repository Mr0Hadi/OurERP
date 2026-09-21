using Application.Common.Contracts.Context;
using Application.Common.Contracts.Storage;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.PurchaseReturn.Dtos;
using Common.Exceptions;
using Common.Extensions;
using Domain.Enums;
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
                .Where(x => x.Id == request.PurchaseId)
                .Include(x => x.Supplier)
                .Include(x => x.Items)
                .ThenInclude(x => x.Product)
                .FirstOrDefaultAsync(cancellationToken) ?? throw new NotFoundCustomException("خرید مورد نظر یافت نشد.");

            var receivingImages = await _context.PurchaseReceivingImages
                .Where(x => x.PurchaseId == request.PurchaseId)
                .OrderBy(x => x.CreatedAt)
                .ToListAsync(cancellationToken);

            var held = await _context.ProductUnits
                .Where(u => u.PurchaseId == request.PurchaseId && u.Status == ProductUnitStatusEnum.QUARANTINED)
                .GroupBy(u => new { u.CustodyReason, u.PurchaseItemId, u.ProductId })
                .Select(g => new { g.Key.CustodyReason, g.Key.PurchaseItemId, g.Key.ProductId, Count = g.Count() })
                .ToListAsync(cancellationToken);

            var discrepancies = await _context.PurchaseReceivingDiscrepancies
                .Where(x => x.PurchaseId == request.PurchaseId)
                .OrderBy(x => x.ReceivedAt)
                .ThenBy(x => x.Id)
                .Select(x => new PurchaseReceivingDiscrepancyDto
                {
                    Id = x.Id,
                    PurchaseItemId = x.PurchaseItemId,
                    ProductId = x.ProductId,
                    ProductName = x.Product!.Name,
                    CustodyReason = x.CustodyReason,
                    Problem = x.Problem,
                    Quantity = x.Quantity,
                    Note = x.Note,
                    ReceivedAt = x.ReceivedAt,
                })
                .ToListAsync(cancellationToken);

            var unlistedIds = held.Where(h => h.CustodyReason == UnitCustodyReasonEnum.UNLISTED).Select(h => h.ProductId).Distinct().ToList();
            var unlistedProducts = await _context.Products
                .Where(p => unlistedIds.Contains(p.Id))
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
                    Url = _objectStorageService.GetFixedUrl(img.ObjectKey),
                    FileName = img.FileName,
                    Note = img.Note,
                    UploadedAt = img.CreatedAt,
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
                    StillOwedQuantity = item.StillOwedQuantity,
                    ShortClosedQuantity = item.ShortClosedQuantity,
                    QuarantinedOnOrderQuantity = held.Where(h => h.CustodyReason == UnitCustodyReasonEnum.ON_ORDER && h.PurchaseItemId == item.Id).Sum(h => h.Count),
                    QuarantinedExcessQuantity = held.Where(h => h.CustodyReason == UnitCustodyReasonEnum.EXCESS && h.PurchaseItemId == item.Id).Sum(h => h.Count),
                }).ToList(),
                UnlistedItems = unlistedProducts.Select(p => new PurchaseReceivingUnlistedInfoDto
                {
                    ProductId = p.Id,
                    ProductCode = p.Code,
                    ProductName = p.Name,
                    Unit = p.Unit.GetDescription(),
                    QuarantinedQuantity = held.Where(h => h.CustodyReason == UnitCustodyReasonEnum.UNLISTED && h.ProductId == p.Id).Sum(h => h.Count),
                }).ToList(),
                Discrepancies = discrepancies,
            };

            res.Message = "اطلاعات دریافت خرید با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
