namespace Application.Features.Sale.Dtos
{
    public class SaleItemDto
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public int Quantity { get; set; }
        public UInt64 UnitPrice { get; set; }
        public int Discount { get; set; }
        public int ShippedQuantity { get; set; }
        public int SettledQuantity { get; set; }
        public int SaleId { get; set; }
    }
}
