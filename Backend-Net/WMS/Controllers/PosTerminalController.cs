using Application.Features.PosTerminal.Commands;
using Application.Features.PosTerminal.Queries;
using Application.Common.Dtos;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

namespace WMS.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class PosTerminalController : ControllerBase
    {
        private readonly IMediator _mediator;
        public PosTerminalController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HttpGet("GetPosTerminalList")]
        public async Task<ActionResult<ResponseDto>> GetPosTerminalList([FromQuery] GetPosTerminalListQuery request)
        {
            return await _mediator.Send(request);
        }

        [HttpGet("GetPosTerminalDetail")]
        public async Task<ActionResult<ResponseDto>> GetPosTerminalDetail([FromQuery] GetPosTerminalDetailQuery request)
        {
            return await _mediator.Send(request);
        }

        [HttpPost("CreatePosTerminal")]
        public async Task<ActionResult<ResponseDto>> CreatePosTerminal([FromBody] CreatePosTerminalCommand request)
        {
            return await _mediator.Send(request);
        }

        [HttpPut("UpdatePosTerminal")]
        public async Task<ActionResult<ResponseDto>> UpdatePosTerminal([FromBody] UpdatePosTerminalCommand request)
        {
            return await _mediator.Send(request);
        }

        [HttpDelete("DeletePosTerminal")]
        public async Task<ActionResult<ResponseDto>> DeletePosTerminal([FromQuery] DeletePosTerminalCommand request)
        {
            return await _mediator.Send(request);
        }
    }
}
