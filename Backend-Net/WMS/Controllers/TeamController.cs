using Application.Features.Team.Commands;
using Application.Features.Team.Queries;
using Application.Common.Dtos;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Domain.Enums;
using WMS.Authorization;

namespace WMS.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class TeamController : ControllerBase
    {
        private readonly IMediator _mediator;
        public TeamController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HasPermission(PermissionEnum.TeamView)]
        [HttpGet("GetTeamList")]
        public async Task<ActionResult<ResponseDto>> GetTeamList([FromQuery] GetTeamListQuery request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.TeamView)]
        [HttpGet("GetTeamDetail")]
        public async Task<ActionResult<ResponseDto>> GetTeamDetail([FromQuery] GetTeamDetailQuery request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.TeamManage)]
        [HttpPost("CreateTeam")]
        public async Task<ActionResult<ResponseDto>> CreateTeam([FromBody] CreateTeamCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.TeamManage)]
        [HttpPut("UpdateTeam")]
        public async Task<ActionResult<ResponseDto>> UpdateTeam([FromBody] UpdateTeamCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.TeamManage)]
        [HttpDelete("DeleteTeam")]
        public async Task<ActionResult<ResponseDto>> DeleteTeam([FromQuery] DeleteTeamCommand request)
        {
            return await _mediator.Send(request);
        }
    }
}
