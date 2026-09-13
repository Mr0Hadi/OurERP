using Application.Common.Contracts.Context;
using Application.Common.Contracts.SaleReturn;
using Application.Common.Enums;
using Application.Common.Queries;
using Application.Features.SaleReturn.Dtos;
using Application.Features.SaleReturn.Mappings;
using Common.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.SaleReturn.Queries;

/// <summary>
/// Builds the one sale-return document shape - mirrors PurchaseReturnDetailReader. Returned by
/// GetSaleReturnDetailQuery and by every write command on a return, because the frontend drops a
/// write's response straight into its detail cache and reads <c>id</c>/<c>saleId</c> off it.
/// Always a fresh no-tracking read after SaveChanges, so it is exactly what the detail query returns.
/// </summary>
public static class SaleReturnDetailReader
{
    public static async Task<SaleReturnDetailDto> ReadAsync(
        IWMSDbContext context,
        ISaleReturnCalculationService calc,
        int saleReturnId,
        CancellationToken cancellationToken)
    {
        // PreviousReturn is Included rather than looked up separately: the FK and its navigation
        // already exist on the entity, so the extra round-trip bought nothing. It is deliberately
        // not filtered by IsActive - a soft-deleted earlier return still gets to name itself in the
        // chain, which is the behaviour the separate lookup had.
        var saleReturn = await context.SaleReturns
            .Where(x => x.Id == saleReturnId)
            .WhereNotDeleted()
            .WithReturnGraph()
            .Include(x => x.Sale!).ThenInclude(s => s.Customer)
            .Include(x => x.PreviousReturn)
            .AsNoTracking()
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new NotFoundCustomException("مرجوعی مورد نظر یافت نشد.");

        // checked, so a bad row fails loudly instead of wrapping into a plausible-looking huge number.
        var totalAmount = checked((ulong)saleReturn.Claims.Sum(c => checked((long)c.Quantity * (long)c.UnitPrice)));

        return new SaleReturnDetailDto
        {
            Id = saleReturn.Id,
            ReturnNumber = saleReturn.ReturnNumber,
            ReturnDate = saleReturn.ReturnDate,
            SaleId = saleReturn.SaleId,
            SaleInvoiceNumber = saleReturn.Sale!.InvoiceNumber,
            CustomerId = saleReturn.Sale.CustomerId,
            CustomerName = saleReturn.Sale.Customer.FirstName + " " + saleReturn.Sale.Customer.LastName,
            Description = saleReturn.Description,
            PreviousReturnId = saleReturn.PreviousReturnId,
            PreviousReturnNumber = saleReturn.PreviousReturn?.ReturnNumber,
            Status = saleReturn.Status,
            TotalAmount = totalAmount,
            Quantity = saleReturn.Quantity,
            DecidedQuantity = saleReturn.DecidedQuantity,
            RemainingQuantity = saleReturn.RemainingQuantity,
            // The same rule the lifecycle handlers enforce, so a button is never offered for an
            // action the server will refuse.
            CanDelete = calc.CanPerform(saleReturn, ReturnLifecycleActionEnum.DELETE),
            CanCancel = calc.CanPerform(saleReturn, ReturnLifecycleActionEnum.CANCEL),
            CanReject = calc.CanPerform(saleReturn, ReturnLifecycleActionEnum.REJECT),
            CanReopen = calc.CanPerform(saleReturn, ReturnLifecycleActionEnum.REOPEN),
            Claims = [.. saleReturn.Claims.Select(c => c.ToDto())],
        };
    }
}
