using System.Text.Json;
using Application.Common.Dtos;
using Microsoft.AspNetCore.Mvc;

namespace WMS.ResponseHandler;

public static class ResponseHandler
{
    public static Task HandleExceptionAsync(HttpContext context, int statusCode, string error, object? data)
    {
        context.Response.ContentType = "application/json";

        context.Response.StatusCode = statusCode;

        return context.Response.WriteAsync(Serialize(error, data));
    }

    /// <summary>
    /// The same error body as <see cref="HandleExceptionAsync"/>, but as an
    /// <see cref="IActionResult"/> for callers that MVC hands a synchronous signature - notably
    /// <c>ApiBehaviorOptions.InvalidModelStateResponseFactory</c>. Returning a result lets MVC
    /// write the response asynchronously instead of the factory blocking a request thread on it.
    /// </summary>
    public static IActionResult ExceptionResult(int statusCode, string error, object? data)
    {
        return new ContentResult
        {
            StatusCode = statusCode,
            ContentType = "application/json",
            Content = Serialize(error, data)
        };
    }

    private static string Serialize(string error, object? data)
    {
        return JsonSerializer.Serialize(ResponseDto.Danger(error, data));
    }
}