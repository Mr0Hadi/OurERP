# CLAUDE.md

Guidance for coding agents working in the WMS (Warehouse Management System) .NET backend.
This project was scaffolded from the smshub2 reference project (`E:\Programming\smshub2`) and follows its conventions closely, with the entity naming made project-specific.

## 1. Project overview

A warehouse-management REST API (`Backend-Net/WMS`) handling products, product categories, customers, suppliers, purchases, sales, and users. It is a clean-layered, CQRS-style .NET 10 application: controllers are thin, every action is a MediatR request (`IRequest<ResponseDto>`) defined under `Application/Features/<Feature>/`, reads run directly against the EF Core context, and writes go through per-entity repositories plus a `UnitOfWork`.

## 2. Architecture

**Clean-layered + feature-folder CQRS (MediatR).** This is the reference project's pattern and it is followed here verbatim:

- `Domain` — entities + enums only, no dependencies (`Domain/Entities/*.cs`, `Domain/Enums/*.cs`).
- `Application` — MediatR commands/queries/validators, DTOs, contracts (interfaces), AutoMapper profile. Everything returned through `Application.Common.Dtos.ResponseDto`.
- `Infrastructure` — EF Core `WMSDbContext`, repository implementations, `UnitOfWork`, migrations.
- `Common` — shared exceptions and extension helpers (static, no DI registration).
- `WMS` — ASP.NET Core host: controllers, middleware, response handler, DI composition in `Program.cs`.

**One MediatR request file = request + validator + handler.** All three classes live in a single file, e.g. `Application/Features/Customer/Commands/CreateCustomerCommand.cs` contains `CreateCustomerCommand`, `CreateCustomerCommandValidator`, and `CreateCustomerCommandHandler`.

**Reads use the DbContext directly; writes use repositories + UnitOfWork.** List/detail queries inject `IWMSDbContext` and build LINQ `query` pipelines (see `GetCustomerListQuery`, `GetProductListQuery`). Writes inject the entity's repository (`ICustomerRepository`) and `IUnitOfWork`, then call `AddAsync`/`Update` + `SaveChangesAsync` (see `CreateCustomerCommandHandler`, `UpdateCustomerCommandHandler`).

**Repository pattern.** `IGenericRepository<T>` (`GetByIdAsync`, `GetAllAsync`, `AddAsync`, `Update`, `Remove`) implemented by `Infrastructure/Repositories/GenericRepository<T>`. Each aggregate gets a thin interface + implementation, e.g. `ICustomerRepository : IGenericRepository<Customer>` and `CustomerRepository : GenericRepository<Customer>, ICustomerRepository`. Domain-specific lookups are added on the concrete interface (`IUserRepository.GetByUsernameAsync`).

**UnitOfWork.** `IUnitOfWork` exposes only `SaveChangesAsync(cancellationToken)`. `Infrastructure/UnitOfWork/UnitOfWork.cs` forwards to the `IWMSDbContext`.

**Validation pipeline.** `ValidationBehavior<TRequest,TResponse>` (`Application/Common/Behaviors/ValidationBehavior.cs`) runs every registered FluentValidation validator and throws `ValidationCustomException(failures.First())` on the first failure.

**Soft delete (current convention).** Every entity has `bool IsActive`. There is no global query filter and no hard deletes; a delete is a command that loads the entity and sets `IsActive = false` (see `DeleteCustomerCommand`, `Application/Features/Customer/Commands/DeleteCustomerCommand.cs`). New rows are created active (`IsActive = true` is set in `MappingProfile`).

## 3. Coding style

**Naming**
- Classes: `Create<Entity>Command`, `Update<Entity>Command`, `Delete<Entity>Command`, `<...>CommandHandler`, `<...>CommandValidator`, `Get<Entity>ListQuery`, `Get<Entity>DetailQuery`, `<Entity>ListDto`, `<Entity>Dto`.
- Namespace block style (`namespace X { ... }`), not file-scoped.
- `_camelCase` private readonly fields for injected dependencies; underscore prefix. Constructor assigns every field (newer handlers use `?? throw new NotFoundCustomException(...)`; the reference uses explicit `if (x == null) throw ...` — both are accepted, prefer the explicit `?? throw` for single-line guard checks).
- Entity/table names are plain PascalCase in this project (`Customer`, `Product`) — **not** the `tbl`-prefixed names used in smshub2.
- Folder names per feature: `Commands/`, `Queries/`, `Dtos/` (plural). Legacy divergence: the `User` and `Account` features use singular `Command/Query/Dto` folders and namespace `Application.Features.User.Command`.

**Control flow**
- Every handler starts with `var res = new ResponseDto();`.
- Guard clauses first; throw custom exceptions rather than returning errors.
- List queries build an `IQueryable`, apply filters with `if (request.X.HasValue)` / `if (!string.IsNullOrEmpty(request.X))` blocks, then `Select(...).ToPaged(page, take, out int pageCount, out int totalCount).ToListAsync()`.
- `res.Message` is Persian UI text; `res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();` before `return res;`.

