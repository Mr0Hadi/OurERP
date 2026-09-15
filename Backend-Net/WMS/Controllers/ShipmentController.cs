using Application.Common.Dtos;
using Application.Features.Shipment.Commands;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

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

        [HttpPost("ReceiveShipment")]
        public async Task<ActionResult<ResponseDto>> ReceiveShipment([FromBody] ReceiveShipmentCommand request)
        {
            return await _mediator.Send(request);
        }

        [HttpPost("DispatchShipment")]
        public async Task<ActionResult<ResponseDto>> DispatchShipment([FromBody] DispatchShipmentCommand request)
        {
            return await _mediator.Send(request);
        }
    }
}
