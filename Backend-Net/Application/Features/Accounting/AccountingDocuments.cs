using Application.Common.Contracts.Context;
using Application.Features.Accounting.Dtos;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Accounting
{
    /// <summary>
    /// The one definition of an accounting row per sale/purchase invoice, shared by the journals, their exports, the
    /// dashboard and the aging of the party balance list - so "what a sale owes" is computed in one place.
    ///
    /// Line amounts are correlated subqueries in the projection. (A grouped derived table LEFT JOINed onto the document
    /// projects fine but EF cannot translate a WHERE on its columns, and every journal filters on RemainingAmount.)
    /// </summary>
    public static class AccountingDocuments
    {
        /// <summary>An official sale: not a deleted row, not a proforma, not cancelled.</summary>
        public static IQueryable<Domain.Entities.Sale> WhereIssued(this IQueryable<Domain.Entities.Sale> sales) =>
            sales.Where(x => x.IsActive && x.Status != SalesStatusEnum.PROFORMA && x.Status != SalesStatusEnum.CANCELLED);

        /// <summary>A recorded purchase invoice: not a deleted row, not a proforma, not cancelled.</summary>
        public static IQueryable<Domain.Entities.Purchase> WhereIssued(this IQueryable<Domain.Entities.Purchase> purchases) =>
            purchases.Where(x => x.IsActive && x.Status != PurchaseStatusEnum.PROFORMA && x.Status != PurchaseStatusEnum.CANCELLED);

        /// <summary>
        /// Every non-deleted sale as a journal row (proformas and cancelled ones included - callers filter on Status).
        /// Payable follows SaleListDto.PayableAmount: a live plan's total, otherwise the invoice total.
        /// </summary>
        public static IQueryable<SaleJournalRowDto> SaleRows(IWMSDbContext context) =>
            context.Sales.Where(x => x.IsActive).Select(s => new SaleJournalRowDto
            {
                Id = s.Id,
                InvoiceNumber = s.InvoiceNumber,
                InvoiceDate = s.InvoiceDate,
                PaymentDate = s.PaymentDate,
                DueDate = s.PaymentDate ?? s.InvoiceDate,
                Status = s.Status,
                PaymentType = s.PaymentType,
                CustomerId = s.CustomerId,
                CustomerName = s.Customer.FirstName + " " + s.Customer.LastName,
                SalesUserId = s.SalesUserId,
                SalesUserName = s.SalesUser != null ? s.SalesUser.FirstName + " " + s.SalesUser.LastName : null,
                ItemCount = s.Items.Count(),
                GrossAmount = s.Items.Sum(i => (decimal)i.GrossAmount),
                DiscountAmount = s.Items.Sum(i => (decimal)i.DiscountAmount),
                NetAmount = s.Items.Sum(i => (decimal)i.NetAmount),
                TaxAmount = s.Items.Sum(i => (decimal)i.TaxAmount),
                TotalAmount = (decimal)s.TotalAmount,
                HasInstallmentPlan = s.InstallmentPlan != null && s.InstallmentPlan.IsActive,
                InstallmentChargeAmount = s.InstallmentPlan != null && s.InstallmentPlan.IsActive ? (decimal)s.InstallmentPlan.InstallmentChargeAmount : 0m,
                PayableAmount = s.InstallmentPlan != null && s.InstallmentPlan.IsActive ? (decimal)s.InstallmentPlan.TotalAmount : (decimal)s.TotalAmount,
                RemainingAmount = (s.InstallmentPlan != null && s.InstallmentPlan.IsActive ? (decimal)s.InstallmentPlan.TotalAmount : (decimal)s.TotalAmount)
                    - (decimal)s.PaidAmount,
                PaidAmount = (decimal)s.PaidAmount,
            });

        /// <summary>
        /// Every non-deleted purchase as a journal row. ShortClosedAmount rounds each line's share half up exactly like
        /// InvoiceLineMath.ShareOfTotal (SQL Server's ROUND is half away from zero for these positive values).
        /// </summary>
        public static IQueryable<PurchaseJournalRowDto> PurchaseRows(IWMSDbContext context) =>
            context.Purchases.Where(x => x.IsActive).Select(p => new PurchaseJournalRowDto
            {
                Id = p.Id,
                InvoiceNumber = p.InvoiceNumber,
                InvoiceDate = p.InvoiceDate,
                PaymentDate = p.PaymentDate,
                DueDate = p.PaymentDate ?? p.InvoiceDate,
                Status = p.Status,
                PaymentType = p.PaymentType,
                SupplierId = p.SupplierId,
                SupplierName = p.Supplier.CompanyName,
                PurchasingUserId = p.PurchasingUserId,
                PurchasingUserName = p.PurchasingUser != null ? p.PurchasingUser.FirstName + " " + p.PurchasingUser.LastName : null,
                ItemCount = p.Items.Count(),
                GrossAmount = p.Items.Sum(i => (decimal)i.GrossAmount),
                DiscountAmount = p.Items.Sum(i => (decimal)i.DiscountAmount),
                NetAmount = p.Items.Sum(i => (decimal)i.NetAmount),
                TaxAmount = p.Items.Sum(i => (decimal)i.TaxAmount),
                TotalAmount = (decimal)p.TotalAmount,
                ShortClosedAmount = p.Items.Where(i => i.ShortClosedQuantity > 0 && i.Quantity > 0)
                    .Sum(i => Math.Round((decimal)i.TotalAmount * i.ShortClosedQuantity / i.Quantity, 0)),
                // No clamp at 0 (PurchaseDetailReader has one): each line's share is at most the line, so the sum never
                // exceeds the total.
                PayableAmount = (decimal)p.TotalAmount - p.Items.Where(i => i.ShortClosedQuantity > 0 && i.Quantity > 0)
                    .Sum(i => Math.Round((decimal)i.TotalAmount * i.ShortClosedQuantity / i.Quantity, 0)),
                PaidAmount = (decimal)p.PaidAmount,
                RemainingAmount = (decimal)p.TotalAmount - p.Items.Where(i => i.ShortClosedQuantity > 0 && i.Quantity > 0)
                    .Sum(i => Math.Round((decimal)i.TotalAmount * i.ShortClosedQuantity / i.Quantity, 0)) - (decimal)p.PaidAmount,
            });

        /// <summary>
        /// What is still owed, item by item, with the date it falls due - the input of aging. Customers: each unpaid
        /// installment of a live plan at its own due date, and the remainder of every other issued sale at its DueDate.
        /// Suppliers: the remainder of every issued purchase at its DueDate. Overpaid or settled documents are absent.
        /// Document-based on purpose: the party ledger has no due dates, so its balance and this list can differ by
        /// what is on the account outside any open document (on-account return settlements, unallocated prepayments).
        /// </summary>
        public static async Task<List<OpenItem>> LoadOpenItemsAsync(IWMSDbContext context, CancellationToken cancellationToken)
        {
            var sales = await SaleRows(context)
                .Where(x => x.Status != SalesStatusEnum.PROFORMA && x.Status != SalesStatusEnum.CANCELLED)
                .Where(x => !x.HasInstallmentPlan && x.RemainingAmount > 0)
                .Select(x => new OpenItem(AccountingPartyTypeEnum.CUSTOMER, x.CustomerId, x.RemainingAmount, x.DueDate))
                .ToListAsync(cancellationToken);

            var installments = await context.SaleInstallments
                .Where(x => x.Status == SaleInstallmentStatusEnum.PENDING || x.Status == SaleInstallmentStatusEnum.OVERDUE)
                .Where(x => x.Plan.IsActive && x.Plan.Sale.IsActive
                    && x.Plan.Sale.Status != SalesStatusEnum.PROFORMA && x.Plan.Sale.Status != SalesStatusEnum.CANCELLED)
                .Select(x => new OpenItem(AccountingPartyTypeEnum.CUSTOMER, x.Plan.Sale.CustomerId, (decimal)x.Amount, x.DueDate))
                .ToListAsync(cancellationToken);

            var purchases = await PurchaseRows(context)
                .Where(x => x.Status != PurchaseStatusEnum.PROFORMA && x.Status != PurchaseStatusEnum.CANCELLED)
                .Where(x => x.RemainingAmount > 0)
                .Select(x => new OpenItem(AccountingPartyTypeEnum.SUPPLIER, x.SupplierId, x.RemainingAmount, x.DueDate))
                .ToListAsync(cancellationToken);

            return sales.Concat(installments).Concat(purchases).ToList();
        }

        /// <summary>Whole days past due (0 or less = not due yet). A missing due date counts as not due.</summary>
        public static int DaysPastDue(DateTime? dueDate, DateTime today) =>
            dueDate.HasValue ? (today.Date - dueDate.Value.Date).Days : 0;

        /// <summary>Overdue days for a row with something still owed; null when nothing is owed or it is not yet due.</summary>
        public static int? OverdueDays(decimal remaining, DateTime? dueDate, DateTime today)
        {
            var days = DaysPastDue(dueDate, today);
            return remaining > 0 && days > 0 ? days : null;
        }
    }

    /// <summary>One amount still owed by (customer) or to (supplier) a party, and when it falls due.</summary>
    public record OpenItem(AccountingPartyTypeEnum PartyType, int PartyId, decimal Amount, DateTime? DueDate);
}
