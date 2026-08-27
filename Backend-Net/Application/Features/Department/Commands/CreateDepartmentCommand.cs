using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using AutoMapper;
using Common.Extensions;
using Domain.Entities;
using FluentValidation;
using MediatR;

namespace Application.Features.Department.Commands
{
    public class CreateDepartmentCommand : IRequest<ResponseDto>
    {
        public string Name { get; set; }
        public int? HeadId { get; set; }
        public int? DeputyId { get; set; }
    }

    public class CreateDepartmentCommandValidator : AbstractValidator<CreateDepartmentCommand>
    {
        public CreateDepartmentCommandValidator()
        {
            RuleFor(x => x.Name).NotEmpty().WithMessage(Validation.RequiredMessage("نام دپارتمان"));
            RuleFor(x => x.HeadId).GreaterThan(0).When(x => x.HeadId.HasValue)
                .WithMessage(Validation.RequiredMessage("شناسه سرپرست"));
            RuleFor(x => x.DeputyId).GreaterThan(0).When(x => x.DeputyId.HasValue)
                .WithMessage(Validation.RequiredMessage("شناسه معاون"));
            RuleFor(x => x)
                .Must(x => !x.HeadId.HasValue || !x.DeputyId.HasValue || x.HeadId != x.DeputyId)
                .WithMessage("معاون نمی‌تواند همان مدیر باشد")
                .OverridePropertyName(nameof(CreateDepartmentCommand.DeputyId));
        }
    }

    public class CreateDepartmentCommandHandler : IRequestHandler<CreateDepartmentCommand, ResponseDto>
    {
        private readonly IDepartmentRepository _departmentRepository;
        private readonly IMapper _mapper;
        private readonly IUnitOfWork _unitOfWork;

        public CreateDepartmentCommandHandler(IDepartmentRepository departmentRepository, IMapper mapper, IUnitOfWork unitOfWork)
        {
            _departmentRepository = departmentRepository;
            _mapper = mapper;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(CreateDepartmentCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var department = _mapper.Map<Domain.Entities.Department>(request);
            await _departmentRepository.AddAsync(department, cancellationToken);
            await _unitOfWork.SaveChangesAsync();

            res.Message = "دپارتمان جدید با موفقیت ایجاد شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
