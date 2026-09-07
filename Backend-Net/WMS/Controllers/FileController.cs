using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.FileStorage.Commands;
using Application.Features.FileStorage.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace WMS.Controllers
{
    /// <summary>
    /// Image upload is a two-step flow: POST the file here, get back an ObjectKey, then send that
    /// key as ImageUrl on the Create/Update command for the product/customer/supplier (or as an
    /// image entry on ReceivePurchase). This keeps every existing endpoint pure JSON and lets the
    /// frontend show a preview before the entity is saved.
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class FileController : ControllerBase
    {
        private readonly IMediator _mediator;
        public FileController(IMediator mediator)
        {
            _mediator = mediator;
        }

        /// <summary>
        /// multipart/form-data: "file" is the image, "folder" picks the bucket prefix
        /// (1=PRODUCTS, 2=CUSTOMERS, 3=SUPPLIERS, 4=RECEIVING).
        /// </summary>
        [HttpPost("UploadImage")]
        public async Task<ActionResult<ResponseDto>> UploadImage(IFormFile file, [FromForm] ImageFolderEnum folder)
        {
            if (file == null || file.Length == 0)
                return await _mediator.Send(new UploadImageCommand { Folder = folder });

            // The stream stays open only for the duration of the send; the SDK reads it to
            // completion inside the handler, so there is nothing to buffer into memory first.
            await using var stream = file.OpenReadStream();

            return await _mediator.Send(new UploadImageCommand
            {
                Content = stream,
                FileName = file.FileName,
                ContentType = file.ContentType,
                Length = file.Length,
                Folder = folder,
            });
        }

        /// <summary>
        /// Streams the stored object itself. This is what every ImageUrl in the API points at -
        /// a browser cannot load a Liara storage URL directly (their edge 404s browser
        /// User-Agents), so the bytes come back through here, where the AWS SDK fetches them
        /// server-side.
        ///
        /// [AllowAnonymous] because an &lt;img src&gt; cannot send an Authorization header. That
        /// grants nothing that was not already public: the bucket itself serves these objects to
        /// any unauthenticated caller today. If the bucket is ever made private, this endpoint has
        /// to grow an expiring signed token of its own rather than simply being re-[Authorize]d,
        /// or every image in the frontend breaks again.
        /// </summary>
        [AllowAnonymous]
        [HttpGet("GetImage")]
        public async Task<IActionResult> GetImage([FromQuery] GetImageFileQuery request)
        {
            var file = await _mediator.Send(request);

            // No download file name - this must render inline in an <img>, not save to disk.
            return File(file.Content, file.ContentType);
        }

        /// <summary>Rebuilds the browser-loadable URL for a stored key.</summary>
        [HttpGet("GetImageUrl")]
        public async Task<ActionResult<ResponseDto>> GetImageUrl([FromQuery] GetImageUrlQuery request)
        {
            return await _mediator.Send(request);
        }

        [HttpDelete("DeleteImage")]
        public async Task<ActionResult<ResponseDto>> DeleteImage([FromQuery] DeleteImageCommand request)
        {
            return await _mediator.Send(request);
        }
    }
}
