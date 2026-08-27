using Application.Common.Contracts.Context;
using Application.Common.Contracts.SaleReturn;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.SaleReturn.Dtos;
using Common.Extensions;
using Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.SaleReturn.Queries
{
    // Successor to GetSaleReturnInspectionInfoQuery and GetReplacementShippingQueueQuery,
    // generalized: every PENDING goods effect (a customer's return still awaiting inspection, or a
    // replacement still owed to them) across a sale's active returns, awaiting an
    // ExecuteGoodsRoundCommand.
    public class GetSaleReturnPendingEffectsQuery : IRequest<ResponseDto>
    {
        public int? SaleId { get; set; }
    }

    public class GetSaleReturnPendingEffectsQueryHandler : IRequestHandler<GetSaleReturnPendingEffectsQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly ISaleReturnQueryService _saleReturnQueryService;

        public GetSaleReturnPendingEffectsQueryHandler(IWMSDbContext context, ISaleReturnQueryService saleReturnQueryService)
        {
            _context = context;
            _saleReturnQueryService = saleReturnQueryService;
        }

        public async Task<ResponseDto> Handle(GetSaleReturnPendingEffectsQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var query = _context.SaleReturns.AsQueryable();

            if (request.SaleId.HasValue)
                query = query.Where(x => x.SaleId == request.SaleId.Value);

            var returns = await _saleReturnQueryService.WithReturnGraph(query).ToListAsync(cancellationToken);

            var pending = returns
                .SelectMany(r => r.Claims.SelectMany(c => c.Resolutions.SelectMany(res => res.Effects.Select(e => (returnDoc: r, claim: c, effect: e)))))
                .Where(x => x.effect.Status == ReturnEffectStatusEnum.PENDING)
                .Select(x => new PendingEffectDto
                {
                    EffectId = x.effect.Id,
                    SaleReturnId = x.returnDoc.Id,
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
