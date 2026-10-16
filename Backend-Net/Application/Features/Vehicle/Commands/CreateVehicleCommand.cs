using Application.Common.Contracts.Context;
using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Vehicle.Dtos;
using Common.Extensions;
using FluentValidation;
using MediatR;
using Application.Common.Audit;
using Domain.Enums;

namespace Application.Features.Vehicle.Commands
{
    [AuditAction(AuditActionEnum.CreateVehicle)]
    public class CreateVehicleCommand : IRequest<ResponseDto>
    {
        public string Name { get; set; }
    }

    public class CreateVehicleCommandValidator : AbstractValidator<CreateVehicleCommand>
    {
        public CreateVehicleCommandValidator()
        {
            RuleFor(x => VehicleRules.NormalizeName(x.Name)).NotEmpty().WithMessage(Validation.RequiredMessage("نام خودرو"))
                .MaximumLength(VehicleRules.NameMaxLength).WithMessage($"نام خودرو حداکثر {VehicleRules.NameMaxLength} نویسه است.").OverridePropertyName("Name");
        }
    }

    public class CreateVehicleCommandHandler : IRequestHandler<CreateVehicleCommand, ResponseDto>
    {
        private readonly IVehicleRepository _vehicleRepository;
        private readonly IWMSDbContext _context;
        private readonly IUnitOfWork _unitOfWork;

        public CreateVehicleCommandHandler(IVehicleRepository vehicleRepository, IWMSDbContext context, IUnitOfWork unitOfWork)
        {
            _vehicleRepository = vehicleRepository;
            _context = context;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(CreateVehicleCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();
            var name = VehicleRules.NormalizeName(request.Name);
            await VehicleRules.EnsureNameIsFreeAsync(_context, name, null, cancellationToken);

            var vehicle = new Domain.Entities.Vehicle { Name = name, IsActive = true, CreatedAt = DateTime.Now };
            await _vehicleRepository.AddAsync(vehicle, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            // Returned so the product form can select the vehicle it just created.
            res.Data = new VehicleDto { Id = vehicle.Id, Name = vehicle.Name };
            res.Message = "خودرو با موفقیت ایجاد شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
