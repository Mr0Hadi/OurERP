using System.Security.Cryptography;
using System.Text;
using Newtonsoft.Json.Linq;

namespace WMS.Logging
{
    /// <summary>
    /// Decides what of a request may reach the log files, following the OWASP Logging Cheat Sheet:
    /// <list type="bullet">
    /// <item>Secrets (passwords, tokens, keys) are never logged in any form - not even encrypted.</item>
    /// <item>Personal data that is only needed to correlate requests (national id, economic code,
    /// phone numbers) is replaced by a keyed hash: the same value always gives the same hash, so a
    /// support person can hash a customer's national id with the same key and search the logs for
    /// it, but the logs alone do not reveal it. A plain SHA-256 would not do - a national id has only
    /// ten digits, so every possible hash can be computed in seconds; the secret key is what stops that.</item>
    /// <item>Personal data with no troubleshooting value (address, postal code, vehicle plate) is removed.</item>
    /// <item>Very long strings (base64 file content and the like) are cut, never logged whole.</item>
    /// </list>
    /// Field names are matched case-insensitively at any depth, so nested objects and arrays are covered.
    /// </summary>
    public sealed class LogRedactor
    {
        public const string RemovedValue = "***";
        public const int MaxLoggedStringLength = 512;

        // Matched against the lower-cased field name with Contains, so "newPassword",
        // "driverPhoneNumber" and "customerNationalId" are all caught without listing every variant.
        private static readonly string[] RemovedNameParts =
        {
            "password", "token", "secret", "apikey", "appkey", "accesskey", "authorization",
            "address", "postalcode", "vehicleplate",
        };

        private static readonly string[] HashedNameParts =
        {
            "nationalid", "nationalcode", "economiccode", "phone", "mobile",
        };

        private readonly byte[]? _hashKey;

        /// <param name="hashKey">
        /// Secret for the keyed hash (LogRedaction:HashKey). When blank, fields that would be hashed
        /// are removed instead - an unkeyed hash of a ten-digit number protects nothing.
        /// </param>
        public LogRedactor(string? hashKey)
        {
            _hashKey = string.IsNullOrWhiteSpace(hashKey) ? null : Encoding.UTF8.GetBytes(hashKey);
        }

        public JToken Redact(JToken token)
        {
            switch (token)
            {
                case JObject obj:
                    foreach (var property in obj.Properties().ToList())
                        property.Value = RedactField(property.Name, property.Value);
                    return obj;

                case JArray array:
                    for (var i = 0; i < array.Count; i++)
                        array[i] = Redact(array[i]);
                    return array;

                case JValue value when value.Type == JTokenType.String:
                    return new JValue(Truncate((string?)value.Value));

                default:
                    return token;
            }
        }

        /// <summary>The value to log for one named field (body property or query-string key).</summary>
        public JToken RedactField(string name, JToken value)
        {
            var lowered = name.ToLowerInvariant();

            if (value.Type == JTokenType.Null)
                return value;

            if (RemovedNameParts.Any(lowered.Contains))
                return new JValue(RemovedValue);

            if (HashedNameParts.Any(lowered.Contains))
                return value is JValue scalar ? new JValue(Hash(scalar.ToString())) : new JValue(RemovedValue);

            return Redact(value);
        }

        public string RedactField(string name, string value) => RedactField(name, new JValue(value)).ToString();

        private string Hash(string value)
        {
            var normalized = value.Trim();
            if (normalized.Length == 0)
                return normalized;

            if (_hashKey == null)
                return RemovedValue;

            using var hmac = new HMACSHA256(_hashKey);
            var digest = hmac.ComputeHash(Encoding.UTF8.GetBytes(normalized));

            // 16 hex characters (64 bits) is plenty to tell values apart in a log search.
            return "hmac:" + Convert.ToHexString(digest, 0, 8).ToLowerInvariant();
        }

        private static string? Truncate(string? value)
        {
            if (value == null || value.Length <= MaxLoggedStringLength)
                return value;

            return $"{value[..64]}…[{value.Length} نویسه، کوتاه شد]";
        }
    }
}
