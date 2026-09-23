using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Queries;
using Application.Features.ProductCategory.Dtos;
using Common.Extensions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.ProductCategory.Queries
{
    public enum ProductCategoryListSortEnum
    {
        ID = 0,
        NAME = 1,
        PRODUCT_COUNT = 2,
    }

    public class GetProductCategoryListQuery : IRequest<ResponseDto>
    {
        public int Page { get; set; } = 1;
        public int Take { get; set; } = 10;
        public string? Name { get; set; }
        public ProductCategoryListSortEnum? SortBy { get; set; }
        public SortDirectionEnum? SortDirection { get; set; }
    }

    public class GetProductCategoryListQueryHandler : IRequestHandler<GetProductCategoryListQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        public GetProductCategoryListQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }
        public async Task<ResponseDto> Handle(GetProductCategoryListQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();
            var query = _context.ProductCategories.AsQueryable();

            if (!string.IsNullOrEmpty(request.Name))
            {
                query = query.Where(x => x.Name.Contains(request.Name));
            }

            var projected = query.Select(x => new ProductCategoryListDto
            {
                Id = x.Id,
                Name = x.Name,
                ProductCount = x.Products.Count
            });

            // Default: alphabetical.
            var direction = SortingExtensions.ResolveDirection(request.SortBy.HasValue, request.SortDirection, SortDirectionEnum.ASC);
            var sorted = request.SortBy switch
            {
                ProductCategoryListSortEnum.ID => projected.SortBy(x => x.Id, direction),
                ProductCategoryListSortEnum.PRODUCT_COUNT => projected.SortBy(x => x.ProductCount, direction),
                _ => projected.SortBy(x => x.Name, direction),
            };

            var paged = await sorted.ThenSortBy(x => x.Id, direction).ToPagedAsync(request.Page, request.Take, cancellationToken);

            res.Data = new
            {
                ProductCategoryList = paged.Items,
                Page = new ResponsePageDto
                {
                    Page = request.Page,
                    PageCount = paged.PageCount,
                    Take = request.Take,
                    Total = paged.TotalCount
                }
            };
            res.Message = "لیست دسته‌بندی محصولات با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
