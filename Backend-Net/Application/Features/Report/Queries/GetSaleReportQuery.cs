using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Report.Dtos;
using Common.Extensions;
using Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Report.Queries
{
    /// <summary>
    /// One period bucket per row: sales-count/invoice totals bucketed by Sale.InvoiceDate, and
    /// Revenue/COGS/NetProfit bucketed by when the inventory cost ledger actually recognized them
    /// (shipment time) - these two won't reconcile line-for-line if invoicing and shipping happen
    /// in different periods, which mirrors reality (revenue recognition vs. fulfillment). Six
    /// calendar granularities aren't cleanly translatable to one SQL GROUP BY, so both sources are
    /// pulled with a small materialized query and bucketed in-memory with PeriodBucketing.
    /// </summary>
    public class GetSaleReportQuery : IRequest<ResponseDto>
    {
        public ReportPeriodTypeEnum PeriodType { get; set; } = ReportPeriodTypeEnum.Monthly;
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
    }

    public class GetSaleReportQueryHandler : IRequestHandler<GetSaleReportQuery, ResponseDto>
    {
        private static readonly InventoryCostEventTypeEnum[] ProfitAffectingEventTypes =
        {
            InventoryCostEventTypeEnum.SALE_SHIPPED,
            InventoryCostEventTypeEnum.REPLACEMENT_SHIPPED_TO_CUSTOMER,
            InventoryCostEventTypeEnum.SALE_RETURN_REFUND,
        };

        private readonly IWMSDbContext _context;

        public GetSaleReportQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        public async Task<ResponseDto> Handle(GetSaleReportQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var toDate = request.ToDate ?? DateTime.Now;
            var fromDate = request.FromDate ?? toDate.AddMonths(-12);

            var sales = await _context.Sales
                .Where(x => x.InvoiceDate != null && x.InvoiceDate >= fromDate && x.InvoiceDate <= toDate)
                .Select(x => new { x.InvoiceDate, x.TotalAmount })
                .ToListAsync(cancellationToken);

            var ledgerRows = await _context.InventoryCostLedgerEntries
                .Where(x => ProfitAffectingEventTypes.Contains(x.EventType) && x.OccurredAt >= fromDate && x.OccurredAt <= toDate)
                .Select(x => new { x.OccurredAt, x.RevenueDelta, x.InventoryValueDelta })
                .ToListAsync(cancellationToken);

            var buckets = new SortedDictionary<DateTime, SaleReportPeriodDto>();

            DateTime BucketKeyFor(DateTime date) => PeriodBucketing.GetBucketStart(date, request.PeriodType);

            SaleReportPeriodDto GetBucket(DateTime key)
            {
                if (!buckets.TryGetValue(key, out var bucket))
                {
                    bucket = new SaleReportPeriodDto
                    {
                        PeriodStart = key,
                        PeriodEnd = PeriodBucketing.GetNextBucketStart(key, request.PeriodType),
                    };
                    buckets[key] = bucket;
                }
                return bucket;
            }

            foreach (var sale in sales)
            {
                var bucket = GetBucket(BucketKeyFor(sale.InvoiceDate!.Value));
                bucket.SalesCount++;
                bucket.TotalInvoiceAmount += sale.TotalAmount;
            }

            foreach (var row in ledgerRows)
            {
                var bucket = GetBucket(BucketKeyFor(row.OccurredAt));
                bucket.Revenue += row.RevenueDelta;
                bucket.CostOfGoodsSold += -row.InventoryValueDelta;
                bucket.NetProfit += row.RevenueDelta + row.InventoryValueDelta;
            }

            res.Data = new { Periods = buckets.Values.ToList() };
            res.Message = "گزارش فروش با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
