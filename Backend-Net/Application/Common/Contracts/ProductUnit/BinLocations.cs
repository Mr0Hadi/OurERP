namespace Application.Common.Contracts.ProductUnit
{
    /// <summary>The one normalisation of a shelf code, used where it is written and where it is searched.</summary>
    public static class BinLocations
    {
        public const int MaxLength = 50;

        /// <summary>Upper case, all whitespace removed; blank becomes null (no shelf).</summary>
        public static string? Normalize(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
                return null;

            return string.Concat(value.Where(c => !char.IsWhiteSpace(c))).ToUpperInvariant();
        }
    }
}
