using Application.Common.Contracts.Context;
using Application.Features.Product.Dtos;
using Domain.Enums;

namespace Application.Features.Product.Mappings
{
    public static class ProductUnitProjection
    {
        /// <summary>
        /// Server-side projection to <see cref="ProductUnitDto"/>, shared by the unit list and the unit history.
        /// ProductUnit carries only line ids, so the purchase/sale and counterparty come from correlated subqueries
        /// on those lines - one SQL statement, no request per row.
        /// </summary>
        public static IQueryable<ProductUnitDto> SelectDto(this IQueryable<Domain.Entities.ProductUnit> units, IWMSDbContext context) =>
            units.Select(x => new ProductUnitDto
            {
                Id = x.Id,
                ProductId = x.ProductId,
                ProductName = x.Product.Name,
                SerialNumber = x.SerialNumber,
                Barcode = x.Barcode,
                BarcodePayload = x.BarcodePayload,
                Status = x.Status,
                PurchaseItemId = x.PurchaseItemId,
                SaleItemId = x.SaleItemId,
                SoldAt = x.SoldAt,
                // ProductUnit.PurchaseId first: an UNLISTED unit arrived on a purchase but has no line.
                PurchaseId = x.PurchaseId ?? context.Purchases.Where(p => p.Items.Any(i => i.Id == x.PurchaseItemId)).Select(p => (int?)p.Id).FirstOrDefault(),
                PurchaseInvoiceNumber = context.Purchases.Where(p => p.Id == x.PurchaseId || p.Items.Any(i => i.Id == x.PurchaseItemId)).Select(p => p.InvoiceNumber).FirstOrDefault(),
                SupplierId = context.Purchases.Where(p => p.Id == x.PurchaseId || p.Items.Any(i => i.Id == x.PurchaseItemId)).Select(p => (int?)p.SupplierId).FirstOrDefault(),
                SupplierName = context.Purchases.Where(p => p.Id == x.PurchaseId || p.Items.Any(i => i.Id == x.PurchaseItemId)).Select(p => p.Supplier.CompanyName).FirstOrDefault(),
                SaleId = context.Sales.Where(s => s.Items.Any(i => i.Id == x.SaleItemId)).Select(s => (int?)s.Id).FirstOrDefault(),
                SaleInvoiceNumber = context.Sales.Where(s => s.Items.Any(i => i.Id == x.SaleItemId)).Select(s => s.InvoiceNumber).FirstOrDefault(),
                CustomerId = context.Sales.Where(s => s.Items.Any(i => i.Id == x.SaleItemId)).Select(s => (int?)s.CustomerId).FirstOrDefault(),
                CustomerName = context.Sales.Where(s => s.Items.Any(i => i.Id == x.SaleItemId)).Select(s => s.Customer.FirstName + " " + s.Customer.LastName).FirstOrDefault(),
                ProductCode = x.Product.Code,
                RequiresUnitTracking = x.Product.RequiresUnitTracking,
                CreatedAt = x.CreatedAt,
                LastMovementAt = context.ProductUnitMovements.Where(m => m.ProductUnitId == x.Id).Max(m => (DateTime?)m.OccurredAt),
                CustodyReason = x.CustodyReason,
                QuarantineCost = x.QuarantineCost,
                QuarantinedAt = x.QuarantinedAt,
                QuarantineDocumentKind = x.QuarantineDocumentKind,
                QuarantineDocumentId = x.QuarantineDocumentId,
                QuarantineDocumentNumber =
                    x.QuarantineDocumentKind == DocumentKindEnum.PURCHASE ? context.Purchases.Where(p => p.Id == x.QuarantineDocumentId).Select(p => p.InvoiceNumber).FirstOrDefault()
                    : x.QuarantineDocumentKind == DocumentKindEnum.PURCHASE_RETURN ? context.PurchaseReturns.Where(r => r.Id == x.QuarantineDocumentId).Select(r => r.ReturnNumber).FirstOrDefault()
                    : x.QuarantineDocumentKind == DocumentKindEnum.SALE_RETURN ? context.SaleReturns.Where(r => r.Id == x.QuarantineDocumentId).Select(r => r.ReturnNumber).FirstOrDefault()
                    : x.QuarantineDocumentKind == DocumentKindEnum.SALE ? context.Sales.Where(r => r.Id == x.QuarantineDocumentId).Select(r => r.InvoiceNumber).FirstOrDefault()
                    : null,
                PrintCount = x.PrintCount,
                FirstPrintedAt = x.FirstPrintedAt,
                LastPrintedAt = x.LastPrintedAt,
                BinLocation = x.BinLocation,
                LastPrintedByName = context.Users.Where(u => u.Id == x.LastPrintedByUserId).Select(u => u.FirstName + " " + u.LastName).FirstOrDefault(),
            });
    }
}
