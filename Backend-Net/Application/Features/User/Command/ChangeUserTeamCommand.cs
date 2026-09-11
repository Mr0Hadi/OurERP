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

namespace Application.Features.User.Command
{
    /// <summary>
    /// Moves a user between department/team and sets their head/deputy role there.
    ///
    /// <see cref="IsHead"/>/<see cref="IsDeputy"/> apply to the team when <see cref="TeamId"/> is
    /// supplied, and to the department otherwise; leaving both false makes the user a plain member,
    /// releasing whatever slot they held before. Moving to a team in another department is a single
    /// call - pass that department's id and one of its teams.
    ///
    /// All of it goes through <see cref="IOrgRoleService.AssignAsync"/>, which owns the invariants.
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
        private readonly IOrgRoleService _orgRoleService;
        private readonly IUnitOfWork _unitOfWork;

        public ChangeUserTeamCommandHandler(IUserRepository userRepository, IOrgRoleService orgRoleService, IUnitOfWork unitOfWork)
        {
            _userRepository = userRepository;
            _orgRoleService = orgRoleService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(ChangeUserTeamCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var user = await _userRepository.GetByIdAsync(request.UserId, cancellationToken) ?? throw new NotFoundCustomException("کاربر مورد نظر یافت نشد");

            var role = request.TeamId.HasValue
                ? (request.IsHead ? OrgRoleEnum.TEAM_HEAD : request.IsDeputy ? OrgRoleEnum.TEAM_DEPUTY : OrgRoleEnum.MEMBER)
                : (request.IsHead ? OrgRoleEnum.DEPARTMENT_HEAD : request.IsDeputy ? OrgRoleEnum.DEPARTMENT_DEPUTY : OrgRoleEnum.MEMBER);

            await _orgRoleService.AssignAsync(user, request.DepartmentId, request.TeamId, role, cancellationToken);

            user.UpdatedAt = DateTime.Now;
            _userRepository.Update(user);

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Message = "تیم کاربر با موفقیت بروزرسانی شد";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
