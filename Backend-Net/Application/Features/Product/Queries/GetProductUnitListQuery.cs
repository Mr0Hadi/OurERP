using Application.Common.Contracts.Context;
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
    }

    public class GetProductUnitListQuery : IRequest<ResponseDto>
    {
        public int Page { get; set; } = 1;
        public int Take { get; set; } = 20;
        public string? ProductName { get; set; }
        public int? ProductId { get; set; }
        public ProductUnitStatusEnum? Status { get; set; }
        public int? FromSerial { get; set; }
        public int? ToSerial { get; set; }
        public ProductUnitListSortEnum? SortBy { get; set; }
        public SortDirectionEnum? SortDirection { get; set; }
    }

    public class GetProductUnitListQueryHandler : IRequestHandler<GetProductUnitListQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public GetProductUnitListQueryHandler(IWMSDbContext context)
        {
            _context = context;
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

            // Default: grouped by product, then by serial.
            var direction = SortingExtensions.ResolveDirection(request.SortBy.HasValue, request.SortDirection, SortDirectionEnum.ASC);
            var sorted = request.SortBy switch
            {
                ProductUnitListSortEnum.SERIAL_NUMBER => query.SortBy(x => x.SerialNumber, direction),
                ProductUnitListSortEnum.PRODUCT_NAME => query.SortBy(x => x.Product.Name, direction).ThenSortBy(x => x.SerialNumber, direction),
                ProductUnitListSortEnum.STATUS => query.SortBy(x => x.Status, direction),
                ProductUnitListSortEnum.SOLD_AT => query.SortBy(x => x.SoldAt, direction),
                _ => query.SortBy(x => x.ProductId, direction).ThenSortBy(x => x.SerialNumber, direction),
            };

            var paged = await sorted
                .ThenSortBy(x => x.Id, direction)
                .SelectDto(_context)
                .ToPagedAsync(request.Page, request.Take, cancellationToken);

            res.Data = new
            {
                ProductUnitList = paged.Items,
                Page = new ResponsePageDto
                {
                    Page = request.Page,
                    PageCount = paged.PageCount,
                    Take = request.Take,
                    Total = paged.TotalCount
                }
            };
            res.Message = "لیست دانه‌های محصول با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