**Error handling** (in `Common/Exceptions/`)
- `BaseCustomException` carries `Error`, `StatusCode`, `Data`. Concrete types: `NotFoundCustomException` (404), `ValidationCustomException` (400), `UnauthorizedCustomException`, `ForbiddenCustomException`, `InternalServerErrorCustomException`, `ServiceUnavailableCustomException`.
- `WMS/Middlewares/ExceptionHandlingMiddleware.cs` catches `BaseCustomException` (returns its status/error) and a generic `Exception` fallback (500, "خطای داخلی سرور رخ داد."), both serialized via `ResponseHandler.HandleExceptionAsync` into a `ResponseDto.Danger(...)` JSON body.

**Validation** — FluentValidation with helpers from `Common/Extensions/Validation.cs`: `Validation.IsNotNullOrEmpty(...)`, `Validation.RequiredMessage("فارسی")`, `IsPersianText`, `IsEnglishText`, `IsMobileNumber`, `IsValidPassword`.

**Mapping** — AutoMapper `MappingProfile` in `Application/Common/Mapping/MappingProfile.cs`. Create mappings set timestamps and defaults, e.g.:

```csharp
CreateMap<CreateCustomerCommand, Customer>()
    .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(src => DateTime.Now))
    .ForMember(dest => dest.IsActive, opt => opt.MapFrom(src => true));
```

**Pagination** — `ToPaged<T>` extension (note the real typo `Paggination.cs`) in `Common/Extensions/Paggination.cs`.

**Observed style worth rethinking later** (captured for a future style review — no change requested now):
- Child rows are added inside handlers via navigation-collection `Add`/`Remove` — there are no per-child repositories (e.g. `purchaseReturnItem.Decisions.Add(...)` in `AddPurchaseReturnDecisionCommandHandler`).
- The purchase-return feature builds its DTOs by hand in queries/commands; AutoMapper is only used by the classic CRUD features.
- Money is `UInt64` in entities/commands and lands in the DB as `decimal(20,0)` (see `PurchaseItem.UnitPrice`, `PurchaseReturnDecision.RefundAmount`).
- Bulk validation uses `RuleForEach(...).ChildRules(...)` with Persian `WithMessage` texts (see `ReceivePurchaseCommandValidator`).
- The purchase-return feature has no `IsActive`/soft-delete — lifecycle is `Status` (`PENDING`/`COORDINATING`/`RESOLVED`/`REJECTED`/`CANCELLED`).
- Shared cross-handler business math (status recompute, receivable-quantity math, the decision validity matrix, replacement auto-fulfillment) lives behind `IPurchaseReturnCalculationService` (`Application/Common/Contracts/PurchaseReturn/`, implemented by `Infrastructure/Services/PurchaseReturnCalculationService.cs`, registered `Scoped` in `InfrastructureServiceRegistration`) — the same interface-in-`Contracts`/implementation-in-`Infrastructure/Services` shape as `ITokenService`/`TokenService` and smshub2's `IDashboardService`/`DashboardService`. Every command that mutates a `PurchaseReturn` or `Purchase` status injects it so the math can't drift out of sync between handlers.

## 4. Tooling and dependencies

All projects target `net10.0`, `Nullable=enable`, `ImplicitUsings=enable`. Solution file is the XML `.slnx` format: `WMS.slnx`.

| Package | Version | Used in |
|---|---|---|
| MediatR | 14.2.0 | Application |
| FluentValidation + FluentValidation.DependencyInjectionExtensions | 12.1.1 | Application |
| AutoMapper | 16.2.0 | Application |
| Microsoft.EntityFrameworkCore (+SqlServer, Tools, Design, Abstractions) | 10.0.10 | Application, Infrastructure, WMS |
| Microsoft.AspNetCore.Authentication.JwtBearer | 10.0.10 | WMS |
| Microsoft.AspNetCore.OpenApi | 10.0.10 | WMS |
| Serilog / Serilog.AspNetCore / Serilog.Sinks.File | 4.4.0 / 10.0.0 / 7.0.0 | WMS |
| Scalar.AspNetCore | 2.16.16 | WMS |
| Swashbuckle.AspNetCore | 10.2.3 | WMS |
| Newtonsoft.Json | 13.0.4 | WMS |

**CLI commands**
- Build: `dotnet build WMS.slnx` (from `Backend-Net/`).
- Add a migration (DbContext is in `Infrastructure`, host in `WMS`):
  `dotnet ef migrations add <Name> --project Infrastructure --startup-project WMS`
- Run: `dotnet run --project WMS` (SQL Server connection string in `WMS/appsettings.json` → `ConnectionStrings:SqlServer`).
- There is no test project.

## 5. Folder structure

