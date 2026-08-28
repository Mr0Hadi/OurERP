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
    /// PURCHASE_RECEIVED rows). No profit concept here - net profit is sales-side only.
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
                .Where(x => x.InvoiceDate >= fromDate && x.InvoiceDate <= toDate)
                .Select(x => new { x.InvoiceDate, x.TotalAmount })
                .ToListAsync(cancellationToken);

            var ledgerRows = await _context.InventoryCostLedgerEntries
                .Where(x => x.EventType == InventoryCostEventTypeEnum.PURCHASE_RECEIVED && x.OccurredAt >= fromDate && x.OccurredAt <= toDate)
                .Select(x => new { x.OccurredAt, x.InventoryValueDelta })
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
                var bucket = GetBucket(BucketKeyFor(purchase.InvoiceDate));
                bucket.PurchasesCount++;
                bucket.TotalInvoiceAmount += purchase.TotalAmount;
            }

            foreach (var row in ledgerRows)
            {
                var bucket = GetBucket(BucketKeyFor(row.OccurredAt));
                bucket.TotalReceivedValue += row.InventoryValueDelta;
            }

            res.Data = new { Periods = buckets.Values.ToList() };
            res.Message = "گزارش خرید با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
