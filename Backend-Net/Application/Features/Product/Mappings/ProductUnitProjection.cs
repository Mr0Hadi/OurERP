using Application.Common.Contracts.Context;
using Application.Features.Product.Dtos;

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
                PurchaseId = context.Purchases.Where(p => p.Items.Any(i => i.Id == x.PurchaseItemId)).Select(p => (int?)p.Id).FirstOrDefault(),
                PurchaseInvoiceNumber = context.Purchases.Where(p => p.Items.Any(i => i.Id == x.PurchaseItemId)).Select(p => p.InvoiceNumber).FirstOrDefault(),
                SupplierId = context.Purchases.Where(p => p.Items.Any(i => i.Id == x.PurchaseItemId)).Select(p => (int?)p.SupplierId).FirstOrDefault(),
                SupplierName = context.Purchases.Where(p => p.Items.Any(i => i.Id == x.PurchaseItemId)).Select(p => p.Supplier.CompanyName).FirstOrDefault(),
                SaleId = context.Sales.Where(s => s.Items.Any(i => i.Id == x.SaleItemId)).Select(s => (int?)s.Id).FirstOrDefault(),
                SaleInvoiceNumber = context.Sales.Where(s => s.Items.Any(i => i.Id == x.SaleItemId)).Select(s => s.InvoiceNumber).FirstOrDefault(),
                CustomerId = context.Sales.Where(s => s.Items.Any(i => i.Id == x.SaleItemId)).Select(s => (int?)s.CustomerId).FirstOrDefault(),
                CustomerName = context.Sales.Where(s => s.Items.Any(i => i.Id == x.SaleItemId)).Select(s => s.Customer.FirstName + " " + s.Customer.LastName).FirstOrDefault(),
            });
    }
}
