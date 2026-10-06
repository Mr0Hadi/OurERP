using System.ComponentModel;
using System.Globalization;
using System.Reflection;
using System.Text;
using System.Text.RegularExpressions;

namespace Application.Common.DataTransfer
{
    /// <summary>
    /// Turning spreadsheet text into typed values and back. Pure, synchronous string work (section 3's async rule),
    /// shared by every format and every definition so "1,500", "۱۵۰۰" and "1500" mean the same number everywhere.
    /// </summary>
    public static class DataValues
    {
        private static readonly PersianCalendar Persian = new();

        /// <summary>
        /// Characters a spreadsheet may read as the start of a formula (OWASP "CSV injection"). A text value that
        /// starts with one is written with a leading apostrophe, which every spreadsheet shows as plain text.
        /// </summary>
        private static readonly char[] FormulaTriggers = { '=', '+', '-', '@', '\t', '\r' };

        private static readonly Regex Whitespace = new(@"\s+", RegexOptions.Compiled);

        /// <summary>
        /// Trimmed text with Arabic Yeh/Kaf replaced by their Persian forms - the same name typed on an Arabic and a
        /// Persian keyboard must not count as two different categories. Blank becomes null.
        /// </summary>
        public static string? NormalizeText(string? value)
        {
            if (value == null) return null;

            var text = value
                .Replace('ي', 'ی') // ي -> ی
                .Replace('ى', 'ی') // ى -> ی
                .Replace('ك', 'ک') // ك -> ک
                .Trim();

            return text.Length == 0 ? null : text;
        }

        /// <summary>The comparison form of a lookup or duplicate key: normalized, single-spaced, case-insensitive.</summary>
        public static string? NormalizeKey(string? value)
        {
            var text = NormalizeText(value);
            return text == null ? null : Whitespace.Replace(text, " ").ToLowerInvariant();
        }

        /// <summary>Persian and Arabic-Indic digits to ASCII, so a number typed on a Persian keyboard parses.</summary>
        public static string ToAsciiDigits(string value)
        {
            var builder = new StringBuilder(value.Length);
            foreach (var c in value)
            {
                if (c >= '۰' && c <= '۹') builder.Append((char)('0' + (c - '۰')));
                else if (c >= '٠' && c <= '٩') builder.Append((char)('0' + (c - '٠')));
                else builder.Append(c);
            }
            return builder.ToString();
        }

        public static bool StartsLikeFormula(string value) => value.Length > 0 && FormulaTriggers.Contains(value[0]);

        /// <summary>Prefixes an apostrophe when the text would otherwise be read as a formula.</summary>
        public static string NeutralizeFormula(string value) => StartsLikeFormula(value) ? "'" + value : value;

        /// <summary>Undoes <see cref="NeutralizeFormula"/> on import, so an exported file imports back unchanged.</summary>
        public static string RestoreNeutralized(string value)
            => value.Length > 1 && value[0] == '\'' && FormulaTriggers.Contains(value[1]) ? value[1..] : value;

        /// <summary>
        /// Parses one cell. A blank cell is a successful null; whether null is allowed is the caller's decision
        /// (required columns). Returns false with a Persian message when the text is not a value of that type.
        /// </summary>
        public static bool TryParse(string? raw, ImportColumn column, out object? value, out string? error)
        {
            value = null;
            error = null;

            var text = NormalizeText(raw);
            if (text == null) return true;

            switch (column.Type)
            {
                case DataFieldTypeEnum.Text:
                    text = RestoreNeutralized(text);
                    if (column.MaxLength.HasValue && text.Length > column.MaxLength.Value)
                    {
                        error = $"حداکثر طول مجاز {column.MaxLength.Value} نویسه است.";
                        return false;
                    }
                    value = text;
                    return true;

                case DataFieldTypeEnum.Integer:
                    if (!TryParseNumber(text, out var number) || number != decimal.Truncate(number))
                    {
                        error = "عدد صحیح معتبر نیست.";
                        return false;
                    }
                    if (number < column.MinValue || number > column.MaxValue)
                    {
                        error = $"عدد باید بین {column.MinValue} و {column.MaxValue} باشد.";
                        return false;
                    }
                    value = (long)number;
                    return true;

                case DataFieldTypeEnum.Decimal:
                    if (!TryParseNumber(text, out var amount))
                    {
                        error = "عدد معتبر نیست.";
                        return false;
                    }
                    if (amount < column.MinValue || amount > column.MaxValue)
                    {
                        error = $"عدد باید بین {column.MinValue} و {column.MaxValue} باشد.";
                        return false;
                    }
                    value = amount;
                    return true;

                case DataFieldTypeEnum.Boolean:
                    var flag = ParseBoolean(text);
                    if (flag == null)
                    {
                        error = "مقدار باید «بله» یا «خیر» باشد.";
                        return false;
                    }
                    value = flag.Value;
                    return true;

                case DataFieldTypeEnum.Date:
                    if (!TryParseDate(text, out var date))
                    {
                        error = "تاریخ معتبر نیست (نمونه: 1403/05/12 یا 2024-08-02).";
                        return false;
                    }
                    value = date;
                    return true;

                case DataFieldTypeEnum.Enum:
                    var member = ParseEnum(text, column.EnumType!);
                    if (member == null)
                    {
                        error = $"مقدار مجاز نیست. مقدارهای مجاز: {string.Join("، ", EnumLabels(column.EnumType!))}.";
                        return false;
                    }
                    value = member;
                    return true;

                default:
                    error = "نوع ستون پشتیبانی نمی‌شود.";
                    return false;
            }
        }

