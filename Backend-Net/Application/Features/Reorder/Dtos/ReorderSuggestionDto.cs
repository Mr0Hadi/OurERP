namespace Application.Features.Reorder.Dtos
{
    /// <summary>One product that has reached its reorder point, with what to order and from whom.</summary>
    public class ReorderSuggestionDto
    {
        public int ProductId { get; set; }
        public string ProductCode { get; set; } = string.Empty;
        public string ProductName { get; set; } = string.Empty;
        public string? Brand { get; set; }
        public int? ProductCategoryId { get; set; }
        public string? ProductCategoryName { get; set; }

        /// <summary>Free stock (Product.Stock - reserved and quarantined units are already outside it).</summary>
        public int Stock { get; set; }

        /// <summary>Still to arrive on open purchases (draft, pending, shipped, partly received), short-closed quantity excluded.</summary>
        public int OnOrder { get; set; }
        public int ReorderPoint { get; set; }
        public int? TargetStock { get; set; }
        public int? MinOrderQuantity { get; set; }
        public int? LeadTimeDays { get; set; }

        /// <summary>What to order: up to TargetStock (or one minimum order when no target is set), rounded up to MinOrderQuantity.</summary>
        public int SuggestedQuantity { get; set; }

        /// <summary>The preferred supplier, else the supplier of the latest purchase; null when the product was never bought.</summary>
        public int? SupplierId { get; set; }
        public string? SupplierName { get; set; }
        public bool IsPreferredSupplier { get; set; }

        /// <summary>The latest purchase line's unit price, else the product's purchase price.</summary>
        public UInt64 LastUnitPrice { get; set; }
    }
}
