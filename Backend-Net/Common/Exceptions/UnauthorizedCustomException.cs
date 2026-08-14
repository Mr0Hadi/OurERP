namespace Common.Exceptions
{
    public class UnauthorizedCustomException : BaseCustomException
    {
        public UnauthorizedCustomException(string message = "احراز هویت انجام نشده است.")
            : base(message, 401)
        {
        }
    }
}
