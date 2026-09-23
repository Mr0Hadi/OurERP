using Application.Features.Supplier.Commands;
using Application.Features.Supplier.Queries;
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
    public class SupplierController : ControllerBase
    {
        private readonly IMediator _mediator;
        public SupplierController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HasPermission(PermissionEnum.SupplierView)]
        [HttpGet("GetSupplierList")]
        public async Task<ActionResult<ResponseDto>> GetSupplierList([FromQuery] GetSupplierListQuery request)
        { 
            return await _mediator.Send(request); 
        }

        [HasPermission(PermissionEnum.SupplierView)]
        [HttpGet("GetSupplierDetail")]
        public async Task<ActionResult<ResponseDto>> GetSupplierDetail([FromQuery] GetSupplierDetailQuery request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.SupplierCreate)]
        [HttpPost("CreateSupplier")]
        public async Task<ActionResult<ResponseDto>> CreateSupplier([FromBody] CreateSupplierCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.SupplierUpdate)]
        [HttpPut("UpdateSupplier")]
        public async Task<ActionResult<ResponseDto>> UpdateSupplier([FromBody] UpdateSupplierCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.SupplierDelete)]
        [HttpDelete("DeleteSupplier")]
        public async Task<ActionResult<ResponseDto>> DeleteSupplier([FromQuery] DeleteSupplierCommand request)
        {
            return await _mediator.Send(request);
        }
    }
}
