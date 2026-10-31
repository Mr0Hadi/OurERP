using Domain.Entities;
using Domain.Enums;

namespace Application.Features.Product.Dtos
{
    public class ProductDto
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string? EnglishName { get; set; }
        public string? Description { get; set; }
        public string Code { get; set; }
        public string BarCode { get; set; }
        public string Brand { get; set; }
        public ProductUnitEnum Unit { get; set; }
        public UInt64 PurchasePrice { get; set; }
        public UInt64 RetailPrice { get; set; }
        public UInt64 WholeSalePrice { get; set; }
        public int Tax { get; set; }
        public Domain.Enums.TaxCategoryEnum TaxCategory { get; set; }
        public int Stock { get; set; }

        /// <summary>Units the warehouse reserved for proformas - still on the shelf and still ours, but not free to sell, so not part of Stock.</summary>
        public int ReservedCount { get; set; }
        public int LowStockThreshold { get; set; }

        /// <summary>Reorder (GAP-04): order back up to this level when stock falls to LowStockThreshold (the reorder point). Null = up to the reorder point.</summary>
        public int? TargetStock { get; set; }
        public int? LeadTimeDays { get; set; }
        public int? PreferredSupplierId { get; set; }
        public int? MinOrderQuantity { get; set; }
        public string? PreferredSupplierName { get; set; }
        /// <summary>The stable bucket object key - send this back on update to keep the image.</summary>
        public string? ImageKey { get; set; }

        /// <summary>A short-lived signed URL for &lt;img src&gt;. Expires; do not store it.</summary>
        public string? ImageUrl { get; set; }
        public int ProductCategoryId { get; set; }
        public bool RequiresUnitTracking { get; set; }
        public bool IsIncomplete { get; set; }

        /// <summary>The vehicles this product fits, by name. Empty: it fits every vehicle.</summary>
        public List<Application.Features.Vehicle.Dtos.VehicleDto> Vehicles { get; set; } = new();

        /// <summary>Units held in quarantine - physically here, not sellable, not part of Stock.</summary>
        public int QuarantinedCount { get; set; }
    }
}
