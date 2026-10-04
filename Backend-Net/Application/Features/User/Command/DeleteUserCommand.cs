using Application.Common.Contracts.OrgStructure;
using Application.Common.Contracts.Permissions;
using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.Token;
using Application.Common.Contracts.UserContextService;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Common.Exceptions;
using Common.Extensions;
using MediatR;

namespace Application.Features.User.Command
{
    public class DeleteUserCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class DeleteUserCommandHandler : IRequestHandler<DeleteUserCommand, ResponseDto>
    {
        private readonly IUserRepository _userRepository;
        private readonly IOrgRoleService _orgRoleService;
        private readonly IPermissionService _permissionService;
        private readonly IUserContextService _userContextService;
        private readonly IUserSessionService _userSessionService;
        private readonly IUnitOfWork _unitOfWork;

        public DeleteUserCommandHandler(IUserRepository userRepository, IOrgRoleService orgRoleService,
            IPermissionService permissionService, IUserContextService userContextService, IUserSessionService userSessionService,
            IUnitOfWork unitOfWork)
        {
            _userRepository = userRepository;
            _orgRoleService = orgRoleService;
            _permissionService = permissionService;
            _userContextService = userContextService;
            _userSessionService = userSessionService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(DeleteUserCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var user = await _userRepository.GetByIdAsync(request.Id, cancellationToken) ?? throw new NotFoundCustomException("کاربر با اطلاعات مورد نظر یافت نشد.");

            var actorId = _userContextService.GetUserId().ToInt();

            if (user.Id == actorId)
                throw new ValidationCustomException("نمی‌توانید حساب کاربری خودتان را حذف کنید؛ این کار باید توسط مدیر انجام شود.");

            await _permissionService.EnsureCanManageUserAsync(actorId, user.Id, cancellationToken);

            user.IsActive = false;

            // Logged out at once instead of when their token expires.
            _userSessionService.RevokeAll(user);

            // A soft-deleted user kept every headship/deputyship they held, so team and department
            // reads went on rendering HeadName/DeputyName for someone who had been removed.
            await _orgRoleService.ReleaseAllRolesAsync(user.Id, cancellationToken);

            _userRepository.Update(user);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            // A deactivated user holds nothing (PermissionService filters on User.IsActive), but
            // a list cached moments ago would keep answering yes until it expired.
            _permissionService.Invalidate(user.Id);

            res.Message = "کاربر با موفقیت حذف شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
