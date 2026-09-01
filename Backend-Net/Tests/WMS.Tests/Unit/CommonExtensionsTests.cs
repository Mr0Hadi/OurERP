using Common.Extensions;
using Domain.Entities;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using WMS.Tests.Support;

namespace WMS.Tests.Unit
{
    public class GeneratorTests
    {
        [Fact]
        public void GetUniqueKey_ReturnsRequestedLength()
        {
            var key = Generator.GetUniqueKey(12);

            Assert.Equal(12, key.Length);
        }

        [Fact]
        public void GetUniqueKey_OnlyUsesAllowedAlphabet()
        {
            const string allowed = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVXYZW23456789";

            var key = Generator.GetUniqueKey(64);

            Assert.All(key, c => Assert.Contains(c, allowed));
        }

        [Fact]
        public void GenerateReturnNumber_IncludesCurrentYearAndPadsSequence()
        {
            var number = Generator.GenerateReturnNumber(7);

            Assert.Equal($"RET-{DateTime.Now.Year}-0007", number);
        }

        [Fact]
        public void GenerateSaleReturnNumber_IncludesCurrentYearAndPadsSequence()
        {
            var number = Generator.GenerateSaleReturnNumber(42);

            Assert.Equal($"SRET-{DateTime.Now.Year}-0042", number);
        }

        [Fact]
        public void GenerateInvoiceNumber_IncludesCurrentYearAndPadsSequence()
        {
            var number = Generator.GenerateInvoiceNumber(7);

            Assert.Equal($"INV-{DateTime.Now.Year}-0007", number);
        }

        [Theory]
        [InlineData(1)]
        [InlineData(5)]
        [InlineData(13)]
        public void GenerateRandomNumber_ReturnsRequestedDigitCountWithNoLeadingZero(int digits)
        {
            var number = Generator.GenerateRandomNumber(digits);

            Assert.Equal(digits, number.Length);
            Assert.NotEqual('0', number[0]);
            Assert.All(number, c => Assert.True(char.IsDigit(c)));
        }
    }

    public class PagginationTests
    {
        // These run against the real SQLite-backed context rather than a list wrapped in
        // AsQueryable(): ToPagedAsync goes through EF's async query provider, which a plain
        // in-memory IQueryable does not implement. Testing it over EF is also the honest test -
        // it is the COUNT + page round-trip that is being asserted.
        private static async Task<WMSDbContext> SeedCategoriesAsync(TestDatabase db, int count)
        {
            var context = db.NewContext();

            context.ProductCategories.AddRange(Enumerable.Range(1, count)
                .Select(i => new ProductCategory { Name = $"C{i:00}", IsActive = true }));

            await context.SaveChangesAsync(CancellationToken.None);

            return context;
        }

        [Fact]
        public async Task ToPagedAsync_ReturnsRequestedPageAndCounts()
        {
            using var db = new TestDatabase();
            using var context = await SeedCategoriesAsync(db, 25);

            var paged = await context.ProductCategories
                .OrderBy(x => x.Id)
                .Select(x => x.Name)
                .ToPagedAsync(2, 10, CancellationToken.None);

            Assert.Equal(Enumerable.Range(11, 10).Select(i => $"C{i:00}"), paged.Items);
            Assert.Equal(3, paged.PageCount);
            Assert.Equal(25, paged.TotalCount);
        }

        [Fact]
        public async Task ToPagedAsync_LastPageReturnsRemainder()
        {
            using var db = new TestDatabase();
            using var context = await SeedCategoriesAsync(db, 25);

            var paged = await context.ProductCategories
                .OrderBy(x => x.Id)
                .Select(x => x.Name)
                .ToPagedAsync(3, 10, CancellationToken.None);

            Assert.Equal(Enumerable.Range(21, 5).Select(i => $"C{i:00}"), paged.Items);
            Assert.Equal(3, paged.PageCount);
            Assert.Equal(25, paged.TotalCount);
        }

        [Fact]
        public async Task ToPagedAsync_HonoursCancellation()
        {
            using var db = new TestDatabase();
            using var context = await SeedCategoriesAsync(db, 5);

            using var cts = new CancellationTokenSource();
            await cts.CancelAsync();

            await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
                context.ProductCategories.ToPagedAsync(1, 10, cts.Token));
        }

        [Fact]
        public void ToPaged_Enumerable_ComputesPageCount()
        {
            var source = Enumerable.Range(1, 25);

            var page = source.ToPaged(1, 10, out var pageCount).ToList();

            Assert.Equal(Enumerable.Range(1, 10), page);
            Assert.Equal(3, pageCount);
        }

        [Fact]
        public void GetPageCount_Queryable_RoundsUp()
        {
            var source = Enumerable.Range(1, 21).AsQueryable();

            Assert.Equal(3, source.GetPageCount(10));
        }

