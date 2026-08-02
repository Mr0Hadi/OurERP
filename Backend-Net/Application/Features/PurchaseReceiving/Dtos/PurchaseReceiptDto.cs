using Domain.Enums;

namespace Application.Features.PurchaseReceiving.Dtos
{
    public class PurchaseReceiptDto
    {
        public int Id { get; set; }
        public string ReceiptNumber { get; set; }
        public DateTime ReceiptDate { get; set; }
        public PurchaseReceiptStatusEnum Status { get; set; }
        public string? Description { get; set; }
        public int PurchaseId { get; set; }
        public string PurchaseInvoiceNumber { get; set; }
        public string SupplierName { get; set; }
        public List<PurchaseReceiptItemDto> Items { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
