using Application.Features.Product.Commands;
using Application.Features.Product.Queries;
using Application.Common.Dtos;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

namespace WMS.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ProductController : ControllerBase
    {
        private readonly IMediator _mediator;
        public ProductController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HttpGet("GetProductList")]
        public async Task<ActionResult<ResponseDto>> GetProductList([FromQuery] GetProductListQuery request)
        {
            return await _mediator.Send(request);
        }

        [HttpGet("GetProductDetail")]
        public async Task<ActionResult<ResponseDto>> GetProductDetail([FromQuery] GetProductDetailQuery request)
        {
            return await _mediator.Send(request);
        }

        [HttpPost("CreateProduct")]
        public async Task<ActionResult<ResponseDto>> CreateProduct([FromBody] CreateProductCommand request)
        {
            return await _mediator.Send(request);
        }

        [HttpPut("UpdateProduct")]
        public async Task<ActionResult<ResponseDto>> UpdateProduct([FromBody] UpdateProductCommand request)
        {
            return await _mediator.Send(request);
        }

        [HttpDelete("DeleteProduct")]
        public async Task<ActionResult<ResponseDto>> DeleteProduct([FromQuery] DeleteProductCommand request)
        {
            return await _mediator.Send(request);
        }
    }
}
