using Domain.Entities;
using Domain.Enums;

namespace Application.Features.Sale.Dtos
{
    public class SaleDto
    {
        public int Id { get; set; }
        public string InvoiceNumber { get; set; }
        public DateTime InvoiceDate { get; set; }
        public SalesStatusEnum Status { get; set; }
        public PaymentTypeEnum PaymentType { get; set; }
        public List<PaymentDetail> PaymentDetails { get; set; }
        public UInt64 TotalAmount { get; set; }
        public UInt64 PaidAmount { get; set; }
        public string? Description { get; set; }
        public int CustomerId { get; set; }
        public string CustomerName { get; set; }
        public List<SaleItem> Items { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public List<SaleDriverDto> Drivers { get; set; } = new();
        public List<SaleShippingNoteDto> ShippingNotes { get; set; } = new();
    }

    public class SaleDriverDto
    {
        public int Id { get; set; }
        public string DriverFullName { get; set; }
        public string DriverNationalCode { get; set; }
        public string VehiclePlate { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class SaleShippingNoteDto
    {
        public int Id { get; set; }
        public string Note { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
