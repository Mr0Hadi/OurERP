using Application.Common.Contracts.OrgStructure;
using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using AutoMapper;
using Common.Exceptions;
using Common.Extensions;
using Domain.Entities;
using Domain.Enums;
using FluentValidation;
using MediatR;

namespace Application.Features.Department.Commands
{
    /// <summary>
    /// Naming a <see cref="HeadId"/>/<see cref="DeputyId"/> transfers that user into the new
    /// department and out of whatever team and role they were in - a department head belongs to no
    /// team. This used to be rejected outright ("create it, then move the user, then assign"), which
    /// was three calls for one intent; <see cref="IOrgRoleService.AssignAsync"/> now does it in one.
    /// </summary>
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
        private readonly IUserRepository _userRepository;
        private readonly IOrgRoleService _orgRoleService;
        private readonly IMapper _mapper;
        private readonly IUnitOfWork _unitOfWork;

        public CreateDepartmentCommandHandler(IDepartmentRepository departmentRepository, IUserRepository userRepository, IOrgRoleService orgRoleService, IMapper mapper, IUnitOfWork unitOfWork)
        {
            _departmentRepository = departmentRepository;
            _userRepository = userRepository;
            _orgRoleService = orgRoleService;
            _mapper = mapper;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(CreateDepartmentCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            // Load the users before creating the department: a bad id must not leave an orphan behind.
            Domain.Entities.User? head = null;
            Domain.Entities.User? deputy = null;

            if (request.HeadId.HasValue)
            {
                head = await _userRepository.GetByIdAsync(request.HeadId.Value, cancellationToken) ?? throw new NotFoundCustomException("سرپرست انتخاب شده یافت نشد");
            }

            if (request.DeputyId.HasValue)
            {
                deputy = await _userRepository.GetByIdAsync(request.DeputyId.Value, cancellationToken) ?? throw new NotFoundCustomException("معاون انتخاب شده یافت نشد");
            }

            var department = _mapper.Map<Domain.Entities.Department>(request);
            await _departmentRepository.AddAsync(department, cancellationToken);

            // The roles can only be assigned once the department has an Id for User.DepartmentId.
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            if (head != null)
            {
                await _orgRoleService.AssignAsync(head, department.Id, null, OrgRoleEnum.DEPARTMENT_HEAD, cancellationToken);
                _userRepository.Update(head);
            }

            if (deputy != null)
            {
                await _orgRoleService.AssignAsync(deputy, department.Id, null, OrgRoleEnum.DEPARTMENT_DEPUTY, cancellationToken);
                _userRepository.Update(deputy);
            }

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Message = "دپارتمان جدید با موفقیت ایجاد شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
