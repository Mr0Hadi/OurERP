using Application.Common.Contracts.Context;
using Application.Common.Contracts.ProductUnit;
using Common.Exceptions;
using Domain.Entities;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Application.Common.Sales
{
    /// <summary>
    /// The proforma approval pipeline (docs/proforma-approval-pipeline.md), in one place: DRAFT -> CUSTOMER_APPROVED ->
    /// WAREHOUSE_CHECKED, then the first payment issues the invoice. The proforma stays editable at every stage; an edit that
    /// changes what was approved sends it back to DRAFT. Stock is reserved at the warehouse check (units RESERVED, out of
    /// Product.Stock) and released when a line changes or the sale is cancelled/deleted. Nothing here saves.
    /// </summary>
    public static class SaleProformaPipeline
    {
        /// <summary>A customer payment (or an installment down payment) is only taken once the warehouse has confirmed the goods.</summary>
        public static void EnsureReadyForPayment(Sale sale)
        {
            if (sale.Status == SalesStatusEnum.PROFORMA && sale.ProformaStage != SaleProformaStageEnum.WAREHOUSE_CHECKED)
                throw new ValidationCustomException("پیش‌فاکتور هنوز تأیید مشتری و انبار را نگرفته است؛ تا پیش از آن پرداختی پذیرفته نمی‌شود.");
        }

        /// <summary>Approvals name the revision they were given for; a stale screen is refused instead of approving something else.</summary>
        public static void EnsureRevision(Sale sale, int revision)
        {
            if (sale.Revision != revision)
                throw new ValidationCustomException("پیش‌فاکتور پس از باز شدن این صفحه تغییر کرده است؛ صفحه را تازه کنید و دوباره بررسی کنید.");
        }

        /// <summary>
        /// An edit changed what was approved: bump the revision and, past DRAFT, go back to DRAFT with an event saying why.
        /// Reservations are the caller's business (only changed lines lose theirs).
        /// </summary>
        public static async Task ResetByEditAsync(IWMSDbContext context, Sale sale, int? userId, string note, CancellationToken cancellationToken)
        {
            sale.Revision++;
            if (sale.ProformaStage == SaleProformaStageEnum.DRAFT)
                return;

            await RecordAsync(context, sale, SaleProformaEventEnum.RESET_BY_EDIT, SaleProformaStageEnum.DRAFT, userId, note, cancellationToken);
        }

        /// <summary>Moves the stage and writes the history row for it.</summary>
        public static async Task RecordAsync(IWMSDbContext context, Sale sale, SaleProformaEventEnum kind, SaleProformaStageEnum toStage, int? userId, string? note, CancellationToken cancellationToken)
        {
            await context.SaleProformaStageEvents.AddAsync(new SaleProformaStageEvent
            {
                Sale = sale,
                SaleId = sale.Id,
                Kind = kind,
                FromStage = sale.ProformaStage,
                ToStage = toStage,
                Revision = sale.Revision,
                UserId = userId,
                Note = note,
                OccurredAt = DateTime.Now,
            }, cancellationToken);

            sale.ProformaStage = toStage;
        }

        /// <summary>
        /// Puts every unit reserved for these sale lines back on the shelf and raises each product's Stock by what came back.
        /// </summary>
        public static async Task ReleaseAsync(IWMSDbContext context, IProductUnitService productUnitService, Sale sale, IEnumerable<int> saleItemIds, CancellationToken cancellationToken)
        {
            var released = new List<Domain.Entities.ProductUnit>();
            var movement = new UnitMovementContext(ProductUnitMovementReasonEnum.SALE_RESERVATION_RELEASED, DateTime.Now, DocumentKindEnum.SALE, sale.Id, CustomerId: sale.CustomerId);

            foreach (var saleItemId in saleItemIds.Where(id => id > 0).Distinct())
                released.AddRange(await productUnitService.ReleaseReservationAsync(saleItemId, movement, cancellationToken));

            if (released.Count == 0)
                return;

            var counts = released.GroupBy(u => u.ProductId).ToDictionary(g => g.Key, g => g.Count());
            var products = await context.Products.Where(p => counts.Keys.Contains(p.Id)).ToListAsync(cancellationToken);
            foreach (var product in products)
                product.Stock += counts[product.Id];
        }

        /// <summary>
        /// A proforma is written against the stock we have: for each product, what its lines still need on top of the units
        /// already reserved for them must fit in the free stock (Product.Stock). <paramref name="needed"/> is per product.
        /// </summary>
        public static void EnsureFreeStock(IReadOnlyDictionary<int, Product> products, IReadOnlyDictionary<int, int> needed)
        {
            foreach (var (productId, quantity) in needed)
            {
                if (quantity <= 0)
                    continue;

                var product = products[productId];
                if (quantity > product.Stock)
                    throw new ValidationCustomException($"موجودی آزاد «{product.Name}» {product.Stock} عدد است و برای {quantity} عدد کافی نیست.");
            }
        }
    }
}
