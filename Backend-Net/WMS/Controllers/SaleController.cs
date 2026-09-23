using Application.Features.Sale.Commands;
using Application.Features.Sale.Queries;
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
    public class SaleController : ControllerBase
    {
        private readonly IMediator _mediator;
        public SaleController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HasPermission(PermissionEnum.SaleView)]
        [HttpGet("GetSaleList")]
        public async Task<ActionResult<ResponseDto>> GetSaleList([FromQuery] GetSaleListQuery request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.SaleView)]
        [HttpGet("GetSaleDetail")]
        public async Task<ActionResult<ResponseDto>> GetSaleDetail([FromQuery] GetSaleDetailQuery request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.SaleCreate)]
        [HttpPost("CreateSale")]
        public async Task<ActionResult<ResponseDto>> CreateSale([FromBody] CreateSaleCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.SaleInPerson)]
        [HttpPost("CreateInPersonSale")]
        public async Task<ActionResult<ResponseDto>> CreateInPersonSale([FromBody] CreateInPersonSaleCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.SaleUpdate)]
        [HttpPut("UpdateSale")]
        public async Task<ActionResult<ResponseDto>> UpdateSale([FromBody] UpdateSaleCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.SaleDelete)]
        [HttpDelete("DeleteSale")]
        public async Task<ActionResult<ResponseDto>> DeleteSale([FromQuery] DeleteSaleCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.SaleShip)]
        [HttpPost("ShipSale")]
        public async Task<ActionResult<ResponseDto>> ShipSale([FromBody] ShipSaleCommand request)
        {
            return await _mediator.Send(request);
        }
    }
}
