namespace Application.Features.Sale.Dtos
{
    public class CreateSaleItemDto
    {
        public int ProductId { get; set; }
        public int Quantity { get; set; }
        public UInt64 UnitPrice { get; set; }
        public int Discount { get; set; }
    }
}