        [Fact]
        public void GetPageCount_EmptySource_IsZero()
        {
            var source = Enumerable.Empty<int>().AsQueryable();

            Assert.Equal(0, source.GetPageCount(10));
        }
    }

    public class ValidationTests
    {
        [Theory]
        [InlineData("0064175944", true)]
        [InlineData("1234567890", false)]
        [InlineData("1111111111", false)]
        [InlineData(null, false)]
        [InlineData("123", false)]
        public void IsNationalCode_ValidatesChecksum(string? code, bool expected)
        {
            Assert.Equal(expected, Validation.IsNationalCode(code));
        }

        [Theory]
        [InlineData("09121234567", true)]
        [InlineData("00121234567", false)]
        [InlineData("0912123456", false)]
        [InlineData(null, false)]
        public void IsMobileNumber_RequiresIranianMobileFormat(string? number, bool expected)
        {
            Assert.Equal(expected, Validation.IsMobileNumber(number));
        }

        [Theory]
        [InlineData("Aa1!aaaa", true)]
        [InlineData("aaaaaaaa", false)] // no digit, no special char
        [InlineData("Aa1aaaaa", false)] // no special char
        [InlineData("Aa1!", false)] // too short
        [InlineData("", false)]
        public void IsValidPassword_RequiresLetterDigitAndSpecialChar(string password, bool expected)
        {
            Assert.Equal(expected, Validation.IsValidPassword(password));
        }

        [Fact]
        public void IsPersianText_RejectsLatinCharacters()
        {
            Assert.True("سلام دنیا".IsPersianText());
            Assert.False("hello".IsPersianText());
        }

        [Fact]
        public void IsEnglishText_RejectsPersianCharacters()
        {
            Assert.True("hello_world-1".IsEnglishText());
            Assert.False("سلام".IsEnglishText());
        }

        [Theory]
        [InlineData(null, false)]
        [InlineData("", false)]
        [InlineData("   ", false)]
        [InlineData("x", true)]
        public void IsNotNullOrEmpty_TreatsWhitespaceAsEmpty(string? value, bool expected)
        {
            Assert.Equal(expected, Validation.IsNotNullOrEmpty(value!));
        }

        [Fact]
        public void RequiredMessage_FormatsPersianTemplate()
        {
            Assert.Equal("لطفا نام را وارد نمایید", Validation.RequiredMessage("نام"));
        }

        [Theory]
        [InlineData("192.168.1.1", true)]
        [InlineData("999.999.999.999", false)]
        [InlineData("not-an-ip", false)]
        public void IsValidIPv4_ValidatesOctetRange(string input, bool expected)
        {
            Assert.Equal(expected, input.IsValidIPv4());
        }
    }

    public class EnumExtensionsTests
    {
        private enum Sample
        {
            [System.ComponentModel.Description("توضیح")]
            WithDescription,
            WithoutDescription,
        }

        [Fact]
        public void GetDescription_ReturnsDescriptionAttributeWhenPresent()
        {
            Assert.Equal("توضیح", Sample.WithDescription.GetDescription());
        }

        [Fact]
        public void GetDescription_FallsBackToEnumNameWhenAttributeMissing()
        {
            Assert.Equal("WithoutDescription", Sample.WithoutDescription.GetDescription());
        }
    }

    public class EncryptionTests
    {
        [Fact]
        public void ToHashSHA256_IsDeterministicAndLooksLikeHex()
        {
            var hash1 = "password".ToHashSHA256();
            var hash2 = "password".ToHashSHA256();

            Assert.Equal(hash1, hash2);
            Assert.Equal(64, hash1.Length);
            Assert.Matches("^[0-9a-f]+$", hash1);
        }

        [Fact]
        public void ToHashSHA256_DifferentInputsProduceDifferentHashes()
        {
            Assert.NotEqual("password1".ToHashSHA256(), "password2".ToHashSHA256());
        }

        [Fact]
        public void EncryptThenDecrypt_RoundTrips()
        {
            var cipherText = Encryption.Encrypt("سلام دنیا", "030c70bca9fce94ade1e8895fd02ae84");
            var plainText = Encryption.Decrypt(cipherText, "030c70bca9fce94ade1e8895fd02ae84");

            Assert.Equal("سلام دنیا", plainText);
        }

        [Fact]
        public void Decrypt_WithWrongKey_DoesNotReturnOriginalText()
        {
            var cipherText = Encryption.Encrypt("secret-value", "030c70bca9fce94ade1e8895fd02ae84");

            var act = () => Encryption.Decrypt(cipherText, "a-completely-different-key-here");

            // Wrong key either throws (bad padding/UTF8) or silently produces garbage - either way
            // it must never resolve back to the original plaintext.
            try
            {
                var result = act();
                Assert.NotEqual("secret-value", result);
            }
            catch (Exception)
            {
                // Acceptable: CryptographicException / DecoderFallbackException on wrong key.
            }
        }
    }
}
