using Application.Common.Contracts.Context;
using Application.Common.Contracts.PurchaseReturn;
using Application.Common.Contracts.Storage;
using Application.Common.Enums;
using Application.Common.Queries;
using Application.Features.PurchaseReturn.Dtos;
using Application.Features.PurchaseReturn.Mappings;
using Common.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.PurchaseReturn.Queries;

/// <summary>
/// Builds the one purchase-return document shape. GetPurchaseReturnDetailQuery returns it, and so
/// does every write command on a return (create, add/remove resolution, goods round, cancel, reject,
/// reopen): the frontend drops a write's response straight into its detail cache and reads
/// <c>id</c>/<c>purchaseId</c> off it, so a write that answered with null or a partial object crashed
/// the client's success handler and left the page showing a status the server had already changed.
///
/// Always a fresh no-tracking read after SaveChanges, rather than projecting the handler's tracked
/// graph: the tracked graph is loaded with a different Include spine (no supplier, no images) and
/// projecting it would silently produce a different document than the detail query does.
/// </summary>
public static class PurchaseReturnDetailReader
{
    public static async Task<PurchaseReturnDetailDto> ReadAsync(
        IWMSDbContext context,
        IPurchaseReturnCalculationService calc,
        IObjectStorageService storage,
        int purchaseReturnId,
        CancellationToken cancellationToken)
    {
        // PreviousReturn is Included rather than looked up separately: the FK and its navigation
        // already exist on the entity, so the extra round-trip bought nothing. It is deliberately
        // not filtered by IsActive - a soft-deleted earlier return still gets to name itself in the
        // chain, which is the behaviour the separate lookup had.
        var purchaseReturn = await context.PurchaseReturns
            .Where(x => x.Id == purchaseReturnId)
            .WhereNotDeleted()
            .WithReturnGraph()
            .Include(x => x.Purchase!).ThenInclude(p => p.Supplier)
            .Include(x => x.ReceivingImages.OrderBy(i => i.CreatedAt))
            .Include(x => x.PreviousReturn)
            .AsNoTracking()
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new NotFoundCustomException("مرجوعی مورد نظر یافت نشد.");

        // checked, so a bad row fails loudly instead of wrapping into a plausible-looking huge number.
        var totalAmount = checked((ulong)purchaseReturn.Claims.Sum(c => checked((long)c.Quantity * (long)c.UnitPrice)));

        return new PurchaseReturnDetailDto
        {
            Id = purchaseReturn.Id,
            ReturnNumber = purchaseReturn.ReturnNumber,
            ReturnDate = purchaseReturn.ReturnDate,
            PurchaseId = purchaseReturn.PurchaseId,
            PurchaseInvoiceNumber = purchaseReturn.Purchase!.InvoiceNumber,
            SupplierId = purchaseReturn.Purchase.SupplierId,
            SupplierName = purchaseReturn.Purchase.Supplier.CompanyName,
            Description = purchaseReturn.Description,
            PreviousReturnId = purchaseReturn.PreviousReturnId,
            PreviousReturnNumber = purchaseReturn.PreviousReturn?.ReturnNumber,
            StatusReason = purchaseReturn.StatusReason,
            Status = purchaseReturn.Status,
            TotalAmount = totalAmount,
            Quantity = purchaseReturn.Quantity,
            DecidedQuantity = purchaseReturn.DecidedQuantity,
            RemainingQuantity = purchaseReturn.RemainingQuantity,
            // The same rule the lifecycle handlers enforce, so a button is never offered for an
            // action the server will refuse.
            CanDelete = calc.CanPerform(purchaseReturn, ReturnLifecycleActionEnum.DELETE),
            CanCancel = calc.CanPerform(purchaseReturn, ReturnLifecycleActionEnum.CANCEL),
            CanReject = calc.CanPerform(purchaseReturn, ReturnLifecycleActionEnum.REJECT),
            CanReopen = calc.CanPerform(purchaseReturn, ReturnLifecycleActionEnum.REOPEN),
            ReceivingImages = [.. purchaseReturn.ReceivingImages.Select(i => i.ToDto(storage))],
            Claims = [.. purchaseReturn.Claims.Select(c => c.ToDto())],
        };
    }
}
