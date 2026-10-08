using Application.Common.Contracts.Context;
using Application.Common.Contracts.ProductCode;
using Application.Common.Contracts.ProductUnit;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Queries;
using Application.Features.Product.Mappings;
using Common.Extensions;
using Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Product.Queries
{
    public enum ProductUnitListSortEnum
    {
        SERIAL_NUMBER = 0,
        PRODUCT_NAME = 1,
        STATUS = 2,
        SOLD_AT = 3,
        CREATED_AT = 4,
        LAST_PRINTED_AT = 5,
        QUARANTINED_AT = 6,
        ID = 7,
    }

    /// <summary>Label filter: UNPRINTED = IN_STOCK or QUARANTINED with no label printed yet (the print queue); PRINTED = printed at least once.</summary>
    public enum ProductUnitLabelStateEnum
    {
        UNPRINTED = 1,
        PRINTED = 2,
    }

    public class GetProductUnitListQuery : IRequest<ResponseDto>
    {
        public int Page { get; set; } = 1;
        public int Take { get; set; } = 20;
        public string? ProductName { get; set; }
        public int? ProductId { get; set; }
        public ProductUnitStatusEnum? Status { get; set; }

        /// <summary>Any of these statuses (?statuses=1&amp;statuses=9); ANDed with Status like every other filter.</summary>
        public List<ProductUnitStatusEnum>? Statuses { get; set; }

        /// <summary>A scanned barcode in any shape the scanner gives, a serial, or part of the product's name or code.</summary>
        public string? Search { get; set; }
        public UnitCustodyReasonEnum? CustodyReason { get; set; }
        public ProductUnitLabelStateEnum? LabelState { get; set; }

        /// <summary>The supplier of the purchase the unit arrived on.</summary>
        public int? SupplierId { get; set; }

        /// <summary>The customer of the sale the unit last left on.</summary>
        public int? CustomerId { get; set; }
        public int? PurchaseId { get; set; }
        public int? SaleId { get; set; }

        /// <summary>Shelf code prefix ("A-03" finds every shelf of aisle A, bay 03); normalised like the stored value.</summary>
        public string? BinLocation { get; set; }

        /// <summary>On CreatedAt - when the unit entered the warehouse.</summary>
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public int? FromSerial { get; set; }
        public int? ToSerial { get; set; }
        public ProductUnitListSortEnum? SortBy { get; set; }
        public SortDirectionEnum? SortDirection { get; set; }
    }

    public class GetProductUnitListQueryHandler : IRequestHandler<GetProductUnitListQuery, ResponseDto>
    {
        /// <summary>The frontend reads "select every result" in pages of this size.</summary>
        public const int MaxTake = 200;

        private readonly IWMSDbContext _context;
        private readonly IProductCodeService _productCodeService;

        public GetProductUnitListQueryHandler(IWMSDbContext context, IProductCodeService productCodeService)
        {
            _context = context;
            _productCodeService = productCodeService;
        }

        public async Task<ResponseDto> Handle(GetProductUnitListQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();
            var query = _context.ProductUnits.AsQueryable().AsNoTracking();

            if (request.ProductId.HasValue)
                query = query.Where(x => x.ProductId == request.ProductId);

            if (request.Status.HasValue)
                query = query.Where(x => x.Status == request.Status);

            if (request.FromSerial.HasValue)
                query = query.Where(x => x.SerialNumber >= request.FromSerial);

            if (request.ToSerial.HasValue)
                query = query.Where(x => x.SerialNumber <= request.ToSerial);

            if (!string.IsNullOrEmpty(request.ProductName))
                query = query.Where(x => x.Product.Name.Contains(request.ProductName));

            if (request.Statuses is { Count: > 0 })
            {
                var statuses = request.Statuses;
                query = query.Where(x => statuses.Contains(x.Status));
            }

            if (!string.IsNullOrWhiteSpace(request.Search))
            {
                var search = request.Search.Trim();
                var payload = _productCodeService.ToPayload(search);

                // A whole barcode (typed or scanned) means that unit and nothing else. Since barcodes have dashes and no zero
                // padding, "...-1" is also a substring of "...-10" and "...-11", so a Contains search alone would list them too.
                var exact = query.Where(x => x.Barcode == search || (payload != string.Empty && x.BarcodePayload == payload));

                if (await exact.AnyAsync(cancellationToken))
                {
                    query = exact;
                }
                else
                {
                    // Anything else is a partial search: part of a barcode, a serial, or the product's name/code.
                    int? serial = int.TryParse(search, out var n) ? n : null;
                    query = query.Where(x => x.Barcode.Contains(search)
                        || (serial != null && x.SerialNumber == serial)
                        || x.Product.Name.Contains(search)
                        || x.Product.Code.Contains(search));
                }
            }

            if (request.CustodyReason.HasValue)
                query = query.Where(x => x.CustodyReason == request.CustodyReason);

            if (request.LabelState == ProductUnitLabelStateEnum.UNPRINTED)
                query = query.Where(x => (x.Status == ProductUnitStatusEnum.IN_STOCK || x.Status == ProductUnitStatusEnum.QUARANTINED) && x.PrintCount == 0);
            else if (request.LabelState == ProductUnitLabelStateEnum.PRINTED)
                query = query.Where(x => x.PrintCount > 0);

            if (request.PurchaseId.HasValue)
                query = query.Where(x => x.PurchaseId == request.PurchaseId);

            if (request.SupplierId.HasValue)
                query = query.Where(x => _context.Purchases.Any(p => p.Id == x.PurchaseId && p.SupplierId == request.SupplierId));

            if (request.SaleId.HasValue)
                query = query.Where(x => _context.Sales.Any(s => s.Id == request.SaleId && s.Items.Any(i => i.Id == x.SaleItemId)));

            if (request.CustomerId.HasValue)
                query = query.Where(x => _context.Sales.Any(s => s.CustomerId == request.CustomerId && s.Items.Any(i => i.Id == x.SaleItemId)));

            var binPrefix = BinLocations.Normalize(request.BinLocation);
            if (binPrefix != null)
                query = query.Where(x => x.BinLocation != null && x.BinLocation.StartsWith(binPrefix));

            if (request.FromDate.HasValue)
                query = query.Where(x => x.CreatedAt >= request.FromDate);

            if (request.ToDate.HasValue)
                query = query.Where(x => x.CreatedAt <= request.ToDate);

            // Default: grouped by product, then by serial.
            var direction = SortingExtensions.ResolveDirection(request.SortBy.HasValue, request.SortDirection, SortDirectionEnum.ASC);
            var sorted = request.SortBy switch
            {
                ProductUnitListSortEnum.ID => query.SortBy(x => x.Id, direction),
                ProductUnitListSortEnum.SERIAL_NUMBER => query.SortBy(x => x.SerialNumber, direction),
                ProductUnitListSortEnum.PRODUCT_NAME => query.SortBy(x => x.Product.Name, direction).ThenSortBy(x => x.SerialNumber, direction),
                ProductUnitListSortEnum.STATUS => query.SortBy(x => x.Status, direction),
                ProductUnitListSortEnum.SOLD_AT => query.SortBy(x => x.SoldAt, direction),
                ProductUnitListSortEnum.CREATED_AT => query.SortBy(x => x.CreatedAt, direction),
                ProductUnitListSortEnum.LAST_PRINTED_AT => query.SortBy(x => x.LastPrintedAt, direction),
                ProductUnitListSortEnum.QUARANTINED_AT => query.SortBy(x => x.QuarantinedAt, direction),
                _ => query.SortBy(x => x.ProductId, direction).ThenSortBy(x => x.SerialNumber, direction),
            };

            var paged = await sorted
                .ThenSortBy(x => x.Id, direction)
                .SelectDto(_context)
                .ToPagedAsync(request.Page, Math.Min(request.Take, MaxTake), cancellationToken);

            res.Data = new
            {
                ProductUnitList = paged.Items,
                Page = new ResponsePageDto
                {
                    Page = request.Page,
                    PageCount = paged.PageCount,
                    Take = Math.Min(request.Take, MaxTake),
                    Total = paged.TotalCount
                }
            };
            res.Message = "لیست دانه‌های محصول با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
