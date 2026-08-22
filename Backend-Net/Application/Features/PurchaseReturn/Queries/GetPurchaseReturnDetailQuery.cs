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
    public class GetPurchaseReturnDetailQuery : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class GetPurchaseReturnDetailQueryHandler : IRequestHandler<GetPurchaseReturnDetailQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IObjectStorageService _objectStorageService;

        public GetPurchaseReturnDetailQueryHandler(IWMSDbContext context, IObjectStorageService objectStorageService)
        {
            _context = context;
            _objectStorageService = objectStorageService;
        }

        public async Task<ResponseDto> Handle(GetPurchaseReturnDetailQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var purchaseReturn = await _context.PurchaseReturns
                .Include(x => x.Purchase)
                    .ThenInclude(x => x.Supplier)
                .Include(x => x.Items)
                    .ThenInclude(x => x.Product)
                .Include(x => x.Items)
                    .ThenInclude(x => x.Decisions)
                .Include(x => x.ReceivingImages)
                .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken) ?? throw new NotFoundCustomException("مرجوعی مورد نظر یافت نشد.");

            var totalQuantity = purchaseReturn.Items.Sum(i => i.Quantity);
            var allocatedQuantity = purchaseReturn.Items.Sum(i => i.Decisions.Sum(d => d.Quantity));
            var totalAmount = (UInt64)purchaseReturn.Items.Sum(i => (long)i.Quantity * (long)i.UnitPrice);
            var finalizedRefundAmount = (UInt64)purchaseReturn.Items
                .SelectMany(i => i.Decisions)
                .Where(d => d.DecisionType == PurchaseReturnDecisionTypeEnum.REFUND && d.Status == PurchaseReturnDecisionStatusEnum.RESOLVED)
                .Sum(d => (long)(d.RefundAmount ?? 0));

            res.Data = new PurchaseReturnDetailDto
            {
                Id = purchaseReturn.Id,
                ReturnNumber = purchaseReturn.ReturnNumber,
                ReturnDate = purchaseReturn.ReturnDate,
                PurchaseId = purchaseReturn.PurchaseId,
                PurchaseInvoiceNumber = purchaseReturn.Purchase.InvoiceNumber,
                SupplierId = purchaseReturn.Purchase.SupplierId,
                SupplierName = purchaseReturn.Purchase.Supplier.CompanyName,
                Description = purchaseReturn.Description,
                CreatedAt = purchaseReturn.CreatedAt,
                UpdatedAt = purchaseReturn.UpdatedAt,
                Status = purchaseReturn.Status,
                TotalAmount = totalAmount,
                FinalizedRefundAmount = finalizedRefundAmount,
                TotalQuantity = totalQuantity,
                AllocatedQuantity = allocatedQuantity,
                CanDelete = purchaseReturn.Status == PurchaseReturnStatusEnum.PENDING,
                CanCancel = purchaseReturn.Status == PurchaseReturnStatusEnum.PENDING,
                CanReject = purchaseReturn.Status == PurchaseReturnStatusEnum.PENDING,
                CanReopen = purchaseReturn.Status == PurchaseReturnStatusEnum.REJECTED,
                ReceivingImages = purchaseReturn.ReceivingImages
                    .OrderBy(img => img.CreatedAt)
                    .Select(img => new PurchaseReceivingImageDto
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
                Items = purchaseReturn.Items.Select(i => new PurchaseReturnItemDto
                {
                    Id = i.Id,
                    PurchaseReturnId = i.PurchaseReturnId,
                    PurchaseItemId = i.PurchaseItemId,
                    ProductId = i.ProductId,
                    ProductCode = i.Product!.Code,
                    ProductName = i.Product.Name,
                    Unit = i.Product.Unit.GetDescription(),
                    UnitPrice = i.UnitPrice,
                    IssueType = i.IssueType,
                    Quantity = i.Quantity,
                    LineTotal = (UInt64)i.Quantity * i.UnitPrice,
                    AllocatedQuantity = i.Decisions.Sum(d => d.Quantity),
                    RemainingQuantity = i.Quantity - i.Decisions.Sum(d => d.Quantity),
                    Note = i.Note,
                    CreatedAt = i.CreatedAt,
                    Decisions = i.Decisions.Select(d => new PurchaseReturnDecisionDto
                    {
                        Id = d.Id,
                        PurchaseReturnItemId = d.PurchaseReturnItemId,
                        DecisionType = d.DecisionType,
                        Quantity = d.Quantity,
                        RefundAmount = d.RefundAmount,
                        Status = d.Status,
                        Note = d.Note,
                        CreatedAt = d.CreatedAt,
                        ResolvedAt = d.ResolvedAt,
                    }).ToList(),
                }).ToList(),
            };

            res.Message = "اطلاعات مرجوعی با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
