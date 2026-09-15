using Domain.Enums;

namespace Application.Features.Purchase.Dtos
{
    /// <summary>
    /// What the warehouse counted for one purchase line: how many arrived, and how many of those are bad, by problem. The
    /// warehouse does not decide which units are owed, excess or quarantined - the server allocates healthy-first (see
    /// ReceivePurchaseCommand).
    /// </summary>
    public class ReceivePurchaseItemDto
    {
        public int PurchaseItemId { get; set; }
        public int ArrivedQuantity { get; set; }
        public List<ReceivingDefectDto> Defects { get; set; } = new();
    }

    /// <summary>A product that arrived on this purchase but is not on any of its lines.</summary>
    public class ReceivePurchaseUnlistedItemDto
    {
        public int ProductId { get; set; }
        public int ArrivedQuantity { get; set; }
        public List<ReceivingDefectDto> Defects { get; set; } = new();
    }

    public class ReceivingDefectDto
    {
        public ReturnProblemEnum Problem { get; set; }
        public int Quantity { get; set; }
        public string? Note { get; set; }
    }
}
