using Application.Common.Contracts.Context;
using Application.Features.Cheque.Dtos;
using Common.Exceptions;
using Common.Extensions;
using Domain.Entities;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;

namespace Application.Features.Cheque.Queries
{
    /// <summary>The one projection of a cheque, used by the list and by every cheque command's answer.</summary>
    public static class ChequeReader
    {
        /// <summary>Every cheque with a lifecycle (CHECK rows with a status).</summary>
        public static IQueryable<PaymentDetail> Cheques(IWMSDbContext context) =>
            context.PaymentDetails.Where(x => x.Type == PaymentTypeEnum.CHECK && x.CheckStatus != null);

        public static Expression<Func<PaymentDetail, ChequeDto>> Projection(IWMSDbContext context) => x => new ChequeDto
        {
            Id = x.Id,
            Direction = x.Direction,
            Amount = x.Amount,
            CheckNumber = x.CheckNumber,
            CheckDueDate = x.CheckDueDate,
            CheckBankName = x.CheckBankName,
            CheckDrawerName = x.CheckDrawerName,
            Status = x.CheckStatus!.Value,
            StatusChangedAt = x.CheckStatusChangedAt,
            StatusNote = x.CheckStatusNote,
            VoidedAt = x.VoidedAt,
            PaidAt = x.PaidAt,
            Purpose = x.Purpose,
            IsCustomer = x.SaleId != null || x.CustomerId != null,
            PartyId = x.Sale != null ? x.Sale.CustomerId : x.Purchase != null ? x.Purchase.SupplierId : x.CustomerId ?? x.SupplierId,
            PartyName = x.Sale != null ? x.Sale.Customer.FirstName + " " + x.Sale.Customer.LastName
                : x.Purchase != null ? x.Purchase.Supplier.CompanyName
                : x.Customer != null ? x.Customer.FirstName + " " + x.Customer.LastName
                : x.Supplier != null ? x.Supplier.CompanyName : null,
            SaleId = x.SaleId,
            PurchaseId = x.PurchaseId,
            InvoiceNumber = x.Sale != null ? x.Sale.InvoiceNumber : x.Purchase != null ? x.Purchase.InvoiceNumber : null,
            IsOnAccount = x.SaleId == null && x.PurchaseId == null,
            BankAccountId = x.BankAccountId,
            BankAccountTitle = x.BankAccount != null ? x.BankAccount.Title : null,
            EndorsedFromPaymentDetailId = x.EndorsedFromPaymentDetailId,
            EndorsedToPaymentDetailId = context.PaymentDetails.Where(e => e.EndorsedFromPaymentDetailId == x.Id).Select(e => (int?)e.Id).FirstOrDefault(),
            Description = x.Description,
        };

        /// <summary>What cannot be computed in SQL, after the rows are read.</summary>
        public static void Complete(ChequeDto dto)
        {
            dto.StatusTitle = dto.Status.GetDescription();
            dto.DaysToDue = dto.CheckDueDate.HasValue ? (dto.CheckDueDate.Value.Date - DateTime.Today).Days : null;
        }

        public static async Task<ChequeDto> ReadAsync(IWMSDbContext context, int paymentDetailId, CancellationToken cancellationToken)
        {
            var dto = await Cheques(context).AsNoTracking()
                .Where(x => x.Id == paymentDetailId)
                .Select(Projection(context))
                .FirstOrDefaultAsync(cancellationToken)
                ?? throw new NotFoundCustomException("چک مورد نظر یافت نشد.");
            Complete(dto);
            return dto;
        }
    }
}
