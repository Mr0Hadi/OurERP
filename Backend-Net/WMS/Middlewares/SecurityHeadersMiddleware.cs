namespace WMS.Middlewares
{
    /// <summary>
    /// Response headers that tell the browser how to treat what this API sends back. Kept to the ones
    /// that cannot break the frontend:
    /// <list type="bullet">
    /// <item><c>X-Content-Type-Options: nosniff</c> - the browser trusts Content-Type instead of
    /// guessing. Matters because api/File/GetImage serves files users uploaded from this origin: a
    /// ".png" holding HTML must never be run as a page.</item>
    /// <item><c>X-Frame-Options: DENY</c> - nothing this API answers can be shown inside another
    /// site's iframe (clickjacking). The frontend prints PDFs from a blob URL of its own origin, which
    /// this header does not touch.</item>
    /// <item><c>Referrer-Policy: no-referrer</c> - URLs of this API (with ids in the query string)
    /// are not passed on to other sites.</item>
    /// </list>
    /// No Content-Security-Policy on purpose: the Scalar API reference is served from this host and
    /// needs its scripts, and a JSON API gains little from one. HSTS is added by UseHsts in Program.cs.
    /// </summary>
    public class SecurityHeadersMiddleware
    {
        private readonly RequestDelegate _next;

        public SecurityHeadersMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public Task InvokeAsync(HttpContext context)
        {
            var headers = context.Response.Headers;
            headers.XContentTypeOptions = "nosniff";
            headers.XFrameOptions = "DENY";
            headers["Referrer-Policy"] = "no-referrer";

            return _next(context);
        }
    }
}
