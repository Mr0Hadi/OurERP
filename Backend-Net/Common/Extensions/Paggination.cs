using Microsoft.EntityFrameworkCore;

namespace Common.Extensions
{
    /// <summary>
    /// The result of paging a database query: the requested page plus the counts the
    /// caller needs to build a <c>ResponsePageDto</c>. Replaces the old
    /// <c>out int pageCount, out int totalCount</c> shape - <c>out</c> parameters cannot be
    /// filled from an awaited call, which is what forced the row count to run synchronously.
    /// </summary>
    public class PagedResult<T>
    {
        public List<T> Items { get; init; } = new();

        public int PageCount { get; init; }

        public int TotalCount { get; init; }
    }

    public static class Paggination
    {
        /// <summary>
        /// Pages a database query. Both round-trips (the COUNT and the page itself) are
        /// asynchronous, and both honour <paramref name="cancellationToken"/>.
        /// </summary>
        public static async Task<PagedResult<T>> ToPagedAsync<T>(this IQueryable<T> source, int page, int pageSize, CancellationToken cancellationToken = default)
        {
            var totalCount = await source.CountAsync(cancellationToken);

            var items = await source
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync(cancellationToken);

            return new PagedResult<T>
            {
                Items = items,
                PageCount = ComputePageCount(totalCount, pageSize),
                TotalCount = totalCount
            };
        }

        public static async Task<int> GetPageCountAsync<T>(this IQueryable<T> source, int pageSize, CancellationToken cancellationToken = default)
        {
            return ComputePageCount(await source.CountAsync(cancellationToken), pageSize);
        }

        // The IEnumerable overloads below page an already-materialised in-memory sequence.
        // There is no IO here, so they stay synchronous on purpose.

        public static IEnumerable<T> ToPaged<T>(this IEnumerable<T> source, int page, int pageSize, out int pageCount)
        {
            pageCount = ComputePageCount(source.Count(), pageSize);

            return source.Skip((page - 1) * pageSize).Take(pageSize);
        }

        public static int GetPageCount<T>(this IEnumerable<T> source, int pageSize)
        {
            return ComputePageCount(source.Count(), pageSize);
        }

        private static int ComputePageCount(int rowsCount, int pageSize)
        {
            return (int)Math.Ceiling((double)rowsCount / (double)pageSize);
        }
    }
}
