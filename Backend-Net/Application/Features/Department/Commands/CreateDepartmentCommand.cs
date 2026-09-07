using Application.Common.Contracts.OrgStructure;
using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using AutoMapper;
using Common.Exceptions;
using Common.Extensions;
using Domain.Entities;
using FluentValidation;
using MediatR;

namespace Application.Features.Department.Commands
{
    /// <summary>
    /// <see cref="HeadId"/>/<see cref="DeputyId"/> must already belong to this department - which, on
    /// create, is never possible (the department doesn't exist yet for a User.DepartmentId to point at).
    /// Create the department first, move the intended head/deputy into it (<c>ChangeUserTeamCommand</c>
    /// or <c>UpdateUserCommand</c>), then assign the role via <c>UpdateDepartmentCommand</c>.
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

            // A user's DepartmentId can never already point at a department that doesn't exist yet,
            // so no HeadId/DeputyId can be valid here - see the class doc comment.
            if (request.HeadId.HasValue) throw new ValidationCustomException("سرپرست را پس از ایجاد دپارتمان و انتقال کاربر به آن، از طریق ویرایش دپارتمان تعیین کنید");
            if (request.DeputyId.HasValue) throw new ValidationCustomException("معاون را پس از ایجاد دپارتمان و انتقال کاربر به آن، از طریق ویرایش دپارتمان تعیین کنید");

            var department = _mapper.Map<Domain.Entities.Department>(request);
            await _departmentRepository.AddAsync(department, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Message = "دپارتمان جدید با موفقیت ایجاد شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
