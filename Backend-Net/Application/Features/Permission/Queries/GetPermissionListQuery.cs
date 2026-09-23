using Application.Common.Contracts.Permissions;
using Application.Common.Contracts.UserContextService;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Permission.Mappings;
using Common.Extensions;
using MediatR;

namespace Application.Features.Permission.Queries
{
    /// <summary>
    /// The catalogue the permission screen is built from, grouped by section.
    ///
    /// It is filtered to what the caller may manage, not to the whole enum: a restricted
    /// permission is never listed to someone who does not hold it, so they cannot grant it and
    /// cannot even learn that the part of the system behind it exists.
    /// </summary>
    public class GetPermissionListQuery : IRequest<ResponseDto>
    {
    }

    public class GetPermissionListQueryHandler : IRequestHandler<GetPermissionListQuery, ResponseDto>
    {
        private readonly IPermissionService _permissionService;
        private readonly IUserContextService _userContextService;

        public GetPermissionListQueryHandler(IPermissionService permissionService, IUserContextService userContextService)
        {
            _permissionService = permissionService;
            _userContextService = userContextService;
        }

        public async Task<ResponseDto> Handle(GetPermissionListQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var actorId = Convert.ToInt32(_userContextService.GetUserId());
            var held = await _permissionService.GetUserPermissionsAsync(actorId, cancellationToken);

            var visible = PermissionExtensions.ManageableBy(held);

            res.Data = new { PermissionGroups = visible.ToGroupedDtos() };
            res.Message = "لیست دسترسی‌ها با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
