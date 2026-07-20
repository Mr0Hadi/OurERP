using System.Text.Json;
using Application.Common.Dtos;

namespace WMS.ResponseHandler;

public static class ResponseHandler
{
    public static Task HandleExceptionAsync(HttpContext context, int statusCode, string error, object? data)
    {
        context.Response.ContentType = "application/json";

        context.Response.StatusCode = statusCode;

        var response = ResponseDto.Danger(error, data);

        var json = JsonSerializer.Serialize(response);

        return context.Response.WriteAsync(json);
    }
}