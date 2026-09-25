using Application.Common.Dtos;
using Application.Features.PartyAccount.Queries;
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
    public class PartyAccountController : ControllerBase
    {
        private readonly IMediator _mediator;
        public PartyAccountController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HasPermission(PermissionEnum.PartyStatementView)]
        [HttpGet("GetPartyStatement")]
        public async Task<ActionResult<ResponseDto>> GetPartyStatement([FromQuery] GetPartyStatementQuery request)
        {
            return await _mediator.Send(request);
        }
    }
}
