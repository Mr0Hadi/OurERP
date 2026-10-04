using System.Text;
using System.Text.RegularExpressions;
using Application.Common.Contracts.ProductCode;
using Common.Extensions;
using Domain.Enums;

namespace Infrastructure.Services
{
    public class ProductCodeService : IProductCodeService
    {
        private const char Separator = '-';

        // date(8) - productId [- serial]; ids are int, so at most 10 digits each.
        private static readonly Regex CodePattern = new(@"^\d{8}(-\d{1,10}){1,2}$", RegexOptions.Compiled);
        private static readonly Regex Whitespace = new(@"\s+", RegexOptions.Compiled);

        public string BuildProductCode(int productId, DateTime createdAt)
        {
            return $"{PersianDate.ToCompactString(createdAt)}{Separator}{productId}";
        }

        public string ToPayload(string humanReadableCode)
        {
            return Parse(humanReadableCode).NormalizedPayload;
        }

        public string BuildUnitBarcode(string productCode, int serialNumber)
        {
            return $"{productCode}{Separator}{serialNumber}";
        }

        public BarcodeReference Parse(string scannedInput)
        {
            var cleaned = Clean(scannedInput);

            if (!CodePattern.IsMatch(cleaned))
                return new BarcodeReference { Kind = BarcodeReferenceKindEnum.UNKNOWN, NormalizedPayload = cleaned };

            var segments = cleaned.Split(Separator);
            if (!int.TryParse(segments[1], out var productId))
                return new BarcodeReference { Kind = BarcodeReferenceKindEnum.UNKNOWN, NormalizedPayload = cleaned };

            if (segments.Length == 2)
            {
                return new BarcodeReference
                {
                    Kind = BarcodeReferenceKindEnum.PRODUCT,
                    NormalizedPayload = $"{segments[0]}{Separator}{productId}",
                    ProductId = productId
                };
            }

            if (!int.TryParse(segments[2], out var serialNumber))
                return new BarcodeReference { Kind = BarcodeReferenceKindEnum.UNKNOWN, NormalizedPayload = cleaned };

            return new BarcodeReference
            {
                Kind = BarcodeReferenceKindEnum.UNIT,
                NormalizedPayload = $"{segments[0]}{Separator}{productId}{Separator}{serialNumber}",
                ProductId = productId,
                SerialNumber = serialNumber
            };
        }

        /// <summary>
        /// Latin digits, a real '-' and no whitespace. Keyboard-wedge scanners on a Persian
        /// layout type ۰-۹, and some keyboards produce en/em dashes, minus signs or kashida.
        /// </summary>
        private static string Clean(string input)
        {
            var builder = new StringBuilder();
            foreach (var ch in Whitespace.Replace(input ?? string.Empty, string.Empty))
            {
                if (ch is >= '۰' and <= '۹')
                    builder.Append((char)('0' + (ch - '۰')));
                else if (ch is >= '٠' and <= '٩')
                    builder.Append((char)('0' + (ch - '٠')));
                else if (ch is (>= '‐' and <= '―') or '−' or '﹘' or '﹣' or '－' or 'ـ')
                    builder.Append(Separator);
                else
                    builder.Append(ch);
            }
            return builder.ToString();
        }
    }
}