        /// <summary>
        /// A typed value as it should appear in a file: enums become their Persian label (readable, and importable
        /// back), unsigned integers become long or decimal so every writer handles them, everything else passes.
        /// </summary>
        public static object? ToExportValue(object? value)
        {
            return value switch
            {
                null => null,
                Enum member => EnumLabel(member),
                ulong u => u <= long.MaxValue ? (object)(long)u : (decimal)u,
                uint u => (long)u,
                int i => (long)i,
                short s => (long)s,
                byte b => (long)b,
                float f => (decimal)f,
                double d => (decimal)d,
                DateTimeOffset offset => offset.DateTime,
                _ => value,
            };
        }

        public static string EnumLabel(Enum member)
        {
            var field = member.GetType().GetField(member.ToString());
            return field?.GetCustomAttribute<DescriptionAttribute>()?.Description ?? member.ToString();
        }

        public static IEnumerable<string> EnumLabels(Type enumType)
            => Enum.GetValues(enumType).Cast<Enum>().Select(EnumLabel);

        private static bool TryParseNumber(string text, out decimal number)
        {
            var normalized = ToAsciiDigits(text)
                .Replace("٬", string.Empty) // ٬ Arabic thousands separator
                .Replace(",", string.Empty)
                .Replace(" ", string.Empty)
                .Replace('٫', '.');         // ٫ Arabic decimal separator

            return decimal.TryParse(normalized, NumberStyles.AllowLeadingSign | NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture, out number);
        }

        private static bool? ParseBoolean(string text)
        {
            switch (text.ToLowerInvariant())
            {
                case "true": case "1": case "yes": case "y": case "بله": case "آری": case "بلی": case "دارد": case "✓":
                    return true;
                case "false": case "0": case "no": case "n": case "خیر": case "نه": case "ندارد":
                    return false;
                default:
                    return null;
            }
        }

        /// <summary>
        /// ISO (2024-08-02, optionally with a time) or slash-separated dates. A year below 1700 is a Persian
        /// (solar hijri) year - what a user here types - and is converted to the Gregorian date the database stores.
        /// </summary>
        private static bool TryParseDate(string text, out DateTime date)
        {
            date = default;
            var ascii = ToAsciiDigits(text).Replace('/', '-').Replace('.', '-');

            var parts = ascii.Split(new[] { ' ', 'T' }, 2, StringSplitOptions.RemoveEmptyEntries);
            var ymd = parts[0].Split('-');
            if (ymd.Length != 3
                || !int.TryParse(ymd[0], NumberStyles.None, CultureInfo.InvariantCulture, out var year)
                || !int.TryParse(ymd[1], NumberStyles.None, CultureInfo.InvariantCulture, out var month)
                || !int.TryParse(ymd[2], NumberStyles.None, CultureInfo.InvariantCulture, out var day))
                return false;

            var time = TimeSpan.Zero;
            if (parts.Length == 2 && !TimeSpan.TryParse(parts[1], CultureInfo.InvariantCulture, out time))
                return false;

            try
            {
                date = year < 1700
                    ? Persian.ToDateTime(year, month, day, 0, 0, 0, 0)
                    : new DateTime(year, month, day);
                date = date.Add(time);
                return true;
            }
            catch (ArgumentOutOfRangeException)
            {
                return false;
            }
        }

        private static object? ParseEnum(string text, Type enumType)
        {
            var key = NormalizeKey(text);

            foreach (Enum member in Enum.GetValues(enumType))
            {
                if (NormalizeKey(EnumLabel(member)) == key || member.ToString().Equals(text, StringComparison.OrdinalIgnoreCase))
                    return member;
            }

            if (long.TryParse(ToAsciiDigits(text), NumberStyles.AllowLeadingSign, CultureInfo.InvariantCulture, out var number))
            {
                var member = Enum.ToObject(enumType, number);
                if (Enum.IsDefined(enumType, member)) return member;
            }

            return null;
        }
    }
}
