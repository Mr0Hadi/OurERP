namespace Application.Common.Returns
{
    /// <summary>The optional reason a return was rejected or cancelled - one definition for both return sides.</summary>
    public static class ReturnStatusReason
    {
        public const int MaxLength = 500;

        public const string TooLongMessage = "دلیل نمی‌تواند بیشتر از ۵۰۰ نویسه باشد.";

        /// <summary>Trimmed, and null when nothing but whitespace was sent.</summary>
        public static string? Normalize(string? reason) =>
            string.IsNullOrWhiteSpace(reason) ? null : reason.Trim();
    }
}
