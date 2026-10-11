using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Accounting.Dtos;
using Common.Extensions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Accounting.Queries
{
    /// <summary>
    /// The accounting dashboard in one call: the tiles (receivables, payables, sales, purchases, cash, tax, overdue,
    /// installments, inventory value, pending return money) and a chart series. Every figure comes from the same
    /// builders as the table it drills into, so a tile and its table never disagree.
    /// </summary>
    public class GetAccountingDashboardQuery : IRequest<ResponseDto>
    {
        /// <summary>Both days inclusive. Default: the twelve months up to today.</summary>
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }

        /// <summary>Bucket size of Series.</summary>
        public ReportPeriodTypeEnum PeriodType { get; set; } = ReportPeriodTypeEnum.Monthly;
    }

    public class GetAccountingDashboardQueryValidator : AbstractValidator<GetAccountingDashboardQuery>
    {
        public GetAccountingDashboardQueryValidator()
        {
            RuleFor(x => x.PeriodType).IsInEnum().WithMessage("نوع دوره معتبر نیست.");
            RuleFor(x => x.ToDate).GreaterThanOrEqualTo(x => x.FromDate).When(x => x.FromDate.HasValue && x.ToDate.HasValue)
                .WithMessage("تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد.");
        }
    }

    public class GetAccountingDashboardQueryHandler : IRequestHandler<GetAccountingDashboardQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public GetAccountingDashboardQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        public async Task<ResponseDto> Handle(GetAccountingDashboardQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();
            var now = DateTime.Now;
            var today = now.Date;

            var lastDay = (request.ToDate ?? now).Date;
            var to = lastDay.AddDays(1);
            var from = DateRange.Start(request.FromDate) ?? to.AddMonths(-12);

            var dashboard = new AccountingDashboardDto { FromDate = from, ToDate = lastDay, GeneratedAt = now };

            // --- Party balances and aging (as of now) ---
            var balances = await PartyBalances.Rows(_context)
                .Select(x => new { x.PartyType, x.Balance })
                .ToListAsync(cancellationToken);
            var openItems = await AccountingDocuments.LoadOpenItemsAsync(_context, cancellationToken);

            var customers = balances.Where(x => x.PartyType == AccountingPartyTypeEnum.CUSTOMER).ToList();
            var suppliers = balances.Where(x => x.PartyType == AccountingPartyTypeEnum.SUPPLIER).ToList();
            dashboard.Receivables = new PartySideBalanceDto
            {
                Total = customers.Where(x => x.Balance > 0).Sum(x => x.Balance),
                PartyCount = customers.Count(x => x.Balance > 0),
                OppositeTotal = -customers.Where(x => x.Balance < 0).Sum(x => x.Balance),
                OppositePartyCount = customers.Count(x => x.Balance < 0),
                Aging = AgingDto.Of(openItems.Where(x => x.PartyType == AccountingPartyTypeEnum.CUSTOMER), now),
            };
            // A supplier we owe has a negative balance; Payables reads it as a positive amount.
            dashboard.Payables = new PartySideBalanceDto
            {
                Total = -suppliers.Where(x => x.Balance < 0).Sum(x => x.Balance),
                PartyCount = suppliers.Count(x => x.Balance < 0),
                OppositeTotal = suppliers.Where(x => x.Balance > 0).Sum(x => x.Balance),
                OppositePartyCount = suppliers.Count(x => x.Balance > 0),
                Aging = AgingDto.Of(openItems.Where(x => x.PartyType == AccountingPartyTypeEnum.SUPPLIER), now),
            };

            // --- Sales, purchases, tax (period, invoice-based) ---
            var sales = AccountingDocuments.SaleRows(_context)
                .Where(x => x.Status != SalesStatusEnum.PROFORMA && x.Status != SalesStatusEnum.CANCELLED);
            var purchases = AccountingDocuments.PurchaseRows(_context)
                .Where(x => x.Status != PurchaseStatusEnum.PROFORMA && x.Status != PurchaseStatusEnum.CANCELLED);

            var periodSales = sales.Where(x => x.InvoiceDate >= from && x.InvoiceDate < to);
            var periodPurchases = purchases.Where(x => x.InvoiceDate >= from && x.InvoiceDate < to);
            dashboard.Sales = await GetSaleJournalQueryHandler.SummarizeAsync(periodSales, cancellationToken);
            dashboard.Purchases = await GetPurchaseJournalQueryHandler.SummarizeAsync(periodPurchases, cancellationToken);
            dashboard.Tax = new DashboardTaxDto
            {
                OutputTax = dashboard.Sales.TaxAmount,
                InputTax = dashboard.Purchases.TaxAmount,
                NetTaxPayable = dashboard.Sales.TaxAmount - dashboard.Purchases.TaxAmount,
            };

            // --- Cash (period) ---
            var payments = GetPaymentJournalQueryHandler.Filter(_context, new GetPaymentJournalQuery { FromDate = from, ToDate = lastDay });
            dashboard.Cash = await GetPaymentJournalQueryHandler.SummarizeAsync(payments, cancellationToken);

            // --- Overdue invoices (as of now) ---
            var overdueSales = await sales
                .Where(x => !x.HasInstallmentPlan && x.RemainingAmount > 0 && x.DueDate < today)
                .GroupBy(x => 1)
                .Select(g => new DashboardOverdueDto { Count = g.Count(), Amount = g.Sum(x => x.RemainingAmount) })
                .FirstOrDefaultAsync(cancellationToken);
            dashboard.OverdueSales = overdueSales ?? new DashboardOverdueDto();

            var overduePurchases = await purchases
                .Where(x => x.RemainingAmount > 0 && x.DueDate < today)
                .GroupBy(x => 1)
                .Select(g => new DashboardOverdueDto { Count = g.Count(), Amount = g.Sum(x => x.RemainingAmount) })
                .FirstOrDefaultAsync(cancellationToken);
            dashboard.OverduePurchases = overduePurchases ?? new DashboardOverdueDto();

            // --- Installments (as of now) ---
            var unpaid = await _context.SaleInstallments
                .Where(x => x.Status == SaleInstallmentStatusEnum.PENDING || x.Status == SaleInstallmentStatusEnum.OVERDUE)
                .Where(x => x.Plan.IsActive && x.Plan.Sale.IsActive
                    && x.Plan.Sale.Status != SalesStatusEnum.PROFORMA && x.Plan.Sale.Status != SalesStatusEnum.CANCELLED)
                .Select(x => new { x.DueDate, Amount = (decimal)x.Amount })
                .ToListAsync(cancellationToken);
            var horizon = today.AddDays(31);
            dashboard.Installments = new DashboardInstallmentsDto
            {
                ActivePlanCount = await _context.SaleInstallmentPlans.CountAsync(x => x.IsActive && x.Sale.IsActive
                    && x.Sale.Status != SalesStatusEnum.PROFORMA && x.Sale.Status != SalesStatusEnum.CANCELLED, cancellationToken),
                OutstandingCount = unpaid.Count,
                OutstandingAmount = unpaid.Sum(x => x.Amount),
                OverdueCount = unpaid.Count(x => x.DueDate < today),
                OverdueAmount = unpaid.Where(x => x.DueDate < today).Sum(x => x.Amount),
                DueNext30DaysCount = unpaid.Count(x => x.DueDate >= today && x.DueDate < horizon),
                DueNext30DaysAmount = unpaid.Where(x => x.DueDate >= today && x.DueDate < horizon).Sum(x => x.Amount),
            };

            // --- Inventory value (as of now) ---
            dashboard.Inventory = await GetInventoryValuationQueryHandler.SummarizeAsync(
                GetInventoryValuationQueryHandler.Build(_context, new GetInventoryValuationQuery()), cancellationToken) ?? new InventoryValuationSummaryDto();

            // --- Return money decided but not paid yet (as of now) ---
            var saleReturnMoney = await _context.SaleReturnEffects
                .Where(x => x.Status == ReturnEffectStatusEnum.PENDING
                    && (x.Direction == ReturnEffectDirectionEnum.MONEY_IN || x.Direction == ReturnEffectDirectionEnum.MONEY_OUT))
                .Where(x => x.SaleReturnResolution!.SaleReturnClaim!.SaleReturn!.IsActive
                    && (x.SaleReturnResolution.SaleReturnClaim.SaleReturn.Status == ReturnStatusEnum.OPEN
                        || x.SaleReturnResolution.SaleReturnClaim.SaleReturn.Status == ReturnStatusEnum.IN_PROGRESS))
                .GroupBy(x => x.Direction)
                .Select(g => new { Direction = g.Key, Count = g.Count(), Amount = g.Sum(x => (decimal)(x.Amount ?? 0)) })
                .ToListAsync(cancellationToken);
            var purchaseReturnMoney = await _context.PurchaseReturnEffects
                .Where(x => x.Status == ReturnEffectStatusEnum.PENDING
                    && (x.Direction == ReturnEffectDirectionEnum.MONEY_IN || x.Direction == ReturnEffectDirectionEnum.MONEY_OUT))
                .Where(x => x.PurchaseReturnResolution!.PurchaseReturnClaim!.PurchaseReturn!.IsActive
                    && (x.PurchaseReturnResolution.PurchaseReturnClaim.PurchaseReturn.Status == ReturnStatusEnum.OPEN
                        || x.PurchaseReturnResolution.PurchaseReturnClaim.PurchaseReturn.Status == ReturnStatusEnum.IN_PROGRESS))
                .GroupBy(x => x.Direction)
                .Select(g => new { Direction = g.Key, Count = g.Count(), Amount = g.Sum(x => (decimal)(x.Amount ?? 0)) })
                .ToListAsync(cancellationToken);
            dashboard.PendingReturnMoney = new DashboardPendingReturnMoneyDto
            {
                SaleReturnMoneyIn = saleReturnMoney.Where(x => x.Direction == ReturnEffectDirectionEnum.MONEY_IN).Sum(x => x.Amount),
                SaleReturnMoneyOut = saleReturnMoney.Where(x => x.Direction == ReturnEffectDirectionEnum.MONEY_OUT).Sum(x => x.Amount),
                PurchaseReturnMoneyIn = purchaseReturnMoney.Where(x => x.Direction == ReturnEffectDirectionEnum.MONEY_IN).Sum(x => x.Amount),
                PurchaseReturnMoneyOut = purchaseReturnMoney.Where(x => x.Direction == ReturnEffectDirectionEnum.MONEY_OUT).Sum(x => x.Amount),
                EffectCount = saleReturnMoney.Sum(x => x.Count) + purchaseReturnMoney.Sum(x => x.Count),
            };

            // --- Series (period): grouped per day in SQL, bucketed on the Persian calendar in memory ---
            var salesByDay = await periodSales
                .GroupBy(x => x.InvoiceDate!.Value.Date)
                .Select(g => new { Day = g.Key, Count = g.Count(), Total = g.Sum(x => x.TotalAmount), Tax = g.Sum(x => x.TaxAmount) })
                .ToListAsync(cancellationToken);
            var purchasesByDay = await periodPurchases
                .GroupBy(x => x.InvoiceDate!.Value.Date)
                .Select(g => new { Day = g.Key, Count = g.Count(), Total = g.Sum(x => x.TotalAmount), Tax = g.Sum(x => x.TaxAmount) })
                .ToListAsync(cancellationToken);
            var cashByDay = await payments
                .Where(x => x.VoidedAt == null)
                .GroupBy(x => new { Day = x.PaidAt.Date, x.Direction })
                .Select(g => new { g.Key.Day, g.Key.Direction, Amount = g.Sum(x => x.Amount) })
                .ToListAsync(cancellationToken);

            var buckets = new SortedDictionary<DateTime, DashboardPeriodDto>();
            DashboardPeriodDto Bucket(DateTime day)
            {
                var key = PeriodBucketing.GetBucketStart(day, request.PeriodType);
                if (!buckets.TryGetValue(key, out var bucket))
                {
                    bucket = new DashboardPeriodDto { PeriodStart = key, PeriodEnd = PeriodBucketing.GetNextBucketStart(key, request.PeriodType) };
                    buckets[key] = bucket;
                }
                return bucket;
            }

            foreach (var row in salesByDay)
            {
                var bucket = Bucket(row.Day);
                bucket.SaleCount += row.Count;
                bucket.SalesTotal += row.Total;
                bucket.OutputTax += row.Tax;
            }
            foreach (var row in purchasesByDay)
            {
                var bucket = Bucket(row.Day);
                bucket.PurchaseCount += row.Count;
                bucket.PurchasesTotal += row.Total;
                bucket.InputTax += row.Tax;
            }
            foreach (var row in cashByDay)
            {
                var bucket = Bucket(row.Day);
                if (row.Direction == PaymentDirectionEnum.IN) bucket.CashIn += row.Amount;
                else bucket.CashOut += row.Amount;
            }
            dashboard.Series = buckets.Values.ToList();

            res.Data = dashboard;
            res.Message = "داشبورد حسابداری با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
