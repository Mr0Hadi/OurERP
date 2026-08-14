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
        public string? ImageUrl { get; set; }
        public string? Description { get; set; }
        public UInt64? Balance { get; set; }
        public BalanceTypeEnum? BalanceType { get; set; }
        public decimal? Longitude { get; set; }
        public decimal? Latitude { get; set; }
    }
}
