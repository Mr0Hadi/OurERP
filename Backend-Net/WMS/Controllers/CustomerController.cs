using Application.Features.Customer.Commands;
using Application.Features.Customer.Queries;
using Application.Common.Dtos;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace WMS.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CustomerController : ControllerBase
    {
        private readonly IMediator _mediator;
        public CustomerController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HttpGet("GetCustomerList")]
        public async Task<ActionResult<ResponseDto>> GetCustomerList([FromQuery] GetCustomerList request)
            => await _mediator.Send(request);

        [HttpGet("GetCustomerDetail")]
        public async Task<ActionResult<ResponseDto>> GetCustomerDetail([FromQuery] GetCustomerDetail request)
            => await _mediator.Send(request);

        [HttpPost("CreateCustomer")]
        public async Task<ActionResult<ResponseDto>> CreateCustomer([FromBody] CreateCustomerCommand request)
            => await _mediator.Send(request);

        [HttpPut("UpdateCustomer")]
        public async Task<ActionResult<ResponseDto>> UpdateCustomer([FromBody] UpdateCustomerCommand request)
            => await _mediator.Send(request);
    }
}
