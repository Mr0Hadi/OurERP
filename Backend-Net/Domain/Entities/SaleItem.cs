using Domain.Enums;

namespace Domain.Entities
{
    public class SaleItem : IInvoiceLine
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public int Quantity { get; set; }
        public UInt64 UnitPrice { get; set; }
        public int Discount { get; set; }

        // ---- invoice snapshot (IInvoiceLine, written by InvoiceLineMath.Stamp) ----
        public TaxCategoryEnum TaxCategory { get; set; } = TaxCategoryEnum.TAXABLE;
        public int TaxPercent { get; set; }
        public UInt64 GrossAmount { get; set; }
        public UInt64 DiscountAmount { get; set; }
        public UInt64 NetAmount { get; set; }
        public UInt64 TaxAmount { get; set; }
        public UInt64 TotalAmount { get; set; }
        public int ShippedQuantity { get; set; }
        public int SettledQuantity { get; set; }
        public Product Product { get; set; }
        public int SaleId { get; set; }
        public Sale Sale { get; set; }
    }
}
