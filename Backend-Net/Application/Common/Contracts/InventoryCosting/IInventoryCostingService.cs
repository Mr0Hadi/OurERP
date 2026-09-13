using Domain.Entities;
using Domain.Enums;

namespace Application.Common.Contracts.InventoryCosting
{
    /// <summary>
    /// Writes to the perpetual weighted-average-cost (AVCO) inventory ledger
    /// (InventoryCostLedgerEntry) - one method per stock-mutation site that already exists in the
    /// codebase (ReceivePurchaseCommand, ShipSaleCommand, the return commands,
    /// Create/UpdateProductCommand). Every method only stages rows via IWMSDbContext; the caller's
    /// own SaveChangesAsync persists them in the same transaction as the stock/status changes they
    /// accompany, so the ledger can never drift out of sync with Product.Stock.
    ///
    /// Return effects follow one rule each, on both sides: an incoming goods effect enters the pool at its
    /// UnitCost (when omitted, the running average, or Product.PurchasePrice when that is 0), an outgoing one
    /// leaves at the running average, and a
    /// money effect writes a row with RevenueDelta = +amount (MONEY_IN) / -amount (MONEY_OUT). The sale
    /// report reads the sale-return money rows as revenue; the purchase report reads the purchase-return
    /// ones as purchase spend (sign flipped).
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

        /// <summary>SaleReturn ExecuteGoodsRoundCommand, GOODS_IN: enters the pool at <paramref name="unitCost"/>; when null, the running average, or Product.PurchasePrice when that is 0.</summary>
        Task RecordSaleReturnRestockAsync(Product product, int quantity, ulong? unitCost, int? saleItemId, DateTime occurredAt, CancellationToken cancellationToken);

        /// <summary>SaleReturn ExecuteGoodsRoundCommand, GOODS_OUT: leaves the pool at the running average.</summary>
        Task RecordReplacementShippedToCustomerAsync(Product product, int quantity, int? saleItemId, DateTime occurredAt, CancellationToken cancellationToken);

        /// <summary>PurchaseReturn ExecuteGoodsRoundCommand, GOODS_IN: enters the pool at <paramref name="unitCost"/>; when null, the running average, or Product.PurchasePrice when that is 0.</summary>
        Task RecordPurchaseReturnReplacementReceivedAsync(Product product, int quantity, ulong? unitCost, int? purchaseItemId, DateTime occurredAt, CancellationToken cancellationToken);

        /// <summary>PurchaseReturn ExecuteGoodsRoundCommand, GOODS_OUT: leaves the pool at the running average.</summary>
        Task RecordPurchaseReturnShippedToSupplierAsync(Product product, int quantity, DateTime occurredAt, CancellationToken cancellationToken);

        /// <summary>SaleReturn AddClaimResolutionCommand, a money effect: MONEY_IN is revenue
        /// (SALE_RETURN_MONEY_IN), MONEY_OUT negative revenue (SALE_RETURN_REFUND). No inventory movement.</summary>
        Task RecordSaleReturnMoneyAsync(Product product, ReturnEffectDirectionEnum direction, ulong amount, int saleReturnClaimId, DateTime occurredAt, CancellationToken cancellationToken);

        /// <summary>Undoes <see cref="RecordSaleReturnMoneyAsync"/> when its resolution is removed. The ledger is
        /// append-only, so this writes a second row of the same event with the opposite RevenueDelta.</summary>
        Task RecordSaleReturnMoneyReversalAsync(Product product, ReturnEffectDirectionEnum direction, ulong amount, int saleReturnClaimId, DateTime occurredAt, CancellationToken cancellationToken);

        /// <summary>PurchaseReturn AddClaimResolutionCommand, a money effect (PURCHASE_RETURN_MONEY_IN /
        /// PURCHASE_RETURN_MONEY_OUT). No inventory movement. Not revenue: the purchase report reads it as
        /// purchase spend, a supplier refund lowering it and a payment to the supplier raising it.</summary>
        Task RecordPurchaseReturnMoneyAsync(Product product, ReturnEffectDirectionEnum direction, ulong amount, int purchaseReturnClaimId, DateTime occurredAt, CancellationToken cancellationToken);

        /// <summary>Undoes <see cref="RecordPurchaseReturnMoneyAsync"/> when its resolution is removed.</summary>
        Task RecordPurchaseReturnMoneyReversalAsync(Product product, ReturnEffectDirectionEnum direction, ulong amount, int purchaseReturnClaimId, DateTime occurredAt, CancellationToken cancellationToken);
    }
}
