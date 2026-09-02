using Application.Features.Report.Queries;
using Application.Common.Dtos;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

namespace WMS.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ReportController : ControllerBase
    {
        private readonly IMediator _mediator;
        public ReportController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HttpGet("GetSaleReport")]
        public async Task<ActionResult<ResponseDto>> GetSaleReport([FromQuery] GetSaleReportQuery request)
        {
            return await _mediator.Send(request);
        }

        [HttpGet("GetPurchaseReport")]
        public async Task<ActionResult<ResponseDto>> GetPurchaseReport([FromQuery] GetPurchaseReportQuery request)
        {
            return await _mediator.Send(request);
        }

        [HttpGet("GetSalesPerformanceByEmployee")]
        public async Task<ActionResult<ResponseDto>> GetSalesPerformanceByEmployee([FromQuery] GetSalesPerformanceByEmployeeQuery request)
        {
            return await _mediator.Send(request);
        }

        [HttpGet("GetSupplyPerformanceByEmployee")]
        public async Task<ActionResult<ResponseDto>> GetSupplyPerformanceByEmployee([FromQuery] GetSupplyPerformanceByEmployeeQuery request)
        {
            return await _mediator.Send(request);
        }

        [HttpGet("GetCustomerPurchaseStatistics")]
        public async Task<ActionResult<ResponseDto>> GetCustomerPurchaseStatistics([FromQuery] GetCustomerPurchaseStatisticsQuery request)
        {
            return await _mediator.Send(request);
        }

        [HttpGet("GetSupplierSalesStatistics")]
        public async Task<ActionResult<ResponseDto>> GetSupplierSalesStatistics([FromQuery] GetSupplierSalesStatisticsQuery request)
        {
            return await _mediator.Send(request);
        }
    }
}
