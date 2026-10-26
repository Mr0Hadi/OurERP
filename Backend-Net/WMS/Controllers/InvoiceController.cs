using Application.Common.Dtos;
using Application.Features.Invoice.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Domain.Enums;
using WMS.Authorization;

namespace WMS.Controllers
{
    // Returns raw application/pdf, not ResponseDto - see CLAUDE.md section 6,
    // "Product code / barcode / invoice PDF" for why this is a deliberate exception.
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class InvoiceController : ControllerBase
    {
        private readonly IMediator _mediator;
        public InvoiceController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HasPermission(PermissionEnum.InvoicePrint)]
        [HttpGet("GetSaleInvoicePdf")]
        public async Task<IActionResult> GetSaleInvoicePdf([FromQuery] GetSaleInvoicePdfQuery request)
        {
            var file = await _mediator.Send(request);
            return File(file.Content, file.ContentType, file.FileName);
        }

        [HasPermission(PermissionEnum.InvoicePrint)]
        [HttpGet("GetPurchaseReturnPdf")]
        public async Task<IActionResult> GetPurchaseReturnPdf([FromQuery] GetPurchaseReturnPdfQuery request)
        {
            var file = await _mediator.Send(request);
            return File(file.Content, file.ContentType, file.FileName);
        }

        [HasPermission(PermissionEnum.InvoicePrint)]
        [HttpGet("GetSaleReturnCreditNotePdf")]
        public async Task<IActionResult> GetSaleReturnCreditNotePdf([FromQuery] GetSaleReturnCreditNotePdfQuery request)
        {
            var file = await _mediator.Send(request);
            return File(file.Content, file.ContentType, file.FileName);
        }

        // ── Print data of the same three documents, as JSON in the usual envelope (for the browser print studio). ──
        [HasPermission(PermissionEnum.InvoicePrint)]
        [HttpGet("GetSaleInvoiceDocument")]
        public async Task<ActionResult<ResponseDto>> GetSaleInvoiceDocument([FromQuery] GetSaleInvoiceDocumentQuery request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.InvoicePrint)]
        [HttpGet("GetSaleReturnCreditNoteDocument")]
        public async Task<ActionResult<ResponseDto>> GetSaleReturnCreditNoteDocument([FromQuery] GetSaleReturnCreditNoteDocumentQuery request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.InvoicePrint)]
        [HttpGet("GetPurchaseReturnDocument")]
        public async Task<ActionResult<ResponseDto>> GetPurchaseReturnDocument([FromQuery] GetPurchaseReturnDocumentQuery request)
        {
            return await _mediator.Send(request);
        }
    }
}
