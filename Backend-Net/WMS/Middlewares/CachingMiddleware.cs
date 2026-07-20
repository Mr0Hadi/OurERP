using Common.Exceptions;
using Microsoft.Extensions.Caching.Memory;

namespace WMS.Middlewares
{
	public class CachingMiddleware
	{
		private readonly RequestDelegate _next;
		private readonly IMemoryCache _memoryCache;

		public CachingMiddleware(RequestDelegate next, IMemoryCache memoryCache)
		{
			_next = next;
			_memoryCache = memoryCache;
		}

		public async Task InvokeAsync(HttpContext context)
		{
			if (!context.User.Identity.IsAuthenticated)
			{
				await _next(context);
				return;
			}

			var token = context.Request.Headers.Authorization.ToString().Replace("Bearer ", "");
			var userId = Convert.ToInt32(context.User.FindFirst("Id")?.Value);

			var cacheKey = $"UserTokens:{userId}";
			var userTokens = _memoryCache.GetOrCreate(cacheKey, entry => new HashSet<string>());

			if (userTokens.Contains(token))
			{
				await _next(context);
				return;
			}
			else
			{
				throw new UnauthorizedCustomException(message: "توکن معتبر نمیباشد");
			}
		}
	}
}
