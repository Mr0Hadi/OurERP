using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Warehousing.Dtos;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Warehousing.Queries
{
    /// <summary>
    /// One product's units per warehouse. Counted from the units themselves - there is no per-warehouse stock column to drift:
    /// Product.Stock is the sum of IN_STOCK over every warehouse. Warehouses holding nothing of it are left out.
    /// </summary>
    public class GetProductWarehouseStockQuery : IRequest<ResponseDto>
    {
        public int ProductId { get; set; }
    }

    public class GetProductWarehouseStockQueryValidator : AbstractValidator<GetProductWarehouseStockQuery>
    {
        public GetProductWarehouseStockQueryValidator()
        {
            RuleFor(x => x.ProductId).GreaterThan(0).WithMessage("کالا نامعتبر است.");
        }
    }

    public class GetProductWarehouseStockQueryHandler : IRequestHandler<GetProductWarehouseStockQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public GetProductWarehouseStockQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        public async Task<ResponseDto> Handle(GetProductWarehouseStockQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var counts = await _context.ProductUnits.AsNoTracking()
                .Where(x => x.ProductId == request.ProductId && x.IsActive)
                .Where(x => x.Status == ProductUnitStatusEnum.IN_STOCK || x.Status == ProductUnitStatusEnum.QUARANTINED
                    || x.Status == ProductUnitStatusEnum.RESERVED || x.Status == ProductUnitStatusEnum.IN_TRANSIT)
                .GroupBy(x => new { x.WarehouseId, x.Status })
                .Select(g => new { g.Key.WarehouseId, g.Key.Status, Count = g.Count() })
                .ToListAsync(cancellationToken);

            var warehouseIds = counts.Select(x => x.WarehouseId).Distinct().ToList();
            var warehouses = await _context.Warehouses.AsNoTracking()
                .Where(x => warehouseIds.Contains(x.Id))
                .ToDictionaryAsync(x => x.Id, cancellationToken);

            int Count(int warehouseId, ProductUnitStatusEnum status) =>
                counts.Where(x => x.WarehouseId == warehouseId && x.Status == status).Sum(x => x.Count);

            res.Data = warehouseIds
                .Select(id => new ProductWarehouseStockDto
                {
                    WarehouseId = id,
                    WarehouseName = warehouses[id].Name,
                    IsDefault = warehouses[id].IsDefault,
                    InStock = Count(id, ProductUnitStatusEnum.IN_STOCK),
                    Quarantined = Count(id, ProductUnitStatusEnum.QUARANTINED),
                    Reserved = Count(id, ProductUnitStatusEnum.RESERVED),
                    OutgoingInTransit = Count(id, ProductUnitStatusEnum.IN_TRANSIT),
                })
                .OrderByDescending(x => x.IsDefault).ThenBy(x => x.WarehouseName)
                .ToList();
            res.Message = "موجودی کالا به تفکیک انبار ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
