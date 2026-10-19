using Application.Common.Dtos;
using Application.Features.Cheque.Commands;
using Application.Features.Cheque.Queries;
using Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WMS.Authorization;

namespace WMS.Controllers
{
    /// <summary>Cheques received and issued (چک): the list, and recording each cheque's fate - cashed, bounced, passed on.</summary>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class CheckController : ControllerBase
    {
        private readonly IMediator _mediator;
        public CheckController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HasPermission(PermissionEnum.CheckView, PermissionEnum.CheckManage)]
        [HttpGet("GetCheckList")]
        public async Task<ActionResult<ResponseDto>> GetCheckList([FromQuery] GetCheckListQuery request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.CheckManage)]
        [HttpPost("CashCheck")]
        public async Task<ActionResult<ResponseDto>> CashCheck([FromBody] CashCheckCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.CheckManage)]
        [HttpPost("BounceCheck")]
        public async Task<ActionResult<ResponseDto>> BounceCheck([FromBody] BounceCheckCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.CheckManage)]
        [HttpPost("EndorseCheck")]
        public async Task<ActionResult<ResponseDto>> EndorseCheck([FromBody] EndorseCheckCommand request)
        {
            return await _mediator.Send(request);
        }
    }
}
