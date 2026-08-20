using Application.Common.Contracts.Context;
using Application.Common.Contracts.PurchaseReturn;
using Application.Common.Contracts.Repositories;
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
    /// <summary>
    /// Backs the warehouse receiving screen: for a purchase, how much of each item is still
    /// expected, and what's already been reported as a problem but not yet decided on.
    /// </summary>
    public class GetPurchaseReceivingInfoQuery : IRequest<ResponseDto>
    {
        public int PurchaseId { get; set; }
    }

    public class GetPurchaseReceivingInfoQueryHandler : IRequestHandler<GetPurchaseReceivingInfoQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IPurchaseReturnRepository _purchaseReturnRepository;
        private readonly IPurchaseReturnCalculationService _purchaseReturnCalculationService;
        private readonly IObjectStorageService _objectStorageService;

        public GetPurchaseReceivingInfoQueryHandler(IWMSDbContext context, IPurchaseReturnRepository purchaseReturnRepository, IPurchaseReturnCalculationService purchaseReturnCalculationService, IObjectStorageService objectStorageService)
        {
            _context = context;
            _purchaseReturnRepository = purchaseReturnRepository;
            _purchaseReturnCalculationService = purchaseReturnCalculationService;
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

            var activeReturn = await _purchaseReturnRepository.GetActiveByPurchaseIdAsync(request.PurchaseId, cancellationToken);

            // Keyed on the purchase, not on the active return: photos from earlier rounds survive
            // a return being resolved or deleted (see PurchaseReceivingImage).
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
                ActivePurchaseReturnId = activeReturn?.Id,
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
                    SettledQuantity = item.SettledQuantity,
                    OpenIssueQuantity = _purchaseReturnCalculationService.GetOpenIssueQuantity(item.Id, activeReturn),
                    ReceivableQuantity = _purchaseReturnCalculationService.GetReceivableQuantity(item, activeReturn),
                    OpenIssues = (activeReturn?.Items ?? new())
                        .Where(x => x.PurchaseItemId == item.Id)
                        .Select(x => new PurchaseReceivingOpenIssueDto
                        {
                            PurchaseReturnItemId = x.Id,
                            Type = x.IssueType,
                            Quantity = x.Quantity,
                            DecidedQuantity = x.Decisions.Sum(d => d.Quantity),
                            Note = x.Note,
                        }).ToList(),
                }).ToList(),
            };

            res.Message = "اطلاعات دریافت خرید با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
