using Application.Common.Dtos;
using Application.Features.Accounting.Queries;
using Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WMS.Authorization;

namespace WMS.Controllers
{
    /// <summary>The accounting dashboard and the journals behind it. Read-only; one permission for the whole page.</summary>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class AccountingController : ControllerBase
    {
        private readonly IMediator _mediator;
        public AccountingController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HasPermission(PermissionEnum.AccountingView)]
        [HttpGet("GetAccountingDashboard")]
        public async Task<ActionResult<ResponseDto>> GetAccountingDashboard([FromQuery] GetAccountingDashboardQuery request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.AccountingView)]
        [HttpGet("GetPartyBalanceList")]
        public async Task<ActionResult<ResponseDto>> GetPartyBalanceList([FromQuery] GetPartyBalanceListQuery request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.AccountingView)]
        [HttpGet("GetPartyLedgerEntryList")]
        public async Task<ActionResult<ResponseDto>> GetPartyLedgerEntryList([FromQuery] GetPartyLedgerEntryListQuery request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.AccountingView)]
        [HttpGet("GetSaleJournal")]
        public async Task<ActionResult<ResponseDto>> GetSaleJournal([FromQuery] GetSaleJournalQuery request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.AccountingView)]
        [HttpGet("GetPurchaseJournal")]
        public async Task<ActionResult<ResponseDto>> GetPurchaseJournal([FromQuery] GetPurchaseJournalQuery request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.AccountingView)]
        [HttpGet("GetSaleLineJournal")]
        public async Task<ActionResult<ResponseDto>> GetSaleLineJournal([FromQuery] GetSaleLineJournalQuery request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.AccountingView)]
        [HttpGet("GetPaymentJournal")]
        public async Task<ActionResult<ResponseDto>> GetPaymentJournal([FromQuery] GetPaymentJournalQuery request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.AccountingView)]
        [HttpGet("GetTaxReport")]
        public async Task<ActionResult<ResponseDto>> GetTaxReport([FromQuery] GetTaxReportQuery request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.AccountingView)]
        [HttpGet("GetInventoryValuation")]
        public async Task<ActionResult<ResponseDto>> GetInventoryValuation([FromQuery] GetInventoryValuationQuery request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.AccountingView)]
        [HttpGet("GetTradeBreakdown")]
        public async Task<ActionResult<ResponseDto>> GetTradeBreakdown([FromQuery] GetTradeBreakdownQuery request)
        {
            return await _mediator.Send(request);
        }
    }
}
