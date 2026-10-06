using System.Diagnostics;
using Application.Common.Contracts.DataTransfer;
using Application.Common.DataTransfer;
using Common.Exceptions;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.Options;

namespace Application.Features.DataTransfer.Queries
{
    /// <summary>
    /// Exports a resource. <see cref="Filter"/> is an instance of the resource's filter type (the list endpoint's own
    /// request class), bound by the controller from the same query string the table sends - so the file holds exactly
    /// the rows the user is filtering on, through the list query's own filter code. Paging is ignored.
    ///
    /// Everything that can refuse (permission, limit) happens in Handle, before a byte is written; the returned
    /// <see cref="DataExportFile.WriteAsync"/> then streams the rows.
    /// </summary>
    public class ExportDataQuery : IRequest<DataExportFile>
    {
        public string Resource { get; set; } = string.Empty;

        public DataTransferFormatEnum Format { get; set; } = DataTransferFormatEnum.XLSX;

        public object? Filter { get; set; }
    }

    public class ExportDataQueryValidator : AbstractValidator<ExportDataQuery>
    {
        public ExportDataQueryValidator()
        {
            RuleFor(x => x.Resource).NotEmpty().WithMessage("جدول مشخص نشده است.");
            RuleFor(x => x.Format).IsInEnum().WithMessage("قالب فایل نامعتبر است.");
        }
    }

    /// <summary>A file the controller streams to the response. Not ResponseDto: same deliberate exception as the PDF endpoints.</summary>
    public sealed class DataExportFile
    {
        public required string FileName { get; init; }

        public required string ContentType { get; init; }

        public required int RowCount { get; init; }

        public required Func<Stream, CancellationToken, Task> WriteAsync { get; init; }
    }

    public class ExportDataQueryHandler : IRequestHandler<ExportDataQuery, DataExportFile>
    {
        private readonly DataTransferAccess _access;
        private readonly ITabularFileFormatProvider _formats;
        private readonly IDataTransferAuditLog _audit;
        private readonly DataTransferOptions _options;

        public ExportDataQueryHandler(DataTransferAccess access, ITabularFileFormatProvider formats, IDataTransferAuditLog audit, IOptions<DataTransferOptions> options)
        {
            _access = access;
            _formats = formats;
            _audit = audit;
            _options = options.Value;
        }

        public async Task<DataExportFile> Handle(ExportDataQuery request, CancellationToken cancellationToken)
        {
            var (definition, export) = await _access.RequireExportAsync(request.Resource, cancellationToken);
            var userId = _access.CurrentUserId();
            var format = _formats.Get(request.Format);
            var filter = request.Filter ?? Activator.CreateInstance(export.FilterType)!;

            if (!export.FilterType.IsInstanceOfType(filter))
                throw new ValidationCustomException("فیلتر خروجی با این جدول نمی‌خواند.");

            var count = await export.CountAsync(filter, cancellationToken);
            if (count > _options.MaxExportRows)
            {
                _audit.Record(new DataTransferAuditEntry
                {
                    UserId = userId, Operation = DataTransferOperationEnum.EXPORT, Resource = definition.Resource,
                    Format = request.Format, RecordCount = count, Status = "REFUSED", Detail = "row limit",
                });
                throw new ValidationCustomException($"خروجی {count:N0} ردیف دارد و بیش از سقف {_options.MaxExportRows:N0} ردیف است. فیلتر را محدودتر کنید.");
            }

            return new DataExportFile
            {
                FileName = DataTransferAccess.FileNameFor(definition.Title, format.Extension, DateTime.Now),
                ContentType = format.ContentType,
                RowCount = count,
                WriteAsync = async (output, ct) =>
                {
                    var watch = Stopwatch.StartNew();
                    var written = 0;
                    var status = "FAILED";
                    try
                    {
                        var writer = format.CreateWriter(output, export.Columns, definition.Title);
                        await foreach (var row in export.ReadRowsAsync(filter, ct))
                        {
                            await writer.WriteRowAsync(row, ct);
                            written++;
                        }
                        await writer.CompleteAsync(ct);
                        status = "SUCCEEDED";
                    }
                    finally
                    {
                        _audit.Record(new DataTransferAuditEntry
                        {
                            UserId = userId, Operation = DataTransferOperationEnum.EXPORT, Resource = definition.Resource,
                            Format = request.Format, RecordCount = written, Status = status, Duration = watch.Elapsed,
                        });
                    }
                },
            };
        }
    }
}