```
Backend-Net/
├── Domain/
│   ├── Entities/        # Customer, Product, ProductCategory, Purchase, PurchaseItem,
│   │                    # PurchaseReturn, PurchaseReturnItem, PurchaseReturnDecision,
│   │                    # Sale, SaleItem (now ShippedQuantity/SettledQuantity), Supplier,
│   │                    # User, Role, Department, Team, PaymentDetail,
│   │                    # SaleReturn, SaleReturnClaim, SaleReturnItem, SaleReturnDecision
│   └── Enums/           # BalanceTypeEnum, PaymentTypeEnum, ProductUnitEnum,
│                        # PurchaceStatusEnum (typo kept), SalesStatusEnum (now incl. SHIPPED,
│                        # appended at the end to avoid renumbering), UserRolesEnum,
│                        # PurchaseIssueTypeEnum, PurchaseReturnDecisionTypeEnum,
│                        # PurchaseReturnDecisionStatusEnum (AWAITING|RESOLVED),
│                        # PurchaseReturnStatusEnum (PENDING|COORDINATING|RESOLVED|REJECTED|CANCELLED),
│                        # PurchaseStatusEnum (…|PARTIALLY_RECEIVED|RECEIVED|…),
│                        # SalesReturnReasonEnum, SalesReturnIssueTypeEnum (nullable on the
│                        # entity; null = inspected healthy), SaleReturnStatusEnum
│                        # (PENDING_INSPECTION|COORDINATING|RESOLVED|REJECTED|CANCELLED),
│                        # SaleReturnDecisionTypeEnum, SaleReturnDecisionStatusEnum
├── Application/
│   ├── Common/
│   │   ├── Behaviors/   # ValidationBehavior
│   │   ├── Contracts/   # Repositories/, Context/ (IWMSDbContext), UnitOfWork/, Token/,
│   │   │                # UserContextService/, Environment/, PurchaseReturn/ (IPurchaseReturnCalculationService),
│   │   │                # SaleReturn/ (ISaleReturnCalculationService), (Captcha/ present, unused)
│   │   ├── Dtos/        # ResponseDto (+ Success/Warning/Danger factories), ResponsePageDto, ...
│   │   ├── Enums/       # ResponseMessageTypeEnum
│   │   └── Mapping/     # MappingProfile
│   ├── Features/
│   │   ├── Account/     # Command/ (login, logout, refresh, otp, forget-password)
│   │   ├── Customer/    # Commands/, Queries/, Dtos/
│   │   ├── Product/
│   │   ├── ProductCategory/
│   │   ├── Purchase/
│   │   ├── PurchaseReturn/ # Commands/ (ReceivePurchase, Add/RemovePurchaseReturnDecision,
│   │   │                   # Cancel/Reject/Reopen/DeletePurchaseReturn), Queries/, Dtos/
│   │   │                   # (shared status/quantity math lives in IPurchaseReturnCalculationService, above)
│   │   ├── Sale/         # Commands/ now incl. ShipSaleCommand (multi-round shipping, prerequisite
│   │   │                 # for SaleReturn), Queries/, Dtos/
│   │   ├── SaleReturn/   # Commands/ (CreateSaleReturn, ConfirmReturnInspection,
│   │   │                 # Add/RemoveSaleReturnDecision, ConfirmReplacementShipment,
│   │   │                 # Cancel/Reject/Reopen/DeleteSaleReturn), Queries/, Dtos/
│   │   │                 # (shared status/quantity math lives in ISaleReturnCalculationService, above)
│   │   ├── Supplier/
│   │   └── User/        # Command/, Query/, Dto/ (singular — legacy)
│   └── Ioc/             # ApplicationServiceRegistration (AddApplicationServices)
├── Infrastructure/
│   ├── Persistence/     # WMSDbContext
│   ├── Repositories/    # GenericRepository<T> + per-entity repositories
│   ├── UnitOfWork/      # UnitOfWork
│   ├── Ioc/             # InfrastructureServiceRegistration (AddInfrastructureServices)
│   ├── Services/        # TokenService, CaptchaService, PurchaseReturnCalculationService,
│   │                    # SaleReturnCalculationService
│   └── Migrations/      # EF Core migrations + model snapshot
├── Common/
│   ├── Exceptions/      # BaseCustomException + concrete custom exceptions
│   └── Extensions/      # Encryption, EnumExtensions, Generator, IdentityExtensions,
│                        # Paggination, Validation
└── WMS/
    ├── Controllers/     # thin, call IMediator.Send(request)
    ├── Ioc/             # EndpointServiceRegistration (AddEndPointServiceRegistration)
    ├── Middlewares/     # ExceptionHandlingMiddleware, RequestLoggingMiddleware, CachingMiddleware
    ├── ResponseHandler/ # ResponseHandler.HandleExceptionAsync
    ├── Services/        # EnvironmentService, UserContextService
    ├── Logging/         # SerilogConfiguration
    ├── Program.cs       # DI composition + JWT + CORS + OpenAPI/Scalar
    └── appsettings.json
```

