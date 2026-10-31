using Application.Common.Dtos;
using Application.Features.Setting.Commands;
using Application.Features.Setting.Queries;
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
    public class SettingController : ControllerBase
    {
        private readonly IMediator _mediator;
        public SettingController(IMediator mediator)
        {
            _mediator = mediator;
        }

        /// <summary>Public feature switches for every signed-in user (no permission): the frontend hides menus with it.</summary>
        [HttpGet("GetFeatureFlags")]
        public async Task<ActionResult<ResponseDto>> GetFeatureFlags([FromQuery] GetFeatureFlagsQuery request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.SettingView, PermissionEnum.SettingManage)]
        [HttpGet("GetSystemSettings")]
        public async Task<ActionResult<ResponseDto>> GetSystemSettings([FromQuery] GetSystemSettingsQuery request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.SettingManage)]
        [HttpPut("UpdateSystemSettings")]
        public async Task<ActionResult<ResponseDto>> UpdateSystemSettings([FromBody] UpdateSystemSettingsCommand request)
        {
            return await _mediator.Send(request);
        }
    }
}
