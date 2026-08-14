using Application.Features.Barcode.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace WMS.Controllers
{
    // PDF/SVG endpoints deliberately return the raw file (application/pdf, image/svg+xml)
    // rather than the project's usual ResponseDto envelope - see CLAUDE.md section 6,
    // "Product code / barcode / invoice PDF". Errors still go through the normal
    // ExceptionHandlingMiddleware/ResponseDto path since MediatR throws before any file is built.
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class BarcodeController : ControllerBase
    {
        private readonly IMediator _mediator;
        public BarcodeController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HttpGet("GetBarcodeSvg")]
        public async Task<IActionResult> GetBarcodeSvg([FromQuery] GetBarcodeSvgQuery request)
        {
            var file = await _mediator.Send(request);
            return File(file.Content, file.ContentType, file.FileName);
        }

        [HttpGet("GetProductLabelsPdf")]
        public async Task<IActionResult> GetProductLabelsPdf([FromQuery] GetProductLabelsPdfQuery request)
        {
            var file = await _mediator.Send(request);
            return File(file.Content, file.ContentType, file.FileName);
        }
    }
}
