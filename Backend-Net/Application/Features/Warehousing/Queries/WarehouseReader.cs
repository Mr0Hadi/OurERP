using Application.Common.Contracts.Context;
using Application.Features.Warehousing.Dtos;
using Common.Exceptions;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;

namespace Application.Features.Warehousing.Queries
{
    /// <summary>The one projection of a warehouse with its unit counts (list, detail, every warehouse write).</summary>
    public static class WarehouseReader
    {
        public static Expression<Func<Domain.Entities.Warehouse, WarehouseDto>> Projection(IWMSDbContext context) => x => new WarehouseDto
        {
            Id = x.Id,
            Code = x.Code,
            Name = x.Name,
            Address = x.Address,
            Description = x.Description,
            IsDefault = x.IsDefault,
            IsActive = x.IsActive,
            InStockUnits = context.ProductUnits.Count(u => u.WarehouseId == x.Id && u.Status == ProductUnitStatusEnum.IN_STOCK),
            QuarantinedUnits = context.ProductUnits.Count(u => u.WarehouseId == x.Id && u.Status == ProductUnitStatusEnum.QUARANTINED),
            ReservedUnits = context.ProductUnits.Count(u => u.WarehouseId == x.Id && u.Status == ProductUnitStatusEnum.RESERVED),
            OutgoingInTransitUnits = context.ProductUnits.Count(u => u.WarehouseId == x.Id && u.Status == ProductUnitStatusEnum.IN_TRANSIT),
        };

        public static async Task<WarehouseDto> ReadAsync(IWMSDbContext context, int id, CancellationToken cancellationToken) =>
            await context.Warehouses.AsNoTracking().Where(x => x.Id == id).Select(Projection(context)).FirstOrDefaultAsync(cancellationToken)
            ?? throw new NotFoundCustomException("انبار مورد نظر یافت نشد.");
    }
}
