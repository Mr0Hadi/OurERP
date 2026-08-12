namespace Application.Features.Sale.Dtos
{
    public class UpdateSaleItemDto
    {
        /// <summary>صفر یعنی ردیف جدید</summary>
        public int Id { get; set; }
        public int ProductId { get; set; }
        public int Quantity { get; set; }
        public UInt64 UnitPrice { get; set; }
        public int Discount { get; set; }
    }
}
