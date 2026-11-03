using Application.Common.Contracts.ProductUnit;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.PurchaseReturn;
using Application.Common.Contracts.Storage;
using Application.Common.Dtos;
using Application.Common.Dtos.Returns;
using Application.Common.Enums;
using Application.Common.Queries;
using Application.Features.PurchaseReturn.Dtos;
using Common.Exceptions;
using Common.Extensions;
using Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.PurchaseReturn.Queries
{
    /// <summary>Backs the warehouse receiving screen: for a purchase, how much of each item is still expected.</summary>
    public class GetPurchaseReceivingInfoQuery : IRequest<ResponseDto>
    {
        public int PurchaseId { get; set; }
    }

    public class GetPurchaseReceivingInfoQueryHandler : IRequestHandler<GetPurchaseReceivingInfoQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IObjectStorageService _objectStorageService;
        private readonly IPurchaseReturnCalculationService _purchaseReturnCalculationService;

        public GetPurchaseReceivingInfoQueryHandler(IWMSDbContext context, IObjectStorageService objectStorageService,
            IPurchaseReturnCalculationService purchaseReturnCalculationService)
        {
            _context = context;
            _objectStorageService = objectStorageService;
            _purchaseReturnCalculationService = purchaseReturnCalculationService;
        }

        public async Task<ResponseDto> Handle(GetPurchaseReceivingInfoQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var purchase = await _context.Purchases
                .Where(x => x.Id == request.PurchaseId)
                .Include(x => x.Supplier)
                .Include(x => x.Items)
                .ThenInclude(x => x.Product)
                .FirstOrDefaultAsync(cancellationToken) ?? throw new NotFoundCustomException("خرید مورد نظر یافت نشد.");

            var receivingImages = await _context.PurchaseReceivingImages
                .Where(x => x.PurchaseId == request.PurchaseId)
                .OrderBy(x => x.CreatedAt)
                .ToListAsync(cancellationToken);

            var held = await _context.ProductUnits
                .Where(u => u.PurchaseId == request.PurchaseId && u.Status == ProductUnitStatusEnum.QUARANTINED)
                .GroupBy(u => new { u.CustodyReason, u.PurchaseItemId, u.ProductId })
                .Select(g => new { g.Key.CustodyReason, g.Key.PurchaseItemId, g.Key.ProductId, Count = g.Count() })
                .ToListAsync(cancellationToken);

            // The same open returns CreatePurchaseReturn and AcceptPurchaseExcess read, so the free/claimable numbers below are
            // exactly the caps those handlers enforce.
            var openReturns = await _context.PurchaseReturns
                .AsNoTracking()
                .Where(x => x.PurchaseId == request.PurchaseId)
                .WhereNotDeleted()
                .WhereOpen()
                .WithReturnGraph()
                .ToListAsync(cancellationToken);

            var discrepancies = await _context.PurchaseReceivingDiscrepancies
                .Where(x => x.PurchaseId == request.PurchaseId)
                .OrderBy(x => x.ReceivedAt)
                .ThenBy(x => x.Id)
                .Select(x => new PurchaseReceivingDiscrepancyDto
                {
                    Id = x.Id,
                    PurchaseItemId = x.PurchaseItemId,
                    ProductId = x.ProductId,
                    ProductName = x.Product!.Name,
                    CustodyReason = x.CustodyReason,
                    Problem = x.Problem,
                    Quantity = x.Quantity,
                    Note = x.Note,
                    ReceivedAt = x.ReceivedAt,
                })
                .ToListAsync(cancellationToken);

            // 14.1: every claim of this purchase's live returns (rejected/cancelled ones claim nothing).
            var otherClaims = await _context.PurchaseReturnClaims.AsNoTracking()
                .Where(c => c.PurchaseReturn!.PurchaseId == request.PurchaseId && c.PurchaseReturn.IsActive
                    && c.PurchaseReturn.Status != ReturnStatusEnum.REJECTED && c.PurchaseReturn.Status != ReturnStatusEnum.CANCELLED)
                .OrderBy(c => c.PurchaseReturnId).ThenBy(c => c.Id)
                .Select(c => new
                {
                    c.PurchaseItemId,
                    c.ProductId,
                    Dto = new Application.Common.Dtos.Returns.OtherReturnClaimDto
                    {
                        ReturnId = c.PurchaseReturnId,
                        ReturnNumber = c.PurchaseReturn!.ReturnNumber,
                        Status = c.PurchaseReturn.Status,
                        OffScopeKind = c.OffScopeKind,
                        Quantity = c.Quantity,
                    },
                })
                .ToListAsync(cancellationToken);

            var unlistedIds = held.Where(h => h.CustodyReason == UnitCustodyReasonEnum.UNLISTED).Select(h => h.ProductId).Distinct().ToList();
            var unlistedProducts = await _context.Products
                .Where(p => unlistedIds.Contains(p.Id))
                .ToListAsync(cancellationToken);

            var info = new PurchaseReceivingInfoDto
            {
                PurchaseId = purchase.Id,
                InvoiceNumber = purchase.InvoiceNumber,
                InvoiceDate = purchase.InvoiceDate,
                Status = purchase.Status,
                SupplierId = purchase.SupplierId,
                SupplierName = purchase.Supplier.CompanyName,
                ReceivingImages = receivingImages.Select(img => new PurchaseReceivingImageDto
                {
                    Id = img.Id,
                    PurchaseId = img.PurchaseId,
                    PurchaseReturnId = img.PurchaseReturnId,
                    ObjectKey = img.ObjectKey,
                    Url = _objectStorageService.GetFixedUrl(img.ObjectKey),
                    FileName = img.FileName,
                    Note = img.Note,
                    UploadedAt = img.CreatedAt,
                }).ToList(),
                Items = purchase.Items.Select(item =>
                {
                    var quarantinedExcess = held.Where(h => h.CustodyReason == UnitCustodyReasonEnum.EXCESS && h.PurchaseItemId == item.Id).Sum(h => h.Count);
                    var quarantinedOnLine = held.Where(h => h.PurchaseItemId == item.Id && h.CustodyReason is UnitCustodyReasonEnum.ON_ORDER
                        or UnitCustodyReasonEnum.CUSTOMER_RETURN or UnitCustodyReasonEnum.WAREHOUSE_HOLD).Sum(h => h.Count);
                    var lineGroup = new UnitSelection(ProductUnitStatusEnum.QUARANTINED, purchase.Id, item.Id, UnitCustodyReasonEnum.ON_ORDER, IncludeLineHolds: true);
                    var excessGroup = new UnitSelection(ProductUnitStatusEnum.QUARANTINED, purchase.Id, item.Id, UnitCustodyReasonEnum.EXCESS);
                    return new PurchaseReceivingItemInfoDto
                    {
                        PurchaseItemId = item.Id,
                        ProductId = item.ProductId,
                        ProductCode = item.Product.Code,
                        ProductName = item.Product.Name,
                        Unit = item.Product.Unit.GetDescription(),
                        UnitPrice = item.UnitPrice,
                        OrderedQuantity = item.Quantity,
                        ReceivedQuantity = item.ReceivedQuantity,
                        StillOwedQuantity = item.StillOwedQuantity,
                        ShortClosedQuantity = item.ShortClosedQuantity,
                        SupplementOfPurchaseItemId = item.SupplementOfPurchaseItemId,
                        TotalAmount = item.TotalAmount,
                        RequiresUnitTracking = item.Product.RequiresUnitTracking,
                        Brand = item.Product.Brand,
                        ImageKey = item.Product.ImageUrl,
                        ImageUrl = _objectStorageService.GetFixedUrl(item.Product.ImageUrl),
                        QuarantinedOnOrderQuantity = held.Where(h => h.CustodyReason == UnitCustodyReasonEnum.ON_ORDER && h.PurchaseItemId == item.Id).Sum(h => h.Count),
                        QuarantinedCustomerReturnQuantity = held.Where(h => h.CustodyReason == UnitCustodyReasonEnum.CUSTOMER_RETURN && h.PurchaseItemId == item.Id).Sum(h => h.Count),
                        QuarantinedWarehouseHoldQuantity = held.Where(h => h.CustodyReason == UnitCustodyReasonEnum.WAREHOUSE_HOLD && h.PurchaseItemId == item.Id).Sum(h => h.Count),
                        FreeQuarantinedOnOrderQuantity = Math.Max(0, quarantinedOnLine - _purchaseReturnCalculationService.GetReservedQuarantineQuantity(lineGroup, item.ProductId, purchase.Id, openReturns)),
                        QuarantinedExcessQuantity = quarantinedExcess,
                        FreeExcessQuantity = Math.Max(0, quarantinedExcess - _purchaseReturnCalculationService.GetReservedQuarantineQuantity(excessGroup, item.ProductId, purchase.Id, openReturns)),
                        ClaimableQuantity = _purchaseReturnCalculationService.GetClaimableQuantity(item, openReturns),
                        OtherReturnClaims = otherClaims.Where(c => c.PurchaseItemId == item.Id && c.Dto.OffScopeKind != ReturnOffScopeKindEnum.UNLISTED)
                            .Select(c => c.Dto).ToList(),
                    };
                }).ToList(),
                UnlistedItems = unlistedProducts.Select(p =>
                {
                    var quarantined = held.Where(h => h.CustodyReason == UnitCustodyReasonEnum.UNLISTED && h.ProductId == p.Id).Sum(h => h.Count);
                    return new PurchaseReceivingUnlistedInfoDto
                    {
                        ProductId = p.Id,
                        ProductCode = p.Code,
                        ProductName = p.Name,
                        Unit = p.Unit.GetDescription(),
                        RequiresUnitTracking = p.RequiresUnitTracking,
                        Brand = p.Brand,
                        ImageKey = p.ImageUrl,
                        ImageUrl = _objectStorageService.GetFixedUrl(p.ImageUrl),
                        QuarantinedQuantity = quarantined,
                        FreeQuantity = Math.Max(0, quarantined - _purchaseReturnCalculationService.GetReservedQuarantineQuantity(
                            new UnitSelection(ProductUnitStatusEnum.QUARANTINED, purchase.Id, null, UnitCustodyReasonEnum.UNLISTED), p.Id, purchase.Id, openReturns)),
                        OtherReturnClaims = otherClaims.Where(c => c.ProductId == p.Id && c.Dto.OffScopeKind == ReturnOffScopeKindEnum.UNLISTED)
                            .Select(c => c.Dto).ToList(),
                    };
                }).ToList(),
                Discrepancies = discrepancies,
            };
            // Ordered goods in quarantine that an open ON_ORDER claim already covers are not suggested again: an ON_ORDER claim
            // reserves the line's quota, not quarantine units, so FreeQuarantinedOnOrderQuantity alone does not see it.
            var openOnOrderClaims = openReturns.SelectMany(r => r.Claims)
                .Where(c => c.OnOrderPurchaseItemId.HasValue)
                .GroupBy(c => c.OnOrderPurchaseItemId!.Value)
                .ToDictionary(g => g.Key, g => g.Sum(c => c.RemainingQuantity));
            info.SuggestedClaims = SuggestedClaims(info, openOnOrderClaims);
            res.Data = info;

            res.Message = "اطلاعات دریافت خرید با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }

        /// <summary>14.6: the "record a discrepancy" prefill, built from the free numbers above (the caps CreatePurchaseReturn enforces).</summary>
        private static List<CreateReturnClaimDto> SuggestedClaims(PurchaseReceivingInfoDto info, IReadOnlyDictionary<int, int> openOnOrderClaims)
        {
            ReturnProblemEnum Dominant(Func<PurchaseReceivingDiscrepancyDto, bool> matches, ReturnProblemEnum fallback) =>
                info.Discrepancies.Where(matches)
                    .GroupBy(d => d.Problem)
                    .Select(g => new { Problem = g.Key, Quantity = g.Sum(d => d.Quantity) })
                    .Where(g => g.Quantity > 0)
                    .OrderByDescending(g => g.Quantity).ThenBy(g => g.Problem)
                    .Select(g => (ReturnProblemEnum?)g.Problem)
                    .FirstOrDefault() ?? fallback;

            var claims = new List<CreateReturnClaimDto>();
            foreach (var item in info.Items)
            {
                var onOrder = Math.Min(item.FreeQuarantinedOnOrderQuantity - openOnOrderClaims.GetValueOrDefault(item.PurchaseItemId), item.ClaimableQuantity);
                if (onOrder > 0)
                    claims.Add(new CreateReturnClaimDto
                    {
                        Scope = ReturnClaimScopeEnum.ON_ORDER,
                        OrderLineId = item.PurchaseItemId,
                        ProductId = item.ProductId,
                        UnitPrice = item.UnitPrice,
                        Quantity = onOrder,
                        Problem = Dominant(d => d.PurchaseItemId == item.PurchaseItemId && d.CustodyReason == UnitCustodyReasonEnum.ON_ORDER, ReturnProblemEnum.DEFECTIVE),
                    });

                if (item.FreeExcessQuantity > 0)
                    claims.Add(new CreateReturnClaimDto
                    {
                        Scope = ReturnClaimScopeEnum.OFF_ORDER,
                        OffScopeKind = ReturnOffScopeKindEnum.EXCESS,
                        OrderLineId = item.PurchaseItemId,
                        ProductId = item.ProductId,
                        UnitPrice = item.UnitPrice,
                        Quantity = item.FreeExcessQuantity,
                        Problem = Dominant(d => d.PurchaseItemId == item.PurchaseItemId && d.CustodyReason == UnitCustodyReasonEnum.EXCESS, ReturnProblemEnum.OVER_SHIPPED),
                    });
            }

            // Nothing was paid for unlisted goods: the price is the user's to agree, so 0.
            foreach (var item in info.UnlistedItems.Where(u => u.FreeQuantity > 0))
                claims.Add(new CreateReturnClaimDto
                {
                    Scope = ReturnClaimScopeEnum.OFF_ORDER,
                    OffScopeKind = ReturnOffScopeKindEnum.UNLISTED,
                    ProductId = item.ProductId,
                    UnitPrice = 0,
                    Quantity = item.FreeQuantity,
                    Problem = ReturnProblemEnum.UNLISTED_ITEM,
                });

            return claims;
        }
    }
}
