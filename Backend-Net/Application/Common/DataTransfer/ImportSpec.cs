using Domain.Enums;

namespace Application.Common.DataTransfer
{
    /// <summary>
    /// A foreign key the file names by a human value ("Category = Engine Parts") instead of an id. The core collects
    /// the distinct values of the column across the whole file and resolves them in one call - never one query per row.
    /// </summary>
    public sealed class ForeignKeyLookup
    {
        /// <summary>The import column holding the referenced record's name.</summary>
        public required string ColumnKey { get; init; }

        /// <summary>Persian name of the referenced entity, used in messages ("دسته‌بندی").</summary>
        public required string EntityTitle { get; init; }

        /// <summary>
        /// Given the normalized values (<see cref="DataValues.NormalizeKey"/>), returns the ones that exist, keyed by
        /// that same normalized value. A value missing from the result does not exist.
        /// </summary>
        public required Func<IReadOnlyCollection<string>, CancellationToken, Task<IReadOnlyDictionary<string, int>>> ResolveAsync { get; init; }

        /// <summary>
        /// Null (the default) means a missing reference is an error and nothing is created. A definition that really
        /// wants missing records created sets this; it receives the spelling as first typed in the file and returns the
        /// new ids keyed by normalized value. It runs inside the commit transaction, before any row is written.
        /// </summary>
        public Func<IReadOnlyCollection<string>, CancellationToken, Task<IReadOnlyDictionary<string, int>>>? CreateMissingAsync { get; init; }
    }

    /// <summary>
    /// One way a row can be "the same record" as another. Declared per definition - the generic core has no idea that
    /// a product is identified by its supplier barcode or a customer by their phone number.
    /// </summary>
    public sealed class DuplicateKey<TCommand>
    {
        /// <summary>Persian name of the key for messages ("شماره تماس").</summary>
        public required string Title { get; init; }

        /// <summary>The column a duplicate is reported against.</summary>
        public required string ColumnKey { get; init; }

        /// <summary>The key of a mapped row; null or blank means "no key, cannot be a duplicate".</summary>
        public required Func<TCommand, string?> Select { get; init; }

        /// <summary>
        /// Given normalized keys, returns those that already exist in the database (normalized). Called once per
        /// key for the whole file.
        /// </summary>
        public required Func<IReadOnlyCollection<string>, CancellationToken, Task<IReadOnlySet<string>>> FindExistingAsync { get; init; }
    }

    /// <summary>The non-generic face of an import, for the registry and the HTTP layer.</summary>
    public interface IImportSpec
    {
        PermissionEnum Permission { get; }

        IReadOnlyList<ImportColumn> Columns { get; }

        Task<ImportResultDto> RunAsync(ImportRunner runner, ImportRequest request, CancellationToken cancellationToken);
    }

    /// <summary>
    /// What a resource imports. Each row is mapped to the resource's existing create command and checked by that
    /// command's own FluentValidation validator, so an imported record passes exactly the rules a record typed into
    /// the form passes. <see cref="CommitBatchAsync"/> then creates the records through the feature's own creation
    /// code (not a raw DbContext.Add that would skip it); the core calls it in batches inside one transaction.
    /// </summary>
    public sealed class ImportSpec<TCommand> : IImportSpec where TCommand : class
    {
        public required PermissionEnum Permission { get; init; }

        public required IReadOnlyList<ImportColumn> Columns { get; init; }

        /// <summary>Builds the create command from a parsed row. Foreign keys are already resolved (<see cref="ImportRowValues.ReferenceId"/>).</summary>
        public required Func<ImportRowValues, TCommand> Map { get; init; }

        /// <summary>Writes one batch of valid commands. Must not commit a transaction of its own.</summary>
        public required Func<IReadOnlyList<TCommand>, CancellationToken, Task> CommitBatchAsync { get; init; }

        public IReadOnlyList<ForeignKeyLookup> ForeignKeys { get; init; } = Array.Empty<ForeignKeyLookup>();

        public IReadOnlyList<DuplicateKey<TCommand>> DuplicateKeys { get; init; } = Array.Empty<DuplicateKey<TCommand>>();

        public DuplicatePolicyEnum DuplicatePolicy { get; init; } = DuplicatePolicyEnum.SKIP;

        public Task<ImportResultDto> RunAsync(ImportRunner runner, ImportRequest request, CancellationToken cancellationToken)
            => runner.RunAsync(this, request, cancellationToken);
    }

    /// <summary>What the caller asks of one import run, independent of where the file came from (HTTP, a job, a restore).</summary>
    public sealed class ImportRequest
    {
        public required string Resource { get; init; }

        public required Contracts.DataTransfer.TabularSheet Sheet { get; init; }

        public ImportModeEnum Mode { get; init; } = ImportModeEnum.PREVIEW;

        /// <summary>
        /// Commit only: write the valid rows even though some rows are invalid. The user ticks this after seeing the
        /// preview. Without it a file with any invalid row commits nothing.
        /// </summary>
        public bool SkipInvalidRows { get; init; }
    }
}
