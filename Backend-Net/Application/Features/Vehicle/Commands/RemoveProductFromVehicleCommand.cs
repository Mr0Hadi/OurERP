using Application.Common.Contracts.Context;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Common.Exceptions;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Application.Common.Audit;
using Domain.Enums;

namespace Application.Features.Vehicle.Commands
{
    [AuditAction(AuditActionEnum.RemoveProductFromVehicle)]
    public class RemoveProductFromVehicleCommand : IRequest<ResponseDto>
    {
        public int VehicleId { get; set; }
        public int ProductId { get; set; }
    }

    /// <summary>
    /// Unlinks one product from one vehicle. When that was the product's last vehicle it becomes an all-vehicles product;
    /// <c>BecameUniversal</c> in the response tells the frontend so.
    /// </summary>
    public class RemoveProductFromVehicleCommandHandler : IRequestHandler<RemoveProductFromVehicleCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IUnitOfWork _unitOfWork;

        public RemoveProductFromVehicleCommandHandler(IWMSDbContext context, IUnitOfWork unitOfWork)
        {
            _context = context;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(RemoveProductFromVehicleCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();
            var link = await _context.ProductVehicles
                .FirstOrDefaultAsync(x => x.VehicleId == request.VehicleId && x.ProductId == request.ProductId && x.Vehicle.IsActive, cancellationToken)
                ?? throw new NotFoundCustomException("این کالا برای این خودرو ثبت نشده است.");

            var becameUniversal = !await _context.ProductVehicles.AnyAsync(x => x.ProductId == request.ProductId && x.VehicleId != request.VehicleId, cancellationToken);

            _context.ProductVehicles.Remove(link);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = new { BecameUniversal = becameUniversal };
            res.Message = becameUniversal
                ? "کالا از خودرو حذف شد و چون خودروی دیگری ندارد، برای همه‌ی خودروها حساب می‌شود."
                : "کالا از خودرو حذف شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
