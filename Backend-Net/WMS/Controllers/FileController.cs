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

        /// <summary>Re-signs a stored key - signed URLs expire, keys do not.</summary>
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
