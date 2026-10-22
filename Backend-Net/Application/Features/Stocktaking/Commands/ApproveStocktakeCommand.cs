using Application.Common.Audit;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.InventoryCosting;
using Application.Common.Contracts.ProductUnit;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Contracts.UserContextService;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Stocktaking.Queries;
using Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Stocktaking.Commands
{
    /// <summary>
    /// Applies a submitted stocktake's differences (StocktakeVariance - exactly what the detail screen showed):
    ///   - missing units -> SCRAPPED (movement STOCKTAKE_ADJUSTMENT), Stock down, cost ledger MANUAL_ADJUSTMENT_OUT at the average;
    ///   - units found in this warehouse that the books had in another -> moved here (STOCKTAKE_RELOCATED), no stock or value change;
    ///   - typed shortage -> the newest units on this warehouse's shelf marked missing; typed surplus -> new units minted here,
    ///     cost ledger MANUAL_ADJUSTMENT_IN at the product's purchase price;
    ///   - unexpected and unknown scans -> nothing (reported for someone to look into); uncounted products -> nothing.
    /// After this, Product.Stock == COUNT(IN_STOCK) still holds. All or nothing. SUBMITTED -> APPROVED, final.
    /// </summary>
    [AuditAction(AuditActionEnum.ApproveStocktake)]
    public class ApproveStocktakeCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class ApproveStocktakeCommandHandler : IRequestHandler<ApproveStocktakeCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IProductUnitService _productUnitService;
        private readonly IInventoryCostingService _inventoryCostingService;
        private readonly IUserContextService _userContextService;
        private readonly IUnitOfWork _unitOfWork;

        public ApproveStocktakeCommandHandler(IWMSDbContext context, IProductUnitService productUnitService, IInventoryCostingService inventoryCostingService, IUserContextService userContextService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _productUnitService = productUnitService;
            _inventoryCostingService = inventoryCostingService;
            _userContextService = userContextService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(ApproveStocktakeCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var stocktake = await StocktakeLoader.LoadAsync(_context, request.Id, cancellationToken, StocktakeStatusEnum.SUBMITTED);
            var results = await StocktakeVariance.ComputeAsync(_context, stocktake, cancellationToken);
            var now = DateTime.Now;
            var movement = new UnitMovementContext(ProductUnitMovementReasonEnum.STOCKTAKE_ADJUSTMENT, now, Note: stocktake.Number, WarehouseId: stocktake.WarehouseId);
            var relocation = movement with { Reason = ProductUnitMovementReasonEnum.STOCKTAKE_RELOCATED };

            var productIds = results.Select(r => r.Line.ProductId).ToList();
            var products = await _context.Products.Where(x => productIds.Contains(x.Id)).ToDictionaryAsync(x => x.Id, cancellationToken);
            var unitIds = results.SelectMany(r => r.MissingUnitIds.Concat(r.RelocatedUnitIds)).ToList();
            var units = await _context.ProductUnits.Where(x => unitIds.Contains(x.Id)).ToDictionaryAsync(x => x.Id, cancellationToken);

            foreach (var result in results.Where(r => r.Mode != StocktakeCountModeEnum.NONE))
            {
                var product = products[result.Line.ProductId];
                var missing = 0;
                var found = 0;

                if (result.Mode == StocktakeCountModeEnum.SCAN)
                {
                    var gone = result.MissingUnitIds.Select(id => units[id]).ToList();
                    await _productUnitService.MarkMissingAsync(gone, movement, cancellationToken);
                    missing = gone.Count;
                    await _productUnitService.PlaceInStockAsync(result.RelocatedUnitIds.Select(id => units[id]).ToList(), stocktake.WarehouseId, relocation, cancellationToken);
                }
                else if (result.ManualAdjustment < 0)
                {
                    missing = (await _productUnitService.TakeFromStockAsync(product, -result.ManualAdjustment, stocktake.WarehouseId, movement, cancellationToken)).Count;
                }
                else if (result.ManualAdjustment > 0)
                {
                    found = (await _productUnitService.MintAsync(product, result.ManualAdjustment, UnitOrigin.None, movement, cancellationToken)).Count;
                }

                if (missing > 0)
                {
                    await _inventoryCostingService.RecordManualAdjustmentOutAsync(product, missing, now, cancellationToken);
                    product.Stock -= missing;
                }
                if (found > 0)
                {
                    await _inventoryCostingService.RecordManualAdjustmentInAsync(product, found, product.PurchasePrice, now, cancellationToken);
                    product.Stock += found;
                }
                result.Line.AppliedMissing = missing;
                result.Line.AppliedFound = found;
            }

            stocktake.Status = StocktakeStatusEnum.APPROVED;
            stocktake.ApprovedAt = now;
            stocktake.ApprovedByUserId = int.TryParse(_userContextService.GetUserId(), out var id2) ? id2 : null;
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await StocktakeReader.ReadAsync(_context, stocktake.Id, cancellationToken);
            res.Message = "انبارگردانی تأیید و اختلاف‌ها اعمال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
