using Application.Common.Contracts.SaleReturn;
using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Dtos.Returns;
using Application.Common.Enums;
using Application.Common.Returns;
using Application.Features.SaleReturn.Commands;
using Common.Exceptions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.SaleReturn.Queries
{
    /// <summary>
    /// POST api/SaleReturn/PreviewResolution (frontend-requests 13.4): the AddClaimResolution body, checked and expanded by the
    /// same code (the command's validator, then SaleResolutionChecks.PrepareAsync) and never saved. A refusal is part of the
    /// answer (isValid = false + errors), not a 400, so the form can call it on every change. A claim that does not exist is 404.
    /// </summary>
    public class PreviewClaimResolutionQuery : IRequest<ResponseDto>
    {
        public int ClaimId { get; set; }
        public EffectCompositionDto Composition { get; set; } = new();
    }

    public class PreviewClaimResolutionQueryHandler : IRequestHandler<PreviewClaimResolutionQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly ISaleReturnCalculationService _calc;

        public PreviewClaimResolutionQueryHandler(IWMSDbContext context, ISaleReturnCalculationService calc)
        {
            _context = context;
            _calc = calc;
        }

        public async Task<ResponseDto> Handle(PreviewClaimResolutionQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var unitPrice = await _context.SaleReturnClaims.AsNoTracking()
                .Where(c => c.Id == request.ClaimId)
                .Select(c => (ulong?)c.UnitPrice)
                .FirstOrDefaultAsync(cancellationToken)
                ?? throw new NotFoundCustomException("ادعای مورد نظر یافت نشد.");
            var suggested = ResolutionPreview.Suggested(request.Composition?.Quantity ?? 0, unitPrice);

            var command = new AddClaimResolutionCommand { ClaimId = request.ClaimId, Composition = request.Composition! };
            var validation = await new AddClaimResolutionCommandValidator().ValidateAsync(command, cancellationToken);

            ResolutionPreviewDto preview;
            if (!validation.IsValid)
            {
                preview = ResolutionPreview.Invalid(validation, suggested);
            }
            else
            {
                try
                {
                    var (_, _, effects, _) = await SaleResolutionChecks.PrepareAsync(_context, _calc, command, cancellationToken);
                    preview = new ResolutionPreviewDto
                    {
                        IsValid = true,
                        SuggestedMoneyAmount = suggested,
                        Effects = effects.Select(e => new ResolutionPreviewEffectDto
                        {
                            Direction = e.Direction,
                            Quantity = e.Quantity,
                            ProductId = e.ProductId,
                            UnitPrice = e.UnitPrice,
                            Amount = e.Amount,
                            Method = e.Method,
                            Status = e.Status,
                        }).ToList(),
                    };
                }
                catch (ValidationCustomException refusal)
                {
                    preview = ResolutionPreview.Invalid(refusal, suggested);
                }
            }

            res.Data = preview;
            res.Message = preview.IsValid ? "این تصمیم قابل ثبت است." : "این تصمیم با این مقادیر قابل ثبت نیست.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
