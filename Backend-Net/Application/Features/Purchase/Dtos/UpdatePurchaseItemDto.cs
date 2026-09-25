namespace Application.Features.Purchase.Dtos
{
    public class UpdatePurchaseItemDto
    {
        /// <summary>A line of this purchase to update; null = a new line.</summary>
        public int? Id { get; set; }
        public int ProductId { get; set; }
        public int Quantity { get; set; }
        public UInt64 UnitPrice { get; set; }

        /// <summary>Percent.</summary>
        public int Discount { get; set; }
    }
}
