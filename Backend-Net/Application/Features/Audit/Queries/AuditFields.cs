using System.Text.Json;
using Application.Features.Audit.Dtos;

namespace Application.Features.Audit.Queries
{
    /// <summary>
    /// Turns a change's stored OldValues/NewValues JSON into one row per column. In memory, after the query: the JSON is
    /// opaque to SQL here, the same reason signed image URLs and enum titles are filled after ToPagedAsync.
    /// </summary>
    public static class AuditFields
    {
        public static List<AuditFieldChangeDto> From(string? oldValues, string? newValues)
        {
            var old = Parse(oldValues);
            var @new = Parse(newValues);

            // New-value order first (an insert's whole row, an update's changed columns), then anything only the old side has.
            var names = @new.Keys.Concat(old.Keys.Where(k => !@new.ContainsKey(k)));

            return names.Select(name => new AuditFieldChangeDto
            {
                Name = name,
                OldValue = old.TryGetValue(name, out var o) ? o : null,
                NewValue = @new.TryGetValue(name, out var n) ? n : null,
            }).ToList();
        }

        private static Dictionary<string, JsonElement> Parse(string? json)
        {
            if (string.IsNullOrEmpty(json))
                return new Dictionary<string, JsonElement>();

            using var document = JsonDocument.Parse(json);
            // Clone: the elements must outlive the document they were parsed from.
            return document.RootElement.EnumerateObject().ToDictionary(p => p.Name, p => p.Value.Clone());
        }
    }
}
