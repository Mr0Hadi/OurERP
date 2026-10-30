using System.Text.Json;
using System.Text.Json.Serialization;

namespace WMS.Serialization
{
    /// <summary>
    /// The server keeps every time in local time (DateTime.Now everywhere). A request body time carrying "Z" used to be
    /// stored as its UTC clock reading, so a payment entered at 01:00 local landed on the previous day
    /// (frontend-requests 9.6). Incoming UTC times are converted to local time here, once, for every request body;
    /// an explicit offset is already converted by the reader, and a time with no zone is taken as local, as before.
    /// Writing is unchanged.
    /// </summary>
    public sealed class LocalDateTimeJsonConverter : JsonConverter<DateTime>
    {
        public override DateTime Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            var value = reader.GetDateTime();
            return value.Kind == DateTimeKind.Utc ? value.ToLocalTime() : value;
        }

        public override void Write(Utf8JsonWriter writer, DateTime value, JsonSerializerOptions options)
            => writer.WriteStringValue(value);
    }
}
