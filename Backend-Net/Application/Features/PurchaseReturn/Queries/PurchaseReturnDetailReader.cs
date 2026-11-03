using Application.Common.Contracts.Context;
using Application.Common.Contracts.PurchaseReturn;
using Application.Common.Contracts.Storage;
using Application.Common.Documents;
using Application.Common.Enums;
using Application.Common.Queries;
using Application.Common.Returns;
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
        var attachments = await DocumentAttachmentWriter.ReadAsync(context, storage, Domain.Enums.DocumentKindEnum.PURCHASE_RETURN, purchaseReturn.Id, cancellationToken);

        var totalAmount = checked((ulong)purchaseReturn.Claims.Sum(c => checked((long)c.Quantity * (long)c.UnitPrice)));

        // 14.4: the free quarantine per claim, by the same function AddClaimResolution checks with.
        var openReturns = await context.PurchaseReturns.AsNoTracking()
            .Where(x => x.PurchaseId == purchaseReturn.PurchaseId)
            .WhereNotDeleted()
            .WhereOpen()
            .WithReturnGraph()
            .ToListAsync(cancellationToken);
        var freeQuarantine = new Dictionary<int, int>();
        foreach (var claim in purchaseReturn.Claims)
            freeQuarantine[claim.Id] = (await Application.Features.PurchaseReturn.Commands.PurchaseResolutionChecks.FreeQuarantineAsync(
                context, calc, claim, claim.ProductId, purchaseReturn.PurchaseId, openReturns, cancellationToken)).Available;

        var isTerminal = calc.IsTerminal(purchaseReturn.Status);
        var effects = purchaseReturn.Claims.SelectMany(c => c.Resolutions).SelectMany(r => r.Effects).ToList();

        var dto = new PurchaseReturnDetailDto
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
            LifecycleBlocker = calc.GetLifecycleBlocker(purchaseReturn, ReturnLifecycleActionEnum.CANCEL),
            PendingWarehouseWork = Application.Common.Dtos.Returns.PendingWarehouseWorkDto.Of(
                purchaseReturn.Status is Domain.Enums.ReturnStatusEnum.OPEN or Domain.Enums.ReturnStatusEnum.IN_PROGRESS,
                effects.Select(e => (e.Direction, e.Status, e.RemainingQuantity))),
            ReceivingImages = [.. purchaseReturn.ReceivingImages.Select(i => i.ToDto(storage))],
            Claims = [.. purchaseReturn.Claims.Select(c => c.ToDto(storage))],
            Attachments = attachments,
        };

        foreach (var (claimDto, claim) in dto.Claims.Zip(purchaseReturn.Claims))
        {
            claimDto.FreeQuarantinedQuantity = freeQuarantine[claim.Id];
            foreach (var (resolutionDto, resolution) in claimDto.Resolutions.Zip(claim.Resolutions))
                resolutionDto.CanRemove = ReturnLifecycleRules.ResolutionRemoveBlocker(purchaseReturn.Status, isTerminal,
                    resolution.Effects.Select(e => (e.Direction, e.AppliedQuantity))) == null;
        }

        return dto;
    }
}
