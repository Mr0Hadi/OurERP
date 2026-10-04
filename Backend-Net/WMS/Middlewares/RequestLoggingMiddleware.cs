using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Serilog;
using System.Diagnostics;
using WMS.Logging;

namespace WMS.Middlewares
{
    public class RequestLoggingMiddleware
    {
        /// <summary>
        /// Bodies larger than this are not read into memory for the log at all; only their size is
        /// logged. A JSON request of this API is a few KB, so anything bigger is unusual anyway.
        /// </summary>
        public const int MaxLoggedBodyBytes = 32 * 1024;

        private readonly RequestDelegate _next;
        private readonly LogRedactor _redactor;

        public RequestLoggingMiddleware(RequestDelegate next, LogRedactor redactor)
        {
            _next = next;
            _redactor = redactor;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            var stopwatch = Stopwatch.StartNew();

            var parameters = await ReadLoggableBodyAsync(context.Request, context.RequestAborted);

            var queries = context.Request.Query
                .Select(x => new KeyValuePair<string, string>(x.Key, _redactor.RedactField(x.Key, x.Value.ToString())))
                .ToArray();
            var userId = Convert.ToInt32(context.User.FindFirst("Id")?.Value);

            // لاگ کردن اطلاعات اولیه درخواست
            Log.Information("Handling request from IP \"{IP}\": {UserId} {Method} {Path} {queries} {@Parameters}", context.Connection.RemoteIpAddress, userId, context.Request.Method, context.Request.Path, queries, parameters);

            await _next(context);  // عبور دادن به بقیه middleware ها

            stopwatch.Stop();

            // لاگ کردن پایان درخواست و مدت زمان پردازش
            Log.Information("Handled request from IP \"{IP}\": {Method} {Path} responded {StatusCode} in {ElapsedMilliseconds} ms",
                context.Connection.RemoteIpAddress,
                context.Request.Method,
                context.Request.Path,
                context.Response.StatusCode,
                stopwatch.ElapsedMilliseconds);
        }

        /// <summary>
        /// Only JSON bodies are logged, and only after redaction. File uploads (multipart) and any
        /// other binary content are never read - only their type and size go to the log.
        /// </summary>
        private async Task<string> ReadLoggableBodyAsync(HttpRequest request, CancellationToken cancellationToken)
        {
            if (request.ContentLength is null or 0 && !request.Headers.TransferEncoding.Any())
                return "{}";

            var contentType = request.ContentType ?? string.Empty;
            if (!contentType.Contains("json", StringComparison.OrdinalIgnoreCase))
                return $"[{(contentType.Length == 0 ? "بدون نوع" : contentType.Split(';')[0])}، {request.ContentLength?.ToString() ?? "?"} بایت - ثبت نشد]";

            if (request.ContentLength > MaxLoggedBodyBytes)
                return $"[{request.ContentLength} بایت - بزرگ‌تر از حد ثبت در لاگ]";

            request.EnableBuffering();
            request.Body.Position = 0;

            // Read at most one byte past the limit: enough to know a chunked body is too big
            // without ever holding all of it.
            var buffer = new byte[MaxLoggedBodyBytes + 1];
            var total = 0;
            int read;
            while (total < buffer.Length && (read = await request.Body.ReadAsync(buffer.AsMemory(total), cancellationToken)) > 0)
                total += read;

            request.Body.Position = 0;

            if (total > MaxLoggedBodyBytes)
                return "[بدنه بزرگ‌تر از حد ثبت در لاگ]";

            try
            {
                var json = JToken.Parse(System.Text.Encoding.UTF8.GetString(buffer, 0, total));
                return _redactor.Redact(json).ToString(Formatting.None);
            }
            catch (JsonReaderException)
            {
                return "[JSON نامعتبر - ثبت نشد]";
            }
        }
    }
}
