using Application.Common.Contracts.BankAccounts;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.Settings;
using Application.Common.Settings;
using Common.Exceptions;
using Domain.Entities;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services
{
    public class PaymentAccountResolver : IPaymentAccountResolver
    {
        private readonly IWMSDbContext _context;
        private readonly ISystemSettingService _systemSettingService;

        public PaymentAccountResolver(IWMSDbContext context, ISystemSettingService systemSettingService)
        {
            _context = context;
            _systemSettingService = systemSettingService;
        }

        public async Task ApplyAsync(IEnumerable<PaymentDetail> rows, CancellationToken cancellationToken)
        {
            var list = rows.ToList();
            if (list.Count == 0)
                return;

            var terminalIds = list.Where(x => x.BankAccountId == null && x.PosTerminalId != null).Select(x => x.PosTerminalId!.Value).Distinct().ToList();
            if (terminalIds.Count > 0)
            {
                var settlesInto = await _context.PosTerminals
                    .Where(x => terminalIds.Contains(x.Id) && x.BankAccountId != null)
                    .ToDictionaryAsync(x => x.Id, x => x.BankAccountId!.Value, cancellationToken);
                foreach (var row in list.Where(x => x.BankAccountId == null && x.PosTerminalId != null))
                    if (settlesInto.TryGetValue(row.PosTerminalId!.Value, out var accountId))
                        row.BankAccountId = accountId;
            }

            var accountIds = list.Where(x => x.BankAccountId != null).Select(x => x.BankAccountId!.Value).Distinct().ToList();
            if (accountIds.Count > 0)
            {
                var active = await _context.BankAccounts.CountAsync(x => accountIds.Contains(x.Id) && x.IsActive, cancellationToken);
                if (active != accountIds.Count)
                    throw new ValidationCustomException("صندوق/حساب بانکی انتخاب‌شده یافت نشد یا غیرفعال است.");
            }

            // A received cheque is in no account until it is deposited: its account is chosen when it is cashed (Check/CashCheck).
            if (list.Any(x => x.BankAccountId == null && x.Type != PaymentTypeEnum.CREDIT
                    && !(x.Type == PaymentTypeEnum.CHECK && x.Direction == PaymentDirectionEnum.IN))
                && await _systemSettingService.GetBooleanAsync(SystemSettingCatalog.PaymentRequireBankAccount, cancellationToken))
                throw new ValidationCustomException("صندوق یا حساب بانکی‌ای را که پول از آن دریافت یا پرداخت شده انتخاب کنید.");
        }
    }
}
