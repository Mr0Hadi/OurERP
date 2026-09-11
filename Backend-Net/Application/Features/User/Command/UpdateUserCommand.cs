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
    /// Edits a user from the user detail page, including where they sit in the org chart.
    ///
    /// Changing <see cref="DepartmentId"/>/<see cref="TeamId"/> goes through
    /// <see cref="IOrgRoleService.AssignAsync"/>, so the slot the user used to occupy is released:
    /// this handler used to write User.DepartmentId/TeamId alone, which left the previous team still
    /// naming them as its head on the team list/detail pages. Moving to another department's team is
    /// a single call - send that department's id together with one of its teams.
    ///
    /// <see cref="Role"/> is optional: omit it to leave the role as it is (kept when the user stays
    /// put, dropped when they move), or send one to promote/demote them from this page.
    /// </summary>
    public class UpdateUserCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string Username { get; set; }
        public int DepartmentId { get; set; }
        public int? TeamId { get; set; }
        public OrgRoleEnum? Role { get; set; }
        public bool IsActive { get; set; }
    }

    public class UpdateUserCommandValidator : AbstractValidator<UpdateUserCommand>
    {
        public UpdateUserCommandValidator()
        {

            RuleFor(x => x.FirstName)
                .Must(Validation.IsNotNullOrEmpty).WithMessage(Validation.RequiredMessage("نام"))
                .Must(Validation.IsPersianText).WithMessage("نام فقط باید حروف فارسی باشد");

            RuleFor(x => x.LastName)
                .Must(Validation.IsNotNullOrEmpty).WithMessage(Validation.RequiredMessage("نام خانوادگی"))
                .Must(Validation.IsPersianText).WithMessage("نام خانوادگی فقط باید حروف فارسی باشد");

            RuleFor(x => x.Username)
                .Must(Validation.IsNotNullOrEmpty).WithMessage(Validation.RequiredMessage("نام کاربری"))
                .Must(Validation.IsEnglishText).WithMessage("نام کاربری وارد شده معتبر نیست");

            RuleFor(x => x.DepartmentId)
                .GreaterThan(0).WithMessage(Validation.RequiredMessage("شناسه واحد"));

            RuleFor(x => x.TeamId)
                .GreaterThan(0).WithMessage(Validation.RequiredMessage("شناسه تیم"))
                .When(x => x.TeamId.HasValue);

        }
    }

    public class UpdateUserCommandHandler : IRequestHandler<UpdateUserCommand, ResponseDto>
    {
        private readonly IUserRepository _userRepository;
        private readonly IOrgRoleService _orgRoleService;
        private readonly IUnitOfWork _unitOfWork;
        public UpdateUserCommandHandler(IUserRepository userRepository, IOrgRoleService orgRoleService, IUnitOfWork unitOfWork)
        {
            _userRepository = userRepository;
            _orgRoleService = orgRoleService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(UpdateUserCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var user = await _userRepository.GetByIdAsync(request.Id, cancellationToken);

            if (user == null)
            {
                throw new ValidationCustomException("کاربر با این اطلاعات یافت نشد");
            }

            var userByUsername = await _userRepository.GetByUsernameAsync(request.Username, cancellationToken);

            if (userByUsername != null && userByUsername.Id != user.Id)
            {
                throw new ValidationCustomException("کاربر با این شماره موبایل قبلا ثبت شده است");
            }

            // Placement and role in one place: AssignAsync validates the department/team, releases
            // every slot the user held elsewhere, and writes both halves of the org chart together.
            await _orgRoleService.AssignAsync(user, request.DepartmentId, request.TeamId, request.Role, cancellationToken);

            // Deactivating from here is the same thing DeleteUserCommand does, so it frees the slot
            // the same way - an inactive user must not stay named as anyone's head.
            if (!request.IsActive)
            {
                await _orgRoleService.ReleaseAllRolesAsync(user.Id, cancellationToken);
            }

            user.Username = request.Username;
            user.FirstName = request.FirstName;
            user.LastName = request.LastName;
            user.IsActive = request.IsActive;
            user.UpdatedAt = DateTime.Now;

            _userRepository.Update(user);

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Message = "اطلاعات کاربر با موفقیت بروزرسانی شد";
            res.ResponseMessageType = ResponseMessageTypeEnum.Warning.ToString();
            return res;
        }
    }

}
