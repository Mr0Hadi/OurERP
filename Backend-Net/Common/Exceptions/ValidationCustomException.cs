namespace Common.Exceptions
{
    public class ValidationCustomException : BaseCustomException
    {
        public ValidationCustomException(string error)
            : base(error, 400) // BadRequest
        {
        }

        public ValidationCustomException(string error, object data)
            : base(error, 400,data)
        {
        }
    }
}
