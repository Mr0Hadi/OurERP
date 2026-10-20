using Application.Common.Audit;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.ProductUnit;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Contracts.UserContextService;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Warehousing.Queries;
using Domain.Enums;
using MediatR;

namespace Application.Features.Warehousing.Commands
{
    /// <summary>
    /// A transfer called back before it arrived: its units go back on the source shelf and into Product.Stock. Allowed even after
    /// multi-warehouse is switched off (CLAUDE.md 6b).
    /// </summary>
    [AuditAction(AuditActionEnum.CancelStockTransfer)]
    public class CancelStockTransferCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class CancelStockTransferCommandHandler : IRequestHandler<CancelStockTransferCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IProductUnitService _productUnitService;
        private readonly IUserContextService _userContextService;
        private readonly IUnitOfWork _unitOfWork;

        public CancelStockTransferCommandHandler(IWMSDbContext context, IProductUnitService productUnitService, IUserContextService userContextService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _productUnitService = productUnitService;
            _userContextService = userContextService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(CancelStockTransferCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var transfer = await StockTransferLoader.InTransitAsync(_context, request.Id, cancellationToken);
            var now = DateTime.Now;
            await StockTransferLoader.LandAsync(_context, _productUnitService, transfer, transfer.FromWarehouseId,
                new UnitMovementContext(ProductUnitMovementReasonEnum.STOCK_TRANSFER_CANCELLED, now, Note: transfer.TransferNumber), cancellationToken);

            transfer.Status = StockTransferStatusEnum.CANCELLED;
            transfer.CancelledAt = now;
            transfer.CancelledByUserId = int.TryParse(_userContextService.GetUserId(), out var id) ? id : null;
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await StockTransferReader.ReadAsync(_context, transfer.Id, cancellationToken);
            res.Message = "حواله لغو شد و کالا به انبار مبدأ برگشت.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
