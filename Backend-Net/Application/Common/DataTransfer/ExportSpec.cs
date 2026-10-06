using Application.Common.Contracts.DataTransfer;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Application.Common.DataTransfer
{
    /// <summary>
    /// One exported column: a header and how to read it from the definition's own row type. The row type is a
    /// projection the definition writes by hand, so a field that is not in it cannot leak into a file - whitelist,
    /// never "serialize the entity".
    /// </summary>
    public sealed class ExportColumn<TRow>
    {
        public required string Key { get; init; }

        public required string Header { get; init; }

        public DataFieldTypeEnum Type { get; init; } = DataFieldTypeEnum.Text;

        public required Func<TRow, object?> Value { get; init; }
    }

    /// <summary>The non-generic face of an export, for the registry and the HTTP layer.</summary>
    public interface IExportSpec
    {
        PermissionEnum Permission { get; }

        /// <summary>
        /// The filter the export accepts - the same request class the table's list endpoint binds, so "export what
        /// I am looking at" sends the same query string the table already sends.
        /// </summary>
        Type FilterType { get; }

        IReadOnlyList<TabularColumn> Columns { get; }

        Task<int> CountAsync(object filter, CancellationToken cancellationToken);

        IAsyncEnumerable<IReadOnlyList<object?>> ReadRowsAsync(object filter, CancellationToken cancellationToken);
    }

    /// <summary>
    /// What a resource exports. <see cref="Query"/> returns an already-filtered, already-projected, deterministically
    /// ordered IQueryable; the core counts it (to enforce the row limit before writing) and then streams it, so a
    /// large export never holds every entity in memory.
    /// </summary>
    public sealed class ExportSpec<TFilter, TRow> : IExportSpec where TFilter : class
    {
        public required PermissionEnum Permission { get; init; }

        public required IReadOnlyList<ExportColumn<TRow>> Fields { get; init; }

        public required Func<TFilter, CancellationToken, Task<IQueryable<TRow>>> Query { get; init; }

        public Type FilterType => typeof(TFilter);

        public IReadOnlyList<TabularColumn> Columns => Fields.Select(f => new TabularColumn(f.Header, f.Type)).ToList();

        public async Task<int> CountAsync(object filter, CancellationToken cancellationToken)
        {
            var query = await Query((TFilter)filter, cancellationToken);
            return await query.CountAsync(cancellationToken);
        }

        public async IAsyncEnumerable<IReadOnlyList<object?>> ReadRowsAsync(object filter, [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken cancellationToken)
        {
            var query = await Query((TFilter)filter, cancellationToken);

            await foreach (var row in query.AsAsyncEnumerable().WithCancellation(cancellationToken))
                yield return Fields.Select(field => DataValues.ToExportValue(field.Value(row))).ToList();
        }
    }
}
