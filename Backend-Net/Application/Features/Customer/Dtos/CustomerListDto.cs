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

        /// <summary>
        /// From the party ledger: what this party owes us (positive) or we owe them (negative), from every issued invoice,
        /// payment and on-account return settlement since the ledger started. Unlike Balance/BalanceType, which are typed by hand.
        /// </summary>
        public decimal LedgerBalance { get; set; }
    }
}
