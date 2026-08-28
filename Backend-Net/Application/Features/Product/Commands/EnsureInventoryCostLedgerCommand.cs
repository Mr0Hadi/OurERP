using Application.Common.Contracts.Context;
using Application.Common.Contracts.InventoryCosting;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Product.Commands
{
    /// <summary>
    /// Admin/migration command, idempotent. Bootstraps the perpetual weighted-average-cost ledger
    /// (InventoryCostLedgerEntry) for products that already carried stock before this feature
    /// existed: one OPENING_BALANCE row per product, using its current Stock and PurchasePrice -
    /// the only two places PurchasePrice is ever consulted for costing (see
    /// IInventoryCostingService's doc comment). Run this once after applying the
    /// add-inventory-cost-ledger migration, same as EnsureProductCodes was for the barcode feature.
    /// Products with an existing ledger row, or with Stock &lt;= 0, are skipped.
    /// </summary>
    public class EnsureInventoryCostLedgerCommand : IRequest<ResponseDto>
    {
    }

    public class EnsureInventoryCostLedgerCommandHandler : IRequestHandler<EnsureInventoryCostLedgerCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IInventoryCostingService _inventoryCostingService;
        private readonly IUnitOfWork _unitOfWork;

        public EnsureInventoryCostLedgerCommandHandler(IWMSDbContext context, IInventoryCostingService inventoryCostingService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _inventoryCostingService = inventoryCostingService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(EnsureInventoryCostLedgerCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var productIdsWithLedger = await _context.InventoryCostLedgerEntries
                .Select(x => x.ProductId)
                .Distinct()
                .ToListAsync(cancellationToken);

            var products = await _context.Products
                .Where(p => p.Stock > 0 && !productIdsWithLedger.Contains(p.Id))
                .ToListAsync(cancellationToken);

            var now = DateTime.Now;

            foreach (var product in products)
                await _inventoryCostingService.RecordOpeningBalanceAsync(product, product.Stock, product.PurchasePrice, now, cancellationToken);

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = new { ProductsBackfilled = products.Count };
            res.Message = "دفتر هزینه موجودی با موفقیت هم‌تراز شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
