using Application.Common.Dtos;
using Application.Features.Warehousing.Commands;
using Application.Features.Warehousing.Queries;
using Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WMS.Authorization;

namespace WMS.Controllers
{
    /// <summary>
    /// Warehouses and stock transfers between them (GAP-08). The flows are used only while the Warehouse.MultiWarehouseEnabled
    /// setting is on; reads and finishing an in-transit transfer always work (CLAUDE.md 6b).
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class WarehouseController : ControllerBase
    {
        private readonly IMediator _mediator;
        public WarehouseController(IMediator mediator)
        {
            _mediator = mediator;
        }

        /// <summary>Every signed-in user: the warehouse pickers need it.</summary>
        [HttpGet("GetWarehouseList")]
        public async Task<ActionResult<ResponseDto>> GetWarehouseList([FromQuery] GetWarehouseListQuery request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.ProductView, PermissionEnum.ProductUnitView, PermissionEnum.WarehouseManage)]
        [HttpGet("GetProductWarehouseStock")]
        public async Task<ActionResult<ResponseDto>> GetProductWarehouseStock([FromQuery] GetProductWarehouseStockQuery request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.WarehouseManage)]
        [HttpPost("CreateWarehouse")]
        public async Task<ActionResult<ResponseDto>> CreateWarehouse([FromBody] CreateWarehouseCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.WarehouseManage)]
        [HttpPut("UpdateWarehouse")]
        public async Task<ActionResult<ResponseDto>> UpdateWarehouse([FromBody] UpdateWarehouseCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.WarehouseManage)]
        [HttpDelete("DeleteWarehouse")]
        public async Task<ActionResult<ResponseDto>> DeleteWarehouse([FromQuery] DeleteWarehouseCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.StockTransferView, PermissionEnum.StockTransferManage)]
        [HttpGet("GetStockTransferList")]
        public async Task<ActionResult<ResponseDto>> GetStockTransferList([FromQuery] GetStockTransferListQuery request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.StockTransferView, PermissionEnum.StockTransferManage)]
        [HttpGet("GetStockTransferDetail")]
        public async Task<ActionResult<ResponseDto>> GetStockTransferDetail([FromQuery] GetStockTransferDetailQuery request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.StockTransferManage)]
        [HttpPost("CreateStockTransfer")]
        public async Task<ActionResult<ResponseDto>> CreateStockTransfer([FromBody] CreateStockTransferCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.StockTransferManage)]
        [HttpPost("ReceiveStockTransfer")]
        public async Task<ActionResult<ResponseDto>> ReceiveStockTransfer([FromBody] ReceiveStockTransferCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.StockTransferManage)]
        [HttpPost("CancelStockTransfer")]
        public async Task<ActionResult<ResponseDto>> CancelStockTransfer([FromBody] CancelStockTransferCommand request)
        {
            return await _mediator.Send(request);
        }
    }
}
