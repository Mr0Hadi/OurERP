using Application.Common.Audit;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Treasury.Dtos;
using Common.Exceptions;
using Common.Extensions;
using Domain.Entities;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Treasury.Commands
{
    /// <summary>The fields a cash box / bank account is created and edited with.</summary>
    public abstract class BankAccountInput
    {
        public string Title { get; set; } = string.Empty;
        public BankAccountKindEnum Kind { get; set; }
        public string? BankName { get; set; }
        public string? AccountNumber { get; set; }
        public string? CardNumber { get; set; }

        /// <summary>Sheba: "IR" + 24 digits (spaces ignored).</summary>
        public string? Iban { get; set; }

        /// <summary>What the account held when it was set up here. Money; 0 when omitted.</summary>
        public UInt64 OpeningBalance { get; set; }

        /// <summary>Today when omitted.</summary>
        public DateTime? OpeningDate { get; set; }
        public string? Description { get; set; }

        internal void ApplyTo(BankAccount account)
        {
            account.Title = Title.Trim();
            account.Kind = Kind;
            account.BankName = Kind == BankAccountKindEnum.BANK ? Blank(BankName) : null;
            account.AccountNumber = Kind == BankAccountKindEnum.BANK ? Blank(AccountNumber) : null;
            account.CardNumber = Kind == BankAccountKindEnum.BANK ? Blank(CardNumber) : null;
            account.Iban = Kind == BankAccountKindEnum.BANK ? NormalizeIban(Iban) : null;
            account.OpeningBalance = OpeningBalance;
            account.OpeningDate = (OpeningDate ?? DateTime.Now).Date;
            account.Description = Blank(Description);
        }

        internal static string? NormalizeIban(string? iban) =>
            string.IsNullOrWhiteSpace(iban) ? null : new string(iban.Where(c => !char.IsWhiteSpace(c)).ToArray()).ToUpperInvariant();

        private static string? Blank(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    public class BankAccountInputValidator : AbstractValidator<BankAccountInput>
    {
        public BankAccountInputValidator()
        {
            RuleFor(x => x.Title).Must(t => !string.IsNullOrWhiteSpace(t)).WithMessage(Validation.RequiredMessage("عنوان"));
            RuleFor(x => x.Title).MaximumLength(100).WithMessage("عنوان حداکثر ۱۰۰ نویسه است.");
            RuleFor(x => x.Kind).IsInEnum().WithMessage("نوع حساب نامعتبر است.");
            RuleFor(x => x.BankName).MaximumLength(100).WithMessage("نام بانک حداکثر ۱۰۰ نویسه است.");
            RuleFor(x => x.AccountNumber).MaximumLength(50).WithMessage("شماره حساب حداکثر ۵۰ نویسه است.");
            RuleFor(x => x.CardNumber).MaximumLength(32).WithMessage("شماره کارت حداکثر ۳۲ نویسه است.");
            RuleFor(x => BankAccountInput.NormalizeIban(x.Iban))
                .Matches("^IR[0-9]{24}$").When(x => !string.IsNullOrWhiteSpace(x.Iban))
                .WithMessage("شماره شبا باید IR و ۲۴ رقم باشد.");
            RuleFor(x => x.Description).MaximumLength(500).WithMessage("توضیح حداکثر ۵۰۰ نویسه است.");
        }
    }

    internal static class BankAccountTitles
    {
        /// <summary>Two active accounts with the same title would be impossible to tell apart in a picker.</summary>
        public static async Task EnsureUniqueAsync(IWMSDbContext context, string title, int? exceptId, CancellationToken cancellationToken)
        {
            var trimmed = title.Trim();
            if (await context.BankAccounts.AnyAsync(x => x.IsActive && x.Title == trimmed && x.Id != exceptId, cancellationToken))
                throw new ValidationCustomException($"صندوق/حساب فعالی با عنوان «{trimmed}» وجود دارد.");
        }
    }
}
