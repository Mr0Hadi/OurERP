using System.Linq.Expressions;
using Application.Common.Enums;

namespace Application.Common.Queries;

/// <summary>
/// Ordering helpers for the paged list queries.
///
/// Every list query must end its ordering with a unique key (normally Id) before
/// <c>ToPagedAsync</c>: SQL Server gives no order to rows that tie on the sort column, so
/// without the tie-breaker a row can show up on two pages or on none.
/// </summary>
public static class SortingExtensions
{
    public static IOrderedQueryable<T> SortBy<T, TKey>(this IQueryable<T> source, Expression<Func<T, TKey>> key, SortDirectionEnum direction) =>
        direction == SortDirectionEnum.DESC ? source.OrderByDescending(key) : source.OrderBy(key);

    public static IOrderedQueryable<T> ThenSortBy<T, TKey>(this IOrderedQueryable<T> source, Expression<Func<T, TKey>> key, SortDirectionEnum direction) =>
        direction == SortDirectionEnum.DESC ? source.ThenByDescending(key) : source.ThenBy(key);

    /// <summary>
    /// The direction a list query sorts in. An explicit <paramref name="sortDirection"/> always wins;
    /// otherwise a column the caller picked sorts ascending, and the query's own default ordering
    /// (no <c>SortBy</c> sent) uses <paramref name="defaultDirection"/>.
    /// </summary>
    public static SortDirectionEnum ResolveDirection(bool hasSortBy, SortDirectionEnum? sortDirection, SortDirectionEnum defaultDirection) =>
        sortDirection ?? (hasSortBy ? SortDirectionEnum.ASC : defaultDirection);
}
