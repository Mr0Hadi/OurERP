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
    }
}
