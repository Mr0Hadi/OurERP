using Application.Common.Dtos;
using Application.Features.PurchaseReturn.Commands;
using Application.Features.PurchaseReturn.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Domain.Enums;
using WMS.Authorization;

namespace WMS.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class PurchaseReturnController : ControllerBase
    {
        private readonly IMediator _mediator;
        public PurchaseReturnController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HasPermission(PermissionEnum.PurchaseReturnView)]
        [HttpGet("GetPurchaseReturnList")]
        public async Task<ActionResult<ResponseDto>> GetPurchaseReturnList([FromQuery] GetPurchaseReturnListQuery request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.PurchaseReturnView)]
        [HttpGet("GetPurchaseReturnDetail")]
        public async Task<ActionResult<ResponseDto>> GetPurchaseReturnDetail([FromQuery] GetPurchaseReturnDetailQuery request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.PurchaseReturnView)]
        [HttpGet("GetPurchaseReceivingInfo")]
        public async Task<ActionResult<ResponseDto>> GetPurchaseReceivingInfo([FromQuery] GetPurchaseReceivingInfoQuery request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.PurchaseReturnView)]
        [HttpGet("GetPurchaseReturnPendingEffects")]
        public async Task<ActionResult<ResponseDto>> GetPurchaseReturnPendingEffects([FromQuery] GetPurchaseReturnPendingEffectsQuery request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.PurchaseReturnCreate)]
        [HttpPost("CreatePurchaseReturn")]
        public async Task<ActionResult<ResponseDto>> CreatePurchaseReturn([FromBody] CreatePurchaseReturnCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.PurchaseReturnDecide)]
        [HttpPost("AddClaimResolution")]
        public async Task<ActionResult<ResponseDto>> AddClaimResolution([FromBody] AddClaimResolutionCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.PurchaseReturnDecide)]
        [HttpDelete("RemoveClaimResolution")]
        public async Task<ActionResult<ResponseDto>> RemoveClaimResolution([FromQuery] RemoveClaimResolutionCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.PurchaseReturnExecute)]
        [HttpPost("ExecuteGoodsRound")]
        public async Task<ActionResult<ResponseDto>> ExecuteGoodsRound([FromBody] ExecuteGoodsRoundCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.PurchaseReturnExecute)]
        [HttpPost("ExecuteMoneyEffect")]
        public async Task<ActionResult<ResponseDto>> ExecuteMoneyEffect([FromBody] ExecuteMoneyEffectCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.PurchaseReturnLifecycle)]
        [HttpPost("CancelPurchaseReturn")]
        public async Task<ActionResult<ResponseDto>> CancelPurchaseReturn([FromBody] CancelPurchaseReturnCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.PurchaseReturnLifecycle)]
        [HttpPost("RejectPurchaseReturn")]
        public async Task<ActionResult<ResponseDto>> RejectPurchaseReturn([FromBody] RejectPurchaseReturnCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.PurchaseReturnLifecycle)]
        [HttpPost("ReopenPurchaseReturn")]
        public async Task<ActionResult<ResponseDto>> ReopenPurchaseReturn([FromBody] ReopenPurchaseReturnCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.PurchaseReturnLifecycle)]
        [HttpDelete("DeletePurchaseReturn")]
        public async Task<ActionResult<ResponseDto>> DeletePurchaseReturn([FromQuery] DeletePurchaseReturnCommand request)
        {
            return await _mediator.Send(request);
        }
    }
}
