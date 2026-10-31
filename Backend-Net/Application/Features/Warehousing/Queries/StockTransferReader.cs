using Application.Common.Contracts.Context;
using Application.Features.Warehousing.Dtos;
using Common.Exceptions;
using Common.Extensions;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;

namespace Application.Features.Warehousing.Queries
{
    /// <summary>The one projection of a stock transfer (list, detail, and every transfer command's answer).</summary>
    public static class StockTransferReader
    {
        public static readonly Expression<Func<Domain.Entities.StockTransfer, StockTransferDto>> Projection = x => new StockTransferDto
        {
            Id = x.Id,
            TransferNumber = x.TransferNumber,
            FromWarehouseId = x.FromWarehouseId,
            FromWarehouseName = x.FromWarehouse.Name,
            ToWarehouseId = x.ToWarehouseId,
            ToWarehouseName = x.ToWarehouse.Name,
            Status = x.Status,
            Description = x.Description,
            DispatchedAt = x.DispatchedAt,
            DispatchedByUserId = x.DispatchedByUserId,
            ReceivedAt = x.ReceivedAt,
            ReceivedByUserId = x.ReceivedByUserId,
            CancelledAt = x.CancelledAt,
            TotalUnits = x.Units.Count,
        };

        public static async Task<StockTransferDto> ReadAsync(IWMSDbContext context, int id, CancellationToken cancellationToken)
        {
            var dto = await context.StockTransfers.AsNoTracking().Where(x => x.Id == id).Select(Projection).FirstOrDefaultAsync(cancellationToken)
                ?? throw new NotFoundCustomException("حواله‌ی مورد نظر یافت نشد.");
            dto.StatusTitle = dto.Status.GetDescription();

            var units = await context.StockTransferUnits.AsNoTracking()
                .Where(x => x.StockTransferId == id)
                .Select(x => new { x.ProductId, x.ProductUnit.Product.Code, x.ProductUnit.Product.Name, x.ProductUnit.Barcode, x.ProductUnit.SerialNumber })
                .ToListAsync(cancellationToken);
            dto.Products = units
                .GroupBy(x => new { x.ProductId, x.Code, x.Name })
                .OrderBy(g => g.Key.Name)
                .Select(g => new StockTransferProductDto
                {
                    ProductId = g.Key.ProductId,
                    ProductCode = g.Key.Code,
                    ProductName = g.Key.Name,
                    Quantity = g.Count(),
                    Barcodes = g.OrderBy(x => x.SerialNumber).Select(x => x.Barcode).ToList(),
                })
                .ToList();
            return dto;
        }
    }
}
