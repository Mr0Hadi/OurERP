using Application.Features.Customer.Commands;
using Application.Features.Customer.Queries;
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
    public class CustomerController : ControllerBase
    {
        private readonly IMediator _mediator;
        public CustomerController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HasPermission(PermissionEnum.CustomerView)]
        [HttpGet("GetCustomerList")]
        public async Task<ActionResult<ResponseDto>> GetCustomerList([FromQuery] GetCustomerListQuery request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.CustomerView)]
        [HttpGet("GetCustomerDetail")]
        public async Task<ActionResult<ResponseDto>> GetCustomerDetail([FromQuery] GetCustomerDetailQuery request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.CustomerCreate)]
        [HttpPost("CreateCustomer")]
        public async Task<ActionResult<ResponseDto>> CreateCustomer([FromBody] CreateCustomerCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.CustomerUpdate)]
        [HttpPut("UpdateCustomer")]
        public async Task<ActionResult<ResponseDto>> UpdateCustomer([FromBody] UpdateCustomerCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.CustomerDelete)]
        [HttpDelete("DeleteCustomer")]
        public async Task<ActionResult<ResponseDto>> DeleteCustomer([FromQuery] DeleteCustomerCommand request)
        {
            return await _mediator.Send(request);
        }
    }
}
