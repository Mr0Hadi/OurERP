namespace Common.Exceptions
{
    /// <summary>409: the document changed on the server after the client read it (frontend-requests 13.2).</summary>
    public class ConflictCustomException : BaseCustomException
    {
        public ConflictCustomException(string message, object? data = null)
            : base(message, 409, data)
        {
        }
    }
}
