namespace Common.Exceptions
{
    public class TooManyRequestsCustomException : BaseCustomException
    {
        public TooManyRequestsCustomException(string message = "تعداد درخواست‌ها بیش از حد مجاز است. لطفاً کمی بعد دوباره تلاش کنید.", object? data = null)
            : base(message, 429, data)
        {
        }
    }
}
