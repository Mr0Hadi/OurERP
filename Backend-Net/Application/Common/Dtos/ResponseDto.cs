using Application.Common.Enums;

namespace Application.Common.Dtos
{
    public class ResponseDto
    {
        public object? Data { get; set; }

        public string Message { get; set; } = null!;

        public string ResponseMessageType { get; set; } = null!;

        public static ResponseDto Success(string messages, object? data = null)
        {
            return new ResponseDto
            {
                Message = messages,
                ResponseMessageType = ResponseMessageTypeEnum.Success.ToString(),
                Data = data
            };
        }

        public static ResponseDto Warning(string messages)
        {
            return new ResponseDto
            {
                Message = messages,
                ResponseMessageType = ResponseMessageTypeEnum.Warning.ToString(),
                Data = null
            };
        }

        public static ResponseDto Danger(string messages)
        {
            return new ResponseDto
            {
                Message = messages,
                ResponseMessageType = ResponseMessageTypeEnum.Danger.ToString(),
                Data = null
            };
        }

        public static ResponseDto Warning(string messages, object? data = null)
        {
            return new ResponseDto
            {
                Message = messages,
                ResponseMessageType = ResponseMessageTypeEnum.Warning.ToString(),
                Data = data
            };
        }

        public static ResponseDto Danger(string messages,object? data = null)
        {
            return new ResponseDto
            {
                Message = messages,
                ResponseMessageType = ResponseMessageTypeEnum.Danger.ToString(),
                Data = data
            };
        }

    }
}
