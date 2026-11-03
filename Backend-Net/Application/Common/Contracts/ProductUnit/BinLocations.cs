namespace Application.Common.Contracts.ProductUnit
{
    /// <summary>The one normalisation of a shelf code, used where it is written and where it is searched.</summary>
    public static class BinLocations
    {
        public const int MaxLength = 50;

        /// <summary>
        /// Upper case, all whitespace removed, and leading zeros dropped from every all-digit "-" segment, so "a-05-2" and
        /// "A-5-2" are one shelf (frontend-requests 19); blank becomes null (no shelf). Applied on write and on search.
        /// </summary>
        public static string? Normalize(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
                return null;

            var compact = string.Concat(value.Where(c => !char.IsWhiteSpace(c))).ToUpperInvariant();
            return string.Join('-', compact.Split('-').Select(segment =>
                segment.Length > 0 && segment.All(char.IsAsciiDigit) ? segment.TrimStart('0') is { Length: > 0 } trimmed ? trimmed : "0" : segment));
        }
    }
}
