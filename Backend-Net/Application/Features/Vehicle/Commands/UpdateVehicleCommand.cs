using Application.Common.Contracts.Context;
using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Vehicle.Dtos;
using Common.Exceptions;
using Common.Extensions;
using FluentValidation;
using MediatR;

namespace Application.Features.Vehicle.Commands
{
    public class UpdateVehicleCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
        public string Name { get; set; }
    }

    public class UpdateVehicleCommandValidator : AbstractValidator<UpdateVehicleCommand>
    {
        public UpdateVehicleCommandValidator()
        {
            RuleFor(x => VehicleRules.NormalizeName(x.Name)).NotEmpty().WithMessage(Validation.RequiredMessage("نام خودرو"))
                .MaximumLength(VehicleRules.NameMaxLength).WithMessage($"نام خودرو حداکثر {VehicleRules.NameMaxLength} نویسه است.").OverridePropertyName("Name");
        }
    }

    public class UpdateVehicleCommandHandler : IRequestHandler<UpdateVehicleCommand, ResponseDto>
    {
        private readonly IVehicleRepository _vehicleRepository;
        private readonly IWMSDbContext _context;
        private readonly IUnitOfWork _unitOfWork;

        public UpdateVehicleCommandHandler(IVehicleRepository vehicleRepository, IWMSDbContext context, IUnitOfWork unitOfWork)
        {
            _vehicleRepository = vehicleRepository;
            _context = context;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(UpdateVehicleCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();
            var vehicle = await _vehicleRepository.GetByIdAsync(request.Id, cancellationToken) ?? throw new NotFoundCustomException("خودروی مورد نظر یافت نشد.");

            var name = VehicleRules.NormalizeName(request.Name);
            await VehicleRules.EnsureNameIsFreeAsync(_context, name, vehicle.Id, cancellationToken);

            vehicle.Name = name;
            _vehicleRepository.Update(vehicle);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = new VehicleDto { Id = vehicle.Id, Name = vehicle.Name };
            res.Message = "خودرو با موفقیت بروزرسانی شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
