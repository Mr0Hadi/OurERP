using Application.Features.Pos.Commands;
using Application.Common.Dtos;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

namespace WMS.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class PosController : ControllerBase
    {
        private readonly IMediator _mediator;
        public PosController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HttpPost("Charge")]
        public async Task<ActionResult<ResponseDto>> Charge([FromBody] ChargePosCommand request)
        {
            return await _mediator.Send(request);
        }
    }
}
