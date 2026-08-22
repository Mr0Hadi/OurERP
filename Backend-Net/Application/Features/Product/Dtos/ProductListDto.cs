namespace Application.Features.Product.Dtos
{
    public class ProductListDto
    {
        public int Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string Brand { get; set; }
        public string CategoryName { get; set; }
        public UInt64 RetailPrice { get; set; }
        public UInt64 WholeSalePrice { get; set; }
        public int Stock { get; set; }

        /// <summary>Stable bucket object key; null when the product has no image.</summary>
        public string? ImageKey { get; set; }

        /// <summary>Short-lived signed URL, filled in after the page is materialized.</summary>
        public string? ImageUrl { get; set; }
    }
}
