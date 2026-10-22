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
    /// <summary>Abandons a stocktake before approval. Nothing on the shelf changes; its counts stay readable.</summary>
    [AuditAction(AuditActionEnum.CancelStocktake)]
    public class CancelStocktakeCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class CancelStocktakeCommandHandler : IRequestHandler<CancelStocktakeCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IUnitOfWork _unitOfWork;

        public CancelStocktakeCommandHandler(IWMSDbContext context, IUnitOfWork unitOfWork)
        {
            _context = context;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(CancelStocktakeCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();
            var stocktake = await StocktakeLoader.LoadAsync(_context, request.Id, cancellationToken, StocktakeStatusEnum.COUNTING, StocktakeStatusEnum.SUBMITTED);
            stocktake.Status = StocktakeStatusEnum.CANCELLED;
            stocktake.CancelledAt = DateTime.Now;
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await StocktakeReader.ReadAsync(_context, stocktake.Id, cancellationToken);
            res.Message = "انبارگردانی لغو شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
