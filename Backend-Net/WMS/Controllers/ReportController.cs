using Application.Features.Report.Queries;
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
    public class ReportController : ControllerBase
    {
        private readonly IMediator _mediator;
        public ReportController(IMediator mediator)
        {
            _mediator = mediator;
        }

        // No [HasPermission]: who may ask is decided by the org chart inside the handler (ME for anyone, TEAM/DEPARTMENT for
        // their heads and deputies), and it never shows revenue or cost - see GetScopePerformanceQuery.
        [HttpGet("GetScopePerformance")]
        public async Task<ActionResult<ResponseDto>> GetScopePerformance([FromQuery] GetScopePerformanceQuery request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.ReportView)]
        [HttpGet("GetSaleReport")]
        public async Task<ActionResult<ResponseDto>> GetSaleReport([FromQuery] GetSaleReportQuery request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.ReportView)]
        [HttpGet("GetPurchaseReport")]
        public async Task<ActionResult<ResponseDto>> GetPurchaseReport([FromQuery] GetPurchaseReportQuery request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.ReportView)]
        [HttpGet("GetSalesPerformanceByEmployee")]
        public async Task<ActionResult<ResponseDto>> GetSalesPerformanceByEmployee([FromQuery] GetSalesPerformanceByEmployeeQuery request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.ReportView)]
        [HttpGet("GetSupplyPerformanceByEmployee")]
        public async Task<ActionResult<ResponseDto>> GetSupplyPerformanceByEmployee([FromQuery] GetSupplyPerformanceByEmployeeQuery request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.ReportView)]
        [HttpGet("GetCustomerPurchaseStatistics")]
        public async Task<ActionResult<ResponseDto>> GetCustomerPurchaseStatistics([FromQuery] GetCustomerPurchaseStatisticsQuery request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.ReportView)]
        [HttpGet("GetSupplierSalesStatistics")]
        public async Task<ActionResult<ResponseDto>> GetSupplierSalesStatistics([FromQuery] GetSupplierSalesStatisticsQuery request)
        {
            return await _mediator.Send(request);
        }
    }
}
