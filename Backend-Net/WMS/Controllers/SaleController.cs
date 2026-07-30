using Application.Features.Sale.Commands;
using Application.Features.Sale.Queries;
using Application.Common.Dtos;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

namespace WMS.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class SaleController : ControllerBase
    {
        private readonly IMediator _mediator;
        public SaleController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HttpGet("GetSaleList")]
        public async Task<ActionResult<ResponseDto>> GetSaleList([FromQuery] GetSaleListQuery request)
        {
            return await _mediator.Send(request);
        }

        [HttpGet("GetSaleDetail")]
        public async Task<ActionResult<ResponseDto>> GetSaleDetail([FromQuery] GetSaleDetailQuery request)
        {
            return await _mediator.Send(request);
        }

        [HttpPost("CreateSale")]
        public async Task<ActionResult<ResponseDto>> CreateSale([FromBody] CreateSaleCommand request)
        {
            return await _mediator.Send(request);
        }

        [HttpPut("UpdateSale")]
        public async Task<ActionResult<ResponseDto>> UpdateSale([FromBody] UpdateSaleCommand request)
        {
            return await _mediator.Send(request);
        }
    }
}
