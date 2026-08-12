using Application.Common.Dtos;
using Application.Features.PurchaseReturn.Commands;
using Application.Features.PurchaseReturn.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace WMS.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class PurchaseReturnController : ControllerBase
    {
        private readonly IMediator _mediator;
        public PurchaseReturnController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HttpGet("GetPurchaseReturnList")]
        public async Task<ActionResult<ResponseDto>> GetPurchaseReturnList([FromQuery] GetPurchaseReturnListQuery request)
        {
            return await _mediator.Send(request);
        }

        [HttpGet("GetPurchaseReturnDetail")]
        public async Task<ActionResult<ResponseDto>> GetPurchaseReturnDetail([FromQuery] GetPurchaseReturnDetailQuery request)
        {
            return await _mediator.Send(request);
        }

        [HttpGet("GetPurchaseReceivingInfo")]
        public async Task<ActionResult<ResponseDto>> GetPurchaseReceivingInfo([FromQuery] GetPurchaseReceivingInfoQuery request)
        {
            return await _mediator.Send(request);
        }

        [HttpPost("AddPurchaseReturnDecision")]
        public async Task<ActionResult<ResponseDto>> AddPurchaseReturnDecision([FromBody] AddPurchaseReturnDecisionCommand request)
        {
            return await _mediator.Send(request);
        }

        [HttpDelete("RemovePurchaseReturnDecision")]
        public async Task<ActionResult<ResponseDto>> RemovePurchaseReturnDecision([FromQuery] RemovePurchaseReturnDecisionCommand request)
        {
            return await _mediator.Send(request);
        }

        [HttpPost("CancelPurchaseReturn")]
        public async Task<ActionResult<ResponseDto>> CancelPurchaseReturn([FromBody] CancelPurchaseReturnCommand request)
        {
            return await _mediator.Send(request);
        }

        [HttpPost("RejectPurchaseReturn")]
        public async Task<ActionResult<ResponseDto>> RejectPurchaseReturn([FromBody] RejectPurchaseReturnCommand request)
        {
            return await _mediator.Send(request);
        }

        [HttpPost("ReopenPurchaseReturn")]
        public async Task<ActionResult<ResponseDto>> ReopenPurchaseReturn([FromBody] ReopenPurchaseReturnCommand request)
        {
            return await _mediator.Send(request);
        }

        [HttpDelete("DeletePurchaseReturn")]
        public async Task<ActionResult<ResponseDto>> DeletePurchaseReturn([FromQuery] DeletePurchaseReturnCommand request)
        {
            return await _mediator.Send(request);
        }
    }
}
