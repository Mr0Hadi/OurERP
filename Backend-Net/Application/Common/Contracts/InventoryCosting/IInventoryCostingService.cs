using Domain.Entities;

namespace Application.Common.Contracts.InventoryCosting
{
    /// <summary>
    /// Writes to the perpetual weighted-average-cost (AVCO) inventory ledger
    /// (InventoryCostLedgerEntry) - one method per stock-mutation site that already exists in the
    /// codebase (ReceivePurchaseCommand, ShipSaleCommand, the two ExecuteGoodsRoundCommands,
    /// Create/UpdateProductCommand). Every method only stages rows via IWMSDbContext; the caller's
    /// own SaveChangesAsync persists them in the same transaction as the stock/status changes they
    /// accompany, so the ledger can never drift out of sync with Product.Stock.
    /// </summary>
    public interface IInventoryCostingService
    {
        /// <summary>Product created with, or backfilled to, non-zero stock with no purchase paper
        /// trail - the only two places (with RecordManualAdjustmentInAsync) Product.PurchasePrice is
        /// ever consulted for costing.</summary>
        Task RecordOpeningBalanceAsync(Product product, int quantity, ulong purchasePrice, DateTime occurredAt, CancellationToken cancellationToken);

        /// <summary>UpdateProductCommand's manual Stock reconciliation, increasing quantity.</summary>
        Task RecordManualAdjustmentInAsync(Product product, int quantity, ulong purchasePrice, DateTime occurredAt, CancellationToken cancellationToken);

        /// <summary>UpdateProductCommand's manual Stock reconciliation, decreasing quantity.</summary>
        Task RecordManualAdjustmentOutAsync(Product product, int quantity, DateTime occurredAt, CancellationToken cancellationToken);

        /// <summary>ReceivePurchaseCommand. unitPrice/discountPercent come straight off the
        /// PurchaseItem; the effective cost entering the pool is unitPrice * (100-discount)/100.</summary>
        Task RecordPurchaseReceiptAsync(Product product, int quantity, ulong unitPrice, int discountPercent, int purchaseItemId, DateTime occurredAt, CancellationToken cancellationToken);

        /// <summary>ShipSaleCommand. Consumes at the current running average (AVCO); revenue is
        /// unitPrice * (100-discountPercent)/100 * quantity.</summary>
        Task RecordSaleShipmentAsync(Product product, int quantity, ulong unitPrice, int discountPercent, int saleItemId, DateTime occurredAt, CancellationToken cancellationToken);

        /// <summary>SaleReturn ExecuteGoodsRoundCommand, GOODS_IN (customer returns healthy goods).
        /// Restocks at the historical average cost of that SaleItem's own past shipments, not the
        /// current average and not a fresh purchase price - a return is not a new purchase.</summary>
        Task RecordSaleReturnRestockAsync(Product product, int quantity, int? saleItemId, DateTime occurredAt, CancellationToken cancellationToken);

        /// <summary>SaleReturn ExecuteGoodsRoundCommand, GOODS_OUT (a replacement shipped for free).
        /// A real cost with no matching revenue - pure negative profit in the period it ships.</summary>
        Task RecordReplacementShippedToCustomerAsync(Product product, int quantity, int? saleItemId, DateTime occurredAt, CancellationToken cancellationToken);

        /// <summary>SaleReturn AddClaimResolutionCommand, a MONEY_OUT effect (refund/store credit
        /// paid to the customer). No inventory movement - pure revenue reversal, using the effect's
        /// own Amount rather than reconstructing one from the claim's unit price (more correct for
        /// partial/negotiated refunds, and avoids double-counting against RecordSaleReturnRestockAsync).</summary>
        Task RecordSaleReturnRefundAsync(Product product, ulong amount, int? saleReturnClaimId, DateTime occurredAt, CancellationToken cancellationToken);

        /// <summary>PurchaseReturn ExecuteGoodsRoundCommand, GOODS_IN (supplier ships a replacement).
        /// Restocks at the historical average cost of that PurchaseItem's own past receipts - a
        /// like-for-like replacement, not a new purchase.</summary>
        Task RecordPurchaseReturnReplacementReceivedAsync(Product product, int quantity, int? purchaseItemId, DateTime occurredAt, CancellationToken cancellationToken);

        /// <summary>PurchaseReturn ExecuteGoodsRoundCommand, GOODS_OUT (defective stock leaving to
        /// the supplier). Standard AVCO withdrawal at the current average - no profit impact.</summary>
        Task RecordPurchaseReturnShippedToSupplierAsync(Product product, int quantity, DateTime occurredAt, CancellationToken cancellationToken);
    }
}
