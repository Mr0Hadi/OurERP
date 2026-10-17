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
