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

        [HttpGet("GetSaleReturnPendingEffects")]
        public async Task<ActionResult<ResponseDto>> GetSaleReturnPendingEffects([FromQuery] GetSaleReturnPendingEffectsQuery request)
        {
            return await _mediator.Send(request);
        }

        [HttpPost("CreateSaleReturn")]
        public async Task<ActionResult<ResponseDto>> CreateSaleReturn([FromBody] CreateSaleReturnCommand request)
        {
            return await _mediator.Send(request);
        }

        [HttpPost("AddClaimResolution")]
        public async Task<ActionResult<ResponseDto>> AddClaimResolution([FromBody] AddClaimResolutionCommand request)
        {
            return await _mediator.Send(request);
        }

        [HttpDelete("RemoveClaimResolution")]
        public async Task<ActionResult<ResponseDto>> RemoveClaimResolution([FromQuery] RemoveClaimResolutionCommand request)
        {
            return await _mediator.Send(request);
        }

        [HttpPost("ExecuteGoodsRound")]
        public async Task<ActionResult<ResponseDto>> ExecuteGoodsRound([FromBody] ExecuteGoodsRoundCommand request)
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
