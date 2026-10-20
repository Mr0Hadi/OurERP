using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Queries;
using Application.Features.Accounting;
using Common.Extensions;
using Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Warehousing.Queries
{
    public enum StockTransferListSortEnum
    {
        DISPATCHED_AT = 0,
        TRANSFER_NUMBER = 1,
        STATUS = 2,
    }

    /// <summary>
    /// Stock transfers, newest first. Readable whatever the multi-warehouse switch says: transfers made while it was on stay
    /// visible (and an in-transit one can still be received or cancelled) after it is turned off - CLAUDE.md 6b.
    /// </summary>
    public class GetStockTransferListQuery : IRequest<ResponseDto>
    {
        public int Page { get; set; } = 1;
        public int Take { get; set; } = 10;
        public List<StockTransferStatusEnum>? Statuses { get; set; }
        public int? FromWarehouseId { get; set; }
        public int? ToWarehouseId { get; set; }

        /// <summary>On DispatchedAt, both days inclusive.</summary>
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }

        /// <summary>Transfer number or description, contains.</summary>
        public string? Search { get; set; }
        public StockTransferListSortEnum? SortBy { get; set; }
        public SortDirectionEnum? SortDirection { get; set; }
    }

    public class GetStockTransferListQueryHandler : IRequestHandler<GetStockTransferListQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public GetStockTransferListQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        public async Task<ResponseDto> Handle(GetStockTransferListQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var query = _context.StockTransfers.AsNoTracking();
            if (request.Statuses is { Count: > 0 })
                query = query.Where(x => request.Statuses.Contains(x.Status));
            if (request.FromWarehouseId.HasValue)
                query = query.Where(x => x.FromWarehouseId == request.FromWarehouseId);
            if (request.ToWarehouseId.HasValue)
                query = query.Where(x => x.ToWarehouseId == request.ToWarehouseId);
            var from = DateRange.Start(request.FromDate);
            var to = DateRange.EndExclusive(request.ToDate);
            if (from.HasValue)
                query = query.Where(x => x.DispatchedAt >= from);
            if (to.HasValue)
                query = query.Where(x => x.DispatchedAt < to);
            if (!string.IsNullOrWhiteSpace(request.Search))
            {
                var search = request.Search.Trim();
                query = query.Where(x => x.TransferNumber.Contains(search) || x.Description!.Contains(search));
            }

            var direction = SortingExtensions.ResolveDirection(request.SortBy.HasValue, request.SortDirection, SortDirectionEnum.DESC);
            var sorted = request.SortBy switch
            {
                StockTransferListSortEnum.TRANSFER_NUMBER => query.SortBy(x => x.TransferNumber, direction),
                StockTransferListSortEnum.STATUS => query.SortBy(x => x.Status, direction),
                _ => query.SortBy(x => x.DispatchedAt, direction),
            };

            var paged = await sorted.ThenSortBy(x => x.Id, direction).Select(StockTransferReader.Projection).ToPagedAsync(request.Page, request.Take, cancellationToken);
            foreach (var item in paged.Items)
                item.StatusTitle = item.Status.GetDescription();

            res.Data = new
            {
                StockTransferList = paged.Items,
                Page = new ResponsePageDto { Page = request.Page, PageCount = paged.PageCount, Take = request.Take, Total = paged.TotalCount },
            };
            res.Message = "فهرست حواله‌های بین انبار ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
