using Application.Common.Dtos.Returns;
using Common.Exceptions;
using FluentValidation.Results;

namespace Application.Common.Returns
{
    /// <summary>Shared by both PreviewClaimResolutionQuery handlers: turns validator and handler refusals into the preview's errors.</summary>
    public static class ResolutionPreview
    {
        public static ResolutionPreviewDto Invalid(ValidationResult validation, ulong suggestedMoneyAmount) => new()
        {
            IsValid = false,
            SuggestedMoneyAmount = suggestedMoneyAmount,
            Errors = validation.Errors.Select(e => new ResolutionPreviewErrorDto { Field = FieldOf(e.PropertyName), Message = e.ErrorMessage }).ToList(),
        };

        public static ResolutionPreviewDto Invalid(ValidationCustomException refusal, ulong suggestedMoneyAmount) => new()
        {
            IsValid = false,
            SuggestedMoneyAmount = suggestedMoneyAmount,
            Errors = { new ResolutionPreviewErrorDto { Message = refusal.Error } },
        };

        /// <summary>"Composition.Goods[0].Quantity" -> "goods[0].quantity"; "ClaimId" -> "claimId"; empty -> null.</summary>
        public static string? FieldOf(string? propertyName)
        {
            if (string.IsNullOrWhiteSpace(propertyName))
                return null;

            var path = propertyName.StartsWith("Composition.", StringComparison.Ordinal) ? propertyName["Composition.".Length..] : propertyName;
            return string.Join('.', path.Split('.').Select(s => s.Length == 0 ? s : char.ToLowerInvariant(s[0]) + s[1..]));
        }

        public static ulong Suggested(int quantity, ulong unitPrice) => quantity <= 0 ? 0UL : checked((ulong)quantity * unitPrice);
    }
}
