using Common.Exceptions;

namespace WMS.Middlewares
{
    public class ExceptionHandlingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<RequestLoggingMiddleware> _logger;

        public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (BaseCustomException ex)
            {
                _logger.LogWarning(ex.Message, "Handled exception", "From IP \"{IP}\"", context.Connection.RemoteIpAddress);
                await ResponseHandler.ResponseHandler.HandleExceptionAsync(context, ex.StatusCode, ex.Error, ex.Data);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex.Message, "Unhandled exception on {Method} {Path}, From IP \"{IP}\"", context.Request.Method, context.Request.Path, context.Connection.RemoteIpAddress);
                await ResponseHandler.ResponseHandler.HandleExceptionAsync(context, 500, "خطای داخلی سرور رخ داد.", null);
            }
        }
	}
}
