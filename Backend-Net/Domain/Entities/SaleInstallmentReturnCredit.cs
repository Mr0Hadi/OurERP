namespace Domain.Entities
{
    /// <summary>
    /// A sale return's on-account refund (MONEY_OUT, ON_ACCOUNT) applied to an installment plan: the unpaid tail was shortened
    /// by <see cref="AppliedAmount"/>. Keyed loosely by the return claim (a plain id, like PartyLedgerEntry's), so removing the
    /// resolution can find and reverse it. Append-only: reversal stamps ReversedAt.
    /// </summary>
    public class SaleInstallmentReturnCredit
    {
        public int Id { get; set; }
        public int SaleInstallmentPlanId { get; set; }
        public SaleInstallmentPlan Plan { get; set; } = null!;

        public int SaleReturnClaimId { get; set; }

        /// <summary>The on-account amount of the money effect.</summary>
        public UInt64 RequestedAmount { get; set; }

        /// <summary>What the plan could take (at most its remaining); the rest stays as credit on the customer's account.</summary>
        public UInt64 AppliedAmount { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime? ReversedAt { get; set; }
    }
}
