namespace Application.Common.Contracts.ProductUnit
{
    /// <summary>
    /// Keeps Domain.Entities.ProductUnit rows in sync with Product.Stock at every point that
    /// mutates stock (ReceivePurchase, ShipSale, both ExecuteGoodsRound commands, Create/UpdateProduct - see
    /// docs/product-code-barcode-invoice-design.fa.md section 1.6). None of these methods call
    /// SaveChangesAsync - the calling handler owns the transaction, same convention as
    /// IPurchaseReturnCalculationService/ISaleReturnCalculationService.
    ///
    /// Because nothing here saves, every selection and count sees the request's own unsaved changes:
    /// units the context tracks are judged by their in-memory state (so a unit consumed, restored or
    /// minted earlier in the same request is never picked twice or missed), everything else by its saved
    /// row. Two movements of one product in a single request are therefore safe.
    ///
    /// Every unit created or changed here gets a ProductUnitMovement row built from the
    /// <see cref="UnitMovementContext"/> the caller passes - this service is the ledger's only writer.
    ///
    /// Scanned barcodes: wherever a method takes barcodes, a non-empty list names the exact units and must match
    /// the count; an empty or null list lets the service pick (FIFO by serial).
    /// </summary>
    public interface IProductUnitService
    {
        /// <summary>
        /// Creates <paramref name="count"/> new units for a product, serials continuing from the current max, in the status and
        /// with the purchase/line/custody reason <paramref name="origin"/> gives. The caller owns Product.Stock: only IN_STOCK
        /// units belong in it.
        /// </summary>
        Task<List<Domain.Entities.ProductUnit>> MintAsync(Domain.Entities.Product product, int count, UnitOrigin origin, UnitMovementContext movement, CancellationToken cancellationToken);

        /// <summary>
        /// Marks <paramref name="count"/> IN_STOCK units SOLD against a sale item - the scanned ones, or FIFO - with
        /// <paramref name="custodyReason"/> (ON_ORDER for the ordered shipment, EXCESS for excess sent to the customer, null with no line).
        /// </summary>
        Task<List<Domain.Entities.ProductUnit>> ConsumeAsync(Domain.Entities.Product product, int count, int? saleItemId, Domain.Enums.UnitCustodyReasonEnum? custodyReason, List<string>? explicitBarcodes, UnitMovementContext movement, CancellationToken cancellationToken);

        /// <summary>
        /// A customer's units coming back on a sale line: <paramref name="healthyCount"/> of the line's SOLD units go back to IN_STOCK
        /// and <paramref name="defectiveCount"/> go to QUARANTINED under custody CUSTOMER_RETURN, carrying
        /// <paramref name="defectiveUnitCost"/> as their QuarantineCost (they used to be SCRAPPED on arrival). Their purchase line is kept,
        /// so a purchase return on that line can send them back to the supplier. <paramref name="excessUnits"/> picks which of the
        /// line's sold units: the excess ones (custody EXCESS) or the ordered ones (everything else). With <paramref name="barcodes"/>
        /// (all units coming back, healthy and defective), <paramref name="defectiveBarcodes"/> names which of them are defective and
        /// must count exactly <paramref name="defectiveCount"/>.
        /// </summary>
        Task RestoreAsync(int saleItemId, bool excessUnits, int healthyCount, int defectiveCount, decimal defectiveUnitCost, List<string>? barcodes, List<string>? defectiveBarcodes, UnitMovementContext movement, CancellationToken cancellationToken);

        /// <summary>
        /// Marks <paramref name="count"/> units matching <paramref name="selection"/> RETURNED_TO_SUPPLIER - the scanned ones, or
        /// FIFO. The selection is the whole rule: a shortfall throws rather than widening it (another line, another purchase,
        /// shelf stock instead of quarantine). Returns the units moved.
        /// </summary>
        Task<List<Domain.Entities.ProductUnit>> ReturnToSupplierAsync(Domain.Entities.Product product, int count, UnitSelection selection, List<string>? explicitBarcodes, UnitMovementContext movement, CancellationToken cancellationToken);

