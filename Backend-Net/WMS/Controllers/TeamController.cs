using Application.Features.Team.Commands;
using Application.Features.Team.Queries;
using Application.Common.Dtos;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

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

        [HttpGet("GetTeamList")]
        public async Task<ActionResult<ResponseDto>> GetTeamList([FromQuery] GetTeamListQuery request)
        {
            return await _mediator.Send(request);
        }

        [HttpGet("GetTeamDetail")]
        public async Task<ActionResult<ResponseDto>> GetTeamDetail([FromQuery] GetTeamDetailQuery request)
        {
            return await _mediator.Send(request);
        }

        [HttpPost("CreateTeam")]
        public async Task<ActionResult<ResponseDto>> CreateTeam([FromBody] CreateTeamCommand request)
        {
            return await _mediator.Send(request);
        }

        [HttpPut("UpdateTeam")]
        public async Task<ActionResult<ResponseDto>> UpdateTeam([FromBody] UpdateTeamCommand request)
        {
            return await _mediator.Send(request);
        }

        [HttpDelete("DeleteTeam")]
        public async Task<ActionResult<ResponseDto>> DeleteTeam([FromQuery] DeleteTeamCommand request)
        {
            return await _mediator.Send(request);
        }
    }
}
