using Application.Common.DataTransfer;
using Application.Common.Dtos;
using Application.Features.DataTransfer.Commands;
using Application.Features.DataTransfer.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace WMS.Controllers
{
    /// <summary>
    /// Import/export for every resource that has an IDataTransferDefinition - one controller, not one per table.
    ///
    /// No [HasPermission] here on purpose: the permission depends on the resource in the request (ProductExport,
    /// CustomerImport, ...), so each handler checks it through DataTransferAccess and answers 403 itself. The actions
    /// are listed in EndpointPermissionCoverageTests' AuthenticatedOnly set with that reason.
    ///
    /// Export and template return a file, not ResponseDto - the same deliberate exception as the PDF endpoints.
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class DataTransferController : ControllerBase
    {
        private readonly IMediator _mediator;
        private readonly IDataTransferRegistry _registry;

        public DataTransferController(IMediator mediator, IDataTransferRegistry registry)
        {
            _mediator = mediator;
            _registry = registry;
        }

        [HttpGet("GetResources")]
        public async Task<ActionResult<ResponseDto>> GetResources()
        {
            return await _mediator.Send(new GetDataTransferResourcesQuery());
        }

        /// <summary>
        /// GET api/DataTransfer/Export?resource=products&amp;format=2&amp;name=...&amp;productCategoryId=...
        /// Every query parameter other than resource/format is bound onto the resource's filter - the same class and
        /// the same names its list endpoint takes - so the frontend sends the table's current filters unchanged.
        /// </summary>
        [HttpGet("Export")]
        public async Task<IActionResult> Export([FromQuery] string resource, [FromQuery] DataTransferFormatEnum format = DataTransferFormatEnum.XLSX)
        {
            var export = _registry.Get(resource).Export;

            object? filter = null;
            if (export != null)
            {
                filter = Activator.CreateInstance(export.FilterType)!;
                // Same model binding as [FromQuery] on the list endpoint; a value that does not bind is a 400, not an
                // export of everything.
                if (!await TryUpdateModelAsync(filter, export.FilterType, string.Empty))
                    return BadRequest(ResponseDto.Danger("فیلتر خروجی نامعتبر است."));
            }

            var file = await _mediator.Send(new ExportDataQuery { Resource = resource, Format = format, Filter = filter }, HttpContext.RequestAborted);

            return new FileCallbackResult(file.ContentType, file.FileName, file.WriteAsync);
        }

        [HttpGet("GetImportTemplate")]
        public async Task<IActionResult> GetImportTemplate([FromQuery] GetImportTemplateQuery request)
        {
            var file = await _mediator.Send(request);
            return File(file.Content, file.ContentType, file.FileName);
        }

        /// <summary>multipart/form-data: "file", "resource", optional "format". Validates and reports; writes nothing.</summary>
        [HttpPost("PreviewImport")]
        public Task<ActionResult<ResponseDto>> PreviewImport(IFormFile? file, [FromForm] string resource, [FromForm] DataTransferFormatEnum? format)
            => SendImport(file, resource, format, ImportModeEnum.PREVIEW, skipInvalidRows: false);

        /// <summary>
        /// The same file again, after the user confirmed the preview. Re-validated from scratch; valid rows are written
        /// in one transaction. skipInvalidRows=true lets the valid rows in while invalid ones are left out.
        /// </summary>
        [HttpPost("CommitImport")]
        public Task<ActionResult<ResponseDto>> CommitImport(IFormFile? file, [FromForm] string resource, [FromForm] DataTransferFormatEnum? format, [FromForm] bool skipInvalidRows)
            => SendImport(file, resource, format, ImportModeEnum.COMMIT, skipInvalidRows);

        private async Task<ActionResult<ResponseDto>> SendImport(IFormFile? file, string resource, DataTransferFormatEnum? format, ImportModeEnum mode, bool skipInvalidRows)
        {
            await using var stream = file?.OpenReadStream();

            return await _mediator.Send(new ImportDataCommand
            {
                Resource = resource,
                Format = format,
                Mode = mode,
                SkipInvalidRows = skipInvalidRows,
                Content = stream,
                FileName = file?.FileName,
                Length = file?.Length ?? 0,
            }, HttpContext.RequestAborted);
        }

        /// <summary>
        /// Streams a file produced by a callback, so an export is written row by row to the response instead of being
        /// built as one byte array first.
        /// </summary>
        private sealed class FileCallbackResult : FileResult
        {
            private readonly Func<Stream, CancellationToken, Task> _write;

            public FileCallbackResult(string contentType, string fileName, Func<Stream, CancellationToken, Task> write) : base(contentType)
            {
                FileDownloadName = fileName;
                _write = write;
            }

            public override async Task ExecuteResultAsync(ActionContext context)
            {
                var response = context.HttpContext.Response;
                response.ContentType = ContentType;
                var disposition = new Microsoft.Net.Http.Headers.ContentDispositionHeaderValue("attachment");
                disposition.SetHttpFileName(FileDownloadName);
                response.Headers.ContentDisposition = disposition.ToString();
                response.Headers.CacheControl = "no-store";

                await _write(response.Body, context.HttpContext.RequestAborted);
            }
        }
    }
}
