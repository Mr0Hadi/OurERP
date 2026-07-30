using Application.Features.ProductCategory.Commands;
using Application.Features.ProductCategory.Queries;
using Application.Common.Dtos;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

namespace WMS.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ProductCategoryController : ControllerBase
    {
        private readonly IMediator _mediator;
        public ProductCategoryController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HttpGet("GetProductCategoryList")]
        public async Task<ActionResult<ResponseDto>> GetProductCategoryList([FromQuery] GetProductCategoryListQuery request)
        {
            return await _mediator.Send(request);
        }

        [HttpGet("GetProductCategoryDetail")]
        public async Task<ActionResult<ResponseDto>> GetProductCategoryDetail([FromQuery] GetProductCategoryDetailQuery request)
        {
            return await _mediator.Send(request);
        }

        [HttpPost("CreateProductCategory")]
        public async Task<ActionResult<ResponseDto>> CreateProductCategory([FromBody] CreateProductCategoryCommand request)
        {
            return await _mediator.Send(request);
        }

        [HttpPut("UpdateProductCategory")]
        public async Task<ActionResult<ResponseDto>> UpdateProductCategory([FromBody] UpdateProductCategoryCommand request)
        {
            return await _mediator.Send(request);
        }
    }
}
