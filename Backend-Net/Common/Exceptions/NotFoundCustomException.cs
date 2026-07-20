namespace Common.Exceptions
{
    public class NotFoundCustomException : BaseCustomException
    {
        public NotFoundCustomException(string message = "داده مورد نظر یافت نشد.")
            : base(message, 404)
        {
        }
    }
}
