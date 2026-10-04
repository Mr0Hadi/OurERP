using Application.Common.Documents;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.SaleReturn;
using Application.Common.Queries;
using Common.Extensions;
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
        public static async Task<SaleDto> ReadAsync(IWMSDbContext context, IObjectStorageService objectStorageService, ISaleReturnCalculationService saleReturnCalculationService, int saleId, CancellationToken cancellationToken)
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
                    ReturnCount = context.SaleReturns.Count(r => r.SaleId == x.Id && r.IsActive),
                    HasOpenReturn = context.SaleReturns.Any(r => r.SaleId == x.Id && r.IsActive
                        && (r.Status == ReturnStatusEnum.OPEN || r.Status == ReturnStatusEnum.IN_PROGRESS)),
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
                        PosTerminalId = p.PosTerminalId,
                        MaskedCardNumber = p.MaskedCardNumber,
                        ApprovalCode = p.ApprovalCode,
                        TraceNumber = p.TraceNumber,
                        Source = p.Source,
                        RecordedAt = p.RecordedAt,
                        RecordedByUserId = p.RecordedByUserId,
                        RecordedByName = p.RecordedByUser != null ? p.RecordedByUser.FirstName + " " + p.RecordedByUser.LastName : null,
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
                        ProductCode = y.Product.Code,
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

            await FillClaimCapsAsync(context, saleReturnCalculationService, sale, cancellationToken);

            sale.Attachments = await DocumentAttachmentWriter.ReadAsync(context, objectStorageService, DocumentKindEnum.SALE, saleId, cancellationToken);

            // خلاصه‌ی قرارداد اقساطی جدا خوانده می‌شود: roll-upهای پلن در حافظه حساب می‌شوند
            // و به SQL ترجمه نمی‌شوند.
            sale.InstallmentSummary = await SaleInstallmentSummaryReader.ReadForSaleAsync(context, saleId, cancellationToken);

            return sale;
        }

        /// <summary>
        /// The caps the sale-return form needs, computed by the same service calls CreateSaleReturn checks with, so the form never
        /// offers a quantity the server will refuse.
        /// </summary>
        private static async Task FillClaimCapsAsync(IWMSDbContext context, ISaleReturnCalculationService calc, SaleDto sale, CancellationToken cancellationToken)
        {
            if (sale.Items.Count == 0)
                return;

            var openReturns = await context.SaleReturns.AsNoTracking()
                .Where(x => x.SaleId == sale.Id)
                .WhereNotDeleted()
                .WhereOpen()
                .WithReturnGraph()
                .ToListAsync(cancellationToken);

            var lineIds = sale.Items.Select(i => i.Id).ToList();
            var soldExcess = await context.ProductUnits.AsNoTracking()
                .Where(u => u.SaleItemId != null && lineIds.Contains(u.SaleItemId.Value) && u.Status == ProductUnitStatusEnum.SOLD && u.CustodyReason == UnitCustodyReasonEnum.EXCESS)
                .GroupBy(u => u.SaleItemId!.Value)
                .Select(g => new { SaleItemId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.SaleItemId, x => x.Count, cancellationToken);

            var productIds = sale.Items.Select(i => i.ProductId).Distinct().ToList();
            var units = await context.Products.AsNoTracking()
                .Where(p => productIds.Contains(p.Id))
                .Select(p => new { p.Id, p.Unit })
                .ToDictionaryAsync(x => x.Id, x => x.Unit, cancellationToken);

            foreach (var item in sale.Items)
            {
                item.Unit = units.TryGetValue(item.ProductId, out var unit) ? unit.GetDescription() : string.Empty;
                item.ClaimableQuantity = calc.GetClaimableQuantity(
                    new Domain.Entities.SaleItem { Id = item.Id, ShippedQuantity = item.ShippedQuantity, SettledQuantity = item.SettledQuantity },
                    openReturns);
                item.ClaimableExcessQuantity = Math.Max(0, soldExcess.GetValueOrDefault(item.Id) - calc.GetOutstandingExcessClaimQuantity(item.Id, openReturns));
            }
        }
    }
}
