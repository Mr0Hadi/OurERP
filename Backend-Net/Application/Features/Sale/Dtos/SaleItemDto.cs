namespace Application.Features.Sale.Dtos
{
    public class SaleItemDto
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public string ProductName { get; set; }
        public int Quantity { get; set; }
        public UInt64 UnitPrice { get; set; }
        public int Discount { get; set; }

        // Invoice snapshot, computed by the server (InvoiceLineMath): tax taken from the product, amounts in whole rials.
        public Domain.Enums.TaxCategoryEnum TaxCategory { get; set; }
        public int TaxPercent { get; set; }
        public UInt64 GrossAmount { get; set; }
        public UInt64 DiscountAmount { get; set; }
        public UInt64 NetAmount { get; set; }
        public UInt64 TaxAmount { get; set; }
        public UInt64 TotalAmount { get; set; }
        public int ShippedQuantity { get; set; }
        public int SettledQuantity { get; set; }
        public int SaleId { get; set; }
    }
}