        /// <summary>QUARANTINED units matching <paramref name="selection"/> become IN_STOCK. The caller raises Product.Stock.
        /// Returns the units moved, so the caller can book their <c>QuarantineCost</c>.</summary>
        Task<List<Domain.Entities.ProductUnit>> ReleaseFromQuarantineAsync(Domain.Entities.Product product, int count, UnitSelection selection, List<string>? explicitBarcodes, UnitMovementContext movement, CancellationToken cancellationToken);

        /// <summary>QUARANTINED units matching <paramref name="selection"/> become SCRAPPED. Product.Stock is untouched.
        /// Returns the units moved, so the caller can book their <c>QuarantineCost</c>.</summary>
        Task<List<Domain.Entities.ProductUnit>> ScrapFromQuarantineAsync(Domain.Entities.Product product, int count, UnitSelection selection, List<string>? explicitBarcodes, UnitMovementContext movement, CancellationToken cancellationToken);

        /// <summary>
        /// QUARANTINED units matching <paramref name="selection"/> become part of the order - custody ON_ORDER on
        /// <paramref name="purchaseItemId"/>, QuarantineCost <paramref name="netUnitCost"/> - and <b>stay in quarantine</b> (2026-09-27):
        /// buying them is a money decision, putting them on the shelf is a separate one (ApplyProductUnitAction RELEASE). Stock does not
        /// change. Returns the units moved and the value they were held at before (the sum of their old QuarantineCost).
        /// </summary>
        Task<(List<Domain.Entities.ProductUnit> Units, decimal PreviousHeldValue)> AcceptExcessAsync(Domain.Entities.Product product, int count, UnitSelection selection, List<string>? explicitBarcodes, int purchaseItemId, decimal netUnitCost, UnitMovementContext movement, CancellationToken cancellationToken);

        /// <summary>
        /// Manual warehouse action (ApplyProductUnitAction) on exactly these units, already loaded and checked by the caller:
        /// <list type="bullet">
        /// <item><see cref="Domain.Enums.ProductUnitActionEnum.QUARANTINE"/>: IN_STOCK to QUARANTINED, custody WAREHOUSE_HOLD, QuarantineCost
        /// <paramref name="quarantineCost"/>. Purchase links are kept, so an ON_ORDER claim on the unit's line can still send it back.</item>
        /// <item><see cref="Domain.Enums.ProductUnitActionEnum.RELEASE"/>: QUARANTINED to IN_STOCK.</item>
        /// <item><see cref="Domain.Enums.ProductUnitActionEnum.SCRAP"/>: IN_STOCK or QUARANTINED to SCRAPPED.</item>
        /// </list>
        /// Throws InvalidOperationException for a unit in the wrong status: the caller's validation should have refused it.
        /// </summary>
        Task ApplyActionAsync(IReadOnlyCollection<Domain.Entities.ProductUnit> units, Domain.Enums.ProductUnitActionEnum action, decimal? quarantineCost, UnitMovementContext movement, CancellationToken cancellationToken);

        /// <summary>IN_STOCK units matching <paramref name="selection"/> become SCRAPPED. The caller lowers Product.Stock.</summary>
        Task<List<Domain.Entities.ProductUnit>> ScrapFromStockAsync(Domain.Entities.Product product, int count, UnitSelection selection, List<string>? explicitBarcodes, UnitMovementContext movement, CancellationToken cancellationToken);

        /// <summary>
        /// Reconciles ProductUnit rows to a manually-edited Stock value from UpdateProductCommand:
        /// mints the difference if the new stock is higher, scraps the newest units (by serial) if lower.
        /// </summary>
        Task ReconcileStockAsync(Domain.Entities.Product product, int newStock, UnitMovementContext movement, CancellationToken cancellationToken);
    }
}
