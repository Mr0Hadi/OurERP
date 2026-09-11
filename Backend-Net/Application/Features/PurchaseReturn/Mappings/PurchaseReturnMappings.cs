using Application.Common.Contracts.Storage;
using Application.Features.PurchaseReturn.Dtos;
using Common.Extensions;
using Domain.Entities;

namespace Application.Features.PurchaseReturn.Mappings;

/// <summary>
/// Entity -&gt; DTO projections for the purchase-return read side, one small method per level of the
/// graph. They live here rather than inline in the detail query so that the query reads as "fetch,
/// decide, project" instead of a hundred lines of nested object initialisers, and so the list and
/// detail queries can share the same shapes.
///
/// These run in memory over a materialised graph (the roll-up properties they read are
/// <c>[NotMapped]</c>), so they must not be used inside an EF projection.
/// </summary>
public static class PurchaseReturnMappings
{
    public static PurchaseReceivingImageDto ToDto(this PurchaseReceivingImage img, IObjectStorageService storage) => new()
    {
        Id = img.Id,
        PurchaseId = img.PurchaseId,
        PurchaseReturnId = img.PurchaseReturnId,
        ObjectKey = img.ObjectKey,
        Url = storage.GetFixedUrl(img.ObjectKey),
        FileName = img.FileName,
        Note = img.Note,
        UploadedAt = img.CreatedAt,
    };

    public static PurchaseReturnClaimDto ToDto(this PurchaseReturnClaim c) => new()
    {
        Id = c.Id,
        Scope = c.Scope,
        OffScopeKind = c.OffScopeKind,
        PurchaseItemId = c.PurchaseItemId,
        ProductId = c.ProductId,
        ProductCode = c.Product!.Code,
        ProductName = c.Product.Name,
        Unit = c.Product.Unit.GetDescription(),
        UnitPrice = c.UnitPrice,
        Quantity = c.Quantity,
        Problem = c.Problem,
        Note = c.Note,
        DecidedQuantity = c.DecidedQuantity,
        RemainingQuantity = c.RemainingQuantity,
        Resolutions = [.. c.Resolutions.Select(r => r.ToDto())],
    };

    public static PurchaseReturnResolutionDto ToDto(this PurchaseReturnResolution r) => new()
    {
        Id = r.Id,
        Quantity = r.Quantity,
        Note = r.Note,
        DecidedAt = r.CreatedAt,
        Effects = [.. r.Effects.Select(e => e.ToDto())],
    };

    public static PurchaseReturnEffectDto ToDto(this PurchaseReturnEffect e) => new()
    {
        Id = e.Id,
        Direction = e.Direction,
        Quantity = e.Quantity,
        AppliedQuantity = e.AppliedQuantity,
        RemainingQuantity = e.RemainingQuantity,
        RestockedQuantity = e.RestockedQuantity,
        ProductId = e.ProductId,
        ProductName = e.Product?.Name,
        Amount = e.Amount,
        Method = e.Method,
        Reference = e.Reference,
        Note = e.Note,
        Status = e.Status,
        AppliedAt = e.AppliedAt,
        MoneyParts = [.. e.MoneyParts.Select(p => p.ToDto())],
        History = [.. e.History.Select(h => h.ToDto())],
    };

    public static PurchaseReturnEffectMoneyPartDto ToDto(this PurchaseReturnEffectMoneyPart p) => new()
    {
        Id = p.Id,
        Method = p.Method,
        Amount = p.Amount,
        CheckNumber = p.CheckNumber,
        TransferRef = p.TransferRef,
    };

    public static PurchaseReturnEffectRoundDto ToDto(this PurchaseReturnEffectRound h) => new()
    {
        Id = h.Id,
        Date = h.Date,
        Quantity = h.Quantity,
        HealthyQuantity = h.HealthyQuantity,
        PartyName = h.PartyName,
        PartyNationalId = h.PartyNationalId,
        VehiclePlate = h.VehiclePlate,
        Note = h.Note,
        Observations = [.. h.Observations.Select(o => o.ToDto())],
    };

    public static PurchaseReturnEffectObservationDto ToDto(this PurchaseReturnEffectObservation o) => new()
    {
        Id = o.Id,
        Problem = o.Problem,
        Quantity = o.Quantity,
        Note = o.Note,
    };
}
