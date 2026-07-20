namespace Common.Exceptions
{
    public class ServiceUnavailableCustomException: BaseCustomException
    {
        public ServiceUnavailableCustomException(string error)
            : base(error, 503)
        {
        }
    }
}
