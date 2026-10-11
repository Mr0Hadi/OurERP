using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Queries;
using Application.Features.Vehicle.Dtos;
using Common.Extensions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Vehicle.Queries
{
    public enum VehicleListSortEnum
    {
        ID = 0,
        NAME = 1,
        PRODUCT_COUNT = 2,
    }

    public class GetVehicleListQuery : IRequest<ResponseDto>
    {
        public int Page { get; set; } = 1;
        public int Take { get; set; } = 10;
        public string? Name { get; set; }
        public VehicleListSortEnum? SortBy { get; set; }
        public SortDirectionEnum? SortDirection { get; set; }
    }

    public class GetVehicleListQueryHandler : IRequestHandler<GetVehicleListQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        public GetVehicleListQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        public async Task<ResponseDto> Handle(GetVehicleListQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();
            var query = _context.Vehicles.Where(x => x.IsActive).AsNoTracking();

            var name = VehicleRules.NormalizeName(request.Name);
            if (!string.IsNullOrEmpty(name))
            {
                query = query.Where(x => x.Name.Contains(name));
            }

            var projected = query.Select(x => new VehicleListDto
            {
                Id = x.Id,
                Name = x.Name,
                ProductCount = x.Products.Count(p => p.Product.IsActive)
            });

            // Default: alphabetical.
            var direction = SortingExtensions.ResolveDirection(request.SortBy.HasValue, request.SortDirection, SortDirectionEnum.ASC);
            var sorted = request.SortBy switch
            {
                VehicleListSortEnum.ID => projected.SortBy(x => x.Id, direction),
                VehicleListSortEnum.NAME => projected.SortBy(x => x.Name, direction),
                VehicleListSortEnum.PRODUCT_COUNT => projected.SortBy(x => x.ProductCount, direction),
                _ => projected.SortBy(x => x.Name, direction),
            };

            var paged = await sorted.ThenSortBy(x => x.Id, direction).ToPagedAsync(request.Page, request.Take, cancellationToken);

            // The "all vehicles" entry of the vehicles page: active products linked to no vehicle.
            var universalProductCount = await _context.Products.CountAsync(p => p.IsActive && !p.Vehicles.Any(), cancellationToken);

            res.Data = new
            {
                VehicleList = paged.Items,
                UniversalProductCount = universalProductCount,
                Page = new ResponsePageDto
                {
                    Page = request.Page,
                    PageCount = paged.PageCount,
                    Take = request.Take,
                    Total = paged.TotalCount
                }
            };
            res.Message = "لیست خودروها با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
