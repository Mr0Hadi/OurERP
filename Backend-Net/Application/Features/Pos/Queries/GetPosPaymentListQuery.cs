using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Queries;
using Application.Features.Pos.Dtos;
using Common.Extensions;
using Domain.Enums;
using MediatR;

namespace Application.Features.Pos.Queries
{
    public enum PosPaymentListSortEnum
    {
        PAID_AT = 0,
        RECORDED_AT = 1,
        AMOUNT = 2,
    }

    /// <summary>
    /// Every card-reader payment row, for the manager (frontend-requests 12.3): who recorded what, on which device,
    /// typed in from a receipt or from the device. Voided rows are included and flagged - a voided card payment is a
    /// refund, which is exactly what a manager reviewing manual entries wants to see.
    /// </summary>
    public class GetPosPaymentListQuery : IRequest<ResponseDto>
    {
        public int Page { get; set; } = 1;
        public int Take { get; set; } = 10;
        public int? PosTerminalId { get; set; }
        public PaymentSourceEnum? Source { get; set; }
        public int? RecordedByUserId { get; set; }

        /// <summary>On PaidAt, inclusive.</summary>
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }

        /// <summary>RRN or invoice number, contains.</summary>
        public string? Search { get; set; }

        public PosPaymentListSortEnum? SortBy { get; set; }
        public SortDirectionEnum? SortDirection { get; set; }
    }

    public class GetPosPaymentListQueryHandler : IRequestHandler<GetPosPaymentListQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public GetPosPaymentListQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        public async Task<ResponseDto> Handle(GetPosPaymentListQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var query = _context.PaymentDetails.Where(x => x.PosTerminalId != null);

            if (request.PosTerminalId.HasValue)
                query = query.Where(x => x.PosTerminalId == request.PosTerminalId);

            if (request.Source.HasValue)
                query = query.Where(x => x.Source == request.Source);

            if (request.RecordedByUserId.HasValue)
                query = query.Where(x => x.RecordedByUserId == request.RecordedByUserId);

            if (request.FromDate.HasValue)
                query = query.Where(x => x.PaidAt >= request.FromDate.Value.Date);

            if (request.ToDate.HasValue)
                query = query.Where(x => x.PaidAt < request.ToDate.Value.Date.AddDays(1));

            if (!string.IsNullOrWhiteSpace(request.Search))
            {
                var search = request.Search.Trim();
                query = query.Where(x => x.TransferRef!.Contains(search)
                    || (x.Sale != null && x.Sale.InvoiceNumber.Contains(search))
                    || (x.Purchase != null && x.Purchase.InvoiceNumber.Contains(search)));
            }

            // Default: newest payment first.
            var direction = SortingExtensions.ResolveDirection(request.SortBy.HasValue, request.SortDirection, SortDirectionEnum.DESC);
            var sorted = request.SortBy switch
            {
                PosPaymentListSortEnum.RECORDED_AT => query.SortBy(x => x.RecordedAt, direction),
                PosPaymentListSortEnum.AMOUNT => query.SortBy(x => x.Amount, direction),
                _ => query.SortBy(x => x.PaidAt, direction),
            };

            var paged = await sorted.ThenSortBy(x => x.Id, direction).Select(x => new PosPaymentListDto
            {
                Id = x.Id,
                PaidAt = x.PaidAt,
                RecordedAt = x.RecordedAt,
                Amount = x.Amount,
                Direction = x.Direction,
                VoidedAt = x.VoidedAt,
                Source = x.Source,
                PosTerminalId = x.PosTerminalId!.Value,
                PosTerminalName = x.PosTerminal!.Name,
                TransferRef = x.TransferRef,
                MaskedCardNumber = x.MaskedCardNumber,
                ApprovalCode = x.ApprovalCode,
                TraceNumber = x.TraceNumber,
                SaleId = x.SaleId,
                PurchaseId = x.PurchaseId,
                InvoiceNumber = x.Sale != null ? x.Sale.InvoiceNumber : x.Purchase != null ? x.Purchase.InvoiceNumber : null,
                PartyName = x.Sale != null ? x.Sale.Customer.FirstName + " " + x.Sale.Customer.LastName
                    : x.Purchase != null ? x.Purchase.Supplier.CompanyName : null,
                RecordedByUserId = x.RecordedByUserId,
                RecordedByName = x.RecordedByUser != null ? x.RecordedByUser.FirstName + " " + x.RecordedByUser.LastName : null,
            }).ToPagedAsync(request.Page, request.Take, cancellationToken);

            res.Data = new
            {
                PosPaymentList = paged.Items,
                Page = new ResponsePageDto
                {
                    Page = request.Page,
                    PageCount = paged.PageCount,
                    Take = request.Take,
                    Total = paged.TotalCount
                }
            };
            res.Message = "فهرست پرداخت‌های کارتخوان با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
