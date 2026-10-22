using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Reorder.Dtos;
using Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Reorder.Queries
{
    /// <summary>
    /// What to buy (GAP-04): every active product whose free stock plus what is still on order has fallen to its reorder point
    /// (Product.LowStockThreshold, above 0), with a suggested quantity and supplier. Draft purchases count as on order, so
    /// suggestions turned into drafts (CreatePurchaseDraftsFromReorder) stop being suggested. Sorted by supplier, then product.
    /// Not paged: it is a working list for one buyer, and CreatePurchaseDraftsFromReorder takes any subset of it.
    /// </summary>
    public class GetReorderSuggestionListQuery : IRequest<ResponseDto>
    {
        public int? SupplierId { get; set; }
        public int? ProductCategoryId { get; set; }

        /// <summary>Product name, code or brand, contains.</summary>
        public string? Search { get; set; }
    }

    public class GetReorderSuggestionListQueryHandler : IRequestHandler<GetReorderSuggestionListQuery, ResponseDto>
    {
        private static readonly PurchaseStatusEnum[] OpenStatuses =
            { PurchaseStatusEnum.PROFORMA, PurchaseStatusEnum.PENDING, PurchaseStatusEnum.SHIPPED, PurchaseStatusEnum.PARTIALLY_RECEIVED };

        private readonly IWMSDbContext _context;

        public GetReorderSuggestionListQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        public async Task<ResponseDto> Handle(GetReorderSuggestionListQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();
            var open = OpenStatuses;

            var query = _context.Products.AsNoTracking().Where(x => x.IsActive && x.LowStockThreshold > 0);
            if (request.ProductCategoryId.HasValue)
                query = query.Where(x => x.ProductCategoryId == request.ProductCategoryId);
            if (!string.IsNullOrWhiteSpace(request.Search))
            {
                var search = request.Search.Trim();
                query = query.Where(x => x.Name.Contains(search) || x.Code.Contains(search) || (x.Brand != null && x.Brand.Contains(search)));
            }

            var rows = await query
                .Select(x => new
                {
                    x.Id,
                    x.Code,
                    x.Name,
                    x.Brand,
                    x.ProductCategoryId,
                    CategoryName = x.ProductCategory.Name,
                    x.Stock,
                    x.LowStockThreshold,
                    x.TargetStock,
                    x.MinOrderQuantity,
                    x.LeadTimeDays,
                    x.PreferredSupplierId,
                    PreferredSupplierName = x.PreferredSupplier != null ? x.PreferredSupplier.CompanyName : null,
                    x.PurchasePrice,
                    OnOrder = _context.PurchaseItems
                        .Where(i => i.ProductId == x.Id && i.Purchase.IsActive && open.Contains(i.Purchase.Status))
                        .Sum(i => (int?)(i.Quantity - i.ReceivedQuantity - i.ShortClosedQuantity > 0 ? i.Quantity - i.ReceivedQuantity - i.ShortClosedQuantity : 0)) ?? 0,
                    Last = _context.PurchaseItems
                        .Where(i => i.ProductId == x.Id && i.Purchase.IsActive && i.Purchase.Status != PurchaseStatusEnum.CANCELLED)
                        .OrderByDescending(i => i.PurchaseId).ThenByDescending(i => i.Id)
                        .Select(i => new { i.Purchase.SupplierId, i.Purchase.Supplier.CompanyName, i.UnitPrice })
                        .FirstOrDefault(),
                })
                .Where(x => x.Stock + x.OnOrder <= x.LowStockThreshold)
                .ToListAsync(cancellationToken);

            var suggestions = rows.Select(x =>
            {
                var position = x.Stock + x.OnOrder;
                var target = x.TargetStock ?? x.LowStockThreshold;
                var minOrder = Math.Max(1, x.MinOrderQuantity ?? 1);
                var quantity = Math.Max(target - position, minOrder);
                quantity = (int)Math.Ceiling(quantity / (double)minOrder) * minOrder;
                return new ReorderSuggestionDto
                {
                    ProductId = x.Id,
                    ProductCode = x.Code,
                    ProductName = x.Name,
                    Brand = x.Brand,
                    ProductCategoryId = x.ProductCategoryId,
                    ProductCategoryName = x.CategoryName,
                    Stock = x.Stock,
                    OnOrder = x.OnOrder,
                    ReorderPoint = x.LowStockThreshold,
                    TargetStock = x.TargetStock,
                    MinOrderQuantity = x.MinOrderQuantity,
                    LeadTimeDays = x.LeadTimeDays,
                    SuggestedQuantity = quantity,
                    SupplierId = x.PreferredSupplierId ?? x.Last?.SupplierId,
                    SupplierName = x.PreferredSupplierName ?? x.Last?.CompanyName,
                    IsPreferredSupplier = x.PreferredSupplierId.HasValue,
                    LastUnitPrice = x.Last?.UnitPrice ?? x.PurchasePrice,
                };
            })
            .Where(x => request.SupplierId == null || x.SupplierId == request.SupplierId)
            .OrderBy(x => x.SupplierName ?? "￿").ThenBy(x => x.ProductName).ThenBy(x => x.ProductId)
            .ToList();

            res.Data = suggestions;
            res.Message = "پیشنهاد خرید ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
