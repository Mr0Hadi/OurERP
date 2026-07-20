using CommonUtilities.Extentions;
using Newtonsoft.Json.Linq;
using Serilog;
using System.Diagnostics;

namespace WMS.Middlewares
{
    public class RequestLoggingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly IConfiguration _configuration;

        public RequestLoggingMiddleware(RequestDelegate next, IConfiguration configuration)
        {
            _next = next;
            _configuration = configuration;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            var stopwatch = Stopwatch.StartNew();

            // Parse Request Body
            context.Request.EnableBuffering();
            context.Request.Body.Position = 0;
            using StreamReader reader = new(context.Request.Body, leaveOpen: false); // leaveOpen ensures that the stream remains open even after the StreamReader completes its operations and is disposed.
            var bodyAsString = await reader.ReadToEndAsync();
            context.Request.Body.Position = 0;

            var Queries = context.Request.Query.ToArray();
            var UserId = Convert.ToInt32(context.User.FindFirst("Id")?.Value);

            // Encrypt Password
            var Parameters = new JObject();
            JToken propertyValue;
            try
            {
                Parameters = JObject.Parse(bodyAsString);

                if (Parameters.TryGetValue("password", out propertyValue))
                {
                    var x = (string)propertyValue;
                    Parameters["password"] = Encryption.Encrypt(x, _configuration["symmetricKey"]);
                }
                if (Parameters.TryGetValue("appKey", out propertyValue))
                {
                    var x = (string)propertyValue;
                    Parameters["appKey"] = Encryption.Encrypt(x, _configuration["symmetricKey"]);
                }
                if (Parameters.TryGetValue("oldPassword", out propertyValue))
                {
                    var x = (string)propertyValue;
                    Parameters["oldPassword"] = Encryption.Encrypt(x, _configuration["symmetricKey"]);

                }
                if (Parameters.TryGetValue("rePassword", out propertyValue))
                {
                    var x = (string)propertyValue;
                    Parameters["rePassword"] = Encryption.Encrypt(x, _configuration["symmetricKey"]);
                }
            }
            catch
            {
                Parameters = JObject.Parse("{}");
            }

            // لاگ کردن اطلاعات اولیه درخواست
            Log.Information("Handling request from IP \"{IP}\": {UserId} {Method} {Path} {queries} {@Parameters}", context.Connection.RemoteIpAddress, UserId, context.Request.Method, context.Request.Path, Queries, Parameters.ToString().Replace("\n", "").Replace("\r", ""));

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
    }
}
