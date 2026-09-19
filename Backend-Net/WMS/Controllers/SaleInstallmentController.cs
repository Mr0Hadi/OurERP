using Application.Common.Dtos;
using Application.Features.SaleInstallment.Commands;
using Application.Features.SaleInstallment.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace WMS.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class SaleInstallmentController : ControllerBase
    {
        private readonly IMediator _mediator;
        public SaleInstallmentController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HttpGet("GetSaleInstallmentPlanList")]
        public async Task<ActionResult<ResponseDto>> GetSaleInstallmentPlanList([FromQuery] GetSaleInstallmentPlanListQuery request)
        {
            return await _mediator.Send(request);
        }

        [HttpGet("GetSaleInstallmentPlanDetail")]
        public async Task<ActionResult<ResponseDto>> GetSaleInstallmentPlanDetail([FromQuery] GetSaleInstallmentPlanDetailQuery request)
        {
            return await _mediator.Send(request);
        }

        [HttpGet("GetSaleInstallmentList")]
        public async Task<ActionResult<ResponseDto>> GetSaleInstallmentList([FromQuery] GetSaleInstallmentListQuery request)
        {
            return await _mediator.Send(request);
        }

        [HttpPost("CreateSaleInstallmentPlan")]
        public async Task<ActionResult<ResponseDto>> CreateSaleInstallmentPlan([FromBody] CreateSaleInstallmentPlanCommand request)
        {
            return await _mediator.Send(request);
        }

        [HttpPut("UpdateSaleInstallmentPlan")]
        public async Task<ActionResult<ResponseDto>> UpdateSaleInstallmentPlan([FromBody] UpdateSaleInstallmentPlanCommand request)
        {
            return await _mediator.Send(request);
        }

        [HttpDelete("DeleteSaleInstallmentPlan")]
        public async Task<ActionResult<ResponseDto>> DeleteSaleInstallmentPlan([FromQuery] DeleteSaleInstallmentPlanCommand request)
        {
            return await _mediator.Send(request);
        }

        [HttpPost("PaySaleInstallment")]
        public async Task<ActionResult<ResponseDto>> PaySaleInstallment([FromBody] PaySaleInstallmentCommand request)
        {
            return await _mediator.Send(request);
        }

        [HttpPost("SettleSaleInstallmentPlan")]
        public async Task<ActionResult<ResponseDto>> SettleSaleInstallmentPlan([FromBody] SettleSaleInstallmentPlanCommand request)
        {
            return await _mediator.Send(request);
        }
    }
}
