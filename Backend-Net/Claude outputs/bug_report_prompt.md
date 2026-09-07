# Bug list to investigate — WMS backend

Sina found these by poking at the running backend and then clarified several of them further. I've dug through the code enough to point at the exact spots and, in a couple of cases, what looks like the actual mechanism — but I haven't fixed anything or fully verified root cause everywhere. Investigate for real rather than trusting my read at face value.

## 1. Team/department head/deputy transfer is buggy, and stale names linger after removal
When a user is set as head/deputy of a team or department while they already hold that role elsewhere, the behavior becomes random/inconsistent. Worse: after *removing* a user from a team/department, queries about that user can still show the old team/department name.

Look at:
- `Application/Features/User/Command/ChangeUserTeamCommand.cs` — handles moving a user between department/team and toggling `IsHead`/team headship. Walk through what happens when a user is currently head of team A and gets moved to team B as head, or removed from a team entirely while still head, etc.
- `Application/Features/User/Query/GetUserInfoQuery.cs` and `Application/Features/User/Dto/UserInfoDto.cs` (mapped via `Application/Common/Mapping/MappingProfile.cs`, the `CreateMap<User, UserInfoDto>()` block around line 114) — this maps `DepartmentName`/`TeamName` from `src.Department.Name` / `src.Team.Name`. `Infrastructure/Repositories/UserRepository.cs`'s `GetByIdAsync` override does `.Include(x => x.Department).Include(x => x.Team)`, so check whether the navigation properties are actually guaranteed fresh/non-null after a `TeamId`/`DepartmentId` change, and whether `src.Team.Name` blowing up (or silently mapping something stale) when `Team` is null is part of what's happening. Also check `GetUserUpdateQuery`/`GetUserListQuery` for the same pattern.
- There may also be a "head/deputy" concept beyond plain team membership (`Team.HeadId`) worth checking against `Domain/Entities/Team.cs`/`Department.cs` for a similar deputy/head field.

## 2. Invoice PDF rows don't line up between the two info boxes
The seller box and buyer/supplier box in the generated invoice PDF each have multiple rows of fields (name/economic code/registration number, then province/city/postal code/national ID, then address/phone), but the rows aren't forming a proper aligned grid — columns in one row don't sit below the columns in the row above. The address row (last row, wide) is fine as-is.

Look at: `Infrastructure/Services/QuestPdfInvoiceDocumentService.cs`, method `ComposePartyBox` (~line 150) and the `Field` helper (~line 185). Each of the three `inner.Item().Row(row => {...})` blocks inside a box uses a different number of fields with different `RelativeItem` weights (3/2/2, then 2/2/2/2, then 5/2) — that's presumably why nothing lines up into a grid across rows. It's called twice per invoice (once for "مشخصات فروشنده", once for the counterparty), so this affects both boxes identically.

## 3. `ImageKey`/`ImageUrl` naming — already handled
No action needed; Sina says this one is done.

## 4. Money-effect validator blocks every resolution, not just money ones — plus the Money DTO's shape itself
The rule below is meant to only fire when a resolution includes a money effect, but in practice it appears to block creating *any* return resolution (goods-only included), always with what looks like a money-related error.
```csharp
RuleFor(x => x.Composition.Money!.Kind)
  .Must(k => k == ReturnEffectKindEnum.MONEY_IN || k == ReturnEffectKindEnum.MONEY_OUT)
  .WithMessage("جهت اثر مالی نامعتبر است.")
  .When(x => x.Composition.Money != null);
```
Sina wants this deleted. Look at `Application/Features/PurchaseReturn/Commands/AddClaimResolutionCommand.cs` and `Application/Features/SaleReturn/Commands/AddClaimResolutionCommand.cs` (~lines 33-38, both files) — note the `Composition.Money!.Kind` and `Composition.Money!.Parts` rules both use the null-forgiving operator (`!`) to reach into `Money` even though `Money` can legitimately be null on a goods-only resolution; worth understanding exactly how FluentValidation evaluates that member-access expression relative to `.When(...)`, since that's a plausible explanation for why *every* resolution type currently fails here.

Beyond just deleting that rule, Sina also wants the money-effect DTO itself reconsidered — it's "not designed that good." Look at `Application/Common/Dtos/Returns/EffectCompositionDto.cs`: goods movement direction is expressed structurally (separate `GoodsIn`/`GoodsOut` slots on the composition), but money movement direction is expressed instead via a `Kind` field (`MONEY_IN`/`MONEY_OUT`) inside a single `Money` slot — an inconsistent way to express the same kind of thing (direction) across the two effect types. Worth rethinking `MoneyEffectDto`/`MoneyPartDto` with that asymmetry in mind, and how it interacts with `ReturnPaymentMethodEnum.MIXED` + `Parts`.

## 5. Rename `DominantProblem` to `Problems` (plural)
Confirmed still relevant: `Application/Features/PurchaseReturn/Dtos/PurchaseReturnListDto.cs` / `Queries/GetPurchaseReturnListQuery.cs` (~line 90) and the `SaleReturn` equivalents project a single `DominantProblem` guessed from the largest-quantity claim. Sina's naming makes sense if the real requirement is "list every distinct problem type on this return," not just one.

## 6. DB-only fields don't belong in DTOs (`CreatedAt` etc.)
Sina's point on `CreatedAt = x.CreatedAt` in `Application/Features/SaleReturn/Queries/GetSaleReturnListQuery.cs` is broader than that one line: fields like raw `CreatedAt` are database/audit-column concerns, not something that belongs on a response DTO. Look at `SaleReturnListDto`/`PurchaseReturnListDto` (and their detail-query counterparts) for every such DB-exclusive field and reconsider whether it should be on the wire at all, and if some form of it is genuinely needed (e.g. for sorting/display), what the DTO should actually expose instead of the raw column.

