using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Payments;
using Application.Features.PartyAccount.Dtos;
using Common.Exceptions;
using Domain.Entities;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;

namespace Application.Features.PartyAccount.Queries
{
    /// <summary>
    /// The one projection of an on-account payment, used by the list, the detail and every party-payment write (each write
    /// answers with the payment as it now stands).
    /// </summary>
    public static class PartyPaymentReader
    {
        public static IQueryable<PaymentDetail> OnAccount(IWMSDbContext context) =>
            context.PaymentDetails.Where(x => x.CustomerId != null || x.SupplierId != null);

        public static readonly Expression<Func<PaymentDetail, PartyPaymentDto>> Projection = x => new PartyPaymentDto
        {
            Id = x.Id,
            CustomerId = x.CustomerId,
            SupplierId = x.SupplierId,
            PartyName = x.Customer != null ? x.Customer.FirstName + " " + x.Customer.LastName : x.Supplier!.CompanyName,
            Direction = x.Direction,
            Type = x.Type,
            Amount = x.Amount,
            AllocatedAmount = x.Allocations.Where(a => a.VoidedAt == null).Sum(a => (decimal)a.Amount),
            PaidAt = x.PaidAt,
            CheckNumber = x.CheckNumber,
            TransferRef = x.TransferRef,
            BankAccountId = x.BankAccountId,
            BankAccountTitle = x.BankAccount != null ? x.BankAccount.Title : null,
            PosTerminalId = x.PosTerminalId,
            Description = x.Description,
            VoidedAt = x.VoidedAt,
            RecordedAt = x.RecordedAt,
            RecordedByUserId = x.RecordedByUserId,
            RecordedByName = x.RecordedByUser != null ? x.RecordedByUser.FirstName + " " + x.RecordedByUser.LastName : null,
        };

        /// <summary>Fills what cannot be computed in SQL, after the rows are read.</summary>
        public static void Complete(PartyPaymentDto dto)
        {
            var natural = dto.CustomerId != null ? DocumentPayments.SaleDirection : DocumentPayments.PurchaseDirection;
            dto.UnallocatedAmount = dto.VoidedAt != null || dto.AllocatedAmount >= dto.Amount ? 0 : dto.Amount - dto.AllocatedAmount;
            dto.CanAllocate = dto.VoidedAt == null && dto.Direction == natural;
        }

        public static async Task<PartyPaymentDto> ReadAsync(IWMSDbContext context, int paymentDetailId, CancellationToken cancellationToken)
        {
            var dto = await OnAccount(context).AsNoTracking()
                .Where(x => x.Id == paymentDetailId)
                .Select(Projection)
                .FirstOrDefaultAsync(cancellationToken)
                ?? throw new NotFoundCustomException("دریافت/پرداخت علی‌الحساب مورد نظر یافت نشد.");
            Complete(dto);

            dto.Allocations = await context.PaymentAllocations.AsNoTracking()
                .Where(a => a.PaymentDetailId == paymentDetailId)
                .OrderBy(a => a.AllocatedAt).ThenBy(a => a.Id)
                .Select(a => new PaymentAllocationDto
                {
                    Id = a.Id,
                    PaymentDetailId = a.PaymentDetailId,
                    SaleId = a.SaleId,
                    PurchaseId = a.PurchaseId,
                    InvoiceNumber = a.Sale != null ? a.Sale.InvoiceNumber : a.Purchase!.InvoiceNumber,
                    Amount = a.Amount,
                    AllocatedAt = a.AllocatedAt,
                    AllocatedByUserId = a.AllocatedByUserId,
                    VoidedAt = a.VoidedAt,
                    PaymentType = a.PaymentDetail.Type,
                    PaymentPaidAt = a.PaymentDetail.PaidAt,
                    BankAccountTitle = a.PaymentDetail.BankAccount != null ? a.PaymentDetail.BankAccount.Title : null,
                })
                .ToListAsync(cancellationToken);

            return dto;
        }
    }
}
