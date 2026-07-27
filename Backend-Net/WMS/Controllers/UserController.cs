using Application.Features.User.Command;
using Application.Features.User.Queries;
using Application.Common.Dtos;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace WMS.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UserController : ControllerBase
    {
        private readonly IMediator _mediator;
        public UserController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HttpGet("GetUserInfo")]
        public async Task<ActionResult<ResponseDto>> GetUserInfo([FromQuery] GetUserInfoQuery request)
            => await _mediator.Send(request);

        [HttpGet("GetUserUpdate")]
        public async Task<ActionResult<ResponseDto>> GetUserUpdate([FromQuery] GetUserUpdateQuery request)
            => await _mediator.Send(request);

        [HttpPost("CreateUser")]
        public async Task<ActionResult<ResponseDto>> CreateUser([FromBody] CreateUserCommand request)
            => await _mediator.Send(request);

        [HttpPut("UpdateUser")]
        public async Task<ActionResult<ResponseDto>> UpdateUser([FromBody] UpdateUserCommand request)
            => await _mediator.Send(request);

        [HttpPut("ChangePassword")]
        public async Task<ActionResult<ResponseDto>> ChangePassword([FromBody] ChangePasswordCommand request)
            => await _mediator.Send(request);
    }
}
