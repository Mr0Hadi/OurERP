using Domain.Enums;

namespace Application.Features.Supplier.Dtos
{
    public class SupplierDto
    {
        public int Id { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string CompanyName { get; set; }
        public string Phone { get; set; }
        public string Address { get; set; }
        public string PostalCode { get; set; }
        public string? EconomicCode { get; set; }
        public string? NationalId { get; set; }
        public string? RegistrationNumber { get; set; }
        public string? Province { get; set; }
        public string? City { get; set; }
        /// <summary>The stable bucket object key - send this back on update to keep the image.</summary>
        public string? ImageKey { get; set; }

        /// <summary>A short-lived signed URL for &lt;img src&gt;. Expires; do not store it.</summary>
        public string? ImageUrl { get; set; }
        public string? Description { get; set; }
        public UInt64? Balance { get; set; }
        public BalanceTypeEnum? BalanceType { get; set; }
        public decimal? Longitude { get; set; }
        public decimal? Latitude { get; set; }
    }
}
