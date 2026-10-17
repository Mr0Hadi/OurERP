using Application.Common.Dtos;
using Application.Features.PartyAccount.Commands;
using Application.Features.PartyAccount.Queries;
using Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WMS.Authorization;

namespace WMS.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class PartyAccountController : ControllerBase
    {
        private readonly IMediator _mediator;
        public PartyAccountController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HasPermission(PermissionEnum.PartyStatementView)]
        [HttpGet("GetPartyStatement")]
        public async Task<ActionResult<ResponseDto>> GetPartyStatement([FromQuery] GetPartyStatementQuery request)
        {
            return await _mediator.Send(request);
        }

        // ---- On-account receipts and payments (علی‌الحساب) ----

        [HasPermission(PermissionEnum.PartyStatementView, PermissionEnum.PartyPaymentCreate)]
        [HttpGet("GetPartyPaymentList")]
        public async Task<ActionResult<ResponseDto>> GetPartyPaymentList([FromQuery] GetPartyPaymentListQuery request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.PartyStatementView, PermissionEnum.PartyPaymentCreate)]
        [HttpGet("GetPartyPaymentDetail")]
        public async Task<ActionResult<ResponseDto>> GetPartyPaymentDetail([FromQuery] GetPartyPaymentDetailQuery request)
        {
            return await _mediator.Send(request);
        }

        /// <summary>The party's open invoices an on-account payment can be applied to.</summary>
        [HasPermission(PermissionEnum.PartyPaymentCreate)]
        [HttpGet("GetAllocatableDocumentList")]
        public async Task<ActionResult<ResponseDto>> GetAllocatableDocumentList([FromQuery] GetAllocatableDocumentListQuery request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.PartyPaymentCreate)]
        [HttpPost("AddPartyPayment")]
        public async Task<ActionResult<ResponseDto>> AddPartyPayment([FromBody] AddPartyPaymentCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.PartyPaymentCreate)]
        [HttpPost("AllocatePartyPayment")]
        public async Task<ActionResult<ResponseDto>> AllocatePartyPayment([FromBody] AllocatePartyPaymentCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.PartyPaymentCreate)]
        [HttpPost("RemovePartyPaymentAllocation")]
        public async Task<ActionResult<ResponseDto>> RemovePartyPaymentAllocation([FromBody] RemovePartyPaymentAllocationCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.PartyPaymentVoid)]
        [HttpPost("VoidPartyPayment")]
        public async Task<ActionResult<ResponseDto>> VoidPartyPayment([FromBody] VoidPartyPaymentCommand request)
        {
            return await _mediator.Send(request);
        }
    }
}
