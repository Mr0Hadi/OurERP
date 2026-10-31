using Application.Common.Dtos;
using Application.Features.Reorder.Commands;
using Application.Features.Reorder.Queries;
using Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WMS.Authorization;

namespace WMS.Controllers
{
    /// <summary>Reorder point and purchase suggestions (GAP-04).</summary>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ReorderController : ControllerBase
    {
        private readonly IMediator _mediator;
        public ReorderController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HasPermission(PermissionEnum.ReorderSuggestionView)]
        [HttpGet("GetReorderSuggestionList")]
        public async Task<ActionResult<ResponseDto>> GetReorderSuggestionList([FromQuery] GetReorderSuggestionListQuery request) => await _mediator.Send(request);

        [HasPermission(PermissionEnum.PurchaseCreate)]
        [HttpPost("CreatePurchaseDraftsFromReorder")]
        public async Task<ActionResult<ResponseDto>> CreatePurchaseDraftsFromReorder([FromBody] CreatePurchaseDraftsFromReorderCommand request) => await _mediator.Send(request);
    }
}
