using Domain.Enums;
using Infrastructure.Services;

namespace WMS.Tests.Unit
{
    public class ProductCodeServiceTests
    {
        private readonly ProductCodeService _service = new();

        [Fact]
        public void Build_NoZeroPadding()
        {
            var code = _service.BuildProductCode(10, new DateTime(2026, 8, 30));

            Assert.Matches(@"^\d{8}-10$", code);
            Assert.Equal($"{code}-3", _service.BuildUnitBarcode(code, 3));
        }

        [Theory]
        [InlineData("14050608-10", BarcodeReferenceKindEnum.PRODUCT, "14050608-10", 10, null)]
        [InlineData("14050608-10-3", BarcodeReferenceKindEnum.UNIT, "14050608-10-3", 10, 3)]
        [InlineData(" 14050608-010-03 ", BarcodeReferenceKindEnum.UNIT, "14050608-10-3", 10, 3)]
        [InlineData("۱۴۰۵۰۶۰۸–۱۰–۳", BarcodeReferenceKindEnum.UNIT, "14050608-10-3", 10, 3)]
        public void Parse_SplitsOnDashes(string input, BarcodeReferenceKindEnum kind, string payload, int productId, int? serial)
        {
            var reference = _service.Parse(input);

            Assert.Equal(kind, reference.Kind);
            Assert.Equal(payload, reference.NormalizedPayload);
            Assert.Equal(productId, reference.ProductId);
            Assert.Equal(serial, reference.SerialNumber);
            Assert.Equal(payload, _service.ToPayload(input));
        }

        [Theory]
        [InlineData("")]
        [InlineData("1405")]
        [InlineData("1405060800000000100000000003")]
        [InlineData("1405060-10-3")]
        [InlineData("14050608-10-3-1")]
        [InlineData("14050608-9999999999")]
        public void Parse_RejectsEverythingElse(string input)
        {
            Assert.Equal(BarcodeReferenceKindEnum.UNKNOWN, _service.Parse(input).Kind);
        }
    }
}
