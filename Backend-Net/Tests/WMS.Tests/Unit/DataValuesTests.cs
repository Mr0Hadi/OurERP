using Application.Common.DataTransfer;
using Domain.Enums;

namespace WMS.Tests.Unit
{
    public class DataValuesTests
    {
        private static object? Parse(string? raw, ImportColumn column)
        {
            Assert.True(DataValues.TryParse(raw, column, out var value, out var error), error);
            return value;
        }

        private static string Fail(string raw, ImportColumn column)
        {
            Assert.False(DataValues.TryParse(raw, column, out _, out var error));
            return error!;
        }

        private static readonly ImportColumn Integer = new() { Key = "n", Header = "عدد", Type = DataFieldTypeEnum.Integer, MinValue = 0, MaxValue = int.MaxValue };

        [Theory]
        [InlineData("1500", 1500L)]
        [InlineData("۱۵۰۰", 1500L)]
        [InlineData("١٥٠٠", 1500L)]
        [InlineData("1,500,000", 1500000L)]
        [InlineData("۱٬۵۰۰", 1500L)]
        [InlineData(" 42 ", 42L)]
        public void Integer_AcceptsPersianDigitsAndSeparators(string raw, long expected)
        {
            Assert.Equal(expected, Parse(raw, Integer));
        }

        [Theory]
        [InlineData("abc")]
        [InlineData("12.5")]
        [InlineData("-1")]
        [InlineData("99999999999")]
        public void Integer_RefusesNonIntegersAndOutOfRange(string raw)
        {
            Fail(raw, Integer);
        }

        [Fact]
        public void Blank_IsNull_NotAnError()
        {
            Assert.Null(Parse("   ", Integer));
            Assert.Null(Parse(null, Integer));
        }

        [Fact]
        public void Text_NormalizesArabicLettersAndTrims()
        {
            var column = new ImportColumn { Key = "t", Header = "متن" };
            Assert.Equal("لوازم یدکی", Parse("  لوازم يدكي ", column));
        }

        [Fact]
        public void Text_RespectsMaxLength()
        {
            Fail("abcdef", new ImportColumn { Key = "t", Header = "متن", MaxLength = 3 });
        }

        [Fact]
        public void Text_UndoesTheExportFormulaGuard()
        {
            var column = new ImportColumn { Key = "t", Header = "متن" };
            Assert.Equal("=SUM(A1)", Parse("'=SUM(A1)", column));
            Assert.Equal("'quoted", Parse("'quoted", column));
        }

        [Theory]
        [InlineData("1403/05/12", 2024, 8, 2)]
        [InlineData("۱۴۰۳-۰۵-۱۲", 2024, 8, 2)]
        [InlineData("2024-08-02", 2024, 8, 2)]
        [InlineData("2024/08/02", 2024, 8, 2)]
        public void Date_AcceptsPersianAndGregorian(string raw, int year, int month, int day)
        {
            var column = new ImportColumn { Key = "d", Header = "تاریخ", Type = DataFieldTypeEnum.Date };
            Assert.Equal(new DateTime(year, month, day), Parse(raw, column));
        }

        [Theory]
        [InlineData("1403/13/01")]
        [InlineData("not a date")]
        public void Date_RefusesInvalid(string raw)
        {
            Fail(raw, new ImportColumn { Key = "d", Header = "تاریخ", Type = DataFieldTypeEnum.Date });
        }

        [Theory]
        [InlineData("بله", true)]
        [InlineData("خیر", false)]
        [InlineData("TRUE", true)]
        [InlineData("0", false)]
        public void Boolean_AcceptsPersianAndEnglish(string raw, bool expected)
        {
            Assert.Equal(expected, Parse(raw, new ImportColumn { Key = "b", Header = "ب", Type = DataFieldTypeEnum.Boolean }));
        }

        [Theory]
        [InlineData("عدد", ProductUnitEnum.Number)]
        [InlineData("Number", ProductUnitEnum.Number)]
        [InlineData("2", ProductUnitEnum.Box)]
        [InlineData("كارتن", ProductUnitEnum.Box)]
        public void Enum_AcceptsLabelNameOrNumber(string raw, ProductUnitEnum expected)
        {
            var column = new ImportColumn { Key = "u", Header = "واحد", Type = DataFieldTypeEnum.Enum, EnumType = typeof(ProductUnitEnum) };
            Assert.Equal(expected, Parse(raw, column));
        }

        [Fact]
        public void Enum_RefusesUnknown_AndListsTheAllowedLabels()
        {
            var column = new ImportColumn { Key = "u", Header = "واحد", Type = DataFieldTypeEnum.Enum, EnumType = typeof(ProductUnitEnum) };
            var error = Fail("99", column);
            Assert.Contains("کارتن", error);
        }

        [Fact]
        public void ExportValue_EnumBecomesItsPersianLabel_AndUnsignedBecomesLong()
        {
            Assert.Equal("کارتن", DataValues.ToExportValue(ProductUnitEnum.Box));
            Assert.Equal(1500L, DataValues.ToExportValue(1500UL));
            Assert.Equal(7L, DataValues.ToExportValue(7));
        }

        [Fact]
        public void NormalizeKey_IgnoresCaseSpacingAndArabicLetters()
        {
            Assert.Equal(DataValues.NormalizeKey("لوازم  یدکی"), DataValues.NormalizeKey(" لوازم يدكي"));
            Assert.Equal(DataValues.NormalizeKey("ACME"), DataValues.NormalizeKey("acme"));
        }
    }
}
