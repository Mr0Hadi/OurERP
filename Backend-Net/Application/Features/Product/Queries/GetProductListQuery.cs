using Application.Common.Contracts.Context;
using Application.Common.Contracts.ProductCode;
using Application.Common.Contracts.Storage;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Queries;
using Application.Features.Product.Dtos;
using Common.Extensions;
using Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Product.Queries
{
    public enum ProductListSortEnum
    {
        ID = 0,
        CODE = 1,
        NAME = 2,
        BRAND = 3,
        CATEGORY_NAME = 4,
        RETAIL_PRICE = 5,
        WHOLESALE_PRICE = 6,
        STOCK = 7,
        QUARANTINED_COUNT = 8,
    }

    public class GetProductListQuery : IRequest<ResponseDto>
    {
        public int Page { get; set; } = 1;
        public int Take { get; set; } = 10;
        /// <summary>
        /// One box for the item pickers (frontend-requests 13.5): matches by OR on the name (every word, Persian or English
        /// name), the product code, the product barcode, or a scanned unit barcode / product code (normalised like ScanBarcode).
        /// Exact code/barcode matches come first unless SortBy is sent. Combines with the other filters by AND.
        /// </summary>
        public string? Search { get; set; }
        public string? Name { get; set; }
        public string? Code { get; set; }
        public string? BarCode { get; set; }
        public string? Brand { get; set; }
        public int? ProductCategoryId { get; set; }

        /// <summary>Products that fit this vehicle: the ones linked to it plus the all-vehicles ones (linked to none).</summary>
        public int? VehicleId { get; set; }
        public bool? IsLowOnStock { get; set; }
        public UInt64? FromPrice { get; set; }
        public UInt64? ToPrice { get; set; }

        /// <summary>true: only quick-created products still waiting for purchasing to complete them.</summary>
        public bool? IsIncomplete { get; set; }
        public ProductListSortEnum? SortBy { get; set; }
        public SortDirectionEnum? SortDirection { get; set; }
    }

    public class GetProductListQueryHandler : IRequestHandler<GetProductListQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IObjectStorageService _objectStorageService;
        private readonly IProductCodeService _productCodeService;
        public GetProductListQueryHandler(IWMSDbContext context, IObjectStorageService objectStorageService, IProductCodeService productCodeService)
        {
            _context = context;
            _objectStorageService = objectStorageService;
            _productCodeService = productCodeService;
        }
        public async Task<ResponseDto> Handle(GetProductListQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();
            var query = await ApplyFiltersAsync(_context.Products.Where(x => x.IsActive).AsNoTracking(), request, cancellationToken, _context, _productCodeService);
            var exact = ExactSearchMatch(request.Search, _context, _productCodeService);
            // Plain locals, so EF parameterises them (a member of a null record would throw while it does).
            var hasSearch = exact != null;
            var exactText = exact?.Code ?? string.Empty;
            var exactId = exact?.ProductId ?? 0;

            var projected = query.Select(x => new ProductListDto
            {
                RequiresUnitTracking = x.RequiresUnitTracking,
                IsIncomplete = x.IsIncomplete,
                QuarantinedCount = _context.ProductUnits.Count(u => u.ProductId == x.Id && u.Status == Domain.Enums.ProductUnitStatusEnum.QUARANTINED),
                ReservedCount = _context.ProductUnits.Count(u => u.ProductId == x.Id && u.Status == Domain.Enums.ProductUnitStatusEnum.RESERVED),
                Id = x.Id,
                Brand = x.Brand,
                Code = x.Code,
                Name = x.Name,
                EnglishName = x.EnglishName,
                CategoryName = x.ProductCategory.Name,
                Stock = x.Stock,
                LowStockThreshold = x.LowStockThreshold,
                RetailPrice = x.RetailPrice,
                WholeSalePrice = x.WholeSalePrice,
                PurchasePrice = x.PurchasePrice,
                Unit = x.Unit,
                Tax = x.Tax,
                TaxCategory = x.TaxCategory,
                ImageKey = x.ImageUrl,
                IsExactMatch = hasSearch && (x.Code == exactText || x.BarCode == exactText || x.Id == exactId),
            });

            // Sorted on the projection so the computed QuarantinedCount is sortable too. Default: newest first.
            var direction = SortingExtensions.ResolveDirection(request.SortBy.HasValue, request.SortDirection, SortDirectionEnum.DESC);
            // With a Search and no explicit sort, exact code/barcode matches lead (frontend-requests 13.5).
            var leading = hasSearch && !request.SortBy.HasValue
                ? projected.OrderByDescending(x => x.IsExactMatch)
                : null;
            var sorted = leading != null ? leading.ThenSortBy(x => x.Id, direction) : request.SortBy switch
            {
                ProductListSortEnum.ID => projected.SortBy(x => x.Id, direction),
                ProductListSortEnum.CODE => projected.SortBy(x => x.Id, direction),
                ProductListSortEnum.NAME => projected.SortBy(x => x.Name, direction),
                ProductListSortEnum.BRAND => projected.SortBy(x => x.Brand, direction),
                ProductListSortEnum.CATEGORY_NAME => projected.SortBy(x => x.CategoryName, direction),
                ProductListSortEnum.RETAIL_PRICE => projected.SortBy(x => x.RetailPrice, direction),
                ProductListSortEnum.WHOLESALE_PRICE => projected.SortBy(x => x.WholeSalePrice, direction),
                ProductListSortEnum.STOCK => projected.SortBy(x => x.Stock, direction),
                ProductListSortEnum.QUARANTINED_COUNT => projected.SortBy(x => x.QuarantinedCount, direction),
                _ => projected.SortBy(x => x.Id, direction),
            };

            var paged = await sorted.ThenSortBy(x => x.Id, direction).ToPagedAsync(request.Page, request.Take, cancellationToken);

            // Signing happens after materialization - GetPresignedUrl is a local method call and
            // could not be translated into the SQL projection above.
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
            res.Message = "اطلاعات محصول با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }

        /// <summary>
        /// The list's filters, on their own so the table export (ProductDataTransferDefinition) filters with exactly
        /// this code instead of a copy of it. Async because a whole code/barcode probes for an exact match first.
        /// </summary>
        public static async Task<IQueryable<Domain.Entities.Product>> ApplyFiltersAsync(IQueryable<Domain.Entities.Product> query, GetProductListQuery request, CancellationToken cancellationToken,
            IWMSDbContext? context = null, IProductCodeService? productCodeService = null)
        {
            var exact = ExactSearchMatch(request.Search, context, productCodeService);
            if (exact != null)
            {
                var search = exact.Code;
                var words = search.Split(' ', StringSplitOptions.RemoveEmptyEntries);
                var scannedId = exact.ProductId;
                var unitPayload = exact.UnitPayload;

                // Name: every word (like the Name filter), Persian or English.
                query = query.Where(p =>
                    words.All(w => p.Name.Contains(w) || (p.EnglishName != null && p.EnglishName.Contains(w)))
                    || p.Code.Contains(search)
                    || p.BarCode.Contains(search)
                    || (scannedId != null && p.Id == scannedId
                        && (unitPayload == null || context!.ProductUnits.Any(u => u.ProductId == p.Id && u.BarcodePayload == unitPayload))));
            }

            if (!string.IsNullOrEmpty(request.Name))
            {
                var name = request.Name.Split(' ', StringSplitOptions.RemoveEmptyEntries);
                foreach (var word in name)
                {
                    query = query.Where(p => p.Name.Contains(word) || (p.EnglishName != null && p.EnglishName.Contains(word)));
                }
            }

            // A whole code means that product only: codes have dashes and no zero padding, so "14050512-12" is also a
            // substring of "14050512-123". Anything that matches no code exactly is still a partial search.
            if (!string.IsNullOrEmpty(request.Code))
            {
                var code = request.Code.Trim();
                query = await query.AnyAsync(p => p.Code == code, cancellationToken)
                    ? query.Where(p => p.Code == code)
                    : query.Where(p => p.Code.Contains(code));
            }

            if (!string.IsNullOrEmpty(request.BarCode))
            {
                var barCode = request.BarCode.Trim();
                query = await query.AnyAsync(p => p.BarCode == barCode, cancellationToken)
                    ? query.Where(p => p.BarCode == barCode)
                    : query.Where(p => p.BarCode.Contains(barCode));
            }

            if (!string.IsNullOrEmpty(request.Brand))
            {
                query = query.Where(p => p.Brand.Contains(request.Brand));
            }

            if (request.ProductCategoryId.HasValue)
            {
                query = query.Where(p => p.ProductCategoryId == request.ProductCategoryId);
            }

            if (request.VehicleId.HasValue)
            {
                var vehicleId = request.VehicleId.Value;
                query = query.Where(p => !p.Vehicles.Any() || p.Vehicles.Any(v => v.VehicleId == vehicleId));
            }

            if(request.IsLowOnStock.HasValue && request.IsLowOnStock.Value)
            {
                query = query.Where(p => p.Stock <= p.LowStockThreshold);
            }
            
            if(request.IsLowOnStock.HasValue && !request.IsLowOnStock.Value)
            {
                query = query.Where(p => p.Stock > p.LowStockThreshold);
            }
            
            if (request.FromPrice.HasValue)
            {
                query = query.Where(p => p.RetailPrice >= request.FromPrice);
            }

            if (request.ToPrice.HasValue)
            {
                query = query.Where(p => p.RetailPrice <= request.ToPrice);
            }

            if (request.IsIncomplete.HasValue)
            {
                query = query.Where(p => p.IsIncomplete == request.IsIncomplete.Value);
            }

            return query;
        }

        /// <summary>What a Search names exactly: the trimmed text, and the product a scanned code/unit barcode points at.</summary>
        public sealed record SearchMatch(string Code, int? ProductId, string? UnitPayload);

        public static SearchMatch? ExactSearchMatch(string? search, IWMSDbContext? context, IProductCodeService? productCodeService)
        {
            if (string.IsNullOrWhiteSpace(search))
                return null;

            var text = search.Trim();
            if (productCodeService == null || context == null)
                return new SearchMatch(text, null, null);

            var reference = productCodeService.Parse(text);
            return reference.Kind switch
            {
                Domain.Enums.BarcodeReferenceKindEnum.PRODUCT => new SearchMatch(text, reference.ProductId, null),
                Domain.Enums.BarcodeReferenceKindEnum.UNIT => new SearchMatch(text, reference.ProductId, reference.NormalizedPayload),
                _ => new SearchMatch(text, null, null),
            };
        }
    }
}
