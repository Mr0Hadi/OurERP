namespace Application.Common.Contracts.ProductUnit
{
    /// <summary>
    /// Keeps Domain.Entities.ProductUnit rows in sync with Product.Stock at every point that
    /// mutates stock (ReceivePurchase, ShipSale, ConfirmReplacementShipment,
    /// ConfirmReturnInspection, Create/UpdateProduct - see
    /// docs/product-code-barcode-invoice-design.fa.md section 1.6). None of these methods call
    /// SaveChangesAsync - the calling handler owns the transaction, same convention as
    /// IPurchaseReturnCalculationService/ISaleReturnCalculationService.
    /// </summary>
    public interface IProductUnitService
    {
        /// <summary>Creates <paramref name="count"/> new IN_STOCK units for a product, serials continuing from the current max.</summary>
        Task<List<Domain.Entities.ProductUnit>> MintAsync(Domain.Entities.Product product, int count, int? purchaseItemId, CancellationToken cancellationToken);

        /// <summary>
        /// Marks <paramref name="count"/> IN_STOCK units SOLD against a sale item. If
        /// <paramref name="explicitBarcodes"/> is given (the seller scanned specific units),
        /// those exact units are consumed; otherwise the oldest IN_STOCK units (FIFO by serial) are picked.
        /// </summary>
        Task<List<Domain.Entities.ProductUnit>> ConsumeAsync(Domain.Entities.Product product, int count, int saleItemId, List<string>? explicitBarcodes, CancellationToken cancellationToken);

        /// <summary>
        /// Called from ConfirmReturnInspectionCommand: puts <paramref name="healthyCount"/> of the
        /// sale item's SOLD units back to IN_STOCK, and marks <paramref name="scrapCount"/> of them
        /// SCRAPPED (defective/damaged units never return to sellable stock).
        /// </summary>
        Task RestoreAsync(int saleItemId, int healthyCount, int scrapCount, CancellationToken cancellationToken);

        /// <summary>
        /// Reconciles ProductUnit rows to a manually-edited Stock value from UpdateProductCommand:
        /// mints the difference if the new stock is higher, scraps the newest units (by serial) if lower.
        /// </summary>
        Task ReconcileStockAsync(Domain.Entities.Product product, int newStock, CancellationToken cancellationToken);
    }
}
