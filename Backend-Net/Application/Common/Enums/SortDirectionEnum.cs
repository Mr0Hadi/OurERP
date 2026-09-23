namespace Application.Common.Enums
{
    /// <summary>
    /// Direction of a list query's <c>SortBy</c>. Shared by every paged list query; each query
    /// has its own <c>...ListSortEnum</c> naming the columns it can sort on.
    /// </summary>
    public enum SortDirectionEnum
    {
        ASC = 0,
        DESC = 1,
    }
}
