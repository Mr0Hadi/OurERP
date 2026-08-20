using Application.Features.Invoice.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

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

        [HttpGet("GetSaleInvoicePdf")]
        public async Task<IActionResult> GetSaleInvoicePdf([FromQuery] GetSaleInvoicePdfQuery request)
        {
            var file = await _mediator.Send(request);
            return File(file.Content, file.ContentType, file.FileName);
        }

        [HttpGet("GetSaleReturnCreditNotePdf")]
        public async Task<IActionResult> GetSaleReturnCreditNotePdf([FromQuery] GetSaleReturnCreditNotePdfQuery request)
        {
            var file = await _mediator.Send(request);
            return File(file.Content, file.ContentType, file.FileName);
        }
    }
}
