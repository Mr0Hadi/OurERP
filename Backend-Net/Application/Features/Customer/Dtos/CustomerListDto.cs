using Domain.Enums;

namespace Application.Features.Customer.Dtos
{
    public class CustomerListDto
    {
        public int Id { get; set; }
        public string LastName { get; set; }
        public string FirstName { get; set; }
        public BalanceTypeEnum BalanceType { get; set; }
        public UInt64? Balance { get; set; }
    }
}
