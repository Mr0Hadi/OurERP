using System.ComponentModel.DataAnnotations.Schema;
using Domain.Enums;

namespace Domain.Entities
{
    public class Product
    {
        /// <summary>Scanning individual units is required for this product (enforced on outbound movements). Bulk goods leave it false.</summary>
        public bool RequiresUnitTracking { get; set; }

        /// <summary>
        /// Created by the warehouse with only name, unit and category, to receive an off-document product. Cleared only when
        /// the catalog data that was missing is actually filled (<see cref="HasCompleteCatalogData"/>), never by any update.
        /// </summary>
        public bool IsIncomplete { get; set; }

        /// <summary>The fields a quick-created product lacks: a brand and all three prices.</summary>
        [NotMapped]
        public bool HasCompleteCatalogData => !string.IsNullOrWhiteSpace(Brand) && PurchasePrice > 0 && RetailPrice > 0 && WholeSalePrice > 0;

        public int Id { get; set; }
        public string Name { get; set; }
        public string? EnglishName { get; set; }
        public string Code { get; set; }
        public string BarCode { get; set; }
        public string? SupplierBarCode { get; set; }
        public string Brand { get; set; }
        public ProductUnitEnum Unit { get; set; }
        public UInt64 PurchasePrice { get; set; }
        public UInt64 RetailPrice { get; set; }
        public UInt64 WholeSalePrice { get; set; }
        /// <summary>Default tax percent for new invoice lines of this product; each line snapshots it (InvoiceLineMath).</summary>
        public int Tax { get; set; }

        /// <summary>EXEMPT lines carry no tax whatever <see cref="Tax"/> says.</summary>
        public TaxCategoryEnum TaxCategory { get; set; } = TaxCategoryEnum.TAXABLE;
        public int Stock { get; set; }
        public int LowStockThreshold { get; set; }
        public string? ImageUrl { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public int ProductCategoryId { get; set; }
        public ProductCategory ProductCategory { get; set; }
    }
}