## 7. Sale-return quantity concepts should follow the purchase-return naming, not diverge from it
Corrected version of the original note: "دیتای quantity در فروش اشتباه است و باید بر اساس **خرید** نوشته شود" — the quantity-related properties on the sale-return side (wanted/ordered quantity, healthy quantity, unhealthy quantity) don't use the same property names as their purchase-return counterparts, and they should.

Look at both sides in parallel:
- `Application/Common/Contracts/PurchaseReturn/IPurchaseReturnCalculationService.cs` vs `Application/Common/Contracts/SaleReturn/ISaleReturnCalculationService.cs`, and their implementations `Infrastructure/Services/PurchaseReturnCalculationService.cs` / `SaleReturnCalculationService.cs` — these interfaces already look structurally parallel (`GetOpenClaimQuantity`, `GetClaimableQuantity`), so check the actual property/field names used inside (and in what they read from `PurchaseItem` vs `SaleItem` — `ReceivedQuantity`/`SettledQuantity` vs `ShippedQuantity`/`SettledQuantity`) for naming that doesn't match despite meaning the same thing.
- `Domain/Entities/PurchaseReturnEffectRound.cs` vs `Domain/Entities/SaleReturnEffectRound.cs` (`HealthyQuantity`) — currently identically named, but check the request-side DTOs feeding these: `Application/Features/PurchaseReturn/Dtos/GoodsRoundLineDto.cs` + `GoodsRoundObservationDto.cs` are shared top-level DTO files, while the Sale side (`Application/Features/SaleReturn/Commands/ExecuteGoodsRoundCommand.cs`, ~lines 30-42) redeclares its own `GoodsRoundLineDto`/`GoodsRoundObservationDto` inline in the command file instead of reusing a shared DTO — confirm whether that duplication has actually drifted (different property names/types) rather than just being organized differently.
- Sina's instruction is explicit: wherever the two sides disagree, the purchase-return names should win.

## 8. Rename `Kind` to `Direction` on return effects
Still applicable: `Domain/Entities/PurchaseReturnEffect.cs` / `SaleReturnEffect.cs` (`Kind` property, `Domain/Enums/ReturnEffectKindEnum.cs`), also referenced throughout `Application/Features/PurchaseReturn/Commands/*`, `Application/Features/SaleReturn/Commands/*`, both calculation services, and the invoice/credit-note PDF query. Note this overlaps with item 4 above — if the Money DTO's own `Kind` field gets redesigned, make sure the rename lands consistently across both concepts (or intentionally diverges, if they end up meaning different things).

## 9. `GoodsEffectDto.ProductId` "fully problem"
Look at `Application/Common/Dtos/Returns/EffectCompositionDto.cs` (`GoodsEffectDto.ProductId`, nullable, documented as defaulting to the claim's own product) and every consumer: `AddClaimResolutionCommand.cs` and `ExecuteGoodsRoundCommand.cs` on both the Purchase and Sale sides (the `effect.ProductId ?? claim.ProductId` pattern). Check whether that "defaults to claim's product, override for a replacement" contract is actually enforced consistently — validation, stock/unit updates, and read-side DTOs all need to agree on it.

## 10. Related returns aren't surfaced together
Sina's clarification: the ask is to check whether two returns are actually related to each other (not necessarily to always bundle them into one response). Look at `Application/Features/PurchaseReturn/Queries/GetPurchaseReturnDetailQuery.cs` and `Application/Features/SaleReturn/Queries/GetSaleReturnDetailQuery.cs`, and the query services `IPurchaseReturnQueryService`/`ISaleReturnQueryService` (`Application/Common/Contracts/.../`, `Infrastructure/Services/SaleReturnQueryService.cs`) for whether there's currently any way to determine that two `PurchaseReturn`/`SaleReturn` rows against the same `Purchase`/`Sale` (or same claim/product) are related, versus treating every return as fully independent.

## 11. Warehouse-receiving feature folder is dead code
Confirmed: `Application/Features/WarehouseReceiving/` exists with `Dtos/ReceiveSaleReturnListDto.cs` and `Queries/GetWarehouseReceiveSaleListQuery.cs` inside it, but per the project's own `CLAUDE.md` ("the `WarehouseReceiving` feature (old purchase-side) remains deleted from the first rebuild; only `GetWarehouseReceiveSaleListQuery` survives, still unwired") this query isn't wired into any controller. Confirm it's genuinely unused (no controller action, no other handler referencing it) before deciding whether to finish wiring it up or remove it — Sina's two related notes (receiving should account for both supplier shipment and customer returns; shipping should account for both customer shipment and supplier returns) suggest this folder may have been an earlier attempt at exactly that unification:
- Supplier delivery → us: `Application/Features/Purchase/Commands/ReceivePurchaseCommand.cs` (`IProductUnitService.MintAsync`)
- Customer return → us: `Application/Features/SaleReturn/Commands/ExecuteGoodsRoundCommand.cs`, `GOODS_IN` branch (also `MintAsync`, but as a separate return-side code path)
- Us → customer: `Application/Features/Sale/Commands/ShipSaleCommand.cs` (`IProductUnitService.ConsumeAsync`)
- Us → supplier: `Application/Features/PurchaseReturn/Commands/ExecuteGoodsRoundCommand.cs`, `GOODS_OUT` branch (~lines 139-155) — this one has its own comment admitting `IProductUnitService` has no proper method for "goods leaving to a supplier," so it manually queries `ProductUnits` and flips their status directly instead of going through the service like every other stock-mutation path does.

Worth deciding whether `WarehouseReceiving` should become the real unification point for these four paths, or whether it should just be deleted.
