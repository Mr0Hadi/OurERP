using Domain.Enums;

namespace Application.Features.PurchaseReceiving.Dtos
{
    public class ReceivingIssueDto
    {
        public PurchaseIssueTypeEnum Type { get; set; }
        public int Qty { get; set; }
        public string? Note { get; set; }
    }

    public class ConfirmReceivingItemDto
    {
        public int ProductId { get; set; }
        public int ReceivedQty { get; set; }
        public List<ReceivingIssueDto>? Issues { get; set; }
    }
}
