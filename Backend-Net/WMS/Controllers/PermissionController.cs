using Application.Common.Dtos;
using Application.Features.Permission.Commands;
using Application.Features.Permission.Queries;
using Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WMS.Authorization;

namespace WMS.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class PermissionController : ControllerBase
    {
        private readonly IMediator _mediator;
        public PermissionController(IMediator mediator)
        {
            _mediator = mediator;
        }

        /// <summary>The catalogue, grouped - what the caller is allowed to see and grant.</summary>
        [HttpGet("GetPermissionList")]
        [HasPermission(PermissionEnum.PermissionView)]
        public async Task<ActionResult<ResponseDto>> GetPermissionList([FromQuery] GetPermissionListQuery request)
        {
            return await _mediator.Send(request);
        }

        /// <summary>
        /// The signed-in user's own permissions. No permission required - this is what the
        /// frontend builds its menu from.
        /// </summary>
        [HttpGet("GetMyPermissions")]
        public async Task<ActionResult<ResponseDto>> GetMyPermissions([FromQuery] GetMyPermissionsQuery request)
        {
            return await _mediator.Send(request);
        }

        [HttpGet("GetUserPermissions")]
        [HasPermission(PermissionEnum.PermissionView)]
        public async Task<ActionResult<ResponseDto>> GetUserPermissions([FromQuery] GetUserPermissionsQuery request)
        {
            return await _mediator.Send(request);
        }

        [HttpPut("UpdateUserPermissions")]
        [HasPermission(PermissionEnum.PermissionManage)]
        public async Task<ActionResult<ResponseDto>> UpdateUserPermissions([FromBody] UpdateUserPermissionsCommand request)
        {
            return await _mediator.Send(request);
        }
    }
}
