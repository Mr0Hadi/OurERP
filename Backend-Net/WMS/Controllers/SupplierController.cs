using Application.Features.Supplier.Commands;
using Application.Features.Supplier.Queries;
using Application.Common.Dtos;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

namespace WMS.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class SupplierController : ControllerBase
    {
        private readonly IMediator _mediator;
        public SupplierController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HttpGet("GetSupplierList")]
        public async Task<ActionResult<ResponseDto>> GetSupplierList([FromQuery] GetSupplierListQuery request)
        { 
            return await _mediator.Send(request); 
        }

        [HttpGet("GetSupplierDetail")]
        public async Task<ActionResult<ResponseDto>> GetSupplierDetail([FromQuery] GetSupplierDetailQuery request)
        {
            return await _mediator.Send(request);
        }

        [HttpPost("CreateSupplier")]
        public async Task<ActionResult<ResponseDto>> CreateSupplier([FromBody] CreateSupplierCommand request)
        {
            return await _mediator.Send(request);
        }

        [HttpPut("UpdateSupplier")]
        public async Task<ActionResult<ResponseDto>> UpdateSupplier([FromBody] UpdateSupplierCommand request)
        {
            return await _mediator.Send(request);
        }
    }
}
