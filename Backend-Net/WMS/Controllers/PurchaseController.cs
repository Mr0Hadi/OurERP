using Application.Features.Purchase.Commands;
using Application.Features.Purchase.Queries;
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
    public class PurchaseController : ControllerBase
    {
        private readonly IMediator _mediator;
        public PurchaseController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HasPermission(PermissionEnum.PurchaseView)]
        [HttpGet("GetPurchaseList")]
        public async Task<ActionResult<ResponseDto>> GetPurchaseList([FromQuery] GetPurchaseListQuery request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.PurchaseView)]
        [HttpGet("GetPurchaseDetail")]
        public async Task<ActionResult<ResponseDto>> GetPurchaseDetail([FromQuery] GetPurchaseDetailQuery request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.PurchaseCreate)]
        [HttpPost("CreatePurchase")]
        public async Task<ActionResult<ResponseDto>> CreatePurchase([FromBody] CreatePurchaseCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.PurchaseUpdate)]
        [HttpPut("UpdatePurchase")]
        public async Task<ActionResult<ResponseDto>> UpdatePurchase([FromBody] UpdatePurchaseCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.PurchaseUpdate)]
        [HttpPost("ChangePurchaseStatus")]
        public async Task<ActionResult<ResponseDto>> ChangePurchaseStatus([FromBody] ChangePurchaseStatusCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.PurchaseUpdate)]
        [HttpPut("UpdatePurchaseAttachments")]
        public async Task<ActionResult<ResponseDto>> UpdatePurchaseAttachments([FromBody] UpdatePurchaseAttachmentsCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.PurchaseUpdate)]
        [HttpPut("UpdatePurchasePaymentDate")]
        public async Task<ActionResult<ResponseDto>> UpdatePurchasePaymentDate([FromBody] UpdatePurchasePaymentDateCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.PurchasePayment)]
        [HttpPost("AddPurchasePayment")]
        public async Task<ActionResult<ResponseDto>> AddPurchasePayment([FromBody] AddPurchasePaymentCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.PurchasePayment)]
        [HttpPost("EditPurchasePayment")]
        public async Task<ActionResult<ResponseDto>> EditPurchasePayment([FromBody] EditPurchasePaymentCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.PurchasePayment)]
        [HttpPost("VoidPurchasePayment")]
        public async Task<ActionResult<ResponseDto>> VoidPurchasePayment([FromBody] VoidPurchasePaymentCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.PurchaseDelete)]
        [HttpDelete("DeletePurchase")]
        public async Task<ActionResult<ResponseDto>> DeletePurchase([FromQuery] DeletePurchaseCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.PurchaseReceive)]
        [HttpPost("ReceivePurchase")]
        public async Task<ActionResult<ResponseDto>> ReceivePurchase([FromBody] ReceivePurchaseCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.PurchaseItemClose)]
        [HttpPost("ClosePurchaseItem")]
        public async Task<ActionResult<ResponseDto>> ClosePurchaseItem([FromBody] ClosePurchaseItemCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.PurchaseAcceptExcess)]
        [HttpPost("AcceptPurchaseExcess")]
        public async Task<ActionResult<ResponseDto>> AcceptPurchaseExcess([FromBody] AcceptPurchaseExcessCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.PurchaseItemClose)]
        [HttpPost("ReopenPurchaseItem")]
        public async Task<ActionResult<ResponseDto>> ReopenPurchaseItem([FromBody] ReopenPurchaseItemCommand request)
        {
            return await _mediator.Send(request);
        }
    }
}
