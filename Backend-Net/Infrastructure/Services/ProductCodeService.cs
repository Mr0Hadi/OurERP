using System.Text.RegularExpressions;
using Application.Common.Contracts.ProductCode;
using Common.Extensions;
using Domain.Enums;

namespace Infrastructure.Services
{
    public class ProductCodeService : IProductCodeService
    {
        private static readonly Regex NonDigit = new(@"\D+", RegexOptions.Compiled);

        public string BuildProductCode(int productId, DateTime createdAt)
        {
            return $"{PersianDate.ToCompactString(createdAt)}-{productId:D6}";
        }

        public string ToPayload(string humanReadableCode)
        {
            return NonDigit.Replace(humanReadableCode ?? string.Empty, string.Empty);
        }

        public string BuildUnitBarcode(string productCode, int serialNumber)
        {
            return $"{productCode}-{serialNumber:D6}";
        }

        public BarcodeReference Parse(string scannedInput)
        {
            var digits = NonDigit.Replace(scannedInput ?? string.Empty, string.Empty);

            switch (digits.Length)
            {
                case 14:
                    return new BarcodeReference
                    {
                        Kind = BarcodeReferenceKindEnum.PRODUCT,
                        NormalizedPayload = digits,
                        ProductId = int.Parse(digits.Substring(8, 6))
                    };
                case 20:
                    return new BarcodeReference
                    {
                        Kind = BarcodeReferenceKindEnum.UNIT,
                        NormalizedPayload = digits,
                        ProductId = int.Parse(digits.Substring(8, 6)),
                        SerialNumber = int.Parse(digits.Substring(14, 6))
                    };
                default:
                    return new BarcodeReference
                    {
                        Kind = BarcodeReferenceKindEnum.UNKNOWN,
                        NormalizedPayload = digits
                    };
            }
        }
    }
}
