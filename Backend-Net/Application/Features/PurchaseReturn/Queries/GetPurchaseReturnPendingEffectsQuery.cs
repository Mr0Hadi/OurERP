using Application.Common.Contracts.Context;
using Application.Common.Contracts.PurchaseReturn;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Queries;
using Application.Features.PurchaseReturn.Dtos;
using Common.Extensions;
using Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.PurchaseReturn.Queries
{
    // Successor to GetPurchaseReceivingInfoQuery's open-issue list, generalized: every PENDING
    // goods effect (a replacement still owed by the supplier, or goods still owed back to them)
    // across a purchase's active returns, awaiting an ExecuteGoodsRoundCommand.
    public class GetPurchaseReturnPendingEffectsQuery : IRequest<ResponseDto>
    {
        public int? PurchaseId { get; set; }
    }

    public class GetPurchaseReturnPendingEffectsQueryHandler : IRequestHandler<GetPurchaseReturnPendingEffectsQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public GetPurchaseReturnPendingEffectsQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        public async Task<ResponseDto> Handle(GetPurchaseReturnPendingEffectsQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            // Open returns only: a REJECTED/CANCELLED return can still hold a goods effect that never
            // moved (both are legal while nothing has moved), and ExecuteGoodsRound refuses a terminal
            // return - so listing it would hand the warehouse work it cannot record.
            var query = _context.PurchaseReturns.WhereNotDeleted().WhereOpen();

            if (request.PurchaseId.HasValue)
                query = query.Where(x => x.PurchaseId == request.PurchaseId.Value);

            var returns = await query.Include(x => x.Purchase!).ThenInclude(p => p.Supplier).WithReturnGraph().ToListAsync(cancellationToken);

            var pending = returns
                .SelectMany(r => r.Claims.SelectMany(c => c.Resolutions.SelectMany(res => res.Effects.Select(e => (returnDoc: r, claim: c, effect: e)))))
                // Goods only: this is the warehouse queue, and a pending money effect is finance's to execute.
                .Where(x => x.effect.Status == ReturnEffectStatusEnum.PENDING && Application.Common.Returns.ReturnEffectDirections.IsGoods(x.effect.Direction))
                .Select(x => new PendingEffectDto
                {
                    EffectId = x.effect.Id,
                    PurchaseReturnId = x.returnDoc.Id,
                    ReturnNumber = x.returnDoc.ReturnNumber,
                    ReturnDate = x.returnDoc.ReturnDate,
                    PurchaseId = x.returnDoc.PurchaseId,
                    InvoiceNumber = x.returnDoc.Purchase?.InvoiceNumber ?? string.Empty,
                    SupplierName = x.returnDoc.Purchase?.Supplier?.CompanyName ?? string.Empty,
                    ClaimId = x.claim.Id,
                    Direction = x.effect.Direction,
                    ProductId = x.effect.ProductId ?? x.claim.ProductId,
                    ProductCode = (x.effect.Product ?? x.claim.Product)?.Code ?? string.Empty,
                    ProductName = (x.effect.Product ?? x.claim.Product)?.Name ?? string.Empty,
                    Unit = (x.effect.Product ?? x.claim.Product)?.Unit.GetDescription() ?? string.Empty,
                    Quantity = x.effect.Quantity,
                    AppliedQuantity = x.effect.AppliedQuantity,
                    RemainingQuantity = x.effect.RemainingQuantity,
                })
                .ToList();

            res.Data = new { PendingEffects = pending };
            res.Message = "لیست اثرهای در انتظار با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
