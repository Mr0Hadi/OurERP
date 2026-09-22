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
    /// One period bucket per row: purchase-count/invoice totals bucketed by Purchase.InvoiceDate,
    /// and TotalReceivedValue bucketed by when goods actually entered inventory (the ledger's
    /// PURCHASE_RECEIVED rows). ReturnMoneyAmount is purchase-return money, bucketed by when it was
    /// recorded. No profit concept here - net profit is sales-side only.
    /// </summary>
    public class GetPurchaseReportQuery : IRequest<ResponseDto>
    {
        public ReportPeriodTypeEnum PeriodType { get; set; } = ReportPeriodTypeEnum.Monthly;
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
    }

    public class GetPurchaseReportQueryHandler : IRequestHandler<GetPurchaseReportQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public GetPurchaseReportQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        public async Task<ResponseDto> Handle(GetPurchaseReportQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var toDate = request.ToDate ?? DateTime.Now;
            var fromDate = request.FromDate ?? toDate.AddMonths(-12);

            var purchases = await _context.Purchases
                .Where(x => x.InvoiceDate != null && x.InvoiceDate >= fromDate && x.InvoiceDate <= toDate)
                .Select(x => new { x.InvoiceDate, x.TotalAmount })
                .ToListAsync(cancellationToken);

            // Goods received = what entered the sellable pool plus paid-for goods that went straight to quarantine (defective on
            // the line): both were bought. Excess and unlisted goods were not paid for and write no row - until they are bought
            // through AcceptPurchaseExcess, which adds them to the order at the line's net price (pool in, off-pool out, so the
            // sum below is exactly what the supplier is owed for them).
            var ledgerRows = await _context.InventoryCostLedgerEntries
                .Where(x => (x.EventType == InventoryCostEventTypeEnum.PURCHASE_RECEIVED || x.EventType == InventoryCostEventTypeEnum.PURCHASE_RECEIVED_QUARANTINED || x.EventType == InventoryCostEventTypeEnum.PURCHASE_EXCESS_ACCEPTED) && x.OccurredAt >= fromDate && x.OccurredAt <= toDate)
                .Select(x => new { x.OccurredAt, InventoryValueDelta = x.InventoryValueDelta + x.OffPoolValueDelta })
                .ToListAsync(cancellationToken);

            // Purchase-return money is purchase spend, not revenue: the row stores RevenueDelta +amount for a
            // supplier refund, which lowers what we spent, so the sign is flipped here.
            var returnMoneyRows = await _context.InventoryCostLedgerEntries
                .Where(x => (x.EventType == InventoryCostEventTypeEnum.PURCHASE_RETURN_MONEY_IN || x.EventType == InventoryCostEventTypeEnum.PURCHASE_RETURN_MONEY_OUT) && x.OccurredAt >= fromDate && x.OccurredAt <= toDate)
                .Select(x => new { x.OccurredAt, x.RevenueDelta })
                .ToListAsync(cancellationToken);

            var buckets = new SortedDictionary<DateTime, PurchaseReportPeriodDto>();

            DateTime BucketKeyFor(DateTime date) => PeriodBucketing.GetBucketStart(date, request.PeriodType);

            PurchaseReportPeriodDto GetBucket(DateTime key)
            {
                if (!buckets.TryGetValue(key, out var bucket))
                {
                    bucket = new PurchaseReportPeriodDto
                    {
                        PeriodStart = key,
                        PeriodEnd = PeriodBucketing.GetNextBucketStart(key, request.PeriodType),
                    };
                    buckets[key] = bucket;
                }
                return bucket;
            }

            foreach (var purchase in purchases)
            {
                var bucket = GetBucket(BucketKeyFor(purchase.InvoiceDate!.Value));
                bucket.PurchasesCount++;
                bucket.TotalInvoiceAmount += purchase.TotalAmount;
            }

            foreach (var row in ledgerRows)
            {
                var bucket = GetBucket(BucketKeyFor(row.OccurredAt));
                bucket.TotalReceivedValue += row.InventoryValueDelta;
            }

            foreach (var row in returnMoneyRows)
            {
                var bucket = GetBucket(BucketKeyFor(row.OccurredAt));
                bucket.ReturnMoneyAmount += -row.RevenueDelta;
            }

            res.Data = new { Periods = buckets.Values.ToList() };
            res.Message = "گزارش خرید با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
