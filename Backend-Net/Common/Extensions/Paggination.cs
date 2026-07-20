namespace Common.Extensions
{
    public static class Paggination
    {
        public static IEnumerable<T> ToPaged<T>(this IEnumerable<T> source, int page, int pageSize, out int pageCount)
        {
            var rowsCount = source.Count();
            double current = (double)rowsCount / (double)pageSize;
            pageCount = (int)Math.Ceiling(current);

            return source.Skip((page - 1) * pageSize).Take(pageSize);
        }

        public static int GetPageCount<T>(this IEnumerable<T> source, int pageSize)
        {
            var rowsCount = source.Count();
            double current = (double)rowsCount / (double)pageSize;
            var pageCount = (int)Math.Ceiling(current);

            return pageCount;
        }

        public static bool IsValidPage<T>(this IEnumerable<T> source, int page, int pageSize)
        {
            var rowsCount = source.Count();
            double current = (double)rowsCount / (double)pageSize;
            var pageCount = (int)Math.Ceiling(current);

            return page <= pageSize;
        }

        public static IQueryable<T> ToPaged<T>(this IQueryable<T> source, int page, int pageSize, out int pageCount, out int totalCount)
        {
            var rowsCount = source.Count();
            double current = (double)rowsCount / (double)pageSize;
            pageCount = (int)Math.Ceiling(current);
            totalCount = rowsCount;

            return source.Skip((page - 1) * pageSize).Take(pageSize);
        }

        public static int GetPageCount<T>(this IQueryable<T> source, int pageSize)
        {
            var rowsCount = source.Count();
            double current = (double)rowsCount / (double)pageSize;
            var pageCount = (int)Math.Ceiling(current);

            return pageCount;
        }

        public static bool IsValidPage<T>(this IQueryable<T> source, int page, int pageSize)
        {
            var rowsCount = source.Count();
            double current = (double)rowsCount / (double)pageSize;
            var pageCount = (int)Math.Ceiling(current);

            return page <= pageSize;
        }
    }
}