**DI registration pattern.** Each project has a static `Ioc/<X>ServiceRegistration.cs` extension method (`AddApplicationServices`, `AddInfrastructureServices(connectionString)`, `AddEndPointServiceRegistration`), called from `WMS/Program.cs:54-56`. Repositories, the UnitOfWork, the `IWMSDbContext` → `WMSDbContext` forwarding, and services are all registered here as `Scoped`. Handlers/validators/mediator/AutoMapper are picked up via `AddMediatR(...RegisterServicesFromAssembly(typeof(ApplicationServiceRegistration).Assembly))` and `AddValidatorsFromAssembly(...)`.

## 6. Current state

**Implemented**: JWT auth + account flows (login, logout, refresh token, OTP, forget password); full CRUD for Customer, Product, ProductCategory, Supplier; create/update + list/detail for Purchase and Sale; user create/update/info; purchase receiving + returns (below). OpenAPI via Scalar (`/scalar`). **IsActive** exists on every entity and each entity feature folder has a soft-delete command (`DeleteCustomerCommand`, `DeleteProductCommand`, `DeleteProductCategoryCommand`, `DeletePurchaseCommand`, `DeleteSaleCommand`, `DeleteSupplierCommand`, `DeleteUserCommand`), all setting `IsActive = false` and throwing `NotFoundCustomException` when the row is missing. Each controller exposes a matching `[HttpDelete("DeleteX")]` action that `Send`s the command (`DeleteCustomer`, `DeleteProduct`, `DeleteProductCategory`, `DeletePurchase`, `DeleteSale`, `DeleteSupplier`, `DeleteUser`), taking the command via `[FromQuery]`. Create mappings default `IsActive = true` (existing rows default to active via the migration's column default). Schema change shipped as EF migration `20260802123347_add-isactive` (see `Infrastructure/Migrations`).

**Purchase receiving & returns (multi-round, frontend-aligned rebuild — 2026-08-06).** This feature was rebuilt a second time to match the already-built React frontend (`Frontend/src/features/purchases/services/returns/`), which encodes a materially richer contract than the first "spec rebuild" (see git history: `ea33dc7`, `00725f2`). The frontend's mock business logic (`services/returns/api-mockData.js`) was treated as the source of truth for behavior; the backend now implements it for real.

- **Multi-round receiving.** `POST api/Purchase/ReceivePurchase` (`ReceivePurchaseCommand`) no longer assumes a purchase is received in one shot. Each call takes, per `PurchaseItemId`, a `ReceivedQuantity` (good units arriving this round) plus a list of `Issues` (`{Type, Quantity, Note}`, reusing `PurchaseIssueTypeEnum` incl. `EXCESS`). `PurchaseItem.ReceivedQuantity` (previously dead/unused) and a new `PurchaseItem.SettledQuantity` are now both cumulative, actively-used running totals. `Purchase.Status` gains `PARTIALLY_RECEIVED` (between `SHIPPED` and `RECEIVED`) and is recomputed after every receiving/decision/lifecycle action — see `IPurchaseReturnCalculationService.RecomputePurchaseStatus`.
- **Budget validation excludes `EXCESS`.** `ReceivedQuantity + non-EXCESS issue quantity` is validated against `IPurchaseReturnCalculationService.GetReceivableQuantity` (ordered − received − settled − open/undecided issue qty); `EXCESS` quantity is exempt since by definition it's beyond the order. Excess stock is never added to `Product.Stock` (held out until a keep/return decision), matching the prior "spec rebuild" decision.
- **One growing `PurchaseReturn` per active receiving cycle.** `IPurchaseReturnRepository.GetActiveByPurchaseIdAsync` finds the purchase's return with `Status` in `{PENDING, COORDINATING}`; `ReceivePurchaseCommand` reuses it (creating a new one, `ReturnNumber` via `Generator.GenerateReturnNumber`, only if none is active) and merges new issues into existing `PurchaseReturnItem` rows by `(PurchaseItemId, IssueType)`. Because reject/cancel are only legal pre-decision (see below), at most one return per purchase is ever active at a time — this is what lets the backend skip the frontend's client-side "reserved qty across multiple concurrent returns" arbitration entirely.
- **Model:** `PurchaseReturn` (`ReturnNumber`, `ReturnDate`, `Description`, `Status`) → `PurchaseReturnItem` (`IssueType` from `PurchaseIssueTypeEnum`, `Quantity`, `UnitPrice` snapshot, `ProductId`) → `PurchaseReturnDecision` (`DecisionType` from `PurchaseReturnDecisionTypeEnum`, `Quantity`, `RefundAmount?`, `Status` from `PurchaseReturnDecisionStatusEnum`, `ResolvedAt?`).
- **Status lifecycle** (`PurchaseReturnStatusEnum`): `PENDING` (no decision registered yet) → `COORDINATING` (some quantity decided, or a `REPLACEMENT` decision still `AWAITING`) → `RESOLVED` (every unit decided and every decision `RESOLVED`). `REJECTED`/`CANCELLED` are explicit actions, only legal from `PENDING` (`RejectPurchaseReturnCommand`/`CancelPurchaseReturnCommand`); `ReopenPurchaseReturnCommand` only accepts `REJECTED` → back to computed status (always `PENDING`, since a rejected return can't have decisions). `DeletePurchaseReturnCommand` hard-deletes (only from `PENDING` — matches the frontend's `canDeletePurchaseReturn`); `PurchaseReturnItem`/`PurchaseReturnDecision` cascade-delete with it.
- **Decisions are single, one at a time.** `AddPurchaseReturnDecisionCommand` (replaces the old batch `AddPurchaseReturnResolutionsCommand`) registers one decision against one `PurchaseReturnItem`, enforcing the sum-≤-quantity rule and the type/decision validity matrix in `IPurchaseReturnCalculationService.IsValidDecision` (unchanged: `SHORTAGE`/`WRONG_ITEM` → REFUND|REPLACEMENT|CREDIT; `EXCESS` → REFUND|CREDIT; `DAMAGED`/`DEFECTIVE`/`EXPIRED`/`OTHER` → all four). Non-`REPLACEMENT` decisions resolve immediately (`Status = RESOLVED`) and bump `PurchaseItem.SettledQuantity`; `REPLACEMENT` decisions start `AWAITING` and leave `SettledQuantity` untouched (the quantity stays counted as normally receivable). `RemovePurchaseReturnDecisionCommand` only allows removing `AWAITING` lines (final ones are immutable, matching the frontend).
- **Replacement auto-fulfillment.** `IPurchaseReturnCalculationService.ResolveAwaitingReplacements`, called at the end of every `ReceivePurchaseCommand`, can't physically distinguish "replacement stock" from "normal remaining shipment" in an incoming batch, so it infers it: for each purchase item with `AWAITING` `REPLACEMENT` decisions, if their total quantity exceeds what the item would still normally owe (`ordered − received − settled`, using post-this-round numbers), the surplus must be the replacement having arrived — the oldest `AWAITING` lines are resolved FIFO up to that surplus. Ported faithfully from the frontend's `autoResolveReplacementReturns`, simplified to operate on the one active return per purchase (see above) instead of arbitrating across many.
- **`GetPurchaseReceivingInfoQuery`** (`GET api/PurchaseReturn/GetPurchaseReceivingInfo`) backs the warehouse receiving screen: per purchase item, ordered/received/settled/open-issue/still-receivable quantities plus the active return's open (undecided) issue lines. This is the backend equivalent of the frontend's client-computed "shortage report" (`fetchShortageReportByPurchaseId`) — unlike the frontend, it's a real query against persisted state, not derived from a virtual/uncommitted receiving log.
- Route naming keeps the project's action-name convention rather than the frontend's REST-ish `/purchase-returns/:id` shape (e.g. `POST api/Purchase/ReceivePurchase`, `POST api/PurchaseReturn/CancelPurchaseReturn`) — the frontend's `services/returns/api-v1.js` will need an adapter layer when it's wired to the real backend instead of its mock.
- **Not implemented from the frontend's mock**: the frontend also computes a client-side-only `TRACKABLE` pseudo-status for purchases with reported-but-not-yet-formalized issues (`toVirtualReturnEntry`/`getAllTrackableEntries`). The backend doesn't need this: `ReceivePurchaseCommand` always formalizes issues into a real `PENDING` `PurchaseReturn` immediately (see "one growing return" above), so there's never a gap between "issue reported" and "trackable record exists" to paper over.
- **Namespace shadowing gotcha** (still applies, now bites in more places): files inside `Application.Features.PurchaseReturn.Commands`/`Queries` and `Application.Common.Contracts.PurchaseReturn`/`Infrastructure.Services` (where `IPurchaseReturnCalculationService` lives) — and anything else nested under a namespace that has `Application.Common.Contracts.PurchaseReturn` as a sibling, e.g. `IWMSDbContext` in `Application.Common.Contracts.Context` — must qualify entities as `Domain.Entities.PurchaseReturn`/`Domain.Entities.Purchase` where the simple name would otherwise resolve to the namespace segment instead of the type.
- Shipped as migration `20260805211146_purchase-return-lifecycle` (built on top of the last real committed migration, `20260802220706_purchase-return-model`; the intermediate uncommitted `20260805194243_add-purchase-return` migration from the abandoned first rebuild was discarded rather than layered on top). **Not yet applied to any database** — run `dotnet ef database update --project Infrastructure --startup-project WMS` before testing against a real DB.
- The `WarehouseReceiving` feature (old purchase-side) remains deleted from the first rebuild; only `GetWarehouseReceiveSaleListQuery` survives, still unwired.

**Sale shipping & sale returns (2026-08-10).** Built from a business-scenario spec (`docs/return-scenarios-guide.fa.md` section 2, `docs/sale-return-guide.fa.md`) mirroring the `PurchaseReturn` architecture, since no sale-side equivalent existed at all before this. Full detail in `docs/sale-return-guide.fa.md`; summary:

- **`ShipSaleCommand`** (`POST api/Sale/ShipSale`) is a new prerequisite feature — multi-round shipping to the customer, mirroring `ReceivePurchaseCommand`'s shape but for the outbound side: stock goes *down*, not up, and there's no "issues" concept at ship time (problems are only ever reported later by the customer, through `SaleReturn`). Adds `SaleItem.ShippedQuantity`/`SaleItem.SettledQuantity` (mirrors `PurchaseItem`'s fields). Sets `Sale.Status` to `PARTIALLY_DELIVERED` or the newly added `SalesStatusEnum.SHIPPED` (appended at the enum's end, not inserted, so existing persisted `Sale.Status` integers keep their meaning). `DELIVERED` stays manual-only, as in the frontend.
- **`SaleReturn` is a 4-level model** (`SaleReturn` → `SaleReturnClaim` → `SaleReturnItem` → `SaleReturnDecision`), one level deeper than `PurchaseReturn`, because sale returns have two independent axes that `PurchaseReturn` doesn't: the customer's claimed reason (`SalesReturnReasonEnum`, captured at claim time) and the warehouse's physically-observed issue (`SalesReturnIssueTypeEnum?`, captured at inspection time, nullable = inspected healthy). `SaleReturnClaim` is the claim line (customer's reason + claimed quantity, the budget inspection is checked against); `SaleReturnItem` is the per-observed-issue-type inspected quantity (mirrors `PurchaseReturnItem`'s role exactly, one level deeper).
- **Created at claim time, not physical-return time.** `CreateSaleReturnCommand` makes a new `SaleReturn` at `PENDING_INSPECTION` immediately when the claim is filed — the opposite of `PurchaseReturn`, which is only ever created after physical receiving. Only `Sale.Status` in `{SHIPPED, PARTIALLY_DELIVERED, DELIVERED}` is claimable.
- **Several concurrent active returns per sale are allowed** (unlike `PurchaseReturn`'s at-most-one guarantee) — every `CreateSaleReturnCommand` call makes a brand-new `SaleReturn`, never reuses an existing one. `ISaleReturnCalculationService.GetOpenClaimQuantity`/`GetClaimableQuantity` sum reserved quantity across a `List<SaleReturn>` of active returns (`ISaleReturnRepository.GetActiveBySaleIdAsync`), not a single nullable, to arbitrate between them.
- **`ConfirmReturnInspectionCommand`** (`POST api/SaleReturn/ConfirmReturnInspection`) is the warehouse-side counterpart of `ReceivePurchaseCommand`: multi-round, validated against `SaleReturnClaim.UninspectedQuantity` per claim. Only the healthy (`IssueType == null`) verified quantity is added back to `Product.Stock`, at inspection time — mirrors `PurchaseReturn`'s rule that only clean quantity ever touches stock, and matches the spec's explicit statement that defective/damaged/wrong-item quantity never returns to sellable stock.
- **`SaleReturnStatusEnum`** (`PENDING_INSPECTION|COORDINATING|RESOLVED|REJECTED|CANCELLED`) transitions differently from `PurchaseReturnStatusEnum`: `PENDING_INSPECTION` → `COORDINATING` requires *full* inspection completion (`UninspectedQuantity == 0` for every claim), not the first decision — see `ISaleReturnCalculationService.RecomputeReturnStatus`. Cancel/Reject/Delete are only legal pre-inspection (`ISaleReturnCalculationService.IsPreInspection`: `Status == PENDING_INSPECTION && InspectedQuantity == 0`, one definition shared by the three commands and the detail query's `CanCancel`/`CanReject`/`CanDelete` flags), stricter than Purchase's "pre-decision" rule, because a sale return can sit in `PENDING_INSPECTION` for a while with zero inspection done.
- **Decisions** (`SaleReturnDecisionTypeEnum`: `REFUND|REPLACEMENT|STORE_CREDIT|NO_COMPENSATION`) mirror Purchase's `AddPurchaseReturnDecisionCommand`/`RemovePurchaseReturnDecisionCommand` almost exactly, via `AddSaleReturnDecisionCommand`/`RemoveSaleReturnDecisionCommand`. `ISaleReturnCalculationService.IsValidDecision` only excludes one combination: `REPLACEMENT` against a healthy (`IssueType == null`) inspected line — nothing to replace. `STORE_CREDIT` is label-only (bumps `SettledQuantity`, no ledger entity), same as `PurchaseReturn`'s `CREDIT`.
- **Replacement shipping is explicit, not inferred.** Unlike `PurchaseReturn`'s `ResolveAwaitingReplacements` heuristic (which has to *guess* whether an incoming purchase shipment is a promised replacement), the sale side ships *out*, so `ConfirmReplacementShipmentCommand` (`POST api/SaleReturn/ConfirmReplacementShipment`) targets a specific `SaleReturnDecisionId` directly — no guessing needed. Multi-round-safe via `SaleReturnDecision.ReplacementShippedQuantity`; decrements `Product.Stock`.
- **`Sale.Status` is auto-recomputed by return activity, unlike the frontend** (a deliberate deviation, not a gap — see `docs/sale-return-guide.fa.md` for the reasoning): `ISaleReturnCalculationService.RecomputeSaleStatus` only ever overrides `Sale.Status` to `RETURNED`, once every unit ever shipped has been financially settled through a return decision; otherwise `Sale.Status` is left as whatever shipping/manual-delivery set it to. It is called from **`AddSaleReturnDecisionCommand` only** — that is the single command that moves `SaleItem.SettledQuantity`, which is the only input the function reads. Inspection, replacement shipment, cancel/reject/delete/reopen and `AWAITING`-decision removal all leave settled quantity alone, so calling it there was a guaranteed no-op that only forced an extra `Sale → Items` Include.
- **Namespace shadowing gotcha applies again** (same as `PurchaseReturn`, see below): anything in `Application.Features.SaleReturn.*` or `Application.Common.Contracts.SaleReturn.*` must fully qualify `Domain.Entities.SaleReturn`.
- **Include spines and quantity roll-ups are each defined once** (cleanup pass, 2026-08-11). `Application/Features/SaleReturn/SaleReturnQueryExtensions.cs` holds `WhereActive()` (the `PENDING_INSPECTION|COORDINATING` definition, shared with `SaleReturnRepository.GetActiveBySaleIdAsync`), `WithReturnGraph()` (`Claims → Product` + `Claims → InspectionItems → Decisions`) and `WithSaleItems()`. **Any handler that recomputes a status must load `WithReturnGraph()`** — `RecomputeReturnStatus` and the roll-ups sum over the loaded graph, so a missing `ThenInclude` doesn't throw, it silently computes a status from empty collections and persists it. The per-level quantity math lives on the entities as `[NotMapped]` roll-ups (`SaleReturn.ClaimedQuantity/InspectedQuantity/DecidedQuantity`, `SaleReturnClaim.InspectedQuantity/UninspectedQuantity/DecidedQuantity`, `SaleReturnItem.DecidedQuantity/UndecidedQuantity`, `SaleReturnDecision.UnshippedReplacementQuantity`); they are **in-memory only and untranslatable to SQL**, so `GetSaleReturnListQuery`'s server-side projection deliberately still spells its sums out. The decision commands load from `SaleReturns` down (filtering on `Claims.Any(c => c.InspectionItems.Any(...))`) rather than from the decision/item up, so there is one Include spine per handler instead of a reversed second one.
- Shipped as migration `20260809214004_sale-return-and-shipping`, **applied to the local `WMS` database** (verified 2026-08-11 against `__EFMigrationsHistory`). Still **not exercised through a running API**.

**Known gaps / TODOs** (mostly inherited from the initial scaffold):
- `CreatePurchaseCommandHandler` declares `_unitOfWork` but its constructor never assigns it → `NullReferenceException` at runtime (`Application/Features/Purchase/Commands/CreatePurchaseCommand.cs:46-62`).
- **`POST api/Sale/CreateSale` always returns 400** (confirmed against the running API, 2026-08-11): `CreateSaleCommand.ProductIds` is `List<SaleItem>` — the EF entity — and `SaleItem`'s non-nullable `Product`/`Sale` navigations are treated as required by ASP.NET model validation, so no sane payload binds. Needs a request DTO for line items. `CreatePurchaseCommand`/`UpdateSaleCommand` bind `PurchaseItem`/`SaleItem` the same way and are probably equally broken.
- `PaymentDetail` uses `Guid Id`/`Guid PurchaseId` while `Purchase.Id` is `int`; EF added a shadow `PurchaseId1` int FK (see `WMSDbContextModelSnapshot.cs:119-124`). Needs reconciliation.
- `IWMSDbContext` does not expose `DbSet<PurchaseItem>`/`DbSet<SaleItem>` (the concrete `WMSDbContext` does), and the two concrete DbSet properties use `{ get; set; }` while the rest use `=> Set<T>()`.
- List DTOs/queries do not yet surface or filter on `IsActive`; soft-deleted rows are only hidden if a query explicitly filters. Consider adding `IsActive` filters to list queries. (Note: `PurchaseReturn` has no `IsActive` — its lifecycle is `Status` alone, with per-decision `ResolvedAt`; purchase-return queries intentionally do not filter `IsActive`.)
- Validator class naming is inconsistent: `CreateCustomerCommandValidation`/`CreateSupplierCommandValidation` vs the standard `...CommandValidator` suffix.
- `Customer.longitude/latitude` and `Supplier.longitude/latitude` are lowercase in entities while commands use `Longitude/Latitude` — AutoMapper needs config for these.
- Serilog file sinks (`WMS/Logging/SerilogConfiguration.cs`) are never invoked; `Program.cs` only calls `builder.Host.UseSerilog()`, so request/error file logging is not actually wired.
- `Role`, `Department`, `Team`, `PurchaseItem`, `SaleItem`, `PaymentDetail` have no feature folders (no CRUD yet).

**Purchase-return specific gaps / decisions** (multi-round rebuild, see "Current state" above for the full design):
- **No stock-movement ledger exists**: `Product.Stock` is a plain `int`; `ReceivePurchaseCommand` mutates it directly (`Product.Stock += ReceivedQuantity`). The original Go spec assumed a ledger that does not exist here — still true.
- **The frontend's REST-ish routes (`/purchase-returns/:id`, `/purchases/shortage-reports`) are not mirrored** — this project's action-name convention was kept (`POST api/Purchase/ReceivePurchase`, `GET api/PurchaseReturn/GetPurchaseReceivingInfo`, etc.). Whoever wires the frontend off its mock onto this API needs a thin adapter, not a route rename.
- ~~Migration not applied~~: `20260805211146_purchase-return-lifecycle` **is applied** to the local `WMS` database (verified 2026-08-11).
- **Untested against real data**: the multi-round receiving math (budget validation, replacement auto-fulfillment) has been reviewed for logical consistency and the solution builds clean, but has not been exercised through the running API yet.

**Sale-shipping/sale-return specific gaps / decisions** (see "Current state" above for the full design):
- **No stock-movement ledger**, same as Purchase: `Product.Stock` is mutated directly by `ShipSaleCommand`, `ConfirmReturnInspectionCommand`, and `ConfirmReplacementShipmentCommand`.
- **No `CustomerCredit`/ledger entity**: `STORE_CREDIT` decisions are a label only, exactly like `PurchaseReturn`'s `CREDIT` — deliberate scope decision, not an oversight (a real ledger would be its own feature).
- ~~Migration not applied~~: `20260809214004_sale-return-and-shipping` **is applied** to the local `WMS` database (verified 2026-08-11).
- ~~Untested against real data~~: **exercised end-to-end through the running API on 2026-08-11** against the local `WMS` database — 124 assertions, all passing. Two scripted walkthroughs (kept only as scratch, not committed): (1) multi-round `ShipSale` → `CreateSaleReturn` → two-round `ConfirmReturnInspection` → REFUND/REPLACEMENT/STORE_CREDIT decisions → partial then final `ConfirmReplacementShipment` → all four read queries; (2) the lifecycle commands — concurrent-return claim-budget arbitration, reject → reopen → cancel, delete + cascade, the post-inspection guards, and `AWAITING`-only decision removal. Verified along the way: only healthy inspected quantity is restocked, `REPLACEMENT` decisions leave `SettledQuantity` alone, and every over-budget/invalid-transition path returns 400.
  - Test scaffolding note: sales had to be seeded with SQL because **`POST api/Sale/CreateSale` is currently uncallable** — `CreateSaleCommand.ProductIds` is typed `List<SaleItem>`, and that entity's non-nullable `Product`/`Sale` navigations make ASP.NET model validation reject every payload (400 "فرمت داده ورودی صحیح نمی باشد."). Pre-existing, unrelated to the return features; `CreatePurchaseCommand` likely shares it. See the "Known gaps" list above.
- **Seed data available**: `scripts/seed-mock-data.sql` loads the frontend's mock fixtures (products, customers, suppliers, purchases, sales, and a coherent set of both kinds of return) into a migrated DB. It refuses to run against non-empty tables unless `@ResetExisting = 1`. Validated end-to-end against a throwaway migrated database.
- **`SalesStatusEnum.RETURNED` is now reachable** (unlike its still-dead `PurchaseStatusEnum.RETURNED` counterpart) — `RecomputeSaleStatus` sets it once every shipped unit of a sale is settled through return decisions.

## 7. Conventions to avoid

- **Don't add `tbl`-prefixed entities** — that is the smshub2 reference style; this project uses plain `Customer`, `Product`, etc.
- **Don't split handlers/validators into separate files** — request + validator + handler live in one file.
- **Don't route reads through repositories for list/detail queries** — inject `IWMSDbContext` and build LINQ directly.
- **Don't return error messages via `ResponseDto` in handlers** — throw `Common.Exceptions` custom exceptions and let `ExceptionHandlingMiddleware` serialize them.
- **Don't add a global `IsActive` query filter** — soft delete is an explicit `IsActive = false` write; filtering is done per-query.
- **Don't add a test project or repository interfaces beyond the thin per-entity ones** — none exist today.
- **Don't rename the intentional typos** (`Paggination.cs`, `PurchaceStatusEnum`) without asking — they are part of the codebase's existing naming.
