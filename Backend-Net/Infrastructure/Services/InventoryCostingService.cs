using Application.Common.Contracts.Context;
using Application.Common.Contracts.InventoryCosting;
using Domain.Entities;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services
{
    public class InventoryCostingService : IInventoryCostingService
    {
        private readonly IWMSDbContext _context;

        // The newest ledger row this instance has staged per product. The service is Scoped, like the
        // context, so this lives exactly as long as the request's unsaved rows do. See LatestEntryAsync.
        private readonly Dictionary<int, InventoryCostLedgerEntry> _latestStagedByProduct = new();

        public InventoryCostingService(IWMSDbContext context)
        {
            _context = context;
        }

        public Task RecordOpeningBalanceAsync(Product product, int quantity, ulong purchasePrice, DateTime occurredAt, CancellationToken cancellationToken)
        {
            return AddEntryAsync(product, quantity, purchasePrice, 0m, InventoryCostEventTypeEnum.OPENING_BALANCE, null, null, occurredAt, cancellationToken);
        }

        public Task RecordManualAdjustmentInAsync(Product product, int quantity, ulong purchasePrice, DateTime occurredAt, CancellationToken cancellationToken)
        {
            return AddEntryAsync(product, quantity, purchasePrice, 0m, InventoryCostEventTypeEnum.MANUAL_ADJUSTMENT_IN, null, null, occurredAt, cancellationToken);
        }

        public Task RecordManualAdjustmentOutAsync(Product product, int quantity, DateTime occurredAt, CancellationToken cancellationToken)
        {
            return AddEntryAsync(product, -quantity, 0m, 0m, InventoryCostEventTypeEnum.MANUAL_ADJUSTMENT_OUT, null, null, occurredAt, cancellationToken);
        }

        public Task RecordPurchaseReceiptAsync(Product product, int quantity, ulong unitPrice, int discountPercent, int purchaseItemId, DateTime occurredAt, CancellationToken cancellationToken)
        {
            var effectiveUnitCost = NetUnitAmount(unitPrice, discountPercent);
            return AddEntryAsync(product, quantity, effectiveUnitCost, 0m, InventoryCostEventTypeEnum.PURCHASE_RECEIVED, nameof(PurchaseItem), purchaseItemId, occurredAt, cancellationToken);
        }

        public Task RecordPurchaseReceiptQuarantinedAsync(Product product, int quantity, ulong unitPrice, int discountPercent, int purchaseItemId, DateTime occurredAt, CancellationToken cancellationToken)
        {
            var netUnitCost = NetUnitAmount(unitPrice, discountPercent);
            return AddOffPoolEntryAsync(product, InventoryCostEventTypeEnum.PURCHASE_RECEIVED_QUARANTINED, nameof(PurchaseItem), purchaseItemId, occurredAt, netUnitCost, netUnitCost * quantity, cancellationToken);
        }

        public async Task RecordQuarantineReleasedAsync(Product product, int quantity, ulong? unitCost, int purchaseReturnClaimId, DateTime occurredAt, CancellationToken cancellationToken)
        {
            var cost = await UnitCostOrAverageAsync(product, unitCost, cancellationToken);
            var entry = await AddEntryAsync(product, quantity, cost, 0m, InventoryCostEventTypeEnum.QUARANTINE_RELEASED, nameof(PurchaseReturnClaim), purchaseReturnClaimId, occurredAt, cancellationToken);
            entry.OffPoolValueDelta = -(cost * quantity);
        }

        public async Task RecordQuarantineScrappedAsync(Product product, int quantity, ulong? unitCost, int purchaseReturnClaimId, DateTime occurredAt, CancellationToken cancellationToken)
        {
            var cost = await UnitCostOrAverageAsync(product, unitCost, cancellationToken);
            await AddOffPoolEntryAsync(product, InventoryCostEventTypeEnum.QUARANTINE_SCRAPPED, nameof(PurchaseReturnClaim), purchaseReturnClaimId, occurredAt, cost, -(cost * quantity), cancellationToken);
        }

        public async Task RecordPurchaseReturnShippedFromQuarantineAsync(Product product, int quantity, ulong? unitCost, int purchaseReturnClaimId, DateTime occurredAt, CancellationToken cancellationToken)
        {
            var cost = await UnitCostOrAverageAsync(product, unitCost, cancellationToken);
            await AddOffPoolEntryAsync(product, InventoryCostEventTypeEnum.PURCHASE_RETURN_SHIPPED_FROM_QUARANTINE, nameof(PurchaseReturnClaim), purchaseReturnClaimId, occurredAt, cost, -(cost * quantity), cancellationToken);
        }

        public async Task RecordPurchaseReturnReplacementQuarantinedAsync(Product product, int quantity, ulong? unitCost, int? purchaseItemId, DateTime occurredAt, CancellationToken cancellationToken)
        {
            var cost = await UnitCostOrAverageAsync(product, unitCost, cancellationToken);
            await AddOffPoolEntryAsync(product, InventoryCostEventTypeEnum.PURCHASE_RETURN_REPLACEMENT_QUARANTINED, nameof(PurchaseItem), purchaseItemId, occurredAt, cost, cost * quantity, cancellationToken);
        }

        /// <summary>
        /// A row that changes only the off-pool balance (value held in quarantine): the running pool totals are carried forward
        /// unchanged and QuantityDelta is 0. UnitCost is the per-unit value used, so the quantity is |OffPoolValueDelta| / UnitCost.
        /// </summary>
        private async Task AddOffPoolEntryAsync(Product product, InventoryCostEventTypeEnum eventType, string? referenceType, int? referenceId, DateTime occurredAt, decimal unitCost, decimal offPoolValueDelta, CancellationToken cancellationToken)
        {
            var last = await LatestEntryAsync(product.Id, cancellationToken);

            var entry = new InventoryCostLedgerEntry
            {
                ProductId = product.Id,
                EventType = eventType,
                ReferenceType = referenceType,
                ReferenceId = referenceId,
                OccurredAt = occurredAt,
                QuantityDelta = 0,
                UnitCost = unitCost,
                InventoryValueDelta = 0m,
                RunningQuantity = last?.RunningQuantity ?? 0,
                RunningInventoryValue = last?.RunningInventoryValue ?? 0m,
                RunningAverageCost = last?.RunningAverageCost ?? 0m,
                RevenueDelta = 0m,
                OffPoolValueDelta = offPoolValueDelta,
                CreatedAt = DateTime.Now,
            };

            await _context.InventoryCostLedgerEntries.AddAsync(entry, cancellationToken);
            _latestStagedByProduct[product.Id] = entry;
        }

        public Task RecordSaleShipmentAsync(Product product, int quantity, ulong unitPrice, int discountPercent, int saleItemId, DateTime occurredAt, CancellationToken cancellationToken)
        {
            var netUnitRevenue = NetUnitAmount(unitPrice, discountPercent);
            var revenueDelta = netUnitRevenue * quantity;
            return AddEntryAsync(product, -quantity, 0m, revenueDelta, InventoryCostEventTypeEnum.SALE_SHIPPED, nameof(SaleItem), saleItemId, occurredAt, cancellationToken);
        }

        public Task RecordSaleShippedExcessAsync(Product product, int quantity, int saleItemId, DateTime occurredAt, CancellationToken cancellationToken)
        {
            return AddEntryAsync(product, -quantity, 0m, 0m, InventoryCostEventTypeEnum.SALE_SHIPPED_EXCESS, nameof(SaleItem), saleItemId, occurredAt, cancellationToken);
        }

        public async Task RecordSaleReturnRestockAsync(Product product, int quantity, ulong? unitCost, int? saleItemId, DateTime occurredAt, CancellationToken cancellationToken)
        {
            var cost = await UnitCostOrAverageAsync(product, unitCost, cancellationToken);
            await AddEntryAsync(product, quantity, cost, 0m, InventoryCostEventTypeEnum.SALE_RETURN_RESTOCK, nameof(SaleItem), saleItemId, occurredAt, cancellationToken);
        }

        public Task RecordReplacementShippedToCustomerAsync(Product product, int quantity, int? saleItemId, DateTime occurredAt, CancellationToken cancellationToken)
        {
            return AddEntryAsync(product, -quantity, 0m, 0m, InventoryCostEventTypeEnum.REPLACEMENT_SHIPPED_TO_CUSTOMER, nameof(SaleItem), saleItemId, occurredAt, cancellationToken);
        }

        public async Task RecordPurchaseReturnReplacementReceivedAsync(Product product, int quantity, ulong? unitCost, int? purchaseItemId, DateTime occurredAt, CancellationToken cancellationToken)
        {
            var cost = await UnitCostOrAverageAsync(product, unitCost, cancellationToken);
            await AddEntryAsync(product, quantity, cost, 0m, InventoryCostEventTypeEnum.PURCHASE_RETURN_REPLACEMENT_RECEIVED, nameof(PurchaseItem), purchaseItemId, occurredAt, cancellationToken);
        }

        /// <summary>The caller's unit cost when it has one, otherwise the product's current running average
        /// (staged-or-saved, see LatestEntryAsync). When that average is 0 - no ledger history, or no stock left -
        /// Product.PurchasePrice, the same fallback RecordOpeningBalanceAsync and RecordManualAdjustmentInAsync use
        /// for stock with no cost history. A unit entering at 0 would book its whole next sale as profit.</summary>
        private async Task<decimal> UnitCostOrAverageAsync(Product product, ulong? unitCost, CancellationToken cancellationToken)
        {
            if (unitCost.HasValue)
                return unitCost.Value;

            var last = await LatestEntryAsync(product.Id, cancellationToken);
            var average = last?.RunningAverageCost ?? 0m;
            return average > 0m ? average : product.PurchasePrice;
        }

        public Task RecordPurchaseReturnShippedToSupplierAsync(Product product, int quantity, DateTime occurredAt, CancellationToken cancellationToken)
        {
            return AddEntryAsync(product, -quantity, 0m, 0m, InventoryCostEventTypeEnum.PURCHASE_RETURN_SHIPPED_TO_SUPPLIER, null, null, occurredAt, cancellationToken);
        }

        public Task RecordSaleReturnMoneyAsync(Product product, ReturnEffectDirectionEnum direction, ulong amount, int saleReturnClaimId, DateTime occurredAt, CancellationToken cancellationToken)
        {
            var eventType = direction == ReturnEffectDirectionEnum.MONEY_IN ? InventoryCostEventTypeEnum.SALE_RETURN_MONEY_IN : InventoryCostEventTypeEnum.SALE_RETURN_REFUND;
            return AddMoneyEntryAsync(product, direction, amount, reversal: false, eventType, nameof(SaleReturnClaim), saleReturnClaimId, occurredAt, cancellationToken);
        }

        public Task RecordSaleReturnMoneyReversalAsync(Product product, ReturnEffectDirectionEnum direction, ulong amount, int saleReturnClaimId, DateTime occurredAt, CancellationToken cancellationToken)
        {
            var eventType = direction == ReturnEffectDirectionEnum.MONEY_IN ? InventoryCostEventTypeEnum.SALE_RETURN_MONEY_IN : InventoryCostEventTypeEnum.SALE_RETURN_REFUND;
            return AddMoneyEntryAsync(product, direction, amount, reversal: true, eventType, nameof(SaleReturnClaim), saleReturnClaimId, occurredAt, cancellationToken);
        }

        public Task RecordPurchaseReturnMoneyAsync(Product product, ReturnEffectDirectionEnum direction, ulong amount, int purchaseReturnClaimId, DateTime occurredAt, CancellationToken cancellationToken)
        {
            var eventType = direction == ReturnEffectDirectionEnum.MONEY_IN ? InventoryCostEventTypeEnum.PURCHASE_RETURN_MONEY_IN : InventoryCostEventTypeEnum.PURCHASE_RETURN_MONEY_OUT;
            return AddMoneyEntryAsync(product, direction, amount, reversal: false, eventType, nameof(PurchaseReturnClaim), purchaseReturnClaimId, occurredAt, cancellationToken);
        }

        public Task RecordPurchaseReturnMoneyReversalAsync(Product product, ReturnEffectDirectionEnum direction, ulong amount, int purchaseReturnClaimId, DateTime occurredAt, CancellationToken cancellationToken)
        {
            var eventType = direction == ReturnEffectDirectionEnum.MONEY_IN ? InventoryCostEventTypeEnum.PURCHASE_RETURN_MONEY_IN : InventoryCostEventTypeEnum.PURCHASE_RETURN_MONEY_OUT;
            return AddMoneyEntryAsync(product, direction, amount, reversal: true, eventType, nameof(PurchaseReturnClaim), purchaseReturnClaimId, occurredAt, cancellationToken);
        }

        /// <summary>One rule for every return money effect: MONEY_IN is revenue, MONEY_OUT is negative
        /// revenue. No inventory movement. A reversal is the same row with the sign flipped.</summary>
        private Task AddMoneyEntryAsync(Product product, ReturnEffectDirectionEnum direction, ulong amount, bool reversal, InventoryCostEventTypeEnum eventType, string referenceType, int referenceId, DateTime occurredAt, CancellationToken cancellationToken)
        {
            if (direction is not (ReturnEffectDirectionEnum.MONEY_IN or ReturnEffectDirectionEnum.MONEY_OUT))
                throw new ArgumentOutOfRangeException(nameof(direction), direction, "Only money effects carry revenue.");

            var revenue = direction == ReturnEffectDirectionEnum.MONEY_IN ? (decimal)amount : -(decimal)amount;
            return AddEntryAsync(product, 0, 0m, reversal ? -revenue : revenue, eventType, referenceType, referenceId, occurredAt, cancellationToken);
        }

        /// <summary>UnitPrice * (100-discountPercent)/100 - Discount is a percentage everywhere in
        /// this codebase (see IInvoiceLineCalculationService's doc comment), never a flat amount.</summary>
        private static decimal NetUnitAmount(ulong unitPrice, int discountPercent)
        {
            return unitPrice * (100m - discountPercent) / 100m;
        }

        /// <summary>The one place inventory quantity/value/average is ever updated. Inbound rows
        /// (quantityDelta > 0) add value at the caller-supplied unitCost. Outbound rows
        /// (quantityDelta &lt; 0) always consume at the average that already exists - the caller's
        /// unitCost is ignored, which is what makes this AVCO rather than a naive average: a future
        /// purchase can never change the cost already written on a past sale.</summary>
        private async Task<InventoryCostLedgerEntry> AddEntryAsync(Product product, int quantityDelta, decimal unitCost, decimal revenueDelta, InventoryCostEventTypeEnum eventType, string? referenceType, int? referenceId, DateTime occurredAt, CancellationToken cancellationToken)
        {
            var last = await LatestEntryAsync(product.Id, cancellationToken);

            var priorQuantity = last?.RunningQuantity ?? 0;
            var priorValue = last?.RunningInventoryValue ?? 0m;

            decimal valueDelta;
            if (quantityDelta > 0)
            {
                valueDelta = quantityDelta * unitCost;
            }
            else
            {
                var currentAverage = priorQuantity > 0 ? priorValue / priorQuantity : 0m;
                unitCost = currentAverage;
                valueDelta = quantityDelta * currentAverage;
            }

            var newQuantity = priorQuantity + quantityDelta;
            var newValue = priorValue + valueDelta;

            var entry = new InventoryCostLedgerEntry
            {
                ProductId = product.Id,
                EventType = eventType,
                ReferenceType = referenceType,
                ReferenceId = referenceId,
                OccurredAt = occurredAt,
                QuantityDelta = quantityDelta,
                UnitCost = unitCost,
                InventoryValueDelta = valueDelta,
                RunningQuantity = newQuantity,
                RunningInventoryValue = newValue,
                RunningAverageCost = newQuantity > 0 ? newValue / newQuantity : 0m,
                RevenueDelta = revenueDelta,
                CreatedAt = DateTime.Now,
            };

            await _context.InventoryCostLedgerEntries.AddAsync(entry, cancellationToken);
            _latestStagedByProduct[product.Id] = entry;
            return entry;
        }

        /// <summary>
        /// The row every new entry builds its running totals on. Used to be only the newest *saved*
        /// row, so a second entry for the same product in one request (two goods lines in one round, a
        /// receipt and a return together) started from the same base as the first, and the first
        /// entry's quantity and value silently fell out of every running total after it.
        ///
        /// A row staged earlier in this request wins over the database. It is only trusted while the
        /// context still tracks it: a row whose request failed and was detached must not leak into the
        /// next one. Staged rows are kept in insertion order by this service rather than looked up in
        /// the change tracker, because tracker enumeration order is not guaranteed and Added rows only
        /// carry temporary keys, so neither can say which of two unsaved rows is newer.
        /// </summary>
        private async Task<InventoryCostLedgerEntry?> LatestEntryAsync(int productId, CancellationToken cancellationToken)
        {
            if (_latestStagedByProduct.TryGetValue(productId, out var staged)
                && _context.ChangeTracker.Entries<InventoryCostLedgerEntry>().Any(e => ReferenceEquals(e.Entity, staged)))
            {
                return staged;
            }

            return await _context.InventoryCostLedgerEntries
                .Where(e => e.ProductId == productId)
                .OrderByDescending(e => e.Id)
                .FirstOrDefaultAsync(cancellationToken);
        }
    }
}
