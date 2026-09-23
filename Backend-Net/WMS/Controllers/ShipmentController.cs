using Application.Common.Dtos;
using Application.Features.Shipment.Commands;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Domain.Enums;
using WMS.Authorization;

namespace WMS.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ShipmentController : ControllerBase
    {
        private readonly IMediator _mediator;
        public ShipmentController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HasPermission(PermissionEnum.PurchaseReceive)]
        [HttpPost("ReceiveShipment")]
        public async Task<ActionResult<ResponseDto>> ReceiveShipment([FromBody] ReceiveShipmentCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.SaleShip)]
        [HttpPost("DispatchShipment")]
        public async Task<ActionResult<ResponseDto>> DispatchShipment([FromBody] DispatchShipmentCommand request)
        {
            return await _mediator.Send(request);
        }
    }
}
