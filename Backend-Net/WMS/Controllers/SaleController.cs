using Application.Features.Sale.Commands;
using Application.Features.Sale.Queries;
using Application.Common.Dtos;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Domain.Enums;
using WMS.Authorization;
using Application.Features.WarehouseIssue.Commands;
using Application.Features.WarehouseIssue.Queries;

namespace WMS.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class SaleController : ControllerBase
    {
        private readonly IMediator _mediator;
        public SaleController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HasPermission(PermissionEnum.SaleView, PermissionEnum.SaleWarehouseCheck)]
        [HttpGet("GetSaleList")]
        public async Task<ActionResult<ResponseDto>> GetSaleList([FromQuery] GetSaleListQuery request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.SaleView, PermissionEnum.SaleWarehouseCheck)]
        [HttpGet("GetSaleDetail")]
        public async Task<ActionResult<ResponseDto>> GetSaleDetail([FromQuery] GetSaleDetailQuery request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.SaleCreate)]
        [HttpPost("CreateSale")]
        public async Task<ActionResult<ResponseDto>> CreateSale([FromBody] CreateSaleCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.SaleInPerson)]
        [HttpPost("CreateInPersonProforma")]
        public async Task<ActionResult<ResponseDto>> CreateInPersonProforma([FromBody] CreateInPersonProformaCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.SaleUpdate, PermissionEnum.SaleWarehouseCheck)]
        [HttpPost("ReleaseSaleReservation")]
        public async Task<ActionResult<ResponseDto>> ReleaseSaleReservation([FromBody] ReleaseSaleReservationCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.SaleInPerson)]
        [HttpPost("CompleteInPersonSale")]
        public async Task<ActionResult<ResponseDto>> CompleteInPersonSale([FromBody] CompleteInPersonSaleCommand request)
        {
            return await _mediator.Send(request);
        }

        // ── Proforma approval pipeline (docs/proforma-approval-pipeline.md) ─────────────────────────────────────────
        [HasPermission(PermissionEnum.SaleUpdate)]
        [HttpPost("ApproveSaleProforma")]
        public async Task<ActionResult<ResponseDto>> ApproveSaleProforma([FromBody] ApproveSaleProformaCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.SaleWarehouseCheck)]
        [HttpPost("CheckSaleWarehouse")]
        public async Task<ActionResult<ResponseDto>> CheckSaleWarehouse([FromBody] CheckSaleWarehouseCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.AccountingView, PermissionEnum.SaleWarehouseIssueResolve)]
        [HttpGet("GetSaleWarehouseIssueList")]
        public async Task<ActionResult<ResponseDto>> GetSaleWarehouseIssueList([FromQuery] GetSaleWarehouseIssueListQuery request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.SaleWarehouseIssueResolve)]
        [HttpPost("ResolveSaleWarehouseIssue")]
        public async Task<ActionResult<ResponseDto>> ResolveSaleWarehouseIssue([FromBody] ResolveSaleWarehouseIssueCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.SaleUpdate)]
        [HttpPut("UpdateSale")]
        public async Task<ActionResult<ResponseDto>> UpdateSale([FromBody] UpdateSaleCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.SaleUpdate)]
        [HttpPost("ChangeSaleStatus")]
        public async Task<ActionResult<ResponseDto>> ChangeSaleStatus([FromBody] ChangeSaleStatusCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.SaleUpdate)]
        [HttpPut("UpdateSaleAttachments")]
        public async Task<ActionResult<ResponseDto>> UpdateSaleAttachments([FromBody] UpdateSaleAttachmentsCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.SaleUpdate)]
        [HttpPut("UpdateSalePaymentDate")]
        public async Task<ActionResult<ResponseDto>> UpdateSalePaymentDate([FromBody] UpdateSalePaymentDateCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.SalePayment)]
        [HttpPost("AddSalePayment")]
        public async Task<ActionResult<ResponseDto>> AddSalePayment([FromBody] AddSalePaymentCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.SalePayment)]
        [HttpPost("EditSalePayment")]
        public async Task<ActionResult<ResponseDto>> EditSalePayment([FromBody] EditSalePaymentCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.SalePayment)]
        [HttpPost("VoidSalePayment")]
        public async Task<ActionResult<ResponseDto>> VoidSalePayment([FromBody] VoidSalePaymentCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.SaleDelete)]
        [HttpDelete("DeleteSale")]
        public async Task<ActionResult<ResponseDto>> DeleteSale([FromQuery] DeleteSaleCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.SaleShip)]
        [HttpPost("ShipSale")]
        public async Task<ActionResult<ResponseDto>> ShipSale([FromBody] ShipSaleCommand request)
        {
            return await _mediator.Send(request);
        }
    }
}
