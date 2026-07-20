namespace Common.Exceptions
{
    public class ForbiddenCustomException : BaseCustomException
    {
        public ForbiddenCustomException(string message = "دسترسی غیرمجاز است.")
            : base(message, 403)
        {
        }
    }
}
