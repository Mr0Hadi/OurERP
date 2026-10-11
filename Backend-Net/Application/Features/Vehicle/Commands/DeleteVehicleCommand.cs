using Application.Common.Contracts.Context;
using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Common.Exceptions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Vehicle.Commands
{
    public class DeleteVehicleCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    /// <summary>
    /// Soft-deletes the vehicle and hard-deletes its product links, so no product keeps pointing at a vehicle nobody can
    /// see. A product whose only vehicle this was becomes an all-vehicles product; the response says how many did.
    /// </summary>
    public class DeleteVehicleCommandHandler : IRequestHandler<DeleteVehicleCommand, ResponseDto>
    {
        private readonly IVehicleRepository _vehicleRepository;
        private readonly IWMSDbContext _context;
        private readonly IUnitOfWork _unitOfWork;

        public DeleteVehicleCommandHandler(IVehicleRepository vehicleRepository, IWMSDbContext context, IUnitOfWork unitOfWork)
        {
            _vehicleRepository = vehicleRepository;
            _context = context;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(DeleteVehicleCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();
            var vehicle = await _vehicleRepository.GetByIdAsync(request.Id, cancellationToken) ?? throw new NotFoundCustomException("خودروی مورد نظر یافت نشد.");

            var links = await _context.ProductVehicles.Where(x => x.VehicleId == vehicle.Id).ToListAsync(cancellationToken);
            var becameUniversal = await _context.ProductVehicles
                .Where(x => x.VehicleId == vehicle.Id && x.Product.IsActive)
                .CountAsync(x => !x.Product.Vehicles.Any(o => o.VehicleId != vehicle.Id), cancellationToken);

            _context.ProductVehicles.RemoveRange(links);
            vehicle.IsActive = false;
            _vehicleRepository.Update(vehicle);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = new { BecameUniversalCount = becameUniversal };
            res.Message = "خودرو با موفقیت حذف شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
