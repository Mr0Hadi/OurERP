using Application.Common.Dtos;
using Application.Features.Stocktaking.Commands;
using Application.Features.Stocktaking.Queries;
using Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WMS.Authorization;

namespace WMS.Controllers
{
    /// <summary>Stocktake / physical inventory (انبارگردانی, GAP-01).</summary>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class StocktakeController : ControllerBase
    {
        private readonly IMediator _mediator;
        public StocktakeController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HasPermission(PermissionEnum.StocktakeView, PermissionEnum.StocktakeCount, PermissionEnum.StocktakeApprove)]
        [HttpGet("GetStocktakeList")]
        public async Task<ActionResult<ResponseDto>> GetStocktakeList([FromQuery] GetStocktakeListQuery request) => await _mediator.Send(request);

        [HasPermission(PermissionEnum.StocktakeView, PermissionEnum.StocktakeCount, PermissionEnum.StocktakeApprove)]
        [HttpGet("GetStocktakeDetail")]
        public async Task<ActionResult<ResponseDto>> GetStocktakeDetail([FromQuery] GetStocktakeDetailQuery request) => await _mediator.Send(request);

        [HasPermission(PermissionEnum.StocktakeCount)]
        [HttpPost("CreateStocktake")]
        public async Task<ActionResult<ResponseDto>> CreateStocktake([FromBody] CreateStocktakeCommand request) => await _mediator.Send(request);

        [HasPermission(PermissionEnum.StocktakeCount)]
        [HttpPost("ScanStocktakeUnits")]
        public async Task<ActionResult<ResponseDto>> ScanStocktakeUnits([FromBody] ScanStocktakeUnitsCommand request) => await _mediator.Send(request);

        [HasPermission(PermissionEnum.StocktakeCount)]
        [HttpPost("RemoveStocktakeScan")]
        public async Task<ActionResult<ResponseDto>> RemoveStocktakeScan([FromBody] RemoveStocktakeScanCommand request) => await _mediator.Send(request);

        [HasPermission(PermissionEnum.StocktakeCount)]
        [HttpPost("CountStocktakeLine")]
        public async Task<ActionResult<ResponseDto>> CountStocktakeLine([FromBody] CountStocktakeLineCommand request) => await _mediator.Send(request);

        [HasPermission(PermissionEnum.StocktakeCount)]
        [HttpPost("SubmitStocktake")]
        public async Task<ActionResult<ResponseDto>> SubmitStocktake([FromBody] SubmitStocktakeCommand request) => await _mediator.Send(request);

        [HasPermission(PermissionEnum.StocktakeApprove)]
        [HttpPost("ReopenStocktake")]
        public async Task<ActionResult<ResponseDto>> ReopenStocktake([FromBody] ReopenStocktakeCommand request) => await _mediator.Send(request);

        [HasPermission(PermissionEnum.StocktakeApprove)]
        [HttpPost("ApproveStocktake")]
        public async Task<ActionResult<ResponseDto>> ApproveStocktake([FromBody] ApproveStocktakeCommand request) => await _mediator.Send(request);

        [HasPermission(PermissionEnum.StocktakeApprove)]
        [HttpPost("CancelStocktake")]
        public async Task<ActionResult<ResponseDto>> CancelStocktake([FromBody] CancelStocktakeCommand request) => await _mediator.Send(request);
    }
}
