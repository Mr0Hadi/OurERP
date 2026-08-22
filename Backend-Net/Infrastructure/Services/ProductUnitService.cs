using Application.Common.Contracts.Context;
using Application.Common.Contracts.ProductCode;
using Application.Common.Contracts.ProductUnit;
using Common.Exceptions;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services
{
    public class ProductUnitService : IProductUnitService
    {
        private readonly IWMSDbContext _context;
        private readonly IProductCodeService _productCodeService;

        public ProductUnitService(IWMSDbContext context, IProductCodeService productCodeService)
        {
            _context = context;
            _productCodeService = productCodeService;
        }

        public async Task<List<Domain.Entities.ProductUnit>> MintAsync(Domain.Entities.Product product, int count, int? purchaseItemId, CancellationToken cancellationToken)
        {
            var units = new List<Domain.Entities.ProductUnit>();
            if (count <= 0)
                return units;

            var nextSerial = await GetNextSerialAsync(product.Id, cancellationToken);

            for (var i = 0; i < count; i++)
            {
                var serial = nextSerial + i;
                var barcode = _productCodeService.BuildUnitBarcode(product.Code, serial);

                var unit = new Domain.Entities.ProductUnit
                {
                    ProductId = product.Id,
                    SerialNumber = serial,
                    Barcode = barcode,
                    BarcodePayload = _productCodeService.ToPayload(barcode),
                    Status = ProductUnitStatusEnum.IN_STOCK,
                    PurchaseItemId = purchaseItemId,
                    CreatedAt = DateTime.Now,
                    IsActive = true
                };

                units.Add(unit);
                await _context.ProductUnits.AddAsync(unit, cancellationToken);
            }

            return units;
        }

        public async Task<List<Domain.Entities.ProductUnit>> ConsumeAsync(Domain.Entities.Product product, int count, int saleItemId, List<string>? explicitBarcodes, CancellationToken cancellationToken)
        {
            var units = new List<Domain.Entities.ProductUnit>();
            if (count <= 0)
                return units;

            if (explicitBarcodes != null && explicitBarcodes.Count > 0)
            {
                if (explicitBarcodes.Count != count)
                    throw new ValidationCustomException("تعداد بارکدهای اسکن‌شده با مقدار ارسالی مطابقت ندارد.");

                var payloads = explicitBarcodes.Select(_productCodeService.ToPayload).ToList();

                foreach (var payload in payloads)
                {
                    var unit = await _context.ProductUnits
                        .FirstOrDefaultAsync(x => x.BarcodePayload == payload, cancellationToken)
                        ?? throw new NotFoundCustomException($"بارکد «{payload}» در سیستم یافت نشد.");

                    if (unit.ProductId != product.Id)
                        throw new ValidationCustomException($"بارکد «{unit.Barcode}» متعلق به این محصول نیست.");

                    if (unit.Status != ProductUnitStatusEnum.IN_STOCK)
                        throw new ValidationCustomException($"بارکد «{unit.Barcode}» در انبار موجود نیست.");

                    units.Add(unit);
                }
            }
            else
            {
                units = await _context.ProductUnits
                    .Where(x => x.ProductId == product.Id && x.Status == ProductUnitStatusEnum.IN_STOCK)
                    .OrderBy(x => x.SerialNumber)
                    .Take(count)
                    .ToListAsync(cancellationToken);

                if (units.Count < count)
                    throw new ValidationCustomException($"تعداد کافی از دانه‌های موجود «{product.Name}» در انبار برای ثبت این خروج وجود ندارد.");
            }

            foreach (var unit in units)
            {
                unit.Status = ProductUnitStatusEnum.SOLD;
                unit.SaleItemId = saleItemId;
                unit.SoldAt = DateTime.Now;
            }

            return units;
        }

        public async Task RestoreAsync(int saleItemId, int healthyCount, int scrapCount, CancellationToken cancellationToken)
        {
            if (healthyCount <= 0 && scrapCount <= 0)
                return;

            var soldUnits = await _context.ProductUnits
                .Where(x => x.SaleItemId == saleItemId && x.Status == ProductUnitStatusEnum.SOLD)
                .OrderBy(x => x.SoldAt)
                .ThenBy(x => x.SerialNumber)
                .Take(healthyCount + scrapCount)
                .ToListAsync(cancellationToken);

            for (var i = 0; i < soldUnits.Count; i++)
            {
                soldUnits[i].Status = i < healthyCount
                    ? ProductUnitStatusEnum.IN_STOCK
                    : ProductUnitStatusEnum.SCRAPPED;
            }
        }

        public async Task ReconcileStockAsync(Domain.Entities.Product product, int newStock, CancellationToken cancellationToken)
        {
            var inStockCount = await _context.ProductUnits
                .CountAsync(x => x.ProductId == product.Id && x.Status == ProductUnitStatusEnum.IN_STOCK, cancellationToken);

            var diff = newStock - inStockCount;
            if (diff == 0)
                return;

            if (diff > 0)
            {
                await MintAsync(product, diff, null, cancellationToken);
                return;
            }

            var toScrap = await _context.ProductUnits
                .Where(x => x.ProductId == product.Id && x.Status == ProductUnitStatusEnum.IN_STOCK)
                .OrderByDescending(x => x.SerialNumber)
                .Take(-diff)
                .ToListAsync(cancellationToken);

            foreach (var unit in toScrap)
                unit.Status = ProductUnitStatusEnum.SCRAPPED;
        }

        private async Task<int> GetNextSerialAsync(int productId, CancellationToken cancellationToken)
        {
            var maxSerial = await _context.ProductUnits
                .Where(x => x.ProductId == productId)
                .Select(x => (int?)x.SerialNumber)
                .MaxAsync(cancellationToken);

            return (maxSerial ?? 0) + 1;
        }
    }
}
