using System.Globalization;
using Domain.Enums;

namespace Common.Extensions
{
    /// <summary>
    /// Report period-bucket boundaries on the Persian (Jalali) calendar - matches how this
    /// business actually thinks about "this month"/"this quarter" and reuses the same
    /// PersianCalendar this codebase already uses for invoice dates (see PersianDate.cs).
    /// Quarters/halves align to the Persian year (Farvardin..Esfand); weeks start Saturday.
    /// Calendar.AddMonths/AddYears on PersianCalendar are calendar-aware (they respect Persian
    /// month lengths and leap years), so bucket walking never needs to hand-roll that math.
    /// </summary>
    public static class PeriodBucketing
    {
        private static readonly PersianCalendar Calendar = new PersianCalendar();

        public static DateTime GetBucketStart(DateTime date, ReportPeriodTypeEnum periodType)
        {
            switch (periodType)
            {
                case ReportPeriodTypeEnum.Daily:
                    return date.Date;

                case ReportPeriodTypeEnum.Weekly:
                    var daysSinceSaturday = ((int)date.DayOfWeek - (int)DayOfWeek.Saturday + 7) % 7;
                    return date.Date.AddDays(-daysSinceSaturday);

                case ReportPeriodTypeEnum.Monthly:
                    return StartOfPersianMonth(date, Calendar.GetMonth(date));

                case ReportPeriodTypeEnum.Quarterly:
                {
                    var quarterStartMonth = ((Calendar.GetMonth(date) - 1) / 3) * 3 + 1;
                    return StartOfPersianMonth(date, quarterStartMonth);
                }

                case ReportPeriodTypeEnum.SemiAnnual:
                {
                    var halfStartMonth = Calendar.GetMonth(date) <= 6 ? 1 : 7;
                    return StartOfPersianMonth(date, halfStartMonth);
                }

                case ReportPeriodTypeEnum.Annual:
                    return Calendar.ToDateTime(Calendar.GetYear(date), 1, 1, 0, 0, 0, 0);

                default:
                    throw new ArgumentOutOfRangeException(nameof(periodType));
            }
        }

        public static DateTime GetNextBucketStart(DateTime bucketStart, ReportPeriodTypeEnum periodType)
        {
            return periodType switch
            {
                ReportPeriodTypeEnum.Daily => bucketStart.AddDays(1),
                ReportPeriodTypeEnum.Weekly => bucketStart.AddDays(7),
                ReportPeriodTypeEnum.Monthly => Calendar.AddMonths(bucketStart, 1),
                ReportPeriodTypeEnum.Quarterly => Calendar.AddMonths(bucketStart, 3),
                ReportPeriodTypeEnum.SemiAnnual => Calendar.AddMonths(bucketStart, 6),
                ReportPeriodTypeEnum.Annual => Calendar.AddYears(bucketStart, 1),
                _ => throw new ArgumentOutOfRangeException(nameof(periodType)),
            };
        }

        private static DateTime StartOfPersianMonth(DateTime date, int month)
        {
            return Calendar.ToDateTime(Calendar.GetYear(date), month, 1, 0, 0, 0, 0);
        }
    }
}
