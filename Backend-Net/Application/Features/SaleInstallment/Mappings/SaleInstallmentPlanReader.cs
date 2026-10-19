using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Installments;
using Application.Common.Settings;
using Application.Features.SaleInstallment.Dtos;
using Common.Exceptions;
using Common.Extensions;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.SaleInstallment.Mappings
{
    /// <summary>
    /// یک تعریف واحد از «سند کامل یک قرارداد اقساطی». هم کوئری جزئیات و هم همه‌ی commandهای
    /// نوشتن از آن استفاده می‌کنند، تا پاسخ یک write دقیقاً همان شکلی باشد که یک read می‌دهد -
    /// درسی که در دامنه‌ی مرجوعی‌ها گرفته شد (پاسخ ناقص یک write، فرانت را می‌شکند).
    /// </summary>
    public static class SaleInstallmentPlanReader
    {
        public static async Task<SaleInstallmentPlanDto> ReadAsync(IWMSDbContext context, int planId, CancellationToken cancellationToken)
        {
            var plan = await context.SaleInstallmentPlans.AsNoTracking()
                .Include(x => x.Installments)
                .Include(x => x.Sale).ThenInclude(x => x.Customer)
                .FirstOrDefaultAsync(x => x.Id == planId, cancellationToken)
                ?? throw new NotFoundCustomException("قرارداد اقساطی مورد نظر یافت نشد.");

            var graceDays = await SystemSettingValues.GetIntegerAsync(context, SystemSettingCatalog.InstallmentOverdueGraceDays, cancellationToken);
            var today = DateTime.Now;

            var paymentDetails = await context.PaymentDetails.AsNoTracking()
                .Where(x => x.SaleId == plan.SaleId)
                .OrderBy(x => x.PaidAt)
                .Select(x => new PaymentDetailDto
                {
                    Id = x.Id,
                    Type = x.Type,
                    Purpose = x.Purpose,
                    Amount = x.Amount,
                    PaidAt = x.PaidAt,
                    CheckNumber = x.CheckNumber,
                    CheckDueDate = x.CheckDueDate,
                    CheckBankName = x.CheckBankName,
                    CheckDrawerName = x.CheckDrawerName,
                    CheckStatus = x.CheckStatus,
                    CheckStatusChangedAt = x.CheckStatusChangedAt,
                    CheckStatusNote = x.CheckStatusNote,
                    EndorsedFromPaymentDetailId = x.EndorsedFromPaymentDetailId,
                    TransferRef = x.TransferRef,
                    BankAccountId = x.BankAccountId,
                    BankAccountTitle = x.BankAccount != null ? x.BankAccount.Title : null,
                    PosTerminalId = x.PosTerminalId,
                    MaskedCardNumber = x.MaskedCardNumber,
                    ApprovalCode = x.ApprovalCode,
                    TraceNumber = x.TraceNumber,
                    Source = x.Source,
                    RecordedAt = x.RecordedAt,
                    RecordedByUserId = x.RecordedByUserId,
                    RecordedByName = x.RecordedByUser != null ? x.RecordedByUser.FirstName + " " + x.RecordedByUser.LastName : null,
                })
                .ToListAsync(cancellationToken);

            return new SaleInstallmentPlanDto
            {
                Id = plan.Id,
                SaleId = plan.SaleId,
                InvoiceNumber = plan.Sale.InvoiceNumber,
                CustomerId = plan.Sale.CustomerId,
                CustomerName = plan.Sale.Customer.FirstName + " " + plan.Sale.Customer.LastName,
                CashAmount = plan.CashAmount,
                MarkupPercentage = plan.MarkupPercentage,
                InstallmentChargeAmount = plan.InstallmentChargeAmount,
                TotalAmount = plan.TotalAmount,
                DownPaymentAmount = plan.DownPaymentAmount,
                FinancedAmount = plan.FinancedAmount,
                InstallmentCount = plan.InstallmentCount,
                InstallmentAmount = plan.InstallmentAmount,
                FirstDueDate = plan.FirstDueDate,
                LatePenaltyPercentage = plan.LatePenaltyPercentage,
                Status = plan.Status,
                StatusTitle = plan.Status.GetDescription(),
                // roll-upهای پلن در حافظه‌اند و Installments بالا Include شده است.
                PaidInstallmentCount = plan.PaidInstallmentCount,
                RemainingInstallmentCount = plan.RemainingInstallmentCount,
                PaidInstallmentsAmount = plan.PaidInstallmentsAmount,
                PaidAmount = plan.PaidAmount,
                RemainingAmount = plan.RemainingAmount,
                PenaltyPaidAmount = plan.PenaltyPaidAmount,
                PenaltyDueAmount = plan.Status == Domain.Enums.SaleInstallmentPlanStatusEnum.ACTIVE
                    ? plan.Installments.Where(InstallmentRules.IsUnpaid).Aggregate(0UL, (sum, i) => sum + InstallmentRules.PenaltyDue(plan, i, today, graceDays))
                    : 0UL,
                EarlySettlementDiscountAmount = plan.EarlySettlementDiscountAmount,
                ReturnCreditAmount = plan.ReturnCreditAmount,
                LastPaymentDate = plan.LastPaymentDate,
                NextDueDate = plan.NextDueDate,
                CreatedAt = plan.CreatedAt,
                Installments = plan.Installments.OrderBy(i => i.Number).Select(i => new SaleInstallmentDto
                {
                    Id = i.Id,
                    Number = i.Number,
                    DueDate = i.DueDate,
                    Amount = i.Amount,
                    Status = i.Status,
                    StatusTitle = i.Status.GetDescription(),
                    PaidAt = i.PaidAt,
                    PaymentType = i.PaymentType,
                    PaymentDetailId = i.PaymentDetailId,
                    PenaltyAmount = i.PenaltyAmount,
                    DaysLate = InstallmentRules.IsUnpaid(i) ? InstallmentRules.DaysLate(i.DueDate, today, graceDays) : 0,
                    PenaltyDue = InstallmentRules.IsUnpaid(i) ? InstallmentRules.PenaltyDue(plan, i, today, graceDays) : 0,
                    PenaltyWaivedAmount = i.PenaltyWaivedAmount,
                    PenaltyWaiveReason = i.PenaltyWaiveReason,
                    EarlySettlementDiscountAmount = i.EarlySettlementDiscountAmount,
                }).ToList(),
                PaymentDetails = paymentDetails,
            };
        }
    }
}
