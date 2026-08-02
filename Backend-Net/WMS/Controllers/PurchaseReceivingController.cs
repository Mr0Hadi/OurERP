using Application.Common.Dtos;
using Application.Features.Purchase.Queries;
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

        [HttpGet("GetReceiveList")]
        public async Task<ActionResult<ResponseDto>> GetReceiveList([FromQuery] GetReceivePurchaseListQuery request)
        {
            return await _mediator.Send(request);
        }

        [HttpGet("GetDetail")]
        public async Task<ActionResult<ResponseDto>> GetDetail([FromQuery] GetPurchaseReceiptDetailQuery request)
        {
            return await _mediator.Send(request);
        }

        [HttpPost("CreateReceipt")]
        public async Task<ActionResult<ResponseDto>> CreateReceipt([FromBody] CreatePurchaseReceiptCommand request)
        {
            return await _mediator.Send(request);
        }

        [HttpPost("RegisterDiscrepancies")]
        public async Task<ActionResult<ResponseDto>> RegisterDiscrepancies([FromBody] RegisterDiscrepanciesCommand request)
        {
            return await _mediator.Send(request);
        }

        [HttpPost("DecideDiscrepancies")]
        public async Task<ActionResult<ResponseDto>> DecideDiscrepancies([FromBody] DecideDiscrepanciesCommand request)
        {
            return await _mediator.Send(request);
        }

        [HttpDelete("RemoveDiscrepancy")]
        public async Task<ActionResult<ResponseDto>> RemoveDiscrepancy([FromBody] RemoveReceiptDiscrepancyCommand request)
        {
            return await _mediator.Send(request);
        }
    }
}
