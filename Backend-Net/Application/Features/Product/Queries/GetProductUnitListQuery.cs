using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Product.Dtos;
using Common.Extensions;
using Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Product.Queries
{
    public class GetProductUnitListQuery : IRequest<ResponseDto>
    {
        public int Page { get; set; } = 1;
        public int Take { get; set; } = 20;
        public int? ProductId { get; set; }
        public ProductUnitStatusEnum? Status { get; set; }
        public int? FromSerial { get; set; }
        public int? ToSerial { get; set; }
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
            var query = _context.ProductUnits.AsQueryable();

            if (request.ProductId.HasValue)
                query = query.Where(x => x.ProductId == request.ProductId);

            if (request.Status.HasValue)
                query = query.Where(x => x.Status == request.Status);

            if (request.FromSerial.HasValue)
                query = query.Where(x => x.SerialNumber >= request.FromSerial);

            if (request.ToSerial.HasValue)
                query = query.Where(x => x.SerialNumber <= request.ToSerial);

            var data = await query
                .OrderBy(x => x.ProductId)
                .ThenBy(x => x.SerialNumber)
                .Select(x => new ProductUnitDto
                {
                    Id = x.Id,
                    ProductId = x.ProductId,
                    SerialNumber = x.SerialNumber,
                    Barcode = x.Barcode,
                    BarcodePayload = x.BarcodePayload,
                    Status = x.Status,
                    PurchaseItemId = x.PurchaseItemId,
                    SaleItemId = x.SaleItemId,
                    CreatedAt = x.CreatedAt,
                    SoldAt = x.SoldAt,
                })
                .ToPaged(request.Page, request.Take, out int pageCount, out int totalCount)
                .ToListAsync(cancellationToken);

            res.Data = new
            {
                ProductUnitList = data,
                Page = new ResponsePageDto
                {
                    Page = request.Page,
                    PageCount = pageCount,
                    Take = request.Take,
                    Total = totalCount
                }
            };
            res.Message = "لیست دانه‌های محصول با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
