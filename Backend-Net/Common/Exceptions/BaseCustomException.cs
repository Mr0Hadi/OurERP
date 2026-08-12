namespace Common.Exceptions
{
    public abstract class BaseCustomException : Exception
    {
        public object Data { get; set; }
        public  string Error { get; }
        public int StatusCode { get; }

        protected BaseCustomException(string error, int statusCode)
        {
            Error = error;
            StatusCode = statusCode;
            Data = null;
        }

        protected BaseCustomException(string error, int statusCode,object data)
        {
            Error = error;
            StatusCode = statusCode;
            Data = data;
        }

    }
}
