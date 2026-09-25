using System.Security.Cryptography;
using WMS.Idempotency;

namespace WMS.Middlewares
{
    /// <summary>
    /// Honours the <c>Idempotency-Key</c> header on writes (POST/PUT/PATCH/DELETE) from a signed-in user: the first request with a
    /// key runs normally and, when it succeeds, its response is kept; a repeat of the same request with the same key gets that
    /// response back (with <c>Idempotency-Replayed: true</c>) instead of running again - so a network retry cannot record a
    /// payment or a goods round twice. The key is scoped to the user, and a "same request" means the same method, path, query
    /// string and body.
    ///
    /// Answers: 409 while the first request with the key is still running; 422 when the key was already used for a different
    /// request. A request without the header is untouched.
    /// </summary>
    public class IdempotencyMiddleware
    {
        public const string HeaderName = "Idempotency-Key";
        public const string ReplayedHeaderName = "Idempotency-Replayed";
        public const int MaxKeyLength = 255;

        private readonly RequestDelegate _next;

        public IdempotencyMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context, IdempotencyStore store)
        {
            var key = context.Request.Headers[HeaderName].ToString().Trim();
            var userId = context.User.Identity?.IsAuthenticated == true ? context.User.FindFirst("Id")?.Value : null;

            if (key.Length == 0 || userId == null || !IsWrite(context.Request.Method))
            {
                await _next(context);
                return;
            }

            if (key.Length > MaxKeyLength)
            {
                await ResponseHandler.ResponseHandler.HandleExceptionAsync(context, StatusCodes.Status400BadRequest,
                    $"کلید {HeaderName} نباید بیشتر از {MaxKeyLength} نویسه باشد.", null);
                return;
            }

            var scopedKey = $"{userId}:{key}";
            var fingerprint = await FingerprintAsync(context.Request, context.RequestAborted);

            switch (store.Begin(scopedKey, fingerprint, out var stored))
            {
                case IdempotencyBeginResultEnum.REPLAY:
                    context.Response.StatusCode = stored!.StatusCode;
                    context.Response.ContentType = stored.ContentType;
                    context.Response.Headers[ReplayedHeaderName] = "true";
                    await context.Response.Body.WriteAsync(stored.Body, context.RequestAborted);
                    return;

                case IdempotencyBeginResultEnum.IN_PROGRESS:
                    await ResponseHandler.ResponseHandler.HandleExceptionAsync(context, StatusCodes.Status409Conflict,
                        "همین درخواست هنوز در حال انجام است؛ چند لحظه بعد دوباره تلاش کنید.", null);
                    return;

                case IdempotencyBeginResultEnum.KEY_REUSED:
                    await ResponseHandler.ResponseHandler.HandleExceptionAsync(context, StatusCodes.Status422UnprocessableEntity,
                        $"این {HeaderName} قبلاً برای درخواست دیگری به کار رفته است؛ برای هر درخواست تازه یک کلید تازه بفرستید.", null);
                    return;
            }

            // STARTED: run the request into a buffer so its response can be kept.
            var original = context.Response.Body;
            await using var buffer = new MemoryStream();
            context.Response.Body = buffer;
            try
            {
                await _next(context);
            }
            catch
            {
                // The exception middleware outside writes the error; nothing was saved, so a retry may run again.
                store.Abandon(scopedKey);
                throw;
            }
            finally
            {
                context.Response.Body = original;
            }

            var succeeded = context.Response.StatusCode is >= 200 and < 300;
            if (succeeded && buffer.Length <= IdempotencyStore.MaxStoredBodyBytes)
                store.Complete(scopedKey, fingerprint, new IdempotentResponse(context.Response.StatusCode, context.Response.ContentType, buffer.ToArray()));
            else
                store.Abandon(scopedKey);

            buffer.Position = 0;
            await buffer.CopyToAsync(original, context.RequestAborted);
        }

        private static bool IsWrite(string method) =>
            HttpMethods.IsPost(method) || HttpMethods.IsPut(method) || HttpMethods.IsPatch(method) || HttpMethods.IsDelete(method);

        private static async Task<string> FingerprintAsync(HttpRequest request, CancellationToken cancellationToken)
        {
            request.EnableBuffering();

            using var hash = IncrementalHash.CreateHash(HashAlgorithmName.SHA256);
            hash.AppendData(System.Text.Encoding.UTF8.GetBytes($"{request.Method} {request.Path}{request.QueryString}\n"));

            var chunk = new byte[16 * 1024];
            int read;
            while ((read = await request.Body.ReadAsync(chunk, cancellationToken)) > 0)
                hash.AppendData(chunk, 0, read);

            request.Body.Position = 0;
            return Convert.ToHexString(hash.GetHashAndReset());
        }
    }
}
