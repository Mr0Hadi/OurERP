using Application.Common.Contracts.Context;
using Application.Common.Contracts.ProductUnit;
using Common.Exceptions;
using Domain.Entities;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;

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
        /// <summary>
        /// How long after <see cref="Sale.ReservationExpiresAt"/> the background sweep waits before releasing the units. Payment
        /// is refused from the deadline itself, so a payment that passed its check a moment before the deadline can never race
        /// the sweep into releasing the units of a sale it has just issued.
        /// </summary>
        public static readonly TimeSpan ExpirySweepGrace = TimeSpan.FromMinutes(1);

        /// <summary>
        /// A customer payment (or an installment down payment) is only taken once the warehouse has confirmed the goods, and only
        /// while their reservation still holds.
        /// </summary>
        public static void EnsureReadyForPayment(Sale sale)
        {
            if (sale.Status != SalesStatusEnum.PROFORMA)
                return;

            if (sale.ProformaStage != SaleProformaStageEnum.WAREHOUSE_CHECKED)
                throw new ValidationCustomException("پیش‌فاکتور هنوز تأیید مشتری و انبار را نگرفته است؛ تا پیش از آن پرداختی پذیرفته نمی‌شود.");
            if (IsReservationExpired(sale, DateTime.Now))
                throw new ValidationCustomException("مهلت رزرو کالای این پیش‌فاکتور تمام شده است؛ انبار باید کالا را دوباره بررسی و رزرو کند.");
        }

        /// <summary>The deadline of a reservation made at <paramref name="reservedAt"/>; null (never expires) when the setting is 0.</summary>
        public static DateTime? ReservationDeadline(DateTime reservedAt, long minutes) =>
            minutes > 0 ? reservedAt.AddMinutes(minutes) : null;

        /// <summary>Whole seconds from <paramref name="now"/> to <paramref name="expiresAt"/>, never below 0; null when there is no deadline.</summary>
        public static int? SecondsLeft(DateTime? expiresAt, DateTime now) =>
            expiresAt.HasValue ? (int)Math.Max(0, Math.Ceiling((expiresAt.Value - now).TotalSeconds)) : null;

        public static bool IsReservationExpired(Sale sale, DateTime now) =>
            sale.ReservationExpiresAt.HasValue && sale.ReservationExpiresAt.Value <= now;

        /// <summary>Proformas whose reservation the sweep releases at <paramref name="now"/> (deadline plus <see cref="ExpirySweepGrace"/>).</summary>
        public static Expression<Func<Sale, bool>> ReservationDueForRelease(DateTime now)
        {
            var cutoff = now - ExpirySweepGrace;
            return x => x.IsActive && x.Status == SalesStatusEnum.PROFORMA && x.ReservationExpiresAt != null && x.ReservationExpiresAt <= cutoff;
        }

        /// <summary>
        /// The reservation ran out: every unit reserved for the sale goes back on the shelf, and a proforma that was ready for
        /// payment goes back to CUSTOMER_APPROVED - the customer's approval of this revision still stands, the warehouse has to
        /// check again. <paramref name="sale"/> must be loaded with its Items.
        /// </summary>
        public static async Task ExpireReservationAsync(IWMSDbContext context, IProductUnitService productUnitService, Sale sale, CancellationToken cancellationToken)
        {
            sale.ReservationExpiresAt = null;
            await ReleaseAsync(context, productUnitService, sale, sale.Items.Select(i => i.Id), cancellationToken);

            var toStage = sale.ProformaStage == SaleProformaStageEnum.WAREHOUSE_CHECKED ? SaleProformaStageEnum.CUSTOMER_APPROVED : sale.ProformaStage;
            await RecordAsync(context, sale, SaleProformaEventEnum.RESERVATION_EXPIRED, toStage, null,
                "مهلت رزرو تمام شد و کالا به موجودی آزاد برگشت؛ برای پرداخت، انبار باید دوباره بررسی کند.", cancellationToken);
            sale.UpdatedAt = DateTime.Now;
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
