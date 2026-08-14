using Domain.Enums;

namespace Application.Features.Customer.Dtos
{
    public class CustomerListDto
    {
        public int Id { get; set; }
        public string FullName { get; set; }
        public BalanceTypeEnum BalanceType { get; set; }
        public UInt64? Balance { get; set; }
    }
}
