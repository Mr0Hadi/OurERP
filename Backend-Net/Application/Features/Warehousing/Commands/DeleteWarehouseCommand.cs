using Application.Common.Audit;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Common.Exceptions;
using Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Warehousing.Commands
{
    /// <summary>
    /// Deactivates a warehouse (soft delete). Refused for the default warehouse and while it still holds anything - units on
    /// its shelf, in its quarantine, reserved, or travelling to or from it - or an open stocktake: move or finish those first.
    /// Its history stays.
    /// </summary>
    [AuditAction(AuditActionEnum.DeleteWarehouse)]
    public class DeleteWarehouseCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class DeleteWarehouseCommandHandler : IRequestHandler<DeleteWarehouseCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IUnitOfWork _unitOfWork;

        public DeleteWarehouseCommandHandler(IWMSDbContext context, IUnitOfWork unitOfWork)
        {
            _context = context;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(DeleteWarehouseCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var warehouse = await _context.Warehouses.FirstOrDefaultAsync(x => x.Id == request.Id && x.IsActive, cancellationToken)
                ?? throw new NotFoundCustomException("انبار مورد نظر یافت نشد.");
            if (warehouse.IsDefault)
                throw new ValidationCustomException("انبار پیش‌فرض حذف نمی‌شود.");

            var holds = await _context.ProductUnits.AnyAsync(x => x.WarehouseId == warehouse.Id
                && (x.Status == ProductUnitStatusEnum.IN_STOCK || x.Status == ProductUnitStatusEnum.QUARANTINED
                    || x.Status == ProductUnitStatusEnum.RESERVED || x.Status == ProductUnitStatusEnum.IN_TRANSIT), cancellationToken);
            var travelling = await _context.StockTransfers.AnyAsync(x => x.Status == StockTransferStatusEnum.IN_TRANSIT
                && (x.FromWarehouseId == warehouse.Id || x.ToWarehouseId == warehouse.Id), cancellationToken);
            var counting = await _context.Stocktakes.AnyAsync(x => x.WarehouseId == warehouse.Id
                && (x.Status == StocktakeStatusEnum.COUNTING || x.Status == StocktakeStatusEnum.SUBMITTED), cancellationToken);
            if (holds || travelling || counting)
                throw new ValidationCustomException("این انبار هنوز کالا، حواله‌ی در راه یا انبارگردانی باز دارد؛ اول آن‌ها را جابه‌جا یا تمام کنید.");

            warehouse.IsActive = false;
            warehouse.UpdatedAt = DateTime.Now;
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = new { warehouse.Id };
            res.Message = "انبار غیرفعال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
