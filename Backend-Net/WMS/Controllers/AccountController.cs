using Application.Features.Account.Command;
using Application.Common.Dtos;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace WMS.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AccountController : ControllerBase
    {
        private readonly IMediator _mediator;
        public AccountController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HttpPost("Login")]
        public async Task<ActionResult<ResponseDto>> Login([FromBody] LoginUserCommand request)
            => await _mediator.Send(request);

        [HttpPost("RefreshToken")]
        public async Task<ActionResult<ResponseDto>> RefreshToken([FromBody] UserRefreshTokenCommand request)
            => await _mediator.Send(request);

        [HttpPost("Logout")]
        public async Task<ActionResult<ResponseDto>> Logout([FromBody] LogoutUserCommand request)
            => await _mediator.Send(request);

        [HttpPost("LogoutUserById")]
        public async Task<ActionResult<ResponseDto>> LogoutUserById([FromBody] LogoutUserByIdCommand request)
            => await _mediator.Send(request);

        [HttpPost("ForgetPassword")]
        public async Task<ActionResult<ResponseDto>> ForgetPassword([FromBody] ForgetPasswordCommand request)
            => await _mediator.Send(request);
    }
}
