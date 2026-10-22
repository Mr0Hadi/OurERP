using Application.Common.Audit;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Contracts.UserContextService;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Stocktaking.Queries;
using Domain.Enums;
using MediatR;

namespace Application.Features.Stocktaking.Commands
{
    /// <summary>Counting is done: COUNTING -> SUBMITTED. Counts are frozen and the differences shown (even with blind count on).</summary>
    [AuditAction(AuditActionEnum.SubmitStocktake)]
    public class SubmitStocktakeCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class SubmitStocktakeCommandHandler : IRequestHandler<SubmitStocktakeCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IUserContextService _userContextService;
        private readonly IUnitOfWork _unitOfWork;

        public SubmitStocktakeCommandHandler(IWMSDbContext context, IUserContextService userContextService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _userContextService = userContextService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(SubmitStocktakeCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();
            var stocktake = await StocktakeLoader.LoadAsync(_context, request.Id, cancellationToken, StocktakeStatusEnum.COUNTING);
            stocktake.Status = StocktakeStatusEnum.SUBMITTED;
            stocktake.SubmittedAt = DateTime.Now;
            stocktake.SubmittedByUserId = int.TryParse(_userContextService.GetUserId(), out var id) ? id : null;
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await StocktakeReader.ReadAsync(_context, stocktake.Id, cancellationToken);
            res.Message = "شمارش بسته شد و اختلاف‌ها آماده‌ی تأیید است.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
