using Application.Common.Contracts.Context;
using Common.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace Application.Common.Payments
{
    /// <summary>The one existence check for a cash box / bank account named outside a payment row (POS terminals, transfers).</summary>
    public static class BankAccountChecks
    {
        public static async Task EnsureActiveAsync(IWMSDbContext context, int? bankAccountId, CancellationToken cancellationToken)
        {
            if (bankAccountId.HasValue && !await context.BankAccounts.AnyAsync(x => x.Id == bankAccountId && x.IsActive, cancellationToken))
                throw new ValidationCustomException("صندوق/حساب بانکی انتخاب‌شده یافت نشد یا غیرفعال است.");
        }
    }
}
