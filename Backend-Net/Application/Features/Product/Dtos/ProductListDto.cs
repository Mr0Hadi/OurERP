namespace Application.Features.Product.Dtos
{
    public class ProductListDto
    {
        public int Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string Brand { get; set; }
        public int ProductCategoryId { get; set; }
        public UInt64 RetailPrice { get; set; }
        public int Stock { get; set; }
    }
}
