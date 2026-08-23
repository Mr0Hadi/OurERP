using System.Globalization;

namespace Common.Extensions
{
    public static class PersianDate
    {
        private static readonly PersianCalendar Calendar = new PersianCalendar();

        /// <summary>
        /// 8-digit numeric-only Persian date (yyyyMMdd), used as the date segment of
        /// product codes/barcodes. Fixed width is required so the segment can be sliced
        /// out of a scanned payload by position.
        /// </summary>
        public static string ToCompactString(DateTime date)
        {
            var year = Calendar.GetYear(date);
            var month = Calendar.GetMonth(date);
            var day = Calendar.GetDayOfMonth(date);
            return $"{year:D4}{month:D2}{day:D2}";
        }

        /// <summary>Human-readable yyyy/MM/dd Persian date, for invoices and UI display.</summary>
        public static string ToDisplayString(DateTime date)
        {
            var year = Calendar.GetYear(date);
            var month = Calendar.GetMonth(date);
            var day = Calendar.GetDayOfMonth(date);
            return $"{year:D4}/{month:D2}/{day:D2}";
        }

        public static string ToPersianDigits(this string input)
        {
            if (string.IsNullOrEmpty(input))
                return input;

            var persianDigits = new[] { '۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹' };
            var chars = input.ToCharArray();
            for (var i = 0; i < chars.Length; i++)
            {
                if (chars[i] >= '0' && chars[i] <= '9')
                    chars[i] = persianDigits[chars[i] - '0'];
            }
            return new string(chars);
        }
    }
}
