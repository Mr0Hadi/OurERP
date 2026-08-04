using Application.Common.Dtos;
using Application.Features.PurchaseReceiving.Commands;
using Application.Features.PurchaseReceiving.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace WMS.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class PurchaseReceivingController : ControllerBase
    {
        private readonly IMediator _mediator;
        public PurchaseReceivingController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HttpGet("GetReceivePurchaseList")]
        public async Task<ActionResult<ResponseDto>> GetReceivePurchaseList([FromQuery] GetReceivePurchaseListQuery request)
        {
            return await _mediator.Send(request);
        }

        [HttpGet("GetReceivePurchaseDetail")]
        public async Task<ActionResult<ResponseDto>> GetReceivePurchaseDetail([FromQuery] GetReceivePurchaseDetailQuery request)
        {
            return await _mediator.Send(request);
        }

        [HttpPost("ConfirmReceiving")]
        public async Task<ActionResult<ResponseDto>> ConfirmReceiving([FromBody] ConfirmReceivingCommand request)
        {
            return await _mediator.Send(request);
        }
    }
}
