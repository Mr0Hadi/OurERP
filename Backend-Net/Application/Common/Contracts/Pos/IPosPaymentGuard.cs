using Application.Common.Payments;

namespace Application.Common.Contracts.Pos
{
    /// <summary>
    /// Checks the card-reader rows of a payment write before anything is staged (frontend-requests 12.2/12.3).
    /// Rows without a device pass untouched, so cash, checks, ordinary transfers and installments are never affected.
    /// </summary>
    public interface IPosPaymentGuard
    {
        /// <summary>
        /// For every row naming a device: the device is active; the signed-in user holds
        /// <c>PosManualRecord</c> (no row can come from the device itself until signed device results exist,
        /// so every card-reader row is a manual one for now); and its RRN (<c>TransferRef</c>) has never been
        /// recorded on that device before - voided rows included, since voiding refunds the money, it does not
        /// free the transaction - nor twice in the same request.
        /// </summary>
        Task CheckAsync(IEnumerable<IPosPaymentFields> rows, CancellationToken cancellationToken);
    }
}
