using Application.Common.Dtos;
using Application.Features.Treasury.Commands;
using Application.Features.Treasury.Queries;
using Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WMS.Authorization;

namespace WMS.Controllers
{
    /// <summary>Cash boxes and bank accounts (صندوق و بانک), their statements, and transfers between them.</summary>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class BankAccountController : ControllerBase
    {
        private readonly IMediator _mediator;
        public BankAccountController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HasPermission(PermissionEnum.BankAccountView, PermissionEnum.BankAccountManage)]
        [HttpGet("GetBankAccountList")]
        public async Task<ActionResult<ResponseDto>> GetBankAccountList([FromQuery] GetBankAccountListQuery request)
        {
            return await _mediator.Send(request);
        }

        /// <summary>The picker on payment forms: open to everyone who records money, no balances.</summary>
        [HasPermission(PermissionEnum.BankAccountView, PermissionEnum.BankAccountManage, PermissionEnum.SalePayment, PermissionEnum.PurchasePayment,
            PermissionEnum.PartyPaymentCreate, PermissionEnum.SaleInstallmentPay, PermissionEnum.SaleInstallmentManage, PermissionEnum.SaleInPerson,
            PermissionEnum.PurchaseCreate, PermissionEnum.PosTerminalManage)]
        [HttpGet("GetBankAccountOptions")]
        public async Task<ActionResult<ResponseDto>> GetBankAccountOptions([FromQuery] GetBankAccountOptionsQuery request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.BankAccountView, PermissionEnum.BankAccountManage)]
        [HttpGet("GetBankAccountDetail")]
        public async Task<ActionResult<ResponseDto>> GetBankAccountDetail([FromQuery] GetBankAccountDetailQuery request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.BankAccountView, PermissionEnum.BankAccountManage)]
        [HttpGet("GetBankAccountStatement")]
        public async Task<ActionResult<ResponseDto>> GetBankAccountStatement([FromQuery] GetBankAccountStatementQuery request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.BankAccountManage)]
        [HttpPost("CreateBankAccount")]
        public async Task<ActionResult<ResponseDto>> CreateBankAccount([FromBody] CreateBankAccountCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.BankAccountManage)]
        [HttpPut("UpdateBankAccount")]
        public async Task<ActionResult<ResponseDto>> UpdateBankAccount([FromBody] UpdateBankAccountCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.BankAccountManage)]
        [HttpDelete("DeleteBankAccount")]
        public async Task<ActionResult<ResponseDto>> DeleteBankAccount([FromQuery] DeleteBankAccountCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.BankAccountManage)]
        [HttpPost("TransferBetweenAccounts")]
        public async Task<ActionResult<ResponseDto>> TransferBetweenAccounts([FromBody] TransferBetweenBankAccountsCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.BankAccountManage)]
        [HttpPost("VoidTransfer")]
        public async Task<ActionResult<ResponseDto>> VoidTransfer([FromBody] VoidBankAccountTransferCommand request)
        {
            return await _mediator.Send(request);
        }
    }
}
