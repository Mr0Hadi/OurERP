using Domain.Enums;

namespace Application.Features.Warehousing.Dtos
{
    public class WarehouseDto
    {
        public int Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Address { get; set; }
        public string? Description { get; set; }
        public bool IsDefault { get; set; }
        public bool IsActive { get; set; }

        /// <summary>Units here by state: on the shelf, in quarantine, reserved for proformas, and on their way out to another warehouse.</summary>
        public int InStockUnits { get; set; }
        public int QuarantinedUnits { get; set; }
        public int ReservedUnits { get; set; }
        public int OutgoingInTransitUnits { get; set; }
    }

    /// <summary>One product's units in one warehouse.</summary>
    public class ProductWarehouseStockDto
    {
        public int WarehouseId { get; set; }
        public string WarehouseName { get; set; } = string.Empty;
        public bool IsDefault { get; set; }
        public int InStock { get; set; }
        public int Quarantined { get; set; }
        public int Reserved { get; set; }

        /// <summary>Units on a transfer that left this warehouse and has not arrived yet.</summary>
        public int OutgoingInTransit { get; set; }
    }

    public class StockTransferDto
    {
        public int Id { get; set; }
        public string TransferNumber { get; set; } = string.Empty;
        public int FromWarehouseId { get; set; }
        public string FromWarehouseName { get; set; } = string.Empty;
        public int ToWarehouseId { get; set; }
        public string ToWarehouseName { get; set; } = string.Empty;
        public StockTransferStatusEnum Status { get; set; }
        public string StatusTitle { get; set; } = string.Empty;
        public string? Description { get; set; }
        public DateTime DispatchedAt { get; set; }
        public int? DispatchedByUserId { get; set; }
        public DateTime? ReceivedAt { get; set; }
        public int? ReceivedByUserId { get; set; }
        public DateTime? CancelledAt { get; set; }
        public int TotalUnits { get; set; }

        /// <summary>Detail only (empty on the list): what travelled, per product, with the unit barcodes.</summary>
        public List<StockTransferProductDto> Products { get; set; } = new();
    }

    public class StockTransferProductDto
    {
        public int ProductId { get; set; }
        public string ProductCode { get; set; } = string.Empty;
        public string ProductName { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public List<string> Barcodes { get; set; } = new();
    }
}
