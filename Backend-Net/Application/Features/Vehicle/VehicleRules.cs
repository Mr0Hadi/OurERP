using System.Text.RegularExpressions;
using Application.Common.Contracts.Context;
using Application.Common.DataTransfer;
using Common.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Vehicle
{
    /// <summary>The checks every vehicle write shares: one spelling of a name, no duplicates, and only live vehicles linked.</summary>
    public static class VehicleRules
    {
        public const int NameMaxLength = 100;

        private static readonly Regex Whitespace = new(@"\s+", RegexOptions.Compiled);

        /// <summary>Trimmed, single-spaced, with Persian Yeh/Kaf - "پرايد  ۱۱۱" and "پراید ۱۱۱" are one vehicle.</summary>
        public static string NormalizeName(string? name)
            => Whitespace.Replace(DataValues.NormalizeText(name) ?? string.Empty, " ");

        /// <summary>Throws when another live vehicle already has this (normalized) name. The column's collation ignores case.</summary>
        public static async Task EnsureNameIsFreeAsync(IWMSDbContext context, string name, int? exceptId, CancellationToken cancellationToken)
        {
            var taken = await context.Vehicles.AnyAsync(v => v.IsActive && v.Name == name && v.Id != (exceptId ?? 0), cancellationToken);
            if (taken)
                throw new ValidationCustomException($"خودرویی با نام «{name}» از قبل وجود دارد.");
        }

        /// <summary>
        /// The distinct ids of a product's vehicles, every one of them live. An unknown or deleted id is an error rather
        /// than silently dropped: dropping the only id would turn a vehicle-specific product into an all-vehicles one.
        /// </summary>
        public static async Task<List<int>> ResolveVehicleIdsAsync(IWMSDbContext context, IEnumerable<int>? vehicleIds, CancellationToken cancellationToken)
        {
            var ids = (vehicleIds ?? Enumerable.Empty<int>()).Distinct().ToList();
            if (ids.Count == 0)
                return ids;

            var found = await context.Vehicles.Where(v => v.IsActive && ids.Contains(v.Id)).Select(v => v.Id).ToListAsync(cancellationToken);
            if (found.Count != ids.Count)
                throw new ValidationCustomException("یک یا چند خودروی انتخاب‌شده وجود ندارد یا حذف شده است.");

            return ids;
        }
    }
}
