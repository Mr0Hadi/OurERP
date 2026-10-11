namespace Application.Features.Accounting
{
    /// <summary>
    /// A From/To day filter as every accounting page reads it: both days inclusive, whatever time of day is sent.
    /// Translates to <c>&gt;= From.Date</c> and <c>&lt; To.Date + 1 day</c>, which keeps an index on the column usable.
    /// </summary>
    public static class DateRange
    {
        public static DateTime? Start(DateTime? from) => from?.Date;

        public static DateTime? EndExclusive(DateTime? to) => to?.Date.AddDays(1);
    }
}
