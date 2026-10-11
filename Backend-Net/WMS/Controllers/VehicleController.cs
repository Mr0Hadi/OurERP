using Application.Common.Dtos;
using Application.Features.Vehicle.Commands;
using Application.Features.Vehicle.Queries;
using Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WMS.Authorization;

namespace WMS.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class VehicleController : ControllerBase
    {
        private readonly IMediator _mediator;
        public VehicleController(IMediator mediator)
        {
            _mediator = mediator;
        }

        // Whoever manages categories manages vehicles too, so existing users need no new grant; the Vehicle*
        // permissions allow narrower access. The product form picks vehicles from this list, so viewing products is enough to read it.
        [HasPermission(PermissionEnum.VehicleView, PermissionEnum.ProductCategoryView, PermissionEnum.ProductView)]
        [HttpGet("GetVehicleList")]
        public async Task<ActionResult<ResponseDto>> GetVehicleList([FromQuery] GetVehicleListQuery request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.VehicleView, PermissionEnum.ProductCategoryView)]
        [HttpGet("GetVehicleProductList")]
        public async Task<ActionResult<ResponseDto>> GetVehicleProductList([FromQuery] GetVehicleProductListQuery request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.VehicleManage, PermissionEnum.ProductCategoryManage)]
        [HttpPost("CreateVehicle")]
        public async Task<ActionResult<ResponseDto>> CreateVehicle([FromBody] CreateVehicleCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.VehicleManage, PermissionEnum.ProductCategoryManage)]
        [HttpPut("UpdateVehicle")]
        public async Task<ActionResult<ResponseDto>> UpdateVehicle([FromBody] UpdateVehicleCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.VehicleManage, PermissionEnum.ProductCategoryManage)]
        [HttpDelete("DeleteVehicle")]
        public async Task<ActionResult<ResponseDto>> DeleteVehicle([FromQuery] DeleteVehicleCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.VehicleManage, PermissionEnum.ProductCategoryManage)]
        [HttpPost("AddProductsToVehicle")]
        public async Task<ActionResult<ResponseDto>> AddProductsToVehicle([FromBody] AddProductsToVehicleCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.VehicleManage, PermissionEnum.ProductCategoryManage)]
        [HttpDelete("RemoveProductFromVehicle")]
        public async Task<ActionResult<ResponseDto>> RemoveProductFromVehicle([FromQuery] RemoveProductFromVehicleCommand request)
        {
            return await _mediator.Send(request);
        }
    }
}
