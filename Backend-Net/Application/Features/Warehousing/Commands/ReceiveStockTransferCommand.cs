using Application.Common.Audit;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.ProductUnit;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Contracts.UserContextService;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Warehousing.Queries;
using Common.Exceptions;
using Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Warehousing.Commands
{
    /// <summary>
    /// A transfer arrived: its units go on the destination's shelf and back into Product.Stock. Allowed even after
    /// multi-warehouse is switched off, so nothing is left in transit (CLAUDE.md 6b).
    /// </summary>
    [AuditAction(AuditActionEnum.ReceiveStockTransfer)]
    public class ReceiveStockTransferCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class ReceiveStockTransferCommandHandler : IRequestHandler<ReceiveStockTransferCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IProductUnitService _productUnitService;
        private readonly IUserContextService _userContextService;
        private readonly IUnitOfWork _unitOfWork;

        public ReceiveStockTransferCommandHandler(IWMSDbContext context, IProductUnitService productUnitService, IUserContextService userContextService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _productUnitService = productUnitService;
            _userContextService = userContextService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(ReceiveStockTransferCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var transfer = await StockTransferLoader.InTransitAsync(_context, request.Id, cancellationToken);
            var now = DateTime.Now;
            await StockTransferLoader.LandAsync(_context, _productUnitService, transfer, transfer.ToWarehouseId,
                new UnitMovementContext(ProductUnitMovementReasonEnum.STOCK_TRANSFER_RECEIVED, now, Note: transfer.TransferNumber), cancellationToken);

            transfer.Status = StockTransferStatusEnum.RECEIVED;
            transfer.ReceivedAt = now;
            transfer.ReceivedByUserId = int.TryParse(_userContextService.GetUserId(), out var id) ? id : null;
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await StockTransferReader.ReadAsync(_context, transfer.Id, cancellationToken);
            res.Message = "حواله تحویل شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }

    internal static class StockTransferLoader
    {
        public static async Task<Domain.Entities.StockTransfer> InTransitAsync(IWMSDbContext context, int id, CancellationToken cancellationToken)
        {
            var transfer = await context.StockTransfers
                .Include(x => x.Units).ThenInclude(x => x.ProductUnit)
                .FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
                ?? throw new NotFoundCustomException("حواله‌ی مورد نظر یافت نشد.");
            if (transfer.Status != StockTransferStatusEnum.IN_TRANSIT)
                throw new ValidationCustomException("این حواله دیگر در راه نیست.");
            return transfer;
        }

        /// <summary>Puts the transfer's units on <paramref name="warehouseId"/>'s shelf and adds them back to their products' Stock.</summary>
        public static async Task LandAsync(IWMSDbContext context, IProductUnitService productUnitService, Domain.Entities.StockTransfer transfer, int warehouseId, UnitMovementContext movement, CancellationToken cancellationToken)
        {
            var units = transfer.Units.Select(x => x.ProductUnit).Where(u => u.Status == ProductUnitStatusEnum.IN_TRANSIT).ToList();
            await productUnitService.PlaceInStockAsync(units, warehouseId, movement, cancellationToken);

            var counts = units.GroupBy(u => u.ProductId).ToDictionary(g => g.Key, g => g.Count());
            var products = await context.Products.Where(x => counts.Keys.Contains(x.Id)).ToListAsync(cancellationToken);
            foreach (var product in products)
                product.Stock += counts[product.Id];
        }
    }
}
