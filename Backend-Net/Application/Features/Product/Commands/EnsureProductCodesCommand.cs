using System.Text.RegularExpressions;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.ProductCode;
using Application.Common.Contracts.ProductUnit;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Product.Commands
{
    /// <summary>
    /// Admin/migration command. Three jobs, all idempotent:
    /// 1. Give every product whose Code doesn't match the generated pattern a proper one (rows
    ///    created before this feature, or left with a placeholder by a failed second save).
    /// 2. Rebuild every ProductUnit's Barcode/BarcodePayload from its product's (possibly
    ///    just-fixed) Code plus its own serial. Unit barcodes are derived values, so a product
    ///    whose Code changes - or a change to the segment widths themselves - leaves its existing
    ///    units holding a stale payload that Parse no longer recognizes and label PDFs still print.
    /// 3. Reconcile ProductUnit rows against Product.Stock so the invariant holds everywhere.
    /// Run this after applying the ProductUnit migration and before adding the unique index on
    /// Product.Code - see docs/product-code-barcode-invoice-design.fa.md 4.3.
    /// </summary>
    public class EnsureProductCodesCommand : IRequest<ResponseDto>
    {
    }

    public class EnsureProductCodesCommandHandler : IRequestHandler<EnsureProductCodesCommand, ResponseDto>
    {
        private static readonly Regex GeneratedCodePattern = new(@"^\d{8}-\d{10}$", RegexOptions.Compiled);

        private readonly IWMSDbContext _context;
        private readonly IProductCodeService _productCodeService;
        private readonly IProductUnitService _productUnitService;
        private readonly IUnitOfWork _unitOfWork;

        public EnsureProductCodesCommandHandler(IWMSDbContext context, IProductCodeService productCodeService, IProductUnitService productUnitService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _productCodeService = productCodeService;
            _productUnitService = productUnitService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(EnsureProductCodesCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var products = await _context.Products.ToListAsync(cancellationToken);

            var unitCounts = await _context.ProductUnits
                .Where(x => x.Status == ProductUnitStatusEnum.IN_STOCK)
                .GroupBy(x => x.ProductId)
                .Select(g => new { ProductId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.ProductId, x => x.Count, cancellationToken);

            // Loaded in full (not just aggregated) because every unit's barcode is derived from
            // its product's Code and has to be re-derived whenever that Code - or the code format
            // itself - changes. This is a one-shot admin command, so a single full scan is fine.
            var unitsByProduct = (await _context.ProductUnits.ToListAsync(cancellationToken))
                .GroupBy(x => x.ProductId)
                .ToDictionary(g => g.Key, g => g.ToList());

            var codesFixed = 0;
            var barcodesFixed = 0;
            var unitsMinted = 0;
            var unitsScrapped = 0;

            foreach (var product in products)
            {
                if (string.IsNullOrWhiteSpace(product.Code) || !GeneratedCodePattern.IsMatch(product.Code))
                {
                    product.Code = _productCodeService.BuildProductCode(product.Id, product.CreatedAt);
                    product.BarCode = _productCodeService.ToPayload(product.Code);
                    codesFixed++;
                }

                if (unitsByProduct.TryGetValue(product.Id, out var units))
                {
                    foreach (var unit in units)
                    {
                        var barcode = _productCodeService.BuildUnitBarcode(product.Code, unit.SerialNumber);

                        if (unit.Barcode == barcode)
                            continue;

                        unit.Barcode = barcode;
                        unit.BarcodePayload = _productCodeService.ToPayload(barcode);
                        barcodesFixed++;
                    }
                }

                var inStock = unitCounts.TryGetValue(product.Id, out var count) ? count : 0;
                var diff = product.Stock - inStock;

                if (diff > 0)
                    unitsMinted += diff;
                else if (diff < 0)
                    unitsScrapped += -diff;

                if (diff != 0)
                    await _productUnitService.ReconcileStockAsync(product, product.Stock, cancellationToken);
            }

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = new
            {
                ProductsScanned = products.Count,
                CodesFixed = codesFixed,
                UnitBarcodesFixed = barcodesFixed,
                UnitsMinted = unitsMinted,
                UnitsScrapped = unitsScrapped,
            };
            res.Message = "کدهای محصول و دانه‌ها با موفقیت هم‌تراز شدند.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
