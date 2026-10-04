using Newtonsoft.Json.Linq;
using WMS.Logging;

namespace WMS.Tests.Unit
{
    public class LogRedactorTests
    {
        private static readonly LogRedactor Keyed = new("test-key");

        private static JObject Redact(LogRedactor redactor, string json) => (JObject)redactor.Redact(JObject.Parse(json));

        [Theory]
        [InlineData("password")]
        [InlineData("Password")]
        [InlineData("oldPassword")]
        [InlineData("newPassword")]
        [InlineData("rePassword")]
        [InlineData("accessToken")]
        [InlineData("refreshToken")]
        [InlineData("appKey")]
        [InlineData("address")]
        [InlineData("postalCode")]
        [InlineData("vehiclePlate")]
        public void SecretsAndUnneededPersonalData_AreRemoved(string field)
        {
            var result = Redact(Keyed, $"{{\"{field}\": \"value-123\"}}");

            Assert.Equal(LogRedactor.RemovedValue, (string?)result[field]);
        }

        [Theory]
        [InlineData("nationalId")]
        [InlineData("economicCode")]
        [InlineData("phoneNumber")]
        [InlineData("driverPhoneNumber")]
        [InlineData("partyPhoneNumber")]
        [InlineData("mobile")]
        public void CorrelationIdentifiers_AreKeyedHashes(string field)
        {
            var result = Redact(Keyed, $"{{\"{field}\": \"0012345678\"}}");

            var hashed = (string?)result[field];
            Assert.StartsWith("hmac:", hashed);
            Assert.DoesNotContain("0012345678", hashed);
        }

        [Fact]
        public void SameValue_SameHash_SoLogsCanBeSearched()
        {
            var a = (string?)Redact(Keyed, "{\"nationalId\": \"0012345678\"}")["nationalId"];
            var b = (string?)Redact(Keyed, "{\"NationalId\": \" 0012345678 \"}")["NationalId"];
            var other = (string?)Redact(new LogRedactor("another-key"), "{\"nationalId\": \"0012345678\"}")["nationalId"];

            Assert.Equal(a, b);
            Assert.NotEqual(a, other);
        }

        [Fact]
        public void WithoutAHashKey_HashedFieldsAreRemovedInstead()
        {
            var result = Redact(new LogRedactor(""), "{\"nationalId\": \"0012345678\"}");

            Assert.Equal(LogRedactor.RemovedValue, (string?)result["nationalId"]);
        }

        [Fact]
        public void NestedObjectsAndArrays_AreCovered_AndOrdinaryFieldsKept()
        {
            var result = Redact(Keyed, "{\"firstName\": \"علی\", \"sale\": {\"items\": [{\"driverPhoneNumber\": \"09121234567\", \"quantity\": 2}]}, \"user\": {\"password\": \"x\"}}");

            Assert.Equal("علی", (string?)result["firstName"]);
            Assert.StartsWith("hmac:", (string?)result["sale"]!["items"]![0]!["driverPhoneNumber"]);
            Assert.Equal(2, (int)result["sale"]!["items"]![0]!["quantity"]!);
            Assert.Equal(LogRedactor.RemovedValue, (string?)result["user"]!["password"]);
        }

        [Fact]
        public void LongStrings_SuchAsFileContent_AreCut()
        {
            var blob = new string('A', 10_000);

            var logged = (string?)Redact(Keyed, $"{{\"content\": \"{blob}\"}}")["content"];

            Assert.True(logged!.Length < 200);
        }

        [Fact]
        public void QueryStringValues_FollowTheSameRules()
        {
            Assert.Equal(LogRedactor.RemovedValue, Keyed.RedactField("refreshToken", "abc"));
            Assert.StartsWith("hmac:", Keyed.RedactField("nationalId", "0012345678"));
            Assert.Equal("12", Keyed.RedactField("page", "12"));
        }
    }
}
