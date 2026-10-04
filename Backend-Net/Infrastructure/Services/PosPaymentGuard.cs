using Application.Common.Contracts.Context;
using Application.Common.Contracts.Permissions;
using Application.Common.Contracts.Pos;
using Application.Common.Contracts.UserContextService;
using Application.Common.Payments;
using Common.Exceptions;
using Common.Extensions;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services
{
    public class PosPaymentGuard : IPosPaymentGuard
    {
        private readonly IWMSDbContext _context;
        private readonly IPermissionService _permissionService;
        private readonly IUserContextService _userContextService;

        public PosPaymentGuard(IWMSDbContext context, IPermissionService permissionService, IUserContextService userContextService)
        {
            _context = context;
            _permissionService = permissionService;
            _userContextService = userContextService;
        }

        public async Task CheckAsync(IEnumerable<IPosPaymentFields> rows, CancellationToken cancellationToken)
        {
            var posRows = rows.Where(x => x.PosTerminalId.HasValue).ToList();
            if (posRows.Count == 0)
                return;

            var userId = _userContextService.GetUserId().ToInt();
            if (!await _permissionService.HasPermissionAsync(userId, PermissionEnum.PosManualRecord, cancellationToken))
                throw new ForbiddenCustomException("ثبت پرداخت کارتخوان از روی رسید، دسترسی «ثبت دستی پرداخت کارتخوان» می‌خواهد.");

            var terminalIds = posRows.Select(x => x.PosTerminalId!.Value).Distinct().ToList();
            var activeCount = await _context.PosTerminals
                .CountAsync(x => terminalIds.Contains(x.Id) && x.IsActive, cancellationToken);

            if (activeCount != terminalIds.Count)
                throw new ValidationCustomException("دستگاه کارتخوان انتخاب‌شده یافت نشد یا غیرفعال است.");

            var keys = posRows.Select(x => (Terminal: x.PosTerminalId!.Value, Rrn: x.TransferRef!.Trim())).ToList();

            if (keys.Distinct().Count() != keys.Count)
                throw new ValidationCustomException("یک تراکنش کارتخوان دو بار در همین درخواست آمده است.");

            var rrns = keys.Select(x => x.Rrn).Distinct().ToList();
            var existing = await _context.PaymentDetails
                .Where(x => x.PosTerminalId != null && terminalIds.Contains(x.PosTerminalId.Value) && rrns.Contains(x.TransferRef!))
                .Select(x => new
                {
                    Terminal = x.PosTerminalId!.Value,
                    Rrn = x.TransferRef!,
                    Invoice = x.Sale != null ? x.Sale.InvoiceNumber : x.Purchase != null ? x.Purchase.InvoiceNumber : null,
                })
                .ToListAsync(cancellationToken);

            var clash = existing.FirstOrDefault(x => keys.Contains((x.Terminal, x.Rrn)));
            if (clash != null)
            {
                var where = string.IsNullOrWhiteSpace(clash.Invoice) ? "روی سند دیگری" : $"روی فاکتور {clash.Invoice}";
                throw new ValidationCustomException($"این تراکنش کارتخوان (شماره‌ی مرجع {clash.Rrn}) قبلاً {where} ثبت شده است.");
            }
        }
    }
}
