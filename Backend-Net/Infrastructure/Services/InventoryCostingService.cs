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

        public Task RecordSaleShipmentAsync(Product product, int quantity, ulong unitPrice, int discountPercent, int saleItemId, DateTime occurredAt, CancellationToken cancellationToken)
        {
            var netUnitRevenue = NetUnitAmount(unitPrice, discountPercent);
            var revenueDelta = netUnitRevenue * quantity;
            return AddEntryAsync(product, -quantity, 0m, revenueDelta, InventoryCostEventTypeEnum.SALE_SHIPPED, nameof(SaleItem), saleItemId, occurredAt, cancellationToken);
        }

        public async Task RecordSaleReturnRestockAsync(Product product, int quantity, int? saleItemId, DateTime occurredAt, CancellationToken cancellationToken)
        {
            var historicalUnitCost = await GetHistoricalUnitCostAsync(
                product.Id,
                nameof(SaleItem),
                saleItemId,
                new[] { InventoryCostEventTypeEnum.SALE_SHIPPED, InventoryCostEventTypeEnum.REPLACEMENT_SHIPPED_TO_CUSTOMER },
                cancellationToken);

            await AddEntryAsync(product, quantity, historicalUnitCost, 0m, InventoryCostEventTypeEnum.SALE_RETURN_RESTOCK, nameof(SaleItem), saleItemId, occurredAt, cancellationToken);
        }

        public Task RecordReplacementShippedToCustomerAsync(Product product, int quantity, int? saleItemId, DateTime occurredAt, CancellationToken cancellationToken)
        {
            return AddEntryAsync(product, -quantity, 0m, 0m, InventoryCostEventTypeEnum.REPLACEMENT_SHIPPED_TO_CUSTOMER, nameof(SaleItem), saleItemId, occurredAt, cancellationToken);
        }

        public Task RecordSaleReturnRefundAsync(Product product, ulong amount, int? saleReturnClaimId, DateTime occurredAt, CancellationToken cancellationToken)
        {
            return AddEntryAsync(product, 0, 0m, -(decimal)amount, InventoryCostEventTypeEnum.SALE_RETURN_REFUND, nameof(SaleReturnClaim), saleReturnClaimId, occurredAt, cancellationToken);
        }

        public async Task RecordPurchaseReturnReplacementReceivedAsync(Product product, int quantity, int? purchaseItemId, DateTime occurredAt, CancellationToken cancellationToken)
        {
            var historicalUnitCost = await GetHistoricalUnitCostAsync(
                product.Id,
                nameof(PurchaseItem),
                purchaseItemId,
                new[] { InventoryCostEventTypeEnum.PURCHASE_RECEIVED },
                cancellationToken);

            await AddEntryAsync(product, quantity, historicalUnitCost, 0m, InventoryCostEventTypeEnum.PURCHASE_RETURN_REPLACEMENT_RECEIVED, nameof(PurchaseItem), purchaseItemId, occurredAt, cancellationToken);
        }

        public Task RecordPurchaseReturnShippedToSupplierAsync(Product product, int quantity, DateTime occurredAt, CancellationToken cancellationToken)
        {
            return AddEntryAsync(product, -quantity, 0m, 0m, InventoryCostEventTypeEnum.PURCHASE_RETURN_SHIPPED_TO_SUPPLIER, null, null, occurredAt, cancellationToken);
        }

        /// <summary>UnitPrice * (100-discountPercent)/100 - Discount is a percentage everywhere in
        /// this codebase (see IInvoiceLineCalculationService's doc comment), never a flat amount.</summary>
        private static decimal NetUnitAmount(ulong unitPrice, int discountPercent)
        {
            return unitPrice * (100m - discountPercent) / 100m;
        }

        /// <summary>Quantity-weighted average UnitCost of this product's own past ledger rows for
        /// the given reference (e.g. "what did we actually pay/charge for this specific SaleItem's
        /// shipments"). Falls back to the product's current running average when there is nothing to
        /// find - no linked reference (an OFF_ORDER claim) or no matching rows - which is the best
        /// available signal rather than inventing one.</summary>
        private async Task<decimal> GetHistoricalUnitCostAsync(int productId, string referenceType, int? referenceId, InventoryCostEventTypeEnum[] eventTypes, CancellationToken cancellationToken)
        {
            if (referenceId.HasValue)
            {
                var matches = await _context.InventoryCostLedgerEntries
                    .Where(e => e.ReferenceType == referenceType && e.ReferenceId == referenceId.Value && eventTypes.Contains(e.EventType))
                    .Select(e => new { Quantity = Math.Abs(e.QuantityDelta), e.UnitCost })
                    .ToListAsync(cancellationToken);

                var totalQuantity = matches.Sum(m => m.Quantity);
                if (totalQuantity > 0)
                    return matches.Sum(m => m.Quantity * m.UnitCost) / totalQuantity;
            }

            var last = await _context.InventoryCostLedgerEntries
                .Where(e => e.ProductId == productId)
                .OrderByDescending(e => e.Id)
                .FirstOrDefaultAsync(cancellationToken);

            return last?.RunningAverageCost ?? 0m;
        }

        /// <summary>The one place inventory quantity/value/average is ever updated. Inbound rows
        /// (quantityDelta > 0) add value at the caller-supplied unitCost. Outbound rows
        /// (quantityDelta &lt; 0) always consume at the average that already exists - the caller's
        /// unitCost is ignored, which is what makes this AVCO rather than a naive average: a future
        /// purchase can never change the cost already written on a past sale.</summary>
        private async Task AddEntryAsync(Product product, int quantityDelta, decimal unitCost, decimal revenueDelta, InventoryCostEventTypeEnum eventType, string? referenceType, int? referenceId, DateTime occurredAt, CancellationToken cancellationToken)
        {
            var last = await _context.InventoryCostLedgerEntries
                .Where(e => e.ProductId == product.Id)
                .OrderByDescending(e => e.Id)
                .FirstOrDefaultAsync(cancellationToken);

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
        }
    }
}
