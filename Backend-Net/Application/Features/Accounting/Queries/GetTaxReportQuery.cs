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
    /// Value added tax per period (گزارش مالیات بر ارزش افزوده), bucketed on the Persian calendar by InvoiceDate - quarterly
    /// by default, the VAT filing season. Issued invoices only. The per-invoice detail is the sales/purchase journal over
    /// the same dates (its TaxAmount column).
    /// </summary>
    public class GetTaxReportQuery : IRequest<ResponseDto>
    {
        public ReportPeriodTypeEnum PeriodType { get; set; } = ReportPeriodTypeEnum.Quarterly;

        /// <summary>Both days inclusive. Default: the twelve months up to today.</summary>
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
    }

    public class GetTaxReportQueryValidator : AbstractValidator<GetTaxReportQuery>
    {
        public GetTaxReportQueryValidator()
        {
            RuleFor(x => x.PeriodType).IsInEnum().WithMessage("نوع دوره معتبر نیست.");
            RuleFor(x => x.ToDate).GreaterThanOrEqualTo(x => x.FromDate).When(x => x.FromDate.HasValue && x.ToDate.HasValue)
                .WithMessage("تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد.");
        }
    }

    public class GetTaxReportQueryHandler : IRequestHandler<GetTaxReportQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public GetTaxReportQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        /// <summary>The periods and their totals; shared with the tax-report export so the file matches the screen.</summary>
        public static async Task<(List<TaxReportPeriodDto> Periods, TaxReportPeriodDto Totals)> BuildAsync(IWMSDbContext context, GetTaxReportQuery request, CancellationToken cancellationToken)
        {
            var to = DateRange.EndExclusive(request.ToDate ?? DateTime.Now)!.Value;
            var from = DateRange.Start(request.FromDate) ?? to.AddMonths(-12);

            // Grouped per day in SQL, then bucketed in memory: six Persian-calendar granularities don't map onto one GROUP BY.
            var saleLines = await context.SaleItems
                .Where(x => x.Sale.IsActive && x.Sale.Status != SalesStatusEnum.PROFORMA && x.Sale.Status != SalesStatusEnum.CANCELLED)
                .Where(x => x.Sale.InvoiceDate >= from && x.Sale.InvoiceDate < to)
                .GroupBy(x => new { Day = x.Sale.InvoiceDate!.Value.Date, x.TaxCategory })
                .Select(g => new { g.Key.Day, g.Key.TaxCategory, Net = g.Sum(x => (decimal)x.NetAmount), Tax = g.Sum(x => (decimal)x.TaxAmount) })
                .ToListAsync(cancellationToken);

            var purchaseLines = await context.PurchaseItems
                .Where(x => x.Purchase.IsActive && x.Purchase.Status != PurchaseStatusEnum.PROFORMA && x.Purchase.Status != PurchaseStatusEnum.CANCELLED)
                .Where(x => x.Purchase.InvoiceDate >= from && x.Purchase.InvoiceDate < to)
                .GroupBy(x => new { Day = x.Purchase.InvoiceDate!.Value.Date, x.TaxCategory })
                .Select(g => new { g.Key.Day, g.Key.TaxCategory, Net = g.Sum(x => (decimal)x.NetAmount), Tax = g.Sum(x => (decimal)x.TaxAmount) })
                .ToListAsync(cancellationToken);

            var saleCounts = await context.Sales.WhereIssued()
                .Where(x => x.InvoiceDate >= from && x.InvoiceDate < to)
                .GroupBy(x => x.InvoiceDate!.Value.Date)
                .Select(g => new { Day = g.Key, Count = g.Count() })
                .ToListAsync(cancellationToken);

            var purchaseCounts = await context.Purchases.WhereIssued()
                .Where(x => x.InvoiceDate >= from && x.InvoiceDate < to)
                .GroupBy(x => x.InvoiceDate!.Value.Date)
                .Select(g => new { Day = g.Key, Count = g.Count() })
                .ToListAsync(cancellationToken);

            var buckets = new SortedDictionary<DateTime, TaxReportPeriodDto>();
            TaxReportPeriodDto Bucket(DateTime day)
            {
                var key = PeriodBucketing.GetBucketStart(day, request.PeriodType);
                if (!buckets.TryGetValue(key, out var bucket))
                {
                    bucket = new TaxReportPeriodDto { PeriodStart = key, PeriodEnd = PeriodBucketing.GetNextBucketStart(key, request.PeriodType) };
                    buckets[key] = bucket;
                }
                return bucket;
            }

            foreach (var row in saleLines)
            {
                var bucket = Bucket(row.Day);
                if (row.TaxCategory == TaxCategoryEnum.EXEMPT) bucket.ExemptSalesNet += row.Net;
                else bucket.TaxableSalesNet += row.Net;
                bucket.OutputTax += row.Tax;
            }
            foreach (var row in purchaseLines)
            {
                var bucket = Bucket(row.Day);
                if (row.TaxCategory == TaxCategoryEnum.EXEMPT) bucket.ExemptPurchasesNet += row.Net;
                else bucket.TaxablePurchasesNet += row.Net;
                bucket.InputTax += row.Tax;
            }
            foreach (var row in saleCounts)
                Bucket(row.Day).SaleInvoiceCount += row.Count;
            foreach (var row in purchaseCounts)
                Bucket(row.Day).PurchaseInvoiceCount += row.Count;

            var periods = buckets.Values.ToList();
            foreach (var period in periods)
                period.NetTaxPayable = period.OutputTax - period.InputTax;

            var totals = new TaxReportPeriodDto
            {
                PeriodStart = from,
                PeriodEnd = to,
                SaleInvoiceCount = periods.Sum(x => x.SaleInvoiceCount),
                TaxableSalesNet = periods.Sum(x => x.TaxableSalesNet),
                ExemptSalesNet = periods.Sum(x => x.ExemptSalesNet),
                OutputTax = periods.Sum(x => x.OutputTax),
                PurchaseInvoiceCount = periods.Sum(x => x.PurchaseInvoiceCount),
                TaxablePurchasesNet = periods.Sum(x => x.TaxablePurchasesNet),
                ExemptPurchasesNet = periods.Sum(x => x.ExemptPurchasesNet),
                InputTax = periods.Sum(x => x.InputTax),
            };
            totals.NetTaxPayable = totals.OutputTax - totals.InputTax;

            return (periods, totals);
        }

        public async Task<ResponseDto> Handle(GetTaxReportQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var (periods, totals) = await BuildAsync(_context, request, cancellationToken);

            res.Data = new { Periods = periods, Totals = totals };
            res.Message = "گزارش مالیات با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
