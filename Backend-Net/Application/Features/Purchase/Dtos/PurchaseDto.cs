using Application.Common.Dtos;
using Domain.Enums;

namespace Application.Features.Purchase.Dtos
{
    public class PurchaseDto
    {
        public int Id { get; set; }
        public string InvoiceNumber { get; set; }
        public DateTime? InvoiceDate { get; set; }
        public DateTime? PaymentDate { get; set; }
        public PurchaseStatusEnum Status { get; set; }
        public PaymentTypeEnum PaymentType { get; set; }
        public UInt64 TotalAmount { get; set; }
        public UInt64 PaidAmount { get; set; }
        public string? Description { get; set; }
        public int SupplierId { get; set; }
        public string SupplierName { get; set; }
        public List<PurchaseItemDto> Items { get; set; }
        public List<PaymentDetailDto> PaymentDetails { get; set; }
        public List<PurchaseDriverDto> Drivers { get; set; } = new();
        public List<PurchaseReceivingNoteDto> ReceivingNotes { get; set; } = new();
        public List<DocumentAttachmentDto> Attachments { get; set; } = new();
    }

    public class PurchaseDriverDto
    {
        public int Id { get; set; }
        public string DriverFullName { get; set; }
        public string DriverPhoneNumber { get; set; }
        public string VehiclePlate { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class PurchaseReceivingNoteDto
    {
        public int Id { get; set; }
        public string Note { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
