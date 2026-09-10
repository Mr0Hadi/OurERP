using Application.Common.Contracts.OrgStructure;
using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Common.Exceptions;
using Common.Extensions;
using Domain.Enums;
using FluentValidation;
using MediatR;

namespace Application.Features.Department.Commands
{
    /// <summary>
    /// <see cref="HeadId"/>/<see cref="DeputyId"/> carry the department's final state: whoever is
    /// named is moved into this department and, because a department head is not a member of any
    /// team, taken out of whatever team they were in; whoever is dropped stays on as a plain member.
    /// All of it runs through <see cref="IOrgRoleService.AssignAsync"/>, so the team and user pages
    /// see the same thing this page just wrote.
    /// </summary>
    public class UpdateDepartmentCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public int? HeadId { get; set; }
        public int? DeputyId { get; set; }
    }

    public class UpdateDepartmentCommandValidator : AbstractValidator<UpdateDepartmentCommand>
    {
        public UpdateDepartmentCommandValidator()
        {
            RuleFor(x => x.Name).NotEmpty().WithMessage(Validation.RequiredMessage("نام دپارتمان"));
            RuleFor(x => x.HeadId).GreaterThan(0).When(x => x.HeadId.HasValue)
                .WithMessage(Validation.RequiredMessage("شناسه سرپرست"));
            RuleFor(x => x.DeputyId).GreaterThan(0).When(x => x.DeputyId.HasValue)
                .WithMessage(Validation.RequiredMessage("شناسه معاون"));
            RuleFor(x => x)
                .Must(x => !x.HeadId.HasValue || !x.DeputyId.HasValue || x.HeadId != x.DeputyId)
                .WithMessage("معاون نمی‌تواند همان مدیر باشد")
                .OverridePropertyName(nameof(UpdateDepartmentCommand.DeputyId));
        }
    }

    public class UpdateDepartmentCommandHandler : IRequestHandler<UpdateDepartmentCommand, ResponseDto>
    {
        private readonly IDepartmentRepository _departmentRepository;
        private readonly IUserRepository _userRepository;
        private readonly IOrgRoleService _orgRoleService;
        private readonly IUnitOfWork _unitOfWork;

        public UpdateDepartmentCommandHandler(IDepartmentRepository departmentRepository, IUserRepository userRepository, IOrgRoleService orgRoleService, IUnitOfWork unitOfWork)
        {
            _departmentRepository = departmentRepository;
            _userRepository = userRepository;
            _orgRoleService = orgRoleService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(UpdateDepartmentCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var department = await _departmentRepository.GetByIdAsync(request.Id, cancellationToken) ?? throw new NotFoundCustomException("دپارتمان مورد نظر یافت نشد.");

            // Final state first, then the assignments - AssignAsync releases the user's slots
            // before writing the new one, and would otherwise clear what we had just set.
            department.HeadId = request.HeadId;
            department.DeputyId = request.DeputyId;

            if (request.HeadId.HasValue)
            {
                var head = await _userRepository.GetByIdAsync(request.HeadId.Value, cancellationToken) ?? throw new NotFoundCustomException("سرپرست انتخاب شده یافت نشد");
                await _orgRoleService.AssignAsync(head, department.Id, null, OrgRoleEnum.DEPARTMENT_HEAD, cancellationToken);
                _userRepository.Update(head);
            }

            if (request.DeputyId.HasValue)
            {
                var deputy = await _userRepository.GetByIdAsync(request.DeputyId.Value, cancellationToken) ?? throw new NotFoundCustomException("معاون انتخاب شده یافت نشد");
                await _orgRoleService.AssignAsync(deputy, department.Id, null, OrgRoleEnum.DEPARTMENT_DEPUTY, cancellationToken);
                _userRepository.Update(deputy);
            }

            department.Name = request.Name;

            _departmentRepository.Update(department);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Message = "اطلاعات دپارتمان با موفقیت بروزرسانی شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
