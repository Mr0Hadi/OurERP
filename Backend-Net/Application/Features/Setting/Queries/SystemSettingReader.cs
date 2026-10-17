using Application.Common.Contracts.Context;
using Application.Common.Settings;
using Application.Features.Setting.Dtos;
using Common.Extensions;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Setting.Queries
{
    /// <summary>The whole catalogue with the values in force - what GetSystemSettings and UpdateSystemSettings answer with.</summary>
    public static class SystemSettingReader
    {
        public static async Task<List<SystemSettingGroupDto>> ReadAsync(IWMSDbContext context, CancellationToken cancellationToken)
        {
            var stored = await context.SystemSettings
                .AsNoTracking()
                .Select(x => new
                {
                    x.Key,
                    x.Value,
                    x.UpdatedAt,
                    x.UpdatedByUserId,
                    UpdatedByName = context.Users.Where(u => u.Id == x.UpdatedByUserId).Select(u => u.FirstName + " " + u.LastName).FirstOrDefault(),
                })
                .ToListAsync(cancellationToken);
            var byKey = stored.ToDictionary(x => x.Key, StringComparer.OrdinalIgnoreCase);

            return SystemSettingCatalog.All
                .GroupBy(x => x.Group)
                .OrderBy(g => g.Key)
                .Select(g => new SystemSettingGroupDto
                {
                    Group = g.Key,
                    GroupTitle = g.Key.GetDescription(),
                    Settings = g.Select(definition =>
                    {
                        byKey.TryGetValue(definition.Key, out var row);
                        // Same rule as SystemSettingService: a stored value outside the catalogue's limits reads as the default.
                        var value = row != null ? definition.Normalize(row.Value, out _) : null;
                        return new SystemSettingDto
                        {
                            Key = definition.Key,
                            Title = definition.Title,
                            Description = definition.Description,
                            Type = definition.Type,
                            Value = value ?? definition.DefaultValue,
                            DefaultValue = definition.DefaultValue,
                            IsDefault = value == null,
                            MinValue = definition.MinValue,
                            MaxValue = definition.MaxValue,
                            Unit = definition.Unit,
                            UpdatedAt = row?.UpdatedAt,
                            UpdatedByUserId = row?.UpdatedByUserId,
                            UpdatedByName = row?.UpdatedByName,
                        };
                    }).ToList(),
                })
                .ToList();
        }
    }
}
