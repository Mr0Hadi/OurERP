using Application.Features.Account.Command;
using Application.Common.Dtos;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Domain.Enums;
using WMS.Authorization;
using Microsoft.AspNetCore.Authorization;

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

        [AllowAnonymous]
        [HttpPost("Login")]
        public async Task<ActionResult<ResponseDto>> Login([FromBody] LoginUserCommand request)
        {
            return await _mediator.Send(request);
        }

        [AllowAnonymous]
        [HttpPost("RefreshToken")]
        public async Task<ActionResult<ResponseDto>> RefreshToken([FromBody] UserRefreshTokenCommand request)
        {
            return await _mediator.Send(request);
        }

        [Authorize]
        [HttpPost("Logout")]
        public async Task<ActionResult<ResponseDto>> Logout([FromBody] LogoutUserCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.UserUpdate)]
        [HttpPost("LogoutUserById")]
        public async Task<ActionResult<ResponseDto>> LogoutUserById([FromBody] LogoutUserByIdCommand request)
        {
            return await _mediator.Send(request);
        }

        [AllowAnonymous]
        [HttpPost("ForgetPassword")]
        public async Task<ActionResult<ResponseDto>> ForgetPassword([FromBody] ForgetPasswordCommand request)
        {
            return await _mediator.Send(request);
        }
    }
}
