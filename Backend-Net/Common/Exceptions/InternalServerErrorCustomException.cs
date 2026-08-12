namespace Common.Exceptions
{
	public class InternalServerErrorCustomException : BaseCustomException
	{
		public InternalServerErrorCustomException(string message = "خطای داخلی سرور رخ داد.") 
			: base(message, 500)
		{
		}

		public InternalServerErrorCustomException(object data, string message = "خطای داخلی سرور رخ داد.")
			: base(message, 500, data)
		{
		}
	}
}
