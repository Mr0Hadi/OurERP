using Application.Common.Contracts.Context;
using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Common.Exceptions;
using Domain.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Vehicle.Commands
{
    public class AddProductsToVehicleCommand : IRequest<ResponseDto>
    {
        public int VehicleId { get; set; }
        public List<int> ProductIds { get; set; } = new();
    }

    public class AddProductsToVehicleCommandValidator : AbstractValidator<AddProductsToVehicleCommand>
    {
        public AddProductsToVehicleCommandValidator()
        {
            RuleFor(x => x.ProductIds).NotEmpty().WithMessage("هیچ کالایی انتخاب نشده است.");
            RuleFor(x => x.ProductIds.Count).LessThanOrEqualTo(200).WithMessage("در هر بار حداکثر ۲۰۰ کالا اضافه می‌شود.");
        }
    }

    /// <summary>Links products to a vehicle. Idempotent: a product already on the vehicle is skipped, not an error.</summary>
    public class AddProductsToVehicleCommandHandler : IRequestHandler<AddProductsToVehicleCommand, ResponseDto>
    {
        private readonly IVehicleRepository _vehicleRepository;
        private readonly IWMSDbContext _context;
        private readonly IUnitOfWork _unitOfWork;

        public AddProductsToVehicleCommandHandler(IVehicleRepository vehicleRepository, IWMSDbContext context, IUnitOfWork unitOfWork)
        {
            _vehicleRepository = vehicleRepository;
            _context = context;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(AddProductsToVehicleCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();
            var vehicle = await _vehicleRepository.GetByIdAsync(request.VehicleId, cancellationToken) ?? throw new NotFoundCustomException("خودروی مورد نظر یافت نشد.");

            var ids = request.ProductIds.Distinct().ToList();
            var activeIds = await _context.Products.Where(p => p.IsActive && ids.Contains(p.Id)).Select(p => p.Id).ToListAsync(cancellationToken);
            if (activeIds.Count != ids.Count)
                throw new ValidationCustomException("یک یا چند کالای انتخاب‌شده وجود ندارد یا حذف شده است.");

            var existing = await _context.ProductVehicles.Where(x => x.VehicleId == vehicle.Id && ids.Contains(x.ProductId)).Select(x => x.ProductId).ToListAsync(cancellationToken);
            var toAdd = ids.Except(existing).ToList();
            foreach (var productId in toAdd)
                _context.ProductVehicles.Add(new ProductVehicle { ProductId = productId, VehicleId = vehicle.Id });

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = new { AddedCount = toAdd.Count };
            res.Message = toAdd.Count == 0 ? "کالاهای انتخاب‌شده از قبل برای این خودرو ثبت شده بودند." : "کالا به خودرو اضافه شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
