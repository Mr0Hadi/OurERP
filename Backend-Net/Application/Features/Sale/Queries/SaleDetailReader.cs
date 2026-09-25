using Application.Common.Contracts.Context;
using Application.Common.Contracts.Storage;
using Application.Common.Dtos;
using Application.Features.Sale.Dtos;
using Application.Features.SaleInstallment.Mappings;
using Common.Exceptions;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Sale.Queries
{
    /// <summary>
    /// The sale document as the API returns it. Used by GetSaleDetail and by the sale writes that return the document.
    /// Soft-deleted sales are not found.
    /// </summary>
    public static class SaleDetailReader
    {
        public static async Task<SaleDto> ReadAsync(IWMSDbContext context, IObjectStorageService objectStorageService, int saleId, CancellationToken cancellationToken)
        {
            var sale = await context.Sales.AsNoTracking()
                .Where(x => x.Id == saleId && x.IsActive)
                .Select(x => new SaleDto
                {
                    Id = x.Id,
                    InvoiceNumber = x.InvoiceNumber,
                    InvoiceDate = x.InvoiceDate,
                    PaymentDate = x.PaymentDate,
                    Status = x.Status,
                    PaymentType = x.PaymentType,
                    TotalAmount = x.TotalAmount,
                    // A live plan (not cancelled) adds its charge on top of the invoice.
                    PayableAmount = x.InstallmentPlan != null && x.InstallmentPlan.IsActive ? x.InstallmentPlan.TotalAmount : x.TotalAmount,
                    PaidAmount = x.PaidAmount,
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
                        TransferRef = p.TransferRef,
                    }).ToList(),
                    Description = x.Description,
                    CustomerId = x.CustomerId,
                    CustomerName = x.Customer.FirstName + " " + x.Customer.LastName,
                    Items = x.Items.OrderBy(y => y.Id).Select(y => new SaleItemDto
                    {
                        Id = y.Id,
                        Discount = y.Discount,
                        ProductId = y.ProductId,
                        ProductName = y.Product.Name,
                        Quantity = y.Quantity,
                        SaleId = y.SaleId,
                        SettledQuantity = y.SettledQuantity,
                        ShippedQuantity = y.ShippedQuantity,
                        UnitPrice = y.UnitPrice,
                        TaxCategory = y.TaxCategory,
                        TaxPercent = y.TaxPercent,
                        GrossAmount = y.GrossAmount,
                        DiscountAmount = y.DiscountAmount,
                        NetAmount = y.NetAmount,
                        TaxAmount = y.TaxAmount,
                        TotalAmount = y.TotalAmount
                    }).ToList(),
                    Drivers = x.Drivers.Select(d => new SaleDriverDto
                    {
                        Id = d.Id,
                        DriverFullName = d.DriverFullName,
                        DriverPhoneNumber = d.DriverPhoneNumber,
                        VehiclePlate = d.VehiclePlate
                    }).ToList(),
                    ShippingNotes = x.ShippingNotes.Select(n => new SaleShippingNoteDto
                    {
                        Id = n.Id,
                        Note = n.Note
                    }).ToList()
                })
                .FirstOrDefaultAsync(cancellationToken) ?? throw new NotFoundCustomException("فروش مورد نظر یافت نشد.");

            sale.Attachments = await context.DocumentAttachments.AsNoTracking()
                .Where(a => a.DocumentKind == DocumentKindEnum.SALE && a.DocumentId == saleId)
                .Select(a => new DocumentAttachmentDto
                {
                    Id = a.Id,
                    ObjectKey = a.ObjectKey,
                    FileName = a.FileName,
                    Note = a.Note,
                    CreatedAt = a.CreatedAt
                })
                .ToListAsync(cancellationToken);
            foreach (var attachment in sale.Attachments)
                attachment.Url = objectStorageService.GetFixedUrl(attachment.ObjectKey);

            // خلاصه‌ی قرارداد اقساطی جدا خوانده می‌شود: roll-upهای پلن در حافظه حساب می‌شوند
            // و به SQL ترجمه نمی‌شوند.
            sale.InstallmentSummary = await SaleInstallmentSummaryReader.ReadForSaleAsync(context, saleId, cancellationToken);

            return sale;
        }
    }
}
