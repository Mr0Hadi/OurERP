using Application.Common.Contracts.Context;
using Application.Common.Contracts.PurchaseReturn;
using Application.Common.Contracts.Storage;
using Application.Common.Dtos;
using Application.Common.Queries;
using Application.Features.PurchaseReturn.Dtos;
using Application.Features.PurchaseReturn.Mappings;
using Common.Exceptions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.PurchaseReturn.Queries;

public sealed class GetPurchaseReturnDetailQuery : IRequest<ResponseDto>
{
    public int Id { get; set; }
}

public sealed class GetPurchaseReturnDetailQueryHandler(
    IWMSDbContext context,
    IPurchaseReturnCalculationService calc,
    IObjectStorageService storage)
    : IRequestHandler<GetPurchaseReturnDetailQuery, ResponseDto>
{
    public async Task<ResponseDto> Handle(GetPurchaseReturnDetailQuery request, CancellationToken cancellationToken)
    {
        // PreviousReturn is Included rather than looked up separately: the FK and its navigation
        // already exist on the entity, so the extra round-trip bought nothing. It is deliberately
        // not filtered by IsActive - a soft-deleted earlier return still gets to name itself in the
        // chain, which is the behaviour the separate lookup had.
        var purchaseReturn = await context.PurchaseReturns
            .Where(x => x.Id == request.Id)
            .WhereNotDeleted()
            .WithReturnGraph()
            .Include(x => x.Purchase!).ThenInclude(p => p.Supplier)
            .Include(x => x.ReceivingImages.OrderBy(i => i.CreatedAt))
            .Include(x => x.PreviousReturn)
            .AsNoTracking()
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new NotFoundCustomException("مرجوعی مورد نظر یافت نشد.");

        // One expression, three flags: cancel, reject and delete are all "nothing has happened yet".
        var untouched = !calc.IsTerminal(purchaseReturn.Status) && calc.IsUntouched(purchaseReturn);

        // checked, so a bad row fails loudly instead of wrapping into a plausible-looking huge number.
        var totalAmount = checked((ulong)purchaseReturn.Claims.Sum(c => checked((long)c.Quantity * (long)c.UnitPrice)));

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
            Status = purchaseReturn.Status,
            TotalAmount = totalAmount,
            Quantity = purchaseReturn.Quantity,
            DecidedQuantity = purchaseReturn.DecidedQuantity,
            RemainingQuantity = purchaseReturn.RemainingQuantity,
            CanDelete = untouched,
            CanCancel = untouched,
            CanReject = untouched,
            CanReopen = calc.CanReopen(purchaseReturn.Status),
            ReceivingImages = [.. purchaseReturn.ReceivingImages.Select(i => i.ToDto(storage))],
            Claims = [.. purchaseReturn.Claims.Select(c => c.ToDto())],
        };

        return ResponseDto.Success("اطلاعات مرجوعی با موفقیت ارسال شد.", dto);
    }
}
