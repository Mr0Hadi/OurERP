using Common.Exceptions;

namespace Application.Common.DataTransfer
{
    /// <summary>
    /// Makes one resource (a table) exportable and/or importable. This is the only thing a feature writes to join
    /// the import/export system: implement it in the feature's own folder and it is picked up by assembly scan
    /// (ApplicationServiceRegistration) - no controller, parser, dialog or permission plumbing per table.
    ///
    /// Export and import are independent: either spec may be null, which turns that direction off for the resource.
    /// </summary>
    public interface IDataTransferDefinition
    {
        /// <summary>URL-safe key, e.g. "products". Unique across definitions.</summary>
        string Resource { get; }

        /// <summary>Persian title, used for file and sheet names ("کالاها").</summary>
        string Title { get; }

        IExportSpec? Export { get; }

        IImportSpec? Import { get; }
    }

    /// <summary>All registered definitions, by resource key.</summary>
    public interface IDataTransferRegistry
    {
        IReadOnlyList<IDataTransferDefinition> All { get; }

        /// <summary>Throws NotFoundCustomException for an unknown resource.</summary>
        IDataTransferDefinition Get(string resource);
    }

    public class DataTransferRegistry : IDataTransferRegistry
    {
        private readonly Dictionary<string, IDataTransferDefinition> _byResource;

        public DataTransferRegistry(IEnumerable<IDataTransferDefinition> definitions)
        {
            All = definitions.OrderBy(d => d.Resource, StringComparer.Ordinal).ToList();
            _byResource = new Dictionary<string, IDataTransferDefinition>(StringComparer.OrdinalIgnoreCase);
            foreach (var definition in All)
            {
                if (!_byResource.TryAdd(definition.Resource, definition))
                    throw new InvalidOperationException($"Two data transfer definitions use the resource key '{definition.Resource}'.");
            }
        }

        public IReadOnlyList<IDataTransferDefinition> All { get; }

        public IDataTransferDefinition Get(string resource)
        {
            if (string.IsNullOrWhiteSpace(resource) || !_byResource.TryGetValue(resource.Trim(), out var definition))
                throw new NotFoundCustomException("این جدول برای ورود و خروج اطلاعات تعریف نشده است.");
            return definition;
        }
    }
}
