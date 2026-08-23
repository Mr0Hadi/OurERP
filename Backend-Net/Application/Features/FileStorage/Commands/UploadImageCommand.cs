using Application.Common.Contracts.Storage;
using Application.Common.Dtos;
using Application.Common.Enums;
using Common.Exceptions;
using Common.Extensions;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.Options;

namespace Application.Features.FileStorage.Commands
{
    // The feature folder is FileStorage rather than File so nothing inside it has to fight the
    // System.IO.File / namespace shadowing that bites the PurchaseReturn feature
    // (see CLAUDE.md section 6). The route is still api/File/UploadImage.
    public class UploadImageCommand : IRequest<ResponseDto>
    {
        /// <summary>
        /// The raw bytes. The controller opens this off the posted IFormFile - Application stays
        /// free of ASP.NET types, same as every other layer here.
        /// </summary>
        public Stream Content { get; set; } = Stream.Null;
        public string FileName { get; set; } = string.Empty;
        public string? ContentType { get; set; }
        public long Length { get; set; }
        public ImageFolderEnum Folder { get; set; }
    }

    public class UploadImageCommandValidator : AbstractValidator<UploadImageCommand>
    {
        public UploadImageCommandValidator()
        {
            RuleFor(x => x.FileName).NotEmpty().WithMessage(Validation.RequiredMessage("فایل"));
            RuleFor(x => x.Length).GreaterThan(0).WithMessage("فایل ارسال شده خالی است.");
            RuleFor(x => x.Folder).IsInEnum().WithMessage("نوع تصویر نامعتبر است.");
        }
    }

    public class UploadImageCommandHandler : IRequestHandler<UploadImageCommand, ResponseDto>
    {
        private readonly IObjectStorageService _objectStorageService;
        private readonly ObjectStorageOptions _options;

        public UploadImageCommandHandler(IObjectStorageService objectStorageService, IOptions<ObjectStorageOptions> options)
        {
            _objectStorageService = objectStorageService;
            _options = options.Value;
        }

        public async Task<ResponseDto> Handle(UploadImageCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            // Size/extension/content-type are checked here rather than in the validator because
            // they depend on configuration, and they run before a single byte is streamed out.
            if (request.Length > _options.MaxImageSizeBytes)
                throw new ValidationCustomException($"حجم تصویر نباید بیشتر از {_options.MaxImageSizeBytes / (1024 * 1024)} مگابایت باشد.");

            var extension = Path.GetExtension(request.FileName)?.ToLowerInvariant() ?? string.Empty;
            if (!_options.AllowedImageExtensions.Contains(extension))
                throw new ValidationCustomException($"فرمت تصویر مجاز نیست. فرمت‌های مجاز: {string.Join("، ", _options.AllowedImageExtensions)}");

            if (!string.IsNullOrWhiteSpace(request.ContentType)
                && !_options.AllowedImageContentTypes.Contains(request.ContentType, StringComparer.OrdinalIgnoreCase))
                throw new ValidationCustomException("نوع فایل ارسال شده تصویر معتبری نیست.");

            var uploaded = await _objectStorageService.UploadAsync(request.Content, request.FileName, request.ContentType, request.Folder, cancellationToken);

            res.Data = uploaded;
            res.Message = "تصویر با موفقیت بارگذاری شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
