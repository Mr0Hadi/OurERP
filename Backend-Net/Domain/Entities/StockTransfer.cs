using Domain.Enums;

namespace Domain.Entities
{
    /// <summary>
    /// Stock moved from one warehouse to another (حواله‌ی بین انبار). Dispatching takes the units off the source shelf (IN_TRANSIT,
    /// out of Product.Stock); receiving puts them on the destination shelf. The goods stay ours throughout, so no cost-ledger row
    /// is written - inventory value does not change. No IsActive: its lifecycle is Status.
    /// </summary>
    public class StockTransfer
    {
        public int Id { get; set; }
        public string TransferNumber { get; set; } = null!;
        public int FromWarehouseId { get; set; }
        public Warehouse FromWarehouse { get; set; } = null!;
        public int ToWarehouseId { get; set; }
        public Warehouse ToWarehouse { get; set; } = null!;
        public StockTransferStatusEnum Status { get; set; }
        public string? Description { get; set; }

        public DateTime DispatchedAt { get; set; }
        public int? DispatchedByUserId { get; set; }
        public DateTime? ReceivedAt { get; set; }
        public int? ReceivedByUserId { get; set; }
        public DateTime? CancelledAt { get; set; }
        public int? CancelledByUserId { get; set; }
        public DateTime CreatedAt { get; set; }

        public List<StockTransferUnit> Units { get; set; } = new();
    }

    /// <summary>One unit on a transfer - which units travelled, kept after arrival as history.</summary>
    public class StockTransferUnit
    {
        public int Id { get; set; }
        public int StockTransferId { get; set; }
        public StockTransfer StockTransfer { get; set; } = null!;
        public int ProductUnitId { get; set; }
        public ProductUnit ProductUnit { get; set; } = null!;
        public int ProductId { get; set; }
    }
}
