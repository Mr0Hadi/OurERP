using Application.Common.Contracts.Permissions;
using Application.Common.Contracts.UserContextService;
using Application.Common.DataTransfer;
using Common.Exceptions;
using Common.Extensions;

namespace Application.Features.DataTransfer
{
    /// <summary>
    /// The security boundary of import/export. The endpoints are generic (one controller for every resource), so a
    /// static [HasPermission] cannot name the permission; every handler calls this instead, which reads the
    /// resource's own Export/Import permission and asks IPermissionService - the same check [HasPermission] makes.
    /// A user who calls the API directly without the permission gets 403 here, whatever the frontend shows.
    /// </summary>
    public class DataTransferAccess
    {
        private readonly IDataTransferRegistry _registry;
        private readonly IPermissionService _permissionService;
        private readonly IUserContextService _userContextService;

        public DataTransferAccess(IDataTransferRegistry registry, IPermissionService permissionService, IUserContextService userContextService)
        {
            _registry = registry;
            _permissionService = permissionService;
            _userContextService = userContextService;
        }

        public int CurrentUserId()
        {
            return int.TryParse(_userContextService.GetUserId(), out var id) && id > 0
                ? id
                : throw new UnauthorizedCustomException();
        }

        public async Task<(IDataTransferDefinition Definition, IExportSpec Export)> RequireExportAsync(string resource, CancellationToken cancellationToken)
        {
            var definition = _registry.Get(resource);
            var export = definition.Export ?? throw new NotFoundCustomException("خروجی گرفتن از این جدول فعال نیست.");

            if (!await _permissionService.HasPermissionAsync(CurrentUserId(), export.Permission, cancellationToken))
                throw new ForbiddenCustomException("دسترسی خروجی گرفتن از این جدول را ندارید.");

            return (definition, export);
        }

        public async Task<(IDataTransferDefinition Definition, IImportSpec Import)> RequireImportAsync(string resource, CancellationToken cancellationToken)
        {
            var definition = _registry.Get(resource);
            var import = definition.Import ?? throw new NotFoundCustomException("ورود اطلاعات به این جدول فعال نیست.");

            if (!await _permissionService.HasPermissionAsync(CurrentUserId(), import.Permission, cancellationToken))
                throw new ForbiddenCustomException("دسترسی ورود اطلاعات به این جدول را ندارید.");

            return (definition, import);
        }

        /// <summary>A client file name reduced to something safe to log and echo: no path, no control characters, bounded.</summary>
        public static string? SafeFileName(string? fileName)
        {
            if (string.IsNullOrWhiteSpace(fileName)) return null;
            var name = fileName.Replace('\\', '/');
            name = name[(name.LastIndexOf('/') + 1)..];
            name = new string(name.Where(c => !char.IsControl(c)).ToArray()).Trim();
            return name.Length > 120 ? name[..120] : name;
        }

        /// <summary>"کالاها-14050715-1432.xlsx" - the resource title and the Persian date/time of the export.</summary>
        public static string FileNameFor(string title, string extension, DateTime now)
            => $"{title}-{PersianDate.ToCompactString(now)}-{now:HHmm}{extension}";
    }
}
