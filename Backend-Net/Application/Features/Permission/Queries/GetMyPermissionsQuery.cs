using Application.Common.Contracts.Permissions;
using Application.Common.Contracts.UserContextService;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Permission.Mappings;
using MediatR;

namespace Application.Features.Permission.Queries
{
    /// <summary>
    /// What the signed-in user holds, for the frontend to build its menu and hide buttons with.
    /// Needs no permission of its own - every authenticated user may ask what they can do.
    ///
    /// Hiding a button is UX only; the real check is the policy on the endpoint behind it.
    /// </summary>
    public class GetMyPermissionsQuery : IRequest<ResponseDto>
    {
    }

    public class GetMyPermissionsQueryHandler : IRequestHandler<GetMyPermissionsQuery, ResponseDto>
    {
        private readonly IPermissionService _permissionService;
        private readonly IUserContextService _userContextService;

        public GetMyPermissionsQueryHandler(IPermissionService permissionService, IUserContextService userContextService)
        {
            _permissionService = permissionService;
            _userContextService = userContextService;
        }

        public async Task<ResponseDto> Handle(GetMyPermissionsQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var actorId = Convert.ToInt32(_userContextService.GetUserId());
            var held = await _permissionService.GetUserPermissionsAsync(actorId, cancellationToken);

            res.Data = new
            {
                // Names as well as numbers: a frontend guard reads better as
                // has("SaleShip") than as has(94), and the names never change.
                Permissions = held.Select(x => x.ToDto()).ToList(),
                PermissionNames = held.Select(x => x.ToString()).ToList()
            };
            res.Message = "دسترسی‌های کاربر با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
