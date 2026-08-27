using Application.Common.Contracts.Context;
using Application.Common.Contracts.PurchaseReturn;
using Application.Common.Dtos;
using Application.Common.Enums;
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
        private readonly IPurchaseReturnQueryService _purchaseReturnQueryService;

        public GetPurchaseReturnPendingEffectsQueryHandler(IWMSDbContext context, IPurchaseReturnQueryService purchaseReturnQueryService)
        {
            _context = context;
            _purchaseReturnQueryService = purchaseReturnQueryService;
        }

        public async Task<ResponseDto> Handle(GetPurchaseReturnPendingEffectsQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var query = _context.PurchaseReturns.AsQueryable();

            if (request.PurchaseId.HasValue)
                query = query.Where(x => x.PurchaseId == request.PurchaseId.Value);

            var returns = await _purchaseReturnQueryService.WithReturnGraph(query).ToListAsync(cancellationToken);

            var pending = returns
                .SelectMany(r => r.Claims.SelectMany(c => c.Resolutions.SelectMany(res => res.Effects.Select(e => (returnDoc: r, claim: c, effect: e)))))
                .Where(x => x.effect.Status == ReturnEffectStatusEnum.PENDING)
                .Select(x => new PendingEffectDto
                {
                    EffectId = x.effect.Id,
                    PurchaseReturnId = x.returnDoc.Id,
                    ReturnNumber = x.returnDoc.ReturnNumber,
                    ClaimId = x.claim.Id,
                    Kind = x.effect.Kind,
                    ProductId = x.effect.ProductId ?? x.claim.ProductId,
                    ProductCode = x.claim.Product?.Code ?? string.Empty,
                    ProductName = x.claim.Product?.Name ?? string.Empty,
                    Unit = x.claim.Product?.Unit.GetDescription() ?? string.Empty,
                    Quantity = x.effect.Quantity,
                    DoneQuantity = x.effect.DoneQuantity,
                    RemainingQuantity = x.effect.UndoneQuantity,
                })
                .ToList();

            res.Data = new { PendingEffects = pending };
            res.Message = "لیست اثرهای در انتظار با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
