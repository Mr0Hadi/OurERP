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

namespace Application.Features.Team.Commands
{
    /// <summary>
    /// <see cref="HeadId"/>/<see cref="DeputyId"/> must already belong to <see cref="DepartmentId"/> -
    /// setting someone as head/deputy of a team no longer just writes an FK that disagrees with their
    /// own User.DepartmentId/TeamId. Move the user into the department first (<c>ChangeUserTeamCommand</c>
    /// or <c>UpdateUserCommand</c>), then assign them here.
    /// </summary>
    public class CreateTeamCommand : IRequest<ResponseDto>
    {
        public string Name { get; set; }
        public int DepartmentId { get; set; }
        public int? HeadId { get; set; }
        public int? DeputyId { get; set; }
    }

    public class CreateTeamCommandValidator : AbstractValidator<CreateTeamCommand>
    {
        public CreateTeamCommandValidator()
        {
            RuleFor(x => x.Name).NotEmpty().WithMessage(Validation.RequiredMessage("نام تیم"));
            RuleFor(x => x.DepartmentId).GreaterThan(0).WithMessage(Validation.RequiredMessage("شناسه دپارتمان"));
            RuleFor(x => x.HeadId).GreaterThan(0).When(x => x.HeadId.HasValue)
                .WithMessage(Validation.RequiredMessage("شناسه سرپرست"));
            RuleFor(x => x.DeputyId).GreaterThan(0).When(x => x.DeputyId.HasValue)
                .WithMessage(Validation.RequiredMessage("شناسه معاون"));
            RuleFor(x => x)
                .Must(x => !x.HeadId.HasValue || !x.DeputyId.HasValue || x.HeadId != x.DeputyId)
                .WithMessage("معاون نمی‌تواند همان مدیر باشد")
                .OverridePropertyName(nameof(CreateTeamCommand.DeputyId));
        }
    }

    public class CreateTeamCommandHandler : IRequestHandler<CreateTeamCommand, ResponseDto>
    {
        private readonly ITeamRepository _teamRepository;
        private readonly IUserRepository _userRepository;
        private readonly IOrgRoleService _orgRoleService;
        private readonly IMapper _mapper;
        private readonly IUnitOfWork _unitOfWork;

        public CreateTeamCommandHandler(ITeamRepository teamRepository, IUserRepository userRepository, IOrgRoleService orgRoleService, IMapper mapper, IUnitOfWork unitOfWork)
        {
            _teamRepository = teamRepository;
            _userRepository = userRepository;
            _orgRoleService = orgRoleService;
            _mapper = mapper;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(CreateTeamCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            if (request.HeadId.HasValue)
            {
                var head = await _userRepository.GetByIdAsync(request.HeadId.Value, cancellationToken) ?? throw new NotFoundCustomException("سرپرست انتخاب شده یافت نشد");
                if (head.DepartmentId != request.DepartmentId) throw new ValidationCustomException("سرپرست باید عضو همین دپارتمان باشد");
                await _orgRoleService.ReleaseAllRolesAsync(head.Id, cancellationToken);
            }

            if (request.DeputyId.HasValue)
            {
                var deputy = await _userRepository.GetByIdAsync(request.DeputyId.Value, cancellationToken) ?? throw new NotFoundCustomException("معاون انتخاب شده یافت نشد");
                if (deputy.DepartmentId != request.DepartmentId) throw new ValidationCustomException("معاون باید عضو همین دپارتمان باشد");
                await _orgRoleService.ReleaseAllRolesAsync(deputy.Id, cancellationToken);
            }

            var team = _mapper.Map<Domain.Entities.Team>(request);
            await _teamRepository.AddAsync(team, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Message = "تیم جدید با موفقیت ایجاد شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
