using Application.Common.Documents;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.Storage;
using Application.Common.Dtos;
using Application.Features.Purchase.Dtos;
using Common.Exceptions;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Purchase.Queries
{
    /// <summary>
    /// The purchase document as the API returns it. Used by GetPurchaseDetail and by every purchase write, so a write
    /// answers with exactly the shape the detail screen reads. Soft-deleted purchases are not found.
    /// </summary>
    public static class PurchaseDetailReader
    {
        public static async Task<PurchaseDto> ReadAsync(IWMSDbContext context, IObjectStorageService objectStorageService, int purchaseId, CancellationToken cancellationToken)
        {
            var purchase = await context.Purchases.AsNoTracking()
                .Where(x => x.Id == purchaseId && x.IsActive)
                .Select(x => new PurchaseDto
                {
                    Id = x.Id,
                    InvoiceNumber = x.InvoiceNumber,
                    InvoiceDate = x.InvoiceDate,
                    PaymentDate = x.PaymentDate,
                    Status = x.Status,
                    PaymentType = x.PaymentType,
                    TotalAmount = x.TotalAmount,
                    PaidAmount = x.PaidAmount,
                    Description = x.Description,
                    SupplierId = x.SupplierId,
                    SupplierName = x.Supplier.CompanyName,
                    Items = x.Items.OrderBy(i => i.Id).Select(i => new PurchaseItemDto
                    {
                        Id = i.Id,
                        ProductId = i.ProductId,
                        ProductName = i.Product.Name,
                        ProductCode = i.Product.Code,
                        Quantity = i.Quantity,
                        UnitPrice = i.UnitPrice,
                        Discount = i.Discount,
                        TaxCategory = i.TaxCategory,
                        TaxPercent = i.TaxPercent,
                        GrossAmount = i.GrossAmount,
                        DiscountAmount = i.DiscountAmount,
                        NetAmount = i.NetAmount,
                        TaxAmount = i.TaxAmount,
                        TotalAmount = i.TotalAmount,
                        ReceivedQuantity = i.ReceivedQuantity,
                        SettledQuantity = i.SettledQuantity,
                        ShortClosedQuantity = i.ShortClosedQuantity,
                        ShortClosedAt = i.ShortClosedAt,
                        IsSupplement = i.IsSupplement,
                        SupplementOfPurchaseItemId = i.SupplementOfPurchaseItemId,
                    }).ToList(),
                    PaymentDetails = x.PaymentDetails.OrderBy(p => p.PaidAt).ThenBy(p => p.Id).Select(p => new PaymentDetailDto
                    {
                        Id = p.Id,
                        Type = p.Type,
                        Purpose = p.Purpose,
                        Direction = p.Direction,
                        Amount = p.Amount,
                        PaidAt = p.PaidAt,
                        VoidedAt = p.VoidedAt,
                        CheckNumber = p.CheckNumber,
                        TransferRef = p.TransferRef
                    }).ToList(),
                    Drivers = x.Drivers.Select(d => new PurchaseDriverDto
                    {
                        Id = d.Id,
                        DriverFullName = d.DriverFullName,
                        DriverPhoneNumber = d.DriverPhoneNumber,
                        VehiclePlate = d.VehiclePlate
                    }).ToList(),
                    ReceivingNotes = x.ReceivingNotes.Select(n => new PurchaseReceivingNoteDto
                    {
                        Id = n.Id,
                        Note = n.Note
                    }).ToList()
                })
                .FirstOrDefaultAsync(cancellationToken) ?? throw new NotFoundCustomException("خرید مورد نظر یافت نشد.");

            // Same function the ledger's PURCHASE_SHORT_CLOSE row uses, so the document and the account agree.
            var shortClosed = purchase.Items.Aggregate(0UL, (sum, i) => sum + InvoiceLineMath.ShareOfTotal(i.TotalAmount, i.Quantity, i.ShortClosedQuantity));
            purchase.PayableAmount = purchase.TotalAmount > shortClosed ? purchase.TotalAmount - shortClosed : 0UL;

            purchase.Attachments = await context.DocumentAttachments.AsNoTracking()
                .Where(a => a.DocumentKind == DocumentKindEnum.PURCHASE && a.DocumentId == purchaseId)
                .Select(a => new DocumentAttachmentDto
                {
                    Id = a.Id,
                    ObjectKey = a.ObjectKey,
                    FileName = a.FileName,
                    Note = a.Note,
                    CreatedAt = a.CreatedAt
                })
                .ToListAsync(cancellationToken);
            foreach (var attachment in purchase.Attachments)
                attachment.Url = objectStorageService.GetFixedUrl(attachment.ObjectKey);

            return purchase;
        }
    }
}
