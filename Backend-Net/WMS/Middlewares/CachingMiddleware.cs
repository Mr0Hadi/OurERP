using Application.Common.Contracts.Token;
using Common.Exceptions;
using Microsoft.AspNetCore.Authorization;

namespace WMS.Middlewares
{
	/// <summary>
	/// Accepts a signed-in request only when its token is the user's current session (see
	/// <see cref="IUserSessionService"/>): a token replaced by a newer login, or revoked by logout,
	/// a password change/reset or deactivation, is answered 401 even though it is still valid.
	/// </summary>
	public class CachingMiddleware
	{
		private readonly RequestDelegate _next;

		public CachingMiddleware(RequestDelegate next)
		{
			_next = next;
		}

		public async Task InvokeAsync(HttpContext context, IUserSessionService userSessionService)
		{
			// Anonymous actions (Login, RefreshToken) need no session - a client that still sends its
			// old token to RefreshToken after a restart must reach it, not be turned away here.
			if (context.User.Identity?.IsAuthenticated != true
				|| context.GetEndpoint()?.Metadata.GetMetadata<IAllowAnonymous>() != null)
			{
				await _next(context);
				return;
			}

			var token = context.Request.Headers.Authorization.ToString().Replace("Bearer ", "");
			var userId = Convert.ToInt32(context.User.FindFirst("Id")?.Value);

			if (userSessionService.IsCurrent(userId, token))
			{
				await _next(context);
				return;
			}

			throw new UnauthorizedCustomException(message: "توکن معتبر نمیباشد");
		}
	}
}
