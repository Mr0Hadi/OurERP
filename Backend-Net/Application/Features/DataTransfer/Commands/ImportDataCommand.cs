using System.Diagnostics;
using Application.Common.Contracts.DataTransfer;
using Application.Common.DataTransfer;
using Application.Common.Dtos;
using Application.Common.Enums;
using Common.Exceptions;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.Options;

namespace Application.Features.DataTransfer.Commands
{
    /// <summary>
    /// Imports a CSV/XLSX file into a resource. <see cref="Mode"/> PREVIEW parses and validates without writing;
    /// COMMIT does the same again and then writes the valid rows in one transaction. The two calls carry the same
    /// file: nothing is stored on the server between them, so there is no upload to clean up and no stale preview
    /// to trust.
    /// </summary>
    public class ImportDataCommand : IRequest<ResponseDto>
    {
        public string Resource { get; set; } = string.Empty;

        /// <summary>Null: taken from the file name's extension. Either way the content must really be that format.</summary>
        public DataTransferFormatEnum? Format { get; set; }

        public ImportModeEnum Mode { get; set; } = ImportModeEnum.PREVIEW;

        public bool SkipInvalidRows { get; set; }

        public Stream? Content { get; set; }

        public string? FileName { get; set; }

        public long Length { get; set; }
    }

    public class ImportDataCommandValidator : AbstractValidator<ImportDataCommand>
    {
        public ImportDataCommandValidator()
        {
            RuleFor(x => x.Resource).NotEmpty().WithMessage("جدول مشخص نشده است.");
            RuleFor(x => x.Mode).IsInEnum().WithMessage("نوع عملیات نامعتبر است.");
            RuleFor(x => x.Format).IsInEnum().When(x => x.Format.HasValue).WithMessage("قالب فایل نامعتبر است.");
            RuleFor(x => x.Content).NotNull().WithMessage("فایلی ارسال نشده است.");
            RuleFor(x => x.Length).GreaterThan(0).WithMessage("فایل خالی است.");
        }
    }

    public class ImportDataCommandHandler : IRequestHandler<ImportDataCommand, ResponseDto>
    {
        private readonly DataTransferAccess _access;
        private readonly ITabularFileFormatProvider _formats;
        private readonly ImportRunner _runner;
        private readonly IDataTransferAuditLog _audit;
        private readonly DataTransferOptions _options;

        public ImportDataCommandHandler(DataTransferAccess access, ITabularFileFormatProvider formats, ImportRunner runner,
            IDataTransferAuditLog audit, IOptions<DataTransferOptions> options)
        {
            _access = access;
            _formats = formats;
            _runner = runner;
            _audit = audit;
            _options = options.Value;
        }

        public async Task<ResponseDto> Handle(ImportDataCommand request, CancellationToken cancellationToken)
        {
            // Permission first: an unauthorized caller learns nothing about the file, not even that it is too big.
            var (definition, import) = await _access.RequireImportAsync(request.Resource, cancellationToken);
            var userId = _access.CurrentUserId();
            var fileName = DataTransferAccess.SafeFileName(request.FileName);
            var operation = request.Mode == ImportModeEnum.COMMIT ? DataTransferOperationEnum.IMPORT_COMMIT : DataTransferOperationEnum.IMPORT_PREVIEW;
            var watch = Stopwatch.StartNew();

            void Audit(string status, ImportResultDto? result, DataTransferFormatEnum? format, string? detail = null) => _audit.Record(new DataTransferAuditEntry
            {
                UserId = userId, Operation = operation, Resource = definition.Resource, Format = format,
                RecordCount = result?.TotalRows ?? 0, ImportedCount = result?.ImportedRows ?? 0,
                InvalidCount = result?.InvalidRows ?? 0, DuplicateCount = result?.DuplicateRows ?? 0,
                Status = status, FileName = fileName, Detail = detail, Duration = watch.Elapsed,
            });

            if (request.Length > _options.MaxUploadBytes)
            {
                Audit("REFUSED", null, request.Format, "file too large");
                throw new ValidationCustomException($"حجم فایل بیش از {_options.MaxUploadBytes / (1024 * 1024)} مگابایت است.");
            }

            var formatType = request.Format ?? FormatFromFileName(fileName);
            var format = _formats.Get(formatType);

            if (fileName != null && !fileName.EndsWith(format.Extension, StringComparison.OrdinalIgnoreCase))
            {
                Audit("REFUSED", null, formatType, "extension mismatch");
                throw new ValidationCustomException($"پسوند فایل با قالب {format.Extension} نمی‌خواند.");
            }

            ImportResultDto result;
            try
            {
                // Bounded by MaxUploadBytes above; XLSX needs a seekable stream anyway.
                using var buffer = new MemoryStream();
                await CopyBoundedAsync(request.Content!, buffer, _options.MaxUploadBytes, cancellationToken);
                buffer.Position = 0;

                var sheet = await format.ReadAsync(buffer, new TabularReadLimits
                {
                    MaxRows = _options.MaxImportRows,
                    MaxUncompressedBytes = _options.MaxXlsxUncompressedBytes,
                }, cancellationToken);

                result = await import.RunAsync(_runner, new ImportRequest
                {
                    Resource = definition.Resource,
                    Sheet = sheet,
                    Mode = request.Mode,
                    SkipInvalidRows = request.SkipInvalidRows,
                }, cancellationToken);
            }
            catch (BaseCustomException ex)
            {
                Audit("REFUSED", ex.Data as ImportResultDto, formatType, ex.Error);
                throw;
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                // The commit transaction has already rolled back; nothing from this file is in the database.
                Audit("FAILED", null, formatType, ex.GetType().Name);
                throw;
            }

            Audit("SUCCEEDED", result, formatType);

            var message = request.Mode == ImportModeEnum.COMMIT
                ? $"{result.ImportedRows} ردیف وارد شد" + (result.SkippedRows > 0 ? $" و {result.SkippedRows} ردیف کنار گذاشته شد." : ".")
                : "فایل بررسی شد. نتیجه را ببینید و ثبت را تأیید کنید.";

            return new ResponseDto
            {
                Data = result,
                Message = message,
                ResponseMessageType = ResponseMessageTypeEnum.Success.ToString(),
            };
        }

        private static DataTransferFormatEnum FormatFromFileName(string? fileName)
        {
            var extension = Path.GetExtension(fileName ?? string.Empty).ToLowerInvariant();
            return extension switch
            {
                ".csv" => DataTransferFormatEnum.CSV,
                ".xlsx" => DataTransferFormatEnum.XLSX,
                _ => throw new ValidationCustomException("فقط فایل‌های CSV و Excel (.xlsx) پذیرفته می‌شوند."),
            };
        }

        /// <summary>Copies at most <paramref name="limit"/> bytes; a stream that lied about its length is still cut off.</summary>
        private static async Task CopyBoundedAsync(Stream source, Stream destination, long limit, CancellationToken cancellationToken)
        {
            var chunk = new byte[81920];
            long total = 0;
            int read;
            while ((read = await source.ReadAsync(chunk, cancellationToken)) > 0)
            {
                total += read;
                if (total > limit)
                    throw new ValidationCustomException($"حجم فایل بیش از {limit / (1024 * 1024)} مگابایت است.");
                await destination.WriteAsync(chunk.AsMemory(0, read), cancellationToken);
            }
        }
    }
}
