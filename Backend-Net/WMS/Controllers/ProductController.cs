using Application.Features.Product.Commands;
using Application.Features.Product.Queries;
using Application.Common.Dtos;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Domain.Enums;
using WMS.Authorization;

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

        [HasPermission(PermissionEnum.ProductView)]
        [HttpGet("GetProductList")]
        public async Task<ActionResult<ResponseDto>> GetProductList([FromQuery] GetProductListQuery request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.ProductView)]
        [HttpGet("GetProductDetail")]
        public async Task<ActionResult<ResponseDto>> GetProductDetail([FromQuery] GetProductDetailQuery request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.ProductView)]
        [HttpGet("ScanBarcode")]
        public async Task<ActionResult<ResponseDto>> ScanBarcode([FromQuery] ScanBarcodeQuery request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.ProductUnitView)]
        [HttpGet("GetProductUnitList")]
        public async Task<ActionResult<ResponseDto>> GetProductUnitList([FromQuery] GetProductUnitListQuery request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.ProductUnitView)]
        [HttpGet("GetProductUnitHistory")]
        public async Task<ActionResult<ResponseDto>> GetProductUnitHistory([FromQuery] GetProductUnitHistoryQuery request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.InventoryMaintenance)]
        [HttpPost("EnsureProductCodes")]
        public async Task<ActionResult<ResponseDto>> EnsureProductCodes([FromBody] EnsureProductCodesCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.InventoryMaintenance)]
        [HttpPost("EnsureInventoryCostLedger")]
        public async Task<ActionResult<ResponseDto>> EnsureInventoryCostLedger([FromBody] EnsureInventoryCostLedgerCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.ProductCreate)]
        [HttpPost("CreateProduct")]
        public async Task<ActionResult<ResponseDto>> CreateProduct([FromBody] CreateProductCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.ProductUpdate)]
        [HttpPut("UpdateProduct")]
        public async Task<ActionResult<ResponseDto>> UpdateProduct([FromBody] UpdateProductCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.ProductDelete)]
        [HttpDelete("DeleteProduct")]
        public async Task<ActionResult<ResponseDto>> DeleteProduct([FromQuery] DeleteProductCommand request)
        {
            return await _mediator.Send(request);
        }
    }
}
