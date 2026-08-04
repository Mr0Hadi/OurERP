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

        [HttpPost("AddReturnDecision")]
        public async Task<ActionResult<ResponseDto>> AddReturnDecision([FromBody] AddReturnDecisionCommand request)
        {
            return await _mediator.Send(request);
        }

        [HttpDelete("RemoveReturnDecision")]
        public async Task<ActionResult<ResponseDto>> RemoveReturnDecision([FromQuery] RemoveReturnDecisionCommand request)
        {
            return await _mediator.Send(request);
        }

        [HttpPost("RejectReturn")]
        public async Task<ActionResult<ResponseDto>> RejectReturn([FromQuery] RejectReturnCommand request)
        {
            return await _mediator.Send(request);
        }

        [HttpPost("CancelReturn")]
        public async Task<ActionResult<ResponseDto>> CancelReturn([FromQuery] CancelReturnCommand request)
        {
            return await _mediator.Send(request);
        }

        [HttpPost("ReopenReturn")]
        public async Task<ActionResult<ResponseDto>> ReopenReturn([FromQuery] ReopenReturnCommand request)
        {
            return await _mediator.Send(request);
        }

        [HttpDelete("DeleteReturn")]
        public async Task<ActionResult<ResponseDto>> DeleteReturn([FromQuery] DeleteReturnCommand request)
        {
            return await _mediator.Send(request);
        }
    }
}
