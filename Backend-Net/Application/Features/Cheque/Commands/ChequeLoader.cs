using Application.Common.Contracts.Context;
using Common.Exceptions;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Cheque.Commands
{
    internal static class ChequeLoader
    {
        /// <summary>A cheque whose fate is still open: a CHECK row, PENDING, not voided.</summary>
        public static async Task<Domain.Entities.PaymentDetail> PendingAsync(IWMSDbContext context, int id, CancellationToken cancellationToken)
        {
            var cheque = await context.PaymentDetails.FirstOrDefaultAsync(x => x.Id == id && x.Type == PaymentTypeEnum.CHECK, cancellationToken)
                ?? throw new NotFoundCustomException("چک مورد نظر یافت نشد.");
            if (cheque.VoidedAt != null || cheque.CheckStatus != PaymentCheckStatusEnum.PENDING)
                throw new ValidationCustomException("سرنوشت این چک قبلاً ثبت شده یا پرداختش ابطال شده است.");
            return cheque;
        }
    }
}
