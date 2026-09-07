using Application.Common.Contracts.OrgStructure;
using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Common.Exceptions;
using Common.Extensions;
using FluentValidation;
using MediatR;

namespace Application.Features.User.Command
{
    /// <summary>
    /// Moves a user between department/team and sets their head/deputy role there.
    ///
    /// <see cref="IsHead"/>/<see cref="IsDeputy"/> apply to the team when <see cref="TeamId"/> is
    /// supplied, and to the department otherwise. The department case used to be unreachable: the
    /// handler only ever wrote Team.HeadId, so IsHead was silently dropped for a user with no team.
    /// </summary>
    public class ChangeUserTeamCommand : IRequest<ResponseDto>
    {
        public int UserId { get; set; }
        public int DepartmentId { get; set; }
        public int? TeamId { get; set; }
        public bool IsHead { get; set; }
        public bool IsDeputy { get; set; }
    }

    public class ChangeUserTeamCommandValidator : AbstractValidator<ChangeUserTeamCommand>
    {
        public ChangeUserTeamCommandValidator()
        {
            RuleFor(x => x.UserId).GreaterThan(0).WithMessage(Validation.RequiredMessage("شناسه کاربر"));
            RuleFor(x => x.DepartmentId).GreaterThan(0).WithMessage(Validation.RequiredMessage("شناسه واحد"));
            RuleFor(x => x.TeamId).GreaterThan(0).WithMessage(Validation.RequiredMessage("شناسه تیم")).When(x => x.TeamId.HasValue);
            RuleFor(x => x)
                .Must(x => !(x.IsHead && x.IsDeputy))
                .WithMessage("یک کاربر نمی‌تواند هم‌زمان مسئول و جانشین باشد.")
                .OverridePropertyName(nameof(ChangeUserTeamCommand.IsDeputy));
        }
    }

    public class ChangeUserTeamCommandHandler : IRequestHandler<ChangeUserTeamCommand, ResponseDto>
    {
        private readonly IUserRepository _userRepository;
        private readonly IDepartmentRepository _departmentRepository;
        private readonly ITeamRepository _teamRepository;
        private readonly IOrgRoleService _orgRoleService;
        private readonly IUnitOfWork _unitOfWork;

        public ChangeUserTeamCommandHandler(IUserRepository userRepository, IDepartmentRepository departmentRepository, ITeamRepository teamRepository, IOrgRoleService orgRoleService, IUnitOfWork unitOfWork)
        {
            _userRepository = userRepository;
            _departmentRepository = departmentRepository;
            _teamRepository = teamRepository;
            _orgRoleService = orgRoleService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(ChangeUserTeamCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var user = await _userRepository.GetByIdAsync(request.UserId, cancellationToken) ?? throw new NotFoundCustomException("کاربر مورد نظر یافت نشد");

            var department = await _departmentRepository.GetByIdAsync(request.DepartmentId, cancellationToken) ?? throw new NotFoundCustomException("واحد انتخاب شده یافت نشد");

            Domain.Entities.Team? team = null;

            if (request.TeamId.HasValue)
            {
                team = await _teamRepository.GetByIdAsync(request.TeamId.Value, cancellationToken) ?? throw new NotFoundCustomException("تیم انتخاب شده یافت نشد");

                if (team.DepartmentId != request.DepartmentId)
                {
                    throw new ValidationCustomException("تیم انتخاب شده متعلق به این واحد نیست");
                }
            }

            // Release first, assign second. The old handler cleared only the *previous team's*
            // HeadId, which left Team.DeputyId and both Department roles pointing at a user who had
            // moved away, and let one user be head of several teams at once.
            await _orgRoleService.ReleaseAllRolesAsync(user.Id, cancellationToken);

            user.DepartmentId = request.DepartmentId;
            user.TeamId = request.TeamId;
            user.UpdatedAt = DateTime.Now;
            _userRepository.Update(user);

            if (request.IsHead || request.IsDeputy)
            {
                if (team != null)
                {
                    if (request.IsHead) team.HeadId = user.Id;
                    else team.DeputyId = user.Id;

                    _teamRepository.Update(team);
                }
                else
                {
                    if (request.IsHead) department.HeadId = user.Id;
                    else department.DeputyId = user.Id;

                    _departmentRepository.Update(department);
                }
            }

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Message = "تیم کاربر با موفقیت بروزرسانی شد";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
