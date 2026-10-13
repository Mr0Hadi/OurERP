using Application.Common.Contracts.Context;
using Application.Common.Contracts.Storage;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Queries;
using Application.Features.Vehicle.Dtos;
using Common.Exceptions;
using Common.Extensions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Vehicle.Queries
{
    public enum VehicleProductListSortEnum
    {
        ID = 0,
        NAME = 1,
        CODE = 2,
        BRAND = 3,
        CATEGORY_NAME = 4,
        STOCK = 5,
    }

    /// <summary>
    /// The products linked to one vehicle, or - with no <see cref="VehicleId"/> - the all-vehicles products (linked to none).
    /// Only the products linked to the vehicle itself: all-vehicles products fit it too, but cannot be removed from it.
    /// </summary>
    public class GetVehicleProductListQuery : IRequest<ResponseDto>
    {
        public int Page { get; set; } = 1;
        public int Take { get; set; } = 20;
        public int? VehicleId { get; set; }

        /// <summary>Name, English name, code or brand contains it.</summary>
        public string? Search { get; set; }
        public VehicleProductListSortEnum? SortBy { get; set; }
        public SortDirectionEnum? SortDirection { get; set; }
    }

    public class GetVehicleProductListQueryHandler : IRequestHandler<GetVehicleProductListQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IObjectStorageService _objectStorageService;
        public GetVehicleProductListQueryHandler(IWMSDbContext context, IObjectStorageService objectStorageService)
        {
            _context = context;
            _objectStorageService = objectStorageService;
        }

        public async Task<ResponseDto> Handle(GetVehicleProductListQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();
            var query = _context.Products.Where(p => p.IsActive).AsNoTracking();

            if (request.VehicleId.HasValue)
            {
                var vehicleId = request.VehicleId.Value;
                if (!await _context.Vehicles.AnyAsync(v => v.Id == vehicleId && v.IsActive, cancellationToken))
                    throw new NotFoundCustomException("خودروی مورد نظر یافت نشد.");
                query = query.Where(p => p.Vehicles.Any(v => v.VehicleId == vehicleId));
            }
            else
            {
                query = query.Where(p => !p.Vehicles.Any());
            }

            var search = request.Search?.Trim();
            if (!string.IsNullOrEmpty(search))
            {
                query = query.Where(p => p.Name.Contains(search) || (p.EnglishName != null && p.EnglishName.Contains(search))
                    || p.Code.Contains(search) || p.Brand.Contains(search));
            }

            var projected = query.Select(p => new VehicleProductListDto
            {
                Id = p.Id,
                Name = p.Name,
                Code = p.Code,
                Brand = p.Brand,
                CategoryName = p.ProductCategory.Name,
                Stock = p.Stock,
                ImageKey = p.ImageUrl,
                VehicleCount = p.Vehicles.Count
            });

            // Default: alphabetical.
            var direction = SortingExtensions.ResolveDirection(request.SortBy.HasValue, request.SortDirection, SortDirectionEnum.ASC);
            var sorted = request.SortBy switch
            {
                VehicleProductListSortEnum.ID => projected.SortBy(x => x.Id, direction),
                VehicleProductListSortEnum.NAME => projected.SortBy(x => x.Name, direction),
                VehicleProductListSortEnum.CODE => projected.SortBy(x => x.Id, direction),
                VehicleProductListSortEnum.BRAND => projected.SortBy(x => x.Brand, direction),
                VehicleProductListSortEnum.CATEGORY_NAME => projected.SortBy(x => x.CategoryName, direction),
                VehicleProductListSortEnum.STOCK => projected.SortBy(x => x.Stock, direction),
                _ => projected.SortBy(x => x.Name, direction),
            };

            var paged = await sorted.ThenSortBy(x => x.Id, direction).ToPagedAsync(request.Page, request.Take, cancellationToken);

            foreach (var item in paged.Items)
                item.ImageUrl = _objectStorageService.GetFixedUrl(item.ImageKey);

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
            res.Message = "لیست کالاهای خودرو با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
