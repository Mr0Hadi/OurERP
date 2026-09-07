using Application.Common.Contracts.Storage;
using Application.Common.Dtos;
using Common.Extensions;
using FluentValidation;
using MediatR;

namespace Application.Features.FileStorage.Queries
{
    /// <summary>
    /// Serves the object's bytes through this API instead of linking a browser straight at the
    /// bucket. That indirection is not a preference - Liara's storage edge answers a plain
    /// <c>404 page not found</c> to any request with a browser User-Agent, so a bucket URL in an
    /// &lt;img src&gt; can never load. See <see cref="IObjectStorageService"/> for the evidence.
    ///
    /// Returns <see cref="FileResponseDto"/> rather than the project's usual <c>ResponseDto</c>
    /// envelope, the same deliberate exception the PDF/barcode endpoints make: base64 in JSON is
    /// ~33% larger and cannot be pointed at by an &lt;img src&gt; at all.
    /// </summary>
    public class GetImageFileQuery : IRequest<FileResponseDto>
    {
        public string ObjectKey { get; set; } = string.Empty;
    }

    public class GetImageFileQueryValidator : AbstractValidator<GetImageFileQuery>
    {
        public GetImageFileQueryValidator()
        {
            RuleFor(x => x.ObjectKey).NotEmpty().WithMessage(Validation.RequiredMessage("شناسه تصویر"));
        }
    }

    public class GetImageFileQueryHandler : IRequestHandler<GetImageFileQuery, FileResponseDto>
    {
        private readonly IObjectStorageService _objectStorageService;

        public GetImageFileQueryHandler(IObjectStorageService objectStorageService)
        {
            _objectStorageService = objectStorageService;
        }

        public async Task<FileResponseDto> Handle(GetImageFileQuery request, CancellationToken cancellationToken)
        {
            var file = await _objectStorageService.DownloadAsync(request.ObjectKey, cancellationToken);

            return new FileResponseDto
            {
                Content = file.Content,
                ContentType = file.ContentType,
                FileName = file.FileName,
            };
        }
    }
}
