using Application.Common.Contracts.Context;
using Application.Common.Contracts.UnitOfWork;
using Common.Exceptions;
using Common.Extensions;
using FluentValidation;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Warehousing.Commands
{
    /// <summary>The fields a warehouse is created and edited with.</summary>
    public abstract class WarehouseInput
    {
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Address { get; set; }
        public string? Description { get; set; }

        /// <summary>Make this the default warehouse (the one used while multi-warehouse is off, and for any arrival that names none).</summary>
        public bool IsDefault { get; set; }

        internal void ApplyTo(Domain.Entities.Warehouse warehouse)
        {
            warehouse.Code = Code.Trim().ToUpperInvariant();
            warehouse.Name = Name.Trim();
            warehouse.Address = string.IsNullOrWhiteSpace(Address) ? null : Address.Trim();
            warehouse.Description = string.IsNullOrWhiteSpace(Description) ? null : Description.Trim();
        }
    }

    public class WarehouseInputValidator : AbstractValidator<WarehouseInput>
    {
        public WarehouseInputValidator()
        {
            RuleFor(x => x.Code).Must(c => !string.IsNullOrWhiteSpace(c)).WithMessage(Validation.RequiredMessage("کد انبار"));
            RuleFor(x => x.Code).MaximumLength(30).WithMessage("کد انبار حداکثر ۳۰ نویسه است.");
            RuleFor(x => x.Name).Must(n => !string.IsNullOrWhiteSpace(n)).WithMessage(Validation.RequiredMessage("نام انبار"));
            RuleFor(x => x.Name).MaximumLength(100).WithMessage("نام انبار حداکثر ۱۰۰ نویسه است.");
            RuleFor(x => x.Address).MaximumLength(500).WithMessage("نشانی حداکثر ۵۰۰ نویسه است.");
            RuleFor(x => x.Description).MaximumLength(500).WithMessage("توضیح حداکثر ۵۰۰ نویسه است.");
        }
    }

    internal static class WarehouseRules
    {
        public static async Task EnsureUniqueCodeAsync(IWMSDbContext context, string code, int? exceptId, CancellationToken cancellationToken)
        {
            var normalized = code.Trim().ToUpperInvariant();
            if (await context.Warehouses.AnyAsync(x => x.Code == normalized && x.Id != exceptId, cancellationToken))
                throw new ValidationCustomException($"انباری با کد «{normalized}» وجود دارد.");
        }

        /// <summary>
        /// There is exactly one default (a filtered unique index): the old default is cleared and saved before the new one is set,
        /// both inside the caller's transaction.
        /// </summary>
        public static async Task MoveDefaultAsync(IWMSDbContext context, IUnitOfWork unitOfWork, Domain.Entities.Warehouse warehouse, CancellationToken cancellationToken)
        {
            var current = await context.Warehouses.Where(x => x.IsDefault && x.Id != warehouse.Id).ToListAsync(cancellationToken);
            foreach (var other in current)
            {
                other.IsDefault = false;
                other.UpdatedAt = DateTime.Now;
            }
            await unitOfWork.SaveChangesAsync(cancellationToken);
            warehouse.IsDefault = true;
            await unitOfWork.SaveChangesAsync(cancellationToken);
        }
    }
}
