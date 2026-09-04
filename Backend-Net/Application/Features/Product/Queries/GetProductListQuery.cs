using Application.Common.Contracts.Context;
using Application.Common.Contracts.Storage;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Product.Dtos;
using Common.Extensions;
using Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Product.Queries
{
    public class GetProductListQuery : IRequest<ResponseDto>
    {
        public int Page { get; set; } = 1;
        public int Take { get; set; } = 10;
        public string? Name { get; set; }
        public string? Code { get; set; }
        public string? Brand { get; set; }
        public int? ProductCategoryId { get; set; }
        public bool? IsLowOnStock { get; set; }
        public UInt64? FromPrice { get; set; }
        public UInt64? ToPrice { get; set; }
    }

    public class GetProductListQueryHandler : IRequestHandler<GetProductListQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IObjectStorageService _objectStorageService;
        public GetProductListQueryHandler(IWMSDbContext context, IObjectStorageService objectStorageService)
        {
            _context = context;
            _objectStorageService = objectStorageService;
        }
        public async Task<ResponseDto> Handle(GetProductListQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();
            var query = _context.Products.AsQueryable();

            if (!string.IsNullOrEmpty(request.Name))
            {
                query = query.Where(p => p.Name.Contains(request.Name));
            }

            if (!string.IsNullOrEmpty(request.Code))
            {
                query = query.Where(p => p.Code.Contains(request.Code));
            }

            if (!string.IsNullOrEmpty(request.Brand))
            {
                query = query.Where(p => p.Brand.Contains(request.Brand));
            }

            if (request.ProductCategoryId.HasValue)
            {
                query = query.Where(p => p.ProductCategoryId == request.ProductCategoryId);
            }

            if(request.IsLowOnStock.HasValue && request.IsLowOnStock.Value)
            {
                query = query.Where(p => p.Stock <= p.LowStockThreshold);
            }
            
            if(request.IsLowOnStock.HasValue && !request.IsLowOnStock.Value)
            {
                query = query.Where(p => p.Stock > p.LowStockThreshold);
            }
            
            if (request.FromPrice.HasValue)
            {
                query = query.Where(p => p.RetailPrice >= request.FromPrice);
            }

            if (request.ToPrice.HasValue)
            {
                query = query.Where(p => p.RetailPrice <= request.ToPrice);
            }

            var paged = await query.Select(x => new ProductListDto
            {
                Id = x.Id,
                Brand = x.Brand,
                Code = x.Code,
                Name = x.Name,
                CategoryName = x.ProductCategory.Name,
                Stock = x.Stock,
                LowStockThreshold = x.LowStockThreshold,
                RetailPrice = x.RetailPrice,
                WholeSalePrice = x.WholeSalePrice,
                ImageKey = x.ImageUrl
            }).ToPagedAsync(request.Page, request.Take, cancellationToken);

            // Signing happens after materialization - GetPresignedUrl is a local method call and
            // could not be translated into the SQL projection above.
            foreach (var item in paged.Items)
                item.ImageUrl = _objectStorageService.GetPresignedUrl(item.ImageKey);

            res.Data = new
            {
                ProductList = paged.Items,
                Page = new ResponsePageDto
                {
                    Page = request.Page,
                    PageCount = paged.PageCount,
                    Take = request.Take,
                    Total = paged.TotalCount
                }
            };
            res.Message = "اطلاعات محصول با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
