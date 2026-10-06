using Application.Common.Contracts.DataTransfer;
using Application.Common.DataTransfer;
using Application.Common.Dtos;
using FluentValidation;
using MediatR;

namespace Application.Features.DataTransfer.Queries
{
    /// <summary>
    /// An empty file with the import headers in the right order - what a user fills in. Guarded by the import
    /// permission: the template is only useful to someone who may import.
    /// </summary>
    public class GetImportTemplateQuery : IRequest<FileResponseDto>
    {
        public string Resource { get; set; } = string.Empty;

        public DataTransferFormatEnum Format { get; set; } = DataTransferFormatEnum.XLSX;
    }

    public class GetImportTemplateQueryValidator : AbstractValidator<GetImportTemplateQuery>
    {
        public GetImportTemplateQueryValidator()
        {
            RuleFor(x => x.Resource).NotEmpty().WithMessage("جدول مشخص نشده است.");
            RuleFor(x => x.Format).IsInEnum().WithMessage("قالب فایل نامعتبر است.");
        }
    }

    public class GetImportTemplateQueryHandler : IRequestHandler<GetImportTemplateQuery, FileResponseDto>
    {
        private readonly DataTransferAccess _access;
        private readonly ITabularFileFormatProvider _formats;

        public GetImportTemplateQueryHandler(DataTransferAccess access, ITabularFileFormatProvider formats)
        {
            _access = access;
            _formats = formats;
        }

        public async Task<FileResponseDto> Handle(GetImportTemplateQuery request, CancellationToken cancellationToken)
        {
            var (definition, import) = await _access.RequireImportAsync(request.Resource, cancellationToken);
            var format = _formats.Get(request.Format);

            using var buffer = new MemoryStream();
            var columns = import.Columns.Select(c => new TabularColumn(c.Header, c.Type)).ToList();
            var writer = format.CreateWriter(buffer, columns, definition.Title);
            await writer.CompleteAsync(cancellationToken);

            return new FileResponseDto
            {
                Content = buffer.ToArray(),
                ContentType = format.ContentType,
                FileName = $"{definition.Title}-نمونه{format.Extension}",
            };
        }
    }
}
