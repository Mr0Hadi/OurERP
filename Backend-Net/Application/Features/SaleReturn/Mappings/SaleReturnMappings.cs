using Application.Features.SaleReturn.Dtos;
using Common.Extensions;
using Domain.Entities;

namespace Application.Features.SaleReturn.Mappings;

/// <summary>
/// Entity -&gt; DTO projections for the sale-return read side, one small method per level of the
/// graph - the twin of <see cref="Application.Features.PurchaseReturn.Mappings.PurchaseReturnMappings"/>,
/// minus the receiving photos, which are a purchase-side concept only.
///
/// These run in memory over a materialised graph (the roll-up properties they read are
/// <c>[NotMapped]</c>), so they must not be used inside an EF projection.
/// </summary>
public static class SaleReturnMappings
{
    public static SaleReturnClaimDto ToDto(this SaleReturnClaim c) => new()
    {
        Id = c.Id,
        Scope = c.Scope,
        OffScopeKind = c.OffScopeKind,
        SaleItemId = c.SaleItemId,
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

    public static SaleReturnResolutionDto ToDto(this SaleReturnResolution r) => new()
    {
        Id = r.Id,
        Quantity = r.Quantity,
        Note = r.Note,
        DecidedAt = r.CreatedAt,
        Effects = [.. r.Effects.Select(e => e.ToDto())],
    };

    public static SaleReturnEffectDto ToDto(this SaleReturnEffect e) => new()
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

    public static SaleReturnEffectMoneyPartDto ToDto(this SaleReturnEffectMoneyPart p) => new()
    {
        Id = p.Id,
        Method = p.Method,
        Amount = p.Amount,
        CheckNumber = p.CheckNumber,
        TransferRef = p.TransferRef,
    };

    public static SaleReturnEffectRoundDto ToDto(this SaleReturnEffectRound h) => new()
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

    public static SaleReturnEffectObservationDto ToDto(this SaleReturnEffectObservation o) => new()
    {
        Id = o.Id,
        Problem = o.Problem,
        Quantity = o.Quantity,
        Note = o.Note,
    };
}
