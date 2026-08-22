using System.Text;

namespace Common.Extensions
{
    /// <summary>Spells a non-negative integer amount out in Persian words, for the "amount in words" line on invoices.</summary>
    public static class NumberToPersianWords
    {
        private static readonly string[] Ones =
        {
            "", "یک", "دو", "سه", "چهار", "پنج", "شش", "هفت", "هشت", "نه"
        };

        private static readonly string[] Teens =
        {
            "ده", "یازده", "دوازده", "سیزده", "چهارده", "پانزده", "شانزده", "هفده", "هجده", "نوزده"
        };

        private static readonly string[] Tens =
        {
            "", "", "بیست", "سی", "چهل", "پنجاه", "شصت", "هفتاد", "هشتاد", "نود"
        };

        private static readonly string[] Hundreds =
        {
            "", "صد", "دویست", "سیصد", "چهارصد", "پانصد", "ششصد", "هفتصد", "هشتصد", "نهصد"
        };

        private static readonly string[] Scales =
        {
            "", "هزار", "میلیون", "میلیارد", "بیلیون", "بیلیارد"
        };

        public static string ToWords(ulong amount)
        {
            if (amount == 0)
                return "صفر";

            var groups = new List<int>();
            var remaining = amount;
            while (remaining > 0)
            {
                groups.Add((int)(remaining % 1000));
                remaining /= 1000;
            }

            var parts = new List<string>();
            for (var i = groups.Count - 1; i >= 0; i--)
            {
                if (groups[i] == 0)
                    continue;

                var groupWords = ThreeDigitsToWords(groups[i]);
                parts.Add(i > 0 ? $"{groupWords} {Scales[i]}" : groupWords);
            }

            return string.Join(" و ", parts);
        }

        public static string ToWordsWithCurrency(ulong amount, string currency = "ریال")
        {
            return $"{ToWords(amount)} {currency}";
        }

        private static string ThreeDigitsToWords(int number)
        {
            var sb = new StringBuilder();
            var hundred = number / 100;
            var rest = number % 100;

            if (hundred > 0)
                sb.Append(Hundreds[hundred]);

            if (rest == 0)
                return sb.ToString();

            if (sb.Length > 0)
                sb.Append(" و ");

            if (rest < 10)
            {
                sb.Append(Ones[rest]);
            }
            else if (rest < 20)
            {
                sb.Append(Teens[rest - 10]);
            }
            else
            {
                var ten = rest / 10;
                var one = rest % 10;
                sb.Append(Tens[ten]);
                if (one > 0)
                    sb.Append(" و ").Append(Ones[one]);
            }

            return sb.ToString();
        }
    }
}
