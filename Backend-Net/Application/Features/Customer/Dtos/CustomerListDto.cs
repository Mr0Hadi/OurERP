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

        /// <summary>Null = no limit; 0 = cash only (GAP-06).</summary>
        public UInt64? CreditLimit { get; set; }

        /// <summary>LedgerBalance + received cheques not cleared yet - what the credit limit is checked against.</summary>
        public decimal CreditExposure { get; set; }

        /// <summary>CreditLimit - CreditExposure (negative = over the limit). Null when there is no limit.</summary>
        public decimal? CreditAvailable { get; set; }
    }
}
