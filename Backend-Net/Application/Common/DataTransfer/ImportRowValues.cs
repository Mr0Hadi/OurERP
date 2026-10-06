namespace Application.Common.DataTransfer
{
    /// <summary>
    /// One parsed row as a definition's Map sees it: typed values by column key, plus the resolved foreign-key ids.
    /// A column absent from the file, or a blank cell, reads as null.
    /// </summary>
    public sealed class ImportRowValues
    {
        private readonly IReadOnlyDictionary<string, object?> _values;
        private readonly IReadOnlyDictionary<string, int> _referenceIds;

        public ImportRowValues(int rowNumber, IReadOnlyDictionary<string, object?> values, IReadOnlyDictionary<string, int> referenceIds)
        {
            RowNumber = rowNumber;
            _values = values;
            _referenceIds = referenceIds;
        }

        public int RowNumber { get; }

        public bool Has(string key) => _values.TryGetValue(key, out var value) && value != null;

        public string? Text(string key) => _values.GetValueOrDefault(key) as string;

        public long? Integer(string key) => _values.GetValueOrDefault(key) as long?;

        public decimal? Decimal(string key) => _values.GetValueOrDefault(key) as decimal?;

        public bool? Boolean(string key) => _values.GetValueOrDefault(key) as bool?;

        public DateTime? Date(string key) => _values.GetValueOrDefault(key) as DateTime?;

        public TEnum? Enum<TEnum>(string key) where TEnum : struct, System.Enum
            => _values.GetValueOrDefault(key) is TEnum member ? member : null;

        /// <summary>The id a foreign-key column resolved to, or null when the cell was blank.</summary>
        public int? ReferenceId(string key) => _referenceIds.TryGetValue(key, out var id) ? id : null;

        /// <summary>
        /// An integer column narrowed to int. The column's MinValue/MaxValue must keep it in range; this throws if a
        /// definition forgot to, rather than silently wrapping.
        /// </summary>
        public int? Int32(string key) => Integer(key) is { } value ? checked((int)value) : null;
    }
}
