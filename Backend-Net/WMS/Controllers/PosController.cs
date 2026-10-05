using Application.Features.Pos.Commands;
using Application.Features.Pos.Queries;
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
    public class PosController : ControllerBase
    {
        private readonly IMediator _mediator;
        public PosController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HasPermission(PermissionEnum.PosCharge)]
        [HttpPost("Charge")]
        public async Task<ActionResult<ResponseDto>> Charge([FromBody] ChargePosCommand request)
        {
            return await _mediator.Send(request);
        }

        /// <summary>Card-reader payments for the manager: who recorded what, manual or from the device.</summary>
        [HasPermission(PermissionEnum.PosPaymentReportView)]
        [HttpGet("GetPosPaymentList")]
        public async Task<ActionResult<ResponseDto>> GetPosPaymentList([FromQuery] GetPosPaymentListQuery request)
        {
            return await _mediator.Send(request);
        }
    }
}
