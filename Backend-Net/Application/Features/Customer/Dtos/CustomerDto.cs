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
        public string? ReferralCode { get; set; }
        /// <summary>Null = no limit; 0 = cash only (GAP-06).</summary>
        public UInt64? CreditLimit { get; set; }
        public string? EconomicCode { get; set; }
        public string? NationalId { get; set; }
        public string? RegistrationNumber { get; set; }
        public string? Province { get; set; }
        public string? City { get; set; }
        public string? Description { get; set; }
        public UInt64? Balance { get; set; }
        public BalanceTypeEnum BalanceType { get; set; }

        /// <summary>
        /// From the party ledger: what this party owes us (positive) or we owe them (negative), from every issued invoice,
        /// payment and on-account return settlement since the ledger started. Unlike Balance/BalanceType, which are typed by hand.
        /// </summary>
        public decimal LedgerBalance { get; set; }

        /// <summary>
        /// What counts against the credit limit (GAP-06): LedgerBalance + received cheques not cleared yet. Unpaid
        /// installments are already in LedgerBalance. Detail only (0 on other mappings).
        /// </summary>
        public decimal CreditExposure { get; set; }
        public decimal UnclearedCheques { get; set; }

        /// <summary>CreditLimit - CreditExposure (can be negative: over the limit). Null when there is no limit.</summary>
        public decimal? CreditAvailable { get; set; }
        /// <summary>The stable bucket object key - send this back on update to keep the image.</summary>
        public string? ImageKey { get; set; }

        /// <summary>A short-lived signed URL for &lt;img src&gt;. Expires; do not store it.</summary>
        public string? ImageUrl { get; set; }
        public decimal? Longitude { get; set; }
        public decimal? Latitude { get; set; }
    }
}
