using Application.Features.User.Command;
using Application.Common.Dtos;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Application.Features.User.Query;

namespace WMS.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class UserController : ControllerBase
    {
        private readonly IMediator _mediator;
        public UserController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HttpGet("GetUserInfo")]
        public async Task<ActionResult<ResponseDto>> GetUserInfo([FromQuery] GetUserInfoQuery request)
        {
            return await _mediator.Send(request);
        }

        [HttpGet("GetUserUpdate")]
        public async Task<ActionResult<ResponseDto>> GetUserUpdate([FromQuery] GetUserUpdateQuery request)
        {
            return await _mediator.Send(request);
        }

        [HttpPost("CreateUser")]
        public async Task<ActionResult<ResponseDto>> CreateUser([FromBody] CreateUserCommand request)
        {
            return await _mediator.Send(request);
        }

        [HttpPut("UpdateUser")]
        public async Task<ActionResult<ResponseDto>> UpdateUser([FromBody] UpdateUserCommand request)
        {
            return await _mediator.Send(request);
        }

        [HttpPut("ChangePassword")]
        public async Task<ActionResult<ResponseDto>> ChangePassword([FromBody] ChangePasswordCommand request)
        {
            return await _mediator.Send(request);
        }

        [HttpDelete("DeleteUser")]
        public async Task<ActionResult<ResponseDto>> DeleteUser([FromQuery] DeleteUserCommand request)
        {
            return await _mediator.Send(request);
        }
    }
}
