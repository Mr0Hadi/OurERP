using Application.Common.Contracts.Permissions;
using Application.Common.DataTransfer;
using Application.Common.Dtos;
using Application.Common.Enums;
using MediatR;

namespace Application.Features.DataTransfer.Queries
{
    /// <summary>
    /// Every resource that can be exported or imported, with what the signed-in user may do on each and the import
    /// columns (for the dialog's help and the template). The frontend reads its buttons off this, so adding a
    /// definition on the server is enough for the toolbar to know about it. UX only: the export/import handlers check
    /// the permission again.
    /// </summary>
    public class GetDataTransferResourcesQuery : IRequest<ResponseDto>
    {
    }

    public class DataTransferResourceDto
    {
        public string Resource { get; set; } = string.Empty;

        public string Title { get; set; } = string.Empty;

        public bool ExportEnabled { get; set; }

        public bool ImportEnabled { get; set; }

        public bool CanExport { get; set; }

        public bool CanImport { get; set; }

        public string? ExportPermission { get; set; }

        public string? ImportPermission { get; set; }

        public List<DataTransferImportColumnDto> ImportColumns { get; set; } = new();
    }

    public class DataTransferImportColumnDto
    {
        public string Key { get; set; } = string.Empty;

        public string Header { get; set; } = string.Empty;

        public DataFieldTypeEnum Type { get; set; }

        public bool Required { get; set; }

        public string? Hint { get; set; }

        /// <summary>For an enum column, the labels the importer accepts.</summary>
        public List<string>? AllowedValues { get; set; }
    }

    public class GetDataTransferResourcesQueryHandler : IRequestHandler<GetDataTransferResourcesQuery, ResponseDto>
    {
        private readonly IDataTransferRegistry _registry;
        private readonly IPermissionService _permissionService;
        private readonly DataTransferAccess _access;

        public GetDataTransferResourcesQueryHandler(IDataTransferRegistry registry, IPermissionService permissionService, DataTransferAccess access)
        {
            _registry = registry;
            _permissionService = permissionService;
            _access = access;
        }

        public async Task<ResponseDto> Handle(GetDataTransferResourcesQuery request, CancellationToken cancellationToken)
        {
            var held = await _permissionService.GetUserPermissionsAsync(_access.CurrentUserId(), cancellationToken);

            var resources = _registry.All.Select(definition => new DataTransferResourceDto
            {
                Resource = definition.Resource,
                Title = definition.Title,
                ExportEnabled = definition.Export != null,
                ImportEnabled = definition.Import != null,
                CanExport = definition.Export != null && held.Contains(definition.Export.Permission),
                CanImport = definition.Import != null && held.Contains(definition.Import.Permission),
                ExportPermission = definition.Export?.Permission.ToString(),
                ImportPermission = definition.Import?.Permission.ToString(),
                ImportColumns = definition.Import?.Columns.Select(c => new DataTransferImportColumnDto
                {
                    Key = c.Key,
                    Header = c.Header,
                    Type = c.Type,
                    Required = c.Required,
                    Hint = c.Hint,
                    AllowedValues = c.EnumType != null ? DataValues.EnumLabels(c.EnumType).ToList() : null,
                }).ToList() ?? new List<DataTransferImportColumnDto>(),
            }).ToList();

            return new ResponseDto
            {
                Data = new { Resources = resources },
                Message = "فهرست جدول‌های قابل ورود و خروج ارسال شد.",
                ResponseMessageType = ResponseMessageTypeEnum.Success.ToString(),
            };
        }
    }
}
