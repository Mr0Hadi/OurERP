using Application.Features.Purchase.Commands;
using Application.Features.Purchase.Queries;
using Application.Common.Dtos;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

namespace WMS.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class PurchaseController : ControllerBase
    {
        private readonly IMediator _mediator;
        public PurchaseController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HttpGet("GetPurchaseList")]
        public async Task<ActionResult<ResponseDto>> GetPurchaseList([FromQuery] GetPurchaseListQuery request)
        {
            return await _mediator.Send(request);
        }

        [HttpGet("GetPurchaseDetail")]
        public async Task<ActionResult<ResponseDto>> GetPurchaseDetail([FromQuery] GetPurchaseDetailQuery request)
        {
            return await _mediator.Send(request);
        }

        [HttpPost("CreatePurchase")]
        public async Task<ActionResult<ResponseDto>> CreatePurchase([FromBody] CreatePurchaseCommand request)
        {
            return await _mediator.Send(request);
        }

        [HttpPut("UpdatePurchase")]
        public async Task<ActionResult<ResponseDto>> UpdatePurchase([FromBody] UpdatePurchaseCommand request)
        {
            return await _mediator.Send(request);
        }

        [HttpDelete("DeletePurchase")]
        public async Task<ActionResult<ResponseDto>> DeletePurchase([FromQuery] DeletePurchaseCommand request)
        {
            return await _mediator.Send(request);
        }

        [HttpPost("ReceivePurchase")]
        public async Task<ActionResult<ResponseDto>> ReceivePurchase([FromBody] ReceivePurchaseCommand request)
        {
            return await _mediator.Send(request);
        }
    }
}
