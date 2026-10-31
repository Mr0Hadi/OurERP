using Application.Common.Audit;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Stocktaking.Queries;
using Domain.Enums;
using MediatR;

namespace Application.Features.Stocktaking.Commands
{
    /// <summary>Back to counting (SUBMITTED -> COUNTING) - the approver wants something recounted.</summary>
    [AuditAction(AuditActionEnum.ReopenStocktake)]
    public class ReopenStocktakeCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class ReopenStocktakeCommandHandler : IRequestHandler<ReopenStocktakeCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IUnitOfWork _unitOfWork;

        public ReopenStocktakeCommandHandler(IWMSDbContext context, IUnitOfWork unitOfWork)
        {
            _context = context;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(ReopenStocktakeCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();
            var stocktake = await StocktakeLoader.LoadAsync(_context, request.Id, cancellationToken, StocktakeStatusEnum.SUBMITTED);
            stocktake.Status = StocktakeStatusEnum.COUNTING;
            stocktake.SubmittedAt = null;
            stocktake.SubmittedByUserId = null;
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await StocktakeReader.ReadAsync(_context, stocktake.Id, cancellationToken);
            res.Message = "انبارگردانی برای شمارش دوباره باز شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
