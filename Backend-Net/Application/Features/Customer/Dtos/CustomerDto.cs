using Domain.Enums;

namespace Application.Features.Customer.Dtos
{
    public class CustomerDto
    {
        public int Id { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string PhoneNumber { get; set; }
        public string Address { get; set; }
        public string PostalCode { get; set; }
        public string? RefferalCode { get; set; }
        public UInt64 CreditLimit { get; set; }
        public string Description { get; set; }
        public UInt64? Balance { get; set; }
        public BalanceTypeEnum BalanceType { get; set; }
        public string? ImageUrl { get; set; }
        public decimal? Longitude { get; set; }
        public decimal? Latitude { get; set; }
    }
}
