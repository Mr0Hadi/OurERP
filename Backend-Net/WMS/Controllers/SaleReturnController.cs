using Application.Common.Dtos;
using Application.Features.SaleReturn.Commands;
using Application.Features.SaleReturn.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace WMS.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class SaleReturnController : ControllerBase
    {
        private readonly IMediator _mediator;
        public SaleReturnController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HttpGet("GetSaleReturnList")]
        public async Task<ActionResult<ResponseDto>> GetSaleReturnList([FromQuery] GetSaleReturnListQuery request)
        {
            return await _mediator.Send(request);
        }

        [HttpGet("GetSaleReturnDetail")]
        public async Task<ActionResult<ResponseDto>> GetSaleReturnDetail([FromQuery] GetSaleReturnDetailQuery request)
        {
            return await _mediator.Send(request);
        }

        [HttpGet("GetSaleReturnInspectionInfo")]
        public async Task<ActionResult<ResponseDto>> GetSaleReturnInspectionInfo([FromQuery] GetSaleReturnInspectionInfoQuery request)
        {
            return await _mediator.Send(request);
        }

        [HttpGet("GetReplacementShippingQueue")]
        public async Task<ActionResult<ResponseDto>> GetReplacementShippingQueue([FromQuery] GetReplacementShippingQueueQuery request)
        {
            return await _mediator.Send(request);
        }

        [HttpPost("CreateSaleReturn")]
        public async Task<ActionResult<ResponseDto>> CreateSaleReturn([FromBody] CreateSaleReturnCommand request)
        {
            return await _mediator.Send(request);
        }

        [HttpPost("ConfirmReturnInspection")]
        public async Task<ActionResult<ResponseDto>> ConfirmReturnInspection([FromBody] ConfirmReturnInspectionCommand request)
        {
            return await _mediator.Send(request);
        }

        [HttpPost("AddSaleReturnDecision")]
        public async Task<ActionResult<ResponseDto>> AddSaleReturnDecision([FromBody] AddSaleReturnDecisionCommand request)
        {
            return await _mediator.Send(request);
        }

        [HttpDelete("RemoveSaleReturnDecision")]
        public async Task<ActionResult<ResponseDto>> RemoveSaleReturnDecision([FromQuery] RemoveSaleReturnDecisionCommand request)
        {
            return await _mediator.Send(request);
        }

        [HttpPost("ConfirmReplacementShipment")]
        public async Task<ActionResult<ResponseDto>> ConfirmReplacementShipment([FromBody] ConfirmReplacementShipmentCommand request)
        {
            return await _mediator.Send(request);
        }

        [HttpPost("CancelSaleReturn")]
        public async Task<ActionResult<ResponseDto>> CancelSaleReturn([FromBody] CancelSaleReturnCommand request)
        {
            return await _mediator.Send(request);
        }

        [HttpPost("RejectSaleReturn")]
        public async Task<ActionResult<ResponseDto>> RejectSaleReturn([FromBody] RejectSaleReturnCommand request)
        {
            return await _mediator.Send(request);
        }

        [HttpPost("ReopenSaleReturn")]
        public async Task<ActionResult<ResponseDto>> ReopenSaleReturn([FromBody] ReopenSaleReturnCommand request)
        {
            return await _mediator.Send(request);
        }

        [HttpDelete("DeleteSaleReturn")]
        public async Task<ActionResult<ResponseDto>> DeleteSaleReturn([FromQuery] DeleteSaleReturnCommand request)
        {
            return await _mediator.Send(request);
        }
    }
}
