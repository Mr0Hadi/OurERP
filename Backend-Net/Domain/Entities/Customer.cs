using Domain.Enums;

namespace Domain.Entities
{
    public class Customer
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
        public UInt64 Balance { get; set; }
        public BalanceTypeEnum BalanceType { get; set; }
        public string? ImageUrl { get; set; }
        public decimal longitude { get; set; }
        public decimal latitude { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
