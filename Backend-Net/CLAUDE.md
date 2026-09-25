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
- List queries build an `IQueryable`, apply filters with `if (request.X.HasValue)` / `if (!string.IsNullOrEmpty(request.X))` blocks, then `Select(...).ToPagedAsync(request.Page, request.Take, cancellationToken)` and read `paged.Items` / `paged.PageCount` / `paged.TotalCount`.
- Every paged list query takes `SortBy` (its own `<X>ListSortEnum`, declared at the top of the query file) + `SortDirection` (`SortDirectionEnum`), resolves the direction with `SortingExtensions.ResolveDirection`, switches on `SortBy` with `.SortBy(...)`, and **always ends with `.ThenSortBy(x => x.Id, direction)`** before `ToPagedAsync` - paging without a unique final key is non-deterministic on SQL Server. A new list query needs a case in `ListSortingTests.EverySortOption_OfEveryListQuery_Executes`.
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

**Pagination** — `ToPagedAsync<T>` extension (note the real typo `Paggination.cs`) in `Common/Extensions/Paggination.cs`, returning `PagedResult<T>` (`Items`, `PageCount`, `TotalCount`). Both round-trips (the `COUNT` and the page) are async and take the `CancellationToken`. The old `ToPaged(page, take, out int pageCount, out int totalCount)` overload for `IQueryable` is gone — `out` parameters can't be filled from an awaited call, which is exactly what forced the row count to run synchronously. `Common` now references `Microsoft.EntityFrameworkCore` for this. The `IEnumerable` overloads (`ToPaged`, `GetPageCount`) remain synchronous on purpose: they page an already-materialised in-memory sequence.

**Async design (codebase-wide rule).** Every method that touches the database, the network, or the filesystem is `Task`-returning and takes a `CancellationToken` that is actually threaded through to the EF call:
- `IWMSDbContext` exposes **no** synchronous `SaveChanges()` — only `SaveChangesAsync(cancellationToken)` (via `IUnitOfWork`) and `ExecuteSqlRawAsync(sql, cancellationToken)`.
- `IGenericRepository<T>.GetByIdAsync/GetAllAsync/AddAsync` and `IUserRepository.GetByUsernameAsync/IsExistAsync` all take `CancellationToken cancellationToken = default`; handlers pass their own token, never the default.
- `IGenericRepository<T>.Update`/`Remove` stay **synchronous and `void`** — they only stage a change on EF's change tracker in memory. EF ships no `UpdateAsync`/`RemoveAsync` for the same reason; the round-trip is `SaveChangesAsync`.
- Nothing blocks on a `Task`: no `.Result`, `.Wait()`, or `.GetAwaiter().GetResult()` anywhere. MVC hands `ApiBehaviorOptions.InvalidModelStateResponseFactory` a synchronous signature, so it returns `ResponseHandler.ExceptionResult(...)` (an `IActionResult` MVC writes asynchronously) rather than blocking on `HandleExceptionAsync`.
- Pure CPU/in-memory work stays synchronous and must **not** be wrapped in `Task.Run` or given a fake `async`: the calculation services (`IPurchaseReturnCalculationService`, `ISaleReturnCalculationService`), `IProductCodeService`, `IBarcodeRenderer`, `IPdfDocumentService`, `IEnvironmentService`, `IUserContextService`, and `Common/Extensions/Encryption.cs`. `ITokenService.SetTokenAsync` is the one deliberate exception — it keeps a `Task` return so callers have an awaitable seam for a future token store, but its body is `Task.FromResult(...)`, not `async` without an `await`.

**Observed style worth rethinking later** (captured for a future style review — no change requested now):
- Child rows are added inside handlers via navigation-collection `Add`/`Remove` — there are no per-child repositories (e.g. `claim.Resolutions.Add(...)` in `AddClaimResolutionCommandHandler`).
- The purchase-return feature builds its DTOs by hand in queries/commands; AutoMapper is only used by the classic CRUD features.
- Money is `UInt64` in entities/commands and lands in the DB as `decimal(20,0)` (see `PurchaseItem.UnitPrice`, `PurchaseReturnEffect.Amount`).
- Bulk validation uses `RuleForEach(...).ChildRules(...)` with Persian `WithMessage` texts (see `ReceivePurchaseCommandValidator`).
- Both return features carry `IsActive` (soft delete, filtered per query with `WhereNotDeleted()`) plus a lifecycle `Status` (`ReturnStatusEnum`: `OPEN`/`IN_PROGRESS`/`SETTLED`/`REJECTED`/`CANCELLED`; transitions in `ReturnLifecycleRules`).
- Shared cross-handler business math (status recompute, claimable-quantity math, the lifecycle blocker, composition expansion) lives behind `IPurchaseReturnCalculationService` (`Application/Common/Contracts/PurchaseReturn/`, implemented by `Infrastructure/Services/PurchaseReturnCalculationService.cs`, registered `Scoped` in `InfrastructureServiceRegistration`) — the same interface-in-`Contracts`/implementation-in-`Infrastructure/Services` shape as `ITokenService`/`TokenService` and smshub2's `IDashboardService`/`DashboardService`. Every command that mutates a `PurchaseReturn` or `Purchase` status injects it so the math can't drift out of sync between handlers.

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
| AWSSDK.S3 | 4.0.102.1 | Infrastructure (Liara object storage — S3-compatible) |

**CLI commands**
- Build: `dotnet build WMS.slnx` (from `Backend-Net/`).
- Add a migration (DbContext is in `Infrastructure`, host in `WMS`):
  `dotnet ef migrations add <Name> --project Infrastructure --startup-project WMS`
- Run: `dotnet run --project WMS` (SQL Server connection string in `WMS/appsettings.json` → `ConnectionStrings:SqlServer`).
- Tests: `dotnet test Tests/WMS.Tests` (xUnit; integration tests create throwaway `WMS_Test_{guid}` databases on the local SQL Server `Server=.`).

## 5. Folder structure

```
Backend-Net/
├── Domain/
│   ├── Entities/        # Customer, Product, ProductCategory, Purchase, PurchaseItem,
│   │                    # PurchaseReturn, PurchaseReturnClaim, PurchaseReturnResolution,
│   │                    # PurchaseReturnEffect (+ …EffectRound/…EffectObservation/…EffectMoneyPart),
│   │                    # Sale, SaleItem (now ShippedQuantity/SettledQuantity), Supplier,
│   │                    # User, Department, Team, PaymentDetail,
│   │                    # SaleReturn, SaleReturnClaim, SaleReturnResolution, SaleReturnEffect
│   │                    # (same children), InventoryCostLedgerEntry,
│   │                    # ProductUnit, PurchaseReceivingImage (receiving-session photos,
│   │                    # keyed on Purchase with a nullable SetNull link to PurchaseReturn)
│   └── Enums/           # BalanceTypeEnum, PaymentTypeEnum, ProductUnitEnum,
│                        # PurchaceStatusEnum (typo kept), SalesStatusEnum (now incl. SHIPPED,
│                        # appended at the end to avoid renumbering),
│                        # PurchaseStatusEnum (…|PARTIALLY_RECEIVED|RECEIVED|…),
│                        # shared return enums: ReturnStatusEnum (OPEN|IN_PROGRESS|SETTLED|
│                        # REJECTED|CANCELLED), ReturnClaimScopeEnum, ReturnOffScopeKindEnum,
│                        # ReturnProblemEnum, ReturnEffectDirectionEnum, ReturnEffectStatusEnum,
│                        # ReturnPaymentMethodEnum; InventoryCostEventTypeEnum
├── Application/
│   ├── Common/
│   │   ├── Behaviors/   # ValidationBehavior
│   │   ├── Contracts/   # Repositories/, Context/ (IWMSDbContext), UnitOfWork/, Token/,
│   │   │                # UserContextService/, Environment/, PurchaseReturn/ (IPurchaseReturnCalculationService),
│   │   │                # SaleReturn/ (ISaleReturnCalculationService),
│   │   │                # Storage/ (IObjectStorageService, ObjectStorageOptions, UploadedFileDto),
│   │   │                # (Captcha/ present, unused)
│   │   ├── Dtos/        # ResponseDto (+ Success/Warning/Danger factories), ResponsePageDto, ...
│   │   ├── Enums/       # ResponseMessageTypeEnum
│   │   └── Mapping/     # MappingProfile
│   ├── Features/
│   │   ├── Account/     # Command/ (login, logout, refresh, otp, forget-password)
│   │   ├── Customer/    # Commands/, Queries/, Dtos/
│   │   ├── FileStorage/ # Commands/ (UploadImage, DeleteImage), Queries/ (GetImageUrl)
│   │   │                # (named FileStorage, not File, to avoid System.IO.File shadowing;
│   │   │                #  route is still api/File)
│   │   ├── Product/
│   │   ├── ProductCategory/
│   │   ├── Purchase/
│   │   ├── PurchaseReturn/ # Commands/ (CreatePurchaseReturn, Add/RemoveClaimResolution,
│   │   │                   # ExecuteGoodsRound, Cancel/Reject/Reopen/DeletePurchaseReturn), Queries/, Dtos/
│   │   │                   # (shared status/quantity math lives in IPurchaseReturnCalculationService, above)
│   │   ├── Sale/         # Commands/ now incl. ShipSaleCommand (multi-round shipping, prerequisite
│   │   │                 # for SaleReturn), Queries/, Dtos/
│   │   ├── SaleReturn/   # Commands/ (CreateSaleReturn, Add/RemoveClaimResolution,
│   │   │                 # ExecuteGoodsRound, Cancel/Reject/Reopen/DeleteSaleReturn), Queries/, Dtos/
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
│   │                    # SaleReturnCalculationService, LiaraObjectStorageService
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

> **SUPERSEDED — historical.** This entry and "Sale shipping & sale returns (2026-08-10)" below describe the return model that
> was replaced on 2026-08-28 (`…ReturnItem`/`…ReturnDecision`, closed `DecisionType`, `ConfirmReturnInspection`/`ConfirmReplacementShipment`,
> `PENDING`/`COORDINATING`/`RESOLVED`/`PENDING_INSPECTION`, receiving-time issues, `ResolveAwaitingReplacements`). None of that exists any more.
> Multi-round receiving (`ReceivePurchaseCommand`) and shipping (`ShipSaleCommand`) quantities still stand; everything about returns does not.
> Current return model: the entries from 2026-09-10 onward, `docs/api-guide.fa.md` §10/§12, `docs/return-frontend-migration.fa.md`.

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
- The `WarehouseReceiving` feature folder is **gone entirely** (deleted 2026-09-07). Its last survivor, `GetWarehouseReceiveSaleListQuery`, was never wired to a controller and had no references outside its own folder.

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
- **Include spines and quantity roll-ups are each defined once** (cleanup pass, 2026-08-11). `ISaleReturnQueryService` (`Application/Common/Contracts/SaleReturn/ISaleReturnQueryService.cs`, implemented by `Infrastructure/Services/SaleReturnQueryService.cs`, registered `Scoped`) holds `WhereActive()` (the `PENDING_INSPECTION|COORDINATING` definition, shared with `SaleReturnRepository.GetActiveBySaleIdAsync`), `WithReturnGraph()` (`Claims → Product` + `Claims → InspectionItems → Decisions`, plus `Sale → Items` when called with `includeSaleItems: true`) and the `ActiveWithReturnGraph()` composition of the two. Every method takes and returns an `IQueryable` so callers can still compose their own `Where`/`Include` around it. **Any handler that recomputes a status must load `WithReturnGraph()`** — `RecomputeReturnStatus` and the roll-ups sum over the loaded graph, so a missing `ThenInclude` doesn't throw, it silently computes a status from empty collections and persists it. The per-level quantity math lives on the entities as `[NotMapped]` roll-ups (`SaleReturn.ClaimedQuantity/InspectedQuantity/DecidedQuantity`, `SaleReturnClaim.InspectedQuantity/UninspectedQuantity/DecidedQuantity`, `SaleReturnItem.DecidedQuantity/UndecidedQuantity`, `SaleReturnDecision.UnshippedReplacementQuantity`); they are **in-memory only and untranslatable to SQL**, so `GetSaleReturnListQuery`'s server-side projection deliberately still spells its sums out. The decision commands load from `SaleReturns` down (filtering on `Claims.Any(c => c.InspectionItems.Any(...))`) rather than from the decision/item up, so there is one Include spine per handler instead of a reversed second one.
- Shipped as migration `20260809214004_sale-return-and-shipping`, **applied to the local `WMS` database** (verified 2026-08-11 against `__EFMigrationsHistory`). Still **not exercised through a running API**.

**Image upload to cloud object storage (implemented, 2026-08-17).** Images for products, customers, suppliers, and goods-receiving, stored in Liara Object Storage (S3-compatible) via `AWSSDK.S3` — the shape of the [Liara .NET sample](https://github.com/liara-cloud/dotnet-getting-started/tree/object-storage): AWS SDK pointed at `ObjectStorage:Endpoint` with `ForcePathStyle = true` and `BasicAWSCredentials`.

- **`IObjectStorageService`** (`Application/Common/Contracts/Storage/`, implemented by `Infrastructure/Services/LiaraObjectStorageService.cs`, registered `Singleton` alongside `IAmazonS3`) is the only seam onto the bucket. `UploadAsync`/`DeleteAsync`/`ExistsAsync` are async; **`GetPresignedUrl` and `NormalizeKey` are deliberately synchronous** — presigning is local HMAC signing and key normalization is string work, so neither may be fake-asynced (§3 async rule). Config binds `ObjectStorageOptions` from the `ObjectStorage` section (placeholders in `appsettings.json`; override `ObjectStorage__AccessKey`/`__SecretKey` per environment, never commit real keys).
- **The bucket is private, so the database stores the object KEY, not a URL.** `Product/Customer/Supplier.ImageUrl` (column name kept — no rename migration) holds e.g. `products/2026/08/3f1c….jpg`. A signed URL expires and would rot in a column. Read DTOs therefore split it: **`ImageKey`** (stable, send back on update) and **`ImageUrl`** (freshly signed each read, short-lived, never persist). `NormalizeKey` makes the round-trip safe both ways — a frontend that echoes the signed `ImageUrl` straight back into an update command still persists the bare key.
- **Two-step upload flow.** `POST api/File/UploadImage` (multipart: `file` + `folder` from `ImageFolderEnum` = PRODUCTS|CUSTOMERS|SUPPLIERS|RECEIVING) → returns `UploadedFileDto { ObjectKey, Url, … }`; the caller then sends `ObjectKey` as `ImageUrl` on the normal JSON Create/Update command. Every existing endpoint stays pure JSON. Also `GET api/File/GetImageUrl` (re-sign a stored key — signed URLs expire, keys don't) and `DELETE api/File/DeleteImage`. Feature folder is `Application/Features/FileStorage/` **not** `File/`, to dodge the `System.IO.File` namespace shadowing that bites `PurchaseReturn`; the route is still `api/File`.
- **Keys are always server-generated** (`{folder}/{yyyy}/{MM}/{guid}{ext}`) — the client's file name contributes only its extension, so a path-traversal name or a duplicate name can't do anything. Size/extension/content-type are validated in `UploadImageCommandHandler` (config-driven, hence there rather than in the FluentValidation validator) *before* any byte is streamed out.
- **Unconfigured bucket degrades asymmetrically, on purpose**: `GetPresignedUrl` returns null (a missing key must not 500 a whole page of customers), while `UploadAsync` throws `ServiceUnavailableCustomException` — a misconfiguration should surface at the write, not silently at every read.
- **Goods receiving**: `PurchaseReceivingImage` (`PurchaseId`, `PurchaseReturnId?`, `ObjectKey`, `FileName?`, `Note?`, `CreatedAt`) holds **session-level** photos — evidence for the whole receiving round (pallet on arrival, damaged carton, packing slip), not per line item. It hangs off the **Purchase**, not the return, because a clean round creates no `PurchaseReturn` at all and the photos still need somewhere to live; `PurchaseReturnId` links back when that round did open/extend one and is **`SetNull`, not `Cascade`**, so `DeletePurchaseReturnCommand` leaves the photos intact. Sent via `ReceivePurchaseCommand.Images` (`List<ReceivePurchaseImageDto>`); surfaced on `GetPurchaseReceivingInfoQuery` (all rounds of the purchase) and `GetPurchaseReturnDetailQuery` (that return's rounds).
- **Image fields were added to the list DTOs too** (`ProductListDto`, `CustomerListDto`, `SupplierListDto`) for thumbnails. Signing happens **after** `ToPagedAsync` materializes the page — `GetPresignedUrl` is a local call and can't be translated into the SQL projection.
- Shipped as migration `20260815220942_purchase-receiving-images` (the `PurchaseReceivingImages` table only — the three `ImageUrl` columns already existed). **Not yet applied to any database.**
- **Tests**: `Tests/WMS.Tests/Integration/ImageUploadTests.cs` (upload validation, delete, re-sign, the signed-URL-echoed-back round-trip, key/URL exposure on detail+list for all three entities) and `Tests/WMS.Tests/Integration/PurchaseReceivingImageTests.cs` (clean round with no return, images linked to the active return, URL normalization, photos surviving return deletion, both read queries). `Tests/WMS.Tests/Support/FakeObjectStorage.cs` is the in-memory stand-in — its shared `Instance` is only for tests that touch the stateless half of the interface, since xUnit runs test classes in parallel.

**Purchase/sale driver + note persistence (implemented, 2026-08-30).** `ReceivePurchaseCommand` had accepted `DriverFullName`/`DriverNationalCode`/`VehiclePlate`/`ReceivingNote` for a while but silently dropped all four (never written anywhere) — `Domain/Entities/PurchaseDriver.cs` existed but had no `DbSet`, no migration, and nothing constructing it. Fixed by wiring it up, and mirrored on the sale side (which had no driver fields or persisted `ShippingNote` at all before this).

- **New entities**: `PurchaseDriver` (existing type, added `CreatedAt`), `SaleDriver` (new, same shape keyed by `SaleId`), `PurchaseReceivingNote`, `SaleShippingNote` (new — deliberately separate from the driver entities: a note describes the receiving/shipping event, not the driver who happened to carry it out; the two are independent, either can be present without the other).
- **History, not a single field**: each is a list keyed by `PurchaseId`/`SaleId` with its own `CreatedAt`, following the `PurchaseReceivingImage` precedent — `ReceivePurchaseCommand`/`ShipSaleCommand` can be called multiple times for one purchase/sale (partial deliveries/shipments), each round possibly with a different driver.
- **No `IsActive`** on any of the four — same as `PurchaseReceivingImage`, these are append-only event-log rows, not independently editable/deletable entities.
- **Written directly via `IWMSDbContext`** (`_context.PurchaseDrivers.AddAsync(...)` etc.), not through a repository — matches the established pattern for this kind of receiving/shipping child row (`PurchaseReceivingImage` does the same), not the older repository-per-aggregate description elsewhere in this doc.
- `ShipSaleCommand` gained `DriverFullName`/`DriverNationalCode`/`VehiclePlate` request fields (it only had `ShippingNote` before, also previously unpersisted).
- Surfaced on read via `PurchaseDto.Drivers`/`ReceivingNotes` and `SaleDto.Drivers`/`ShippingNotes` (`GetPurchaseDetailQuery`/`GetSaleDetailQuery`) — hand-built DTO projections, matching how these two queries already worked.
- `docs/api-guide.fa.md` updated to match (§9 `ReceivePurchase`/`GetPurchaseDetail`, §11 `ShipSale`/`GetSaleDetail`).
- **Migration not yet generated or applied** — no `dotnet` available in the environment that made this change; run `dotnet ef migrations add add-purchase-sale-drivers-and-notes --project Infrastructure --startup-project WMS` then `dotnet ef database update --project Infrastructure --startup-project WMS`, and a `dotnet build` first since none of this has been compiled yet either.
- Unrelated to `PurchaseReturn`/`SaleReturn`'s own `PartyName`/`PartyNationalId`/`VehiclePlate`/`Note` on `ExecuteGoodsRound` (§9/§10 of the API guide, per-effect-round on the return side) — same shape, different feature, no code shared.
- **`DriverNationalCode` → `DriverPhoneNumber` (2026-09-02).** Renamed on `PurchaseDriver`/`SaleDriver` and the corresponding `ReceivePurchaseCommand`/`ShipSaleCommand` request fields, `PurchaseDto`/`SaleDto` driver DTOs, and the two detail-query projections — the field now stores the driver's phone number instead of national ID. Both commands' validators gained an optional `Validation.IsMobileNumber` check on the field (guarded by `.When(... !string.IsNullOrWhiteSpace ...)`, since the field stays optional), matching the pattern already used on `Customer`/`Supplier` phone fields. Shipped as migration `20260901225139_rename-driver-national-code-to-phone-number` (a genuine `RenameColumn` on both `PurchaseDrivers.DriverNationalCode`/`SaleDrivers.DriverNationalCode`, generated by letting `dotnet ef migrations add` detect the rename rather than hand-editing the model snapshot first — editing the snapshot before generating suppresses the diff and produces an empty migration, which is what happened on the first attempt and had to be undone via `dotnet ef migrations remove`). **Applied to the local `WMS` database (2026-09-02).** `docs/api-guide.fa.md` §9/§11 examples updated to match.

**Purchase/Sale pre-invoice (proforma) + invoice attachments (2026-09-01).** Built from the
frontend's proforma commit (`92544f6`) plus `docs/invoice-attachment-requirements.fa.md`.

- **`PurchaseStatusEnum`/`SalesStatusEnum` were renumbered (2026-09-02) to put `PROFORMA = 0`
  first**, matching the frontend's own renumbering exactly instead of asking the frontend to
  adopt append-only backend numbers (the 2026-09-01 decision documented in
  `docs/frontend-enum-contract.fa.md` — see that file's newer update note for the reversal).
  This breaks §7's "never renumber a persisted enum" rule on purpose: there is no real
  persisted data yet (mock data only), so no adapter/translation layer was written — the
  integers were just changed directly. `PurchaseStatusEnum` is now `PROFORMA=0, PENDING=1,
  SHIPPED=2, PARTIALLY_RECEIVED=3, RECEIVED=4, CANCELLED=5` (the old `RETURNED` member was
  dropped — it was permanently unreachable dead code, per the older documented gap, and the
  frontend never had it either). `SalesStatusEnum` is now `PROFORMA=0, PROCESSING=1,
  PARTIALLY_DELIVERED=2, SHIPPED=3, DELIVERED=4, CANCELLED=5, RETURNED=6` — the first six
  match the frontend's `SaleStatusEnum` exactly; `RETURNED` has no frontend counterpart yet
  (it's genuinely still needed backend-side — it's set by
  `SaleReturnCalculationService.RecomputeSaleStatus`) so it's appended after the shared members
  instead of interleaved, keeping every value the frontend does know about aligned on the wire.
  Update `scripts/seed-mock-data.sql` if you add more raw `Status` integers by hand — its
  Purchase/Sale insert blocks were updated to the new numbering in the same change.
  **✅ SOLVED (2026-09-01) — `SalesStatusEnum.PENDING` removed.** The original append-only
  numbering above briefly had both `PENDING=6` and `RETURNED=7`, reasoning that `PENDING` was
  "a real pre-shipping status used throughout the test suite" and therefore needed to stay.
  That reasoning didn't hold up: nothing in production code ever sets it (only test seeds did,
  as an arbitrary stand-in for "not shipped yet"), and the frontend already displays it under
  the *exact same label* as `PROCESSING` if it ever received it — so backend/frontend were
  already in agreement that the distinction carries no meaning today. Per
  `docs/frontend-enum-contract.fa.md` section 1's open question, `PENDING` was deleted from
  `SalesStatusEnum` and every test seed that used it now uses `PROCESSING` instead (semantics
  unchanged — a sale that hasn't shipped yet). `RETURNED` shifted from `7` to `6`; safe because
  the frontend has no expectation for either number and, per the renumbering note just above,
  there is still no real persisted `Sale` data for this enum. If a genuinely distinct
  pre-shipping status is ever needed again, it should be reintroduced together with a frontend
  change, not appended silently.
- **Purchase**: a purchase in `PROFORMA` has no `InvoiceNumber`/`InvoiceDate` requirement
  (`CreatePurchaseCommandValidator`/`UpdatePurchaseCommandValidator` relax both `.When(x =>
  x.Status != PurchaseStatusEnum.PROFORMA)`). Leaving `PROFORMA` requires a non-empty
  `InvoiceNumber` — enforced in `UpdatePurchaseCommandHandler` (throws
  `ValidationCustomException` otherwise) since `Update` is the only path that changes an
  existing purchase's status. An attachment is recommended but **not** enforced (explicit
  scope decision — see the plan this shipped from).
- **Sale**: identical validator relaxation, but the exit rule is fully automatic and
  payment-driven, not manual. `CreateSaleCommandHandler`/`UpdateSaleCommandHandler` check
  `PaidAmount >= TotalAmount` while `Status == PROFORMA`: if true, the handler itself
  generates the official invoice number (`Generator.GenerateInvoiceNumber`, same
  `INV-{year}-{seq:D4}` shape as `GenerateReturnNumber`/`GenerateSaleReturnNumber`), sets
  `InvoiceDate = DateTime.Now`, and forces `Status = PROCESSING`. `UpdateSaleCommandHandler`
  additionally **rejects** an attempt to move a `PROFORMA` sale to any other status without
  full payment (`ValidationCustomException`) — staff cannot manually push a sale out of
  proforma before the customer has paid. **Changed 2026-09-24: the threshold is now
  `PaidAmount > 0`, not full payment** — see the dated entry "Proforma exits on the first
  payment" further down.
- **`DocumentAttachment`** (`Domain/Entities/DocumentAttachment.cs`) is a new *shared* table —
  option (a) from `docs/invoice-attachment-requirements.fa.md` — keyed loosely by
  `(DocumentKind, DocumentId)` instead of a real FK, so one table backs every document kind.
  `DocumentKindEnum` has all four values (`PURCHASE=1, SALE=2, PURCHASE_RETURN=3,
  SALE_RETURN=4`) but **only `PURCHASE`/`SALE` are wired** into
  `CreatePurchaseCommand`/`UpdatePurchaseCommand`/`CreateSaleCommand`/`UpdateSaleCommand` and
  `PurchaseDto.Attachments`/`SaleDto.Attachments` — `PurchaseReturn`/`SaleReturn` attachments
  are still open (out of this task's scope, not forgotten).
- **`Update` replaces attachments wholesale**, not additively — `UpdatePurchaseCommandHandler`/
  `UpdateSaleCommandHandler` delete every existing `DocumentAttachment` row for that
  `(DocumentKind, DocumentId)` and re-insert the request's list, matching the requirements
  doc's §2.2 contract (the frontend always sends the final list).
- **PDF support**: `.pdf`/`application/pdf` added to `AllowedImageExtensions`/
  `AllowedImageContentTypes` in `appsettings.json` (requirements doc §2.4 option 1 — no new
  upload endpoint).
- Shipped as migration `add-proforma-and-document-attachments` (chained onto
  `20260830210607_add-purchase-sale-drivers-and-notes`) — only creates the
  `DocumentAttachments` table + `(DocumentKind, DocumentId)` index; no Purchase/Sale schema
  change was needed since `PROFORMA` is just a new integer on an already-`int` `Status`
  column. **Applied to the local `WMS` database (2026-09-02)** — this migration had been
  sitting pending since it shipped, which meant any `CreatePurchase`/`UpdatePurchase`/
  `CreateSale`/`UpdateSale` call with a non-empty `attachments` array threw a SQL error
  (`Invalid object name 'DocumentAttachments'`) even though the handler code was correct;
  that pending migration was reported as "receiving purchase doesn't store files/pictures
  properly" — `ReceivePurchaseCommand`'s own photo storage (`PurchaseReceivingImages`, a
  different, already-applied table/migration) was never actually broken and is covered by
  passing tests (`PurchaseReceivingImageTests`).
- **Tests**: new cases in `Tests/WMS.Tests/Integration/PurchaseCrudTests.cs` (create as
  `PROFORMA`, leaving `PROFORMA` without/with an invoice number, attachment persistence) and
  `SaleCrudTests.cs` (partial-payment stays `PROFORMA`, full-payment auto-finalizes on both
  Create and Update, manual exit without full payment rejected), plus a
  `Generator.GenerateInvoiceNumber` unit test. All pass (`dotnet test`).
- **`Tests/WMS.Tests` switched from SQLite to real SQL Server (2026-09-01).** `TestDatabase`
  (`Tests/WMS.Tests/Support/TestDatabase.cs`) and `WmsApiFactory`
  (`Tests/WMS.Tests/Functional/WmsApiFactory.cs`) previously ran against SQLite in-memory,
  which cannot create the `HasSequence<int>("UserPersonelCode")` sequence the
  `personelcode-int` migration added (2026-08-29) — every integration/functional test failed
  with `SQLite does not support sequences`, regardless of what it was testing, since schema
  creation itself failed. Both fixtures now point at the same SQL Server instance as
  production (`Server=.`, per `WMS/appsettings.json`), each test creating its own
  `WMS_Test_{guid}` database via `EnsureCreated()` and dropping it via `EnsureDeleted()` on
  dispose. The `Microsoft.EntityFrameworkCore.Sqlite`/`SQLitePCLRaw.lib.e_sqlite3` package refs
  were removed from `Tests/WMS.Tests/WMS.Tests.csproj` as unused. Requires a reachable local
  SQL Server to run the suite at all now (there wasn't one implicitly required before). Result:
  335/336 tests pass. The one still-failing test
  (`ApiCrudFunctionalTests.GetCustomerList_WithStoredImageKey_AndUnconfiguredBucket_StillReturns200`)
  expects an unconfigured object-storage bucket to yield a null `imageUrl`, but
  `appsettings.json`'s `ObjectStorage:AccessKey`/`SecretKey` placeholders are the literal string
  `"***"` rather than blank — `LiaraObjectStorageService.IsConfigured` treats any non-blank
  string as configured, so it signs a garbage URL instead of returning null. Pre-existing,
  unrelated to this feature, only surfaced now that the DB layer actually works; not fixed
  here.

**Payment due date (`PaymentDate`) wired end-to-end (2026-09-05).** `Purchase.PaymentDate` had
existed since the `purchace-and-more` migration but was write-only dead weight — nothing set it,
read it, or exposed it; `Sale` had no equivalent at all. It is the credit deadline: the date by
which the buyer (us on a purchase, the customer on a sale) must settle. Now treated the same way
`InvoiceDate` is, everywhere.

- **Made `DateTime?`, not `DateTime`.** A cash transaction genuinely has no deadline, and the old
  non-nullable column forced a meaningless `0001-01-01` (the seed script papered over this by
  copying `InvoiceDate` into it). Widening `Purchases.PaymentDate` to nullable is safe — nothing
  read it. `Sales.PaymentDate` is new and nullable from the start.
- **Surfaced on**: `CreatePurchaseCommand`/`UpdatePurchaseCommand`/`CreateSaleCommand`/
  `UpdateSaleCommand` (bound by AutoMapper's name convention on the Create maps; the Update
  handlers assign it explicitly next to `InvoiceDate`), `PurchaseDto`/`SaleDto`,
  `PurchaseListDto`/`SaleListDto`, and all four list/detail query projections.
- **New list filters** `FromPaymentDate`/`ToPaymentDate` on `GetPurchaseListQuery`/
  `GetSaleListQuery`, alongside the existing `FromDate`/`ToDate` (which stay on `InvoiceDate`) —
  this is what a "due soon / overdue" screen needs.
- **Validation**: optional, but must not precede `InvoiceDate` when present — guarded with
  `.When(x => x.PaymentDate.HasValue && x.InvoiceDate != default)` so a `PROFORMA` row (whose
  `InvoiceDate` is legitimately unset) isn't caught by it.
- **PDFs**: `InvoiceDocumentModel.PaymentDueDate` (nullable, printed only when set) fed from
  `GetSaleInvoicePdfQuery`/`GetPurchaseInvoicePdfQuery`. The QuestPDF renderer prints it as a
  third header line under شماره/تاریخ. The **Excel** renderer can't — the official template has no
  due-date cell — so it appends «مهلت پرداخت: …» into the free-form notes cell (`AE29`) ahead of
  the description. Not added to `GetSaleReturnCreditNotePdfQuery`: a credit note settles a return,
  it has no payment deadline of its own.
- **Deliberately not added to** `GetPurchaseReceivingInfoQuery`/the warehouse-receiving DTOs (a
  receiving screen doesn't care about payment terms) or the report queries (which group on
  invoice/shipping dates by design — see §"Known gaps" and `docs/api-guide.fa.md` §14's note).
- `docs/api-guide.fa.md` §9/§11 updated (list/detail/create/update payloads + the two new query
  params); `scripts/seed-mock-data.sql` now sets a realistic +30-day deadline on credit rows and
  `NULL` on cash rows instead of duplicating `InvoiceDate`.
- Shipped as migration `20260904213229_add-sale-payment-date` (adds `Sales.PaymentDate`, alters
  `Purchases.PaymentDate` to nullable). **Applied to the local `WMS` database (2026-09-05).**
- **Tests**: 11 new (`PurchaseCrudTests`/`SaleCrudTests` create+detail round-trip, update, the
  purchase due-date range filter; `CrudValidatorTests` for all four validators' before/after/null
  cases), all passing. Suite is 339/347 — the 8 failures are pre-existing and unrelated (verified
  by running them against a clean tree): 7 collide on the `IX_Users_PersonelCode` unique index
  added by `20260904200850_personelcode-unique`, and the 8th is the long-documented
  `GetCustomerList_WithStoredImageKey_AndUnconfiguredBucket_StillReturns200` `"***"` placeholder gap.

**`InvoiceDate` made nullable, enforced per-status (2026-09-05).** `Purchase.InvoiceDate`/
`Sale.InvoiceDate` were non-nullable `DateTime`, so the PROFORMA relaxation shipped on
2026-09-01 (validators guarded with `.When(x => x.Status != …PROFORMA)`) let a proforma pass
validation but still persisted `DateTime.MinValue` — the API handed the frontend a literal
`0001-01-01T00:00:00` instead of `null`, and `PaymentDate`'s own rule had to work around it
with an `x.InvoiceDate != default` guard.

- **Now `DateTime?` on both entities**, both commands per side, `PurchaseDto`/`SaleDto`,
  `PurchaseListDto`/`SaleListDto`, `PurchaseReceivingInfoDto`, and `ReceiveSaleReturnListDto`.
- **Null is legal if and only if `Status == PROFORMA`.** All four validators
  (`CreatePurchaseValidator`, `UpdatePurchaseCommandValidator`, `CreateSaleCommandValidator`,
  `UpdateSaleCommandValidator`) now use `Must(d => d.HasValue && d.Value != default)
  .When(x => x.Status != …PROFORMA)` rather than `NotEmpty()` — on a `DateTime?`, `NotEmpty()`
  only rejects `null`, so a caller could still smuggle `0001-01-01` past it. A proforma *may*
  carry a date; it just isn't required to.
- **`PaymentDate`'s comparison rule** switched its guard from `x.InvoiceDate != default` to
  `x.InvoiceDate.HasValue` (FluentValidation's nullable `GreaterThanOrEqualTo` overload).
- **PDF fallback**: `GetPurchaseInvoicePdfQuery`/`GetSaleInvoicePdfQuery` print
  `InvoiceDate ?? CreatedAt` — `InvoiceDocumentModel.DocumentDate` stays non-nullable, since a
  printed document always needs *a* date and the QuestPDF layout has no "no date" branch.
- **Report bucketing**: `GetPurchaseReportQuery`/`GetSaleReportQuery` gained an explicit
  `x.InvoiceDate != null` in their `Where` (SQL already excluded nulls via the `>= fromDate`
  comparison; the filter makes the following `!.Value` honest rather than load-bearing on that
  side effect). The statistics/list queries needed no change — nullable comparisons translate.
- Shipped as migration `20260904223059_make-invoice-date-nullable`, which also **backfills**:
  existing `Status = 0` (PROFORMA) rows holding `0001-01-01` are set to `NULL`. **Applied to
  the local `WMS` database (2026-09-05).**
- `docs/api-guide.fa.md` §9/§11/§15 updated.
- **Tests**: 14 new — 12 validator cases (null-on-proforma valid, null-on-non-proforma invalid,
  `default(DateTime)`-on-non-proforma invalid, for each of the four validators) and 2
  integration round-trips (`CreatePurchase`/`CreateSale` as PROFORMA with no date → column is
  `NULL`, and the purchase detail query returns `null`). Suite is 352/361; the 9 failures are
  pre-existing and unrelated (verified by running them against a stashed tree) — the
  `IX_Users_PersonelCode` collisions and the `"***"` object-storage placeholder gap.
- **Gotcha found while writing the tests**: `SalesStatusEnum.PROFORMA` is `0`, so a
  `CreateSaleCommand`/`UpdateSaleCommand` that never sets `Status` defaults to PROFORMA and
  silently skips every invoice-field requirement. `PurchaseStatusEnum.PROFORMA` is `0` too.
  The frontend must send `status` explicitly on create.

**`ReturnPaymentMethodEnum` renumbered to match `PaymentTypeEnum` (2026-09-05).** *(`STORE_CREDIT` was removed on 2026-09-24 - see "Store credit removed" below.)* Requested by
the frontend in `docs/payment-enum-unification.fa.md`: the two enums meant the same things with
different integers, so a shared "split an amount across payment methods" component produced a
different meaning depending on which form called it. Now `CASH=0, ON_ACCOUNT=1, CHECK=2,
TRANSFER=3, MIXED=4, STORE_CREDIT=5` — the first five line up with `PaymentTypeEnum`
(`ON_ACCOUNT` is that enum's `CREDIT`); `STORE_CREDIT` is the only genuinely extra member and is
appended at the end.

- **The enum was kept, not merged into `PaymentTypeEnum`** (option A of the two the request
  offered). Every C# usage referenced members by name, so only the wire numbers changed and no
  handler/DTO/service code needed touching.
- **Data migration `20260904225819_renumber-return-payment-method`** remaps the persisted
  `Method` column on `PurchaseReturnEffects`, `SaleReturnEffects`,
  `PurchaseReturnEffectMoneyParts`, `SaleReturnEffectMoneyParts`. The old→new map
  (`1→2, 2→3, 3→1, 4→5, 5→4`) is a **cyclic permutation**, so it must run as a single
  `UPDATE … CASE` per table — sequential `UPDATE`s would clobber each other. `Down` applies the
  inverse (`1→3, 2→1, 3→2, 4↔5`). `NULL`/`0` pass through untouched. The migration is otherwise
  empty (no schema diff — `Method` was already an `int` column). **Applied to the local `WMS`
  database (2026-09-05)**; contrary to the request's guess that the returns tables were empty,
  there were 12 rows across the four tables, verified value-by-value before and after.
- Docs updated: `docs/api-guide.fa.md` §15's `ReturnPaymentMethodEnum` table and the `MIXED`
  reference in §9 (`MIXED` is now `4`, not `5`), and `docs/frontend-enum-contract.fa.md`'s
  `PAYMENT_METHODS` row (which had documented the two as deliberately *not* aligned).
- The request's §6 side note (the frontend was sending claim quantity as `qty` while the DTO
  expects `Quantity`, so claims silently persisted `0`) was frontend-side and already fixed
  there; checked the local DB for damage — `PurchaseReturnClaims`/`SaleReturnClaims` have no
  `Quantity = 0` rows.
- Build clean; suite 352/361, the same 9 pre-existing failures as before this change (the
  `IX_Users_PersonelCode` collisions and the `"***"` object-storage placeholder gap).

**Frontend-enum-contract cleanup pass (2026-09-01).** Follow-up audit of
`docs/frontend-enum-contract.fa.md` against the actual code — most of its checklist turned out to
already be done (silently, back on 2026-08-28 in the returns-effects rebuild) and the doc just
hadn't been checked off; a few genuinely new fixes went in alongside it. Full detail and rationale
in `docs/frontend-enum-contract.fa.md` itself (now carries ✅ SOLVED markers throughout) and
`docs/returns-effects-and-org-structure-summary.fa.md` (one factual correction). Summary:

- **✅ SOLVED — the return-domain "composite effects vs. closed enum" architecture decision
  (contract doc §3).** Already fully implemented on 2026-08-28: `PurchaseReturn`/`SaleReturn` →
  `…Claim` → `…Resolution` → `…Effect`, matching the frontend's `returnDoc → claims[] →
  resolutions[] → effects[]` exactly. No `DecisionType` enum exists anywhere in the codebase
  anymore. The contract doc's checklist just hadn't been updated to reflect it.
- **✅ SOLVED — `ReturnEffectStatusEnum.VOID`, the full 14-member `ReturnProblemEnum`, and
  `ReturnClaimScopeEnum`/`ReturnOffScopeKindEnum`** (contract doc §3.4) all already exist and
  match the frontend's numbers exactly — same 2026-08-28 rebuild, same stale-checklist situation.
- **`ProductUnitStatusEnum` — 4 unused members deleted.** The contract doc's §2 claimed both
  sides already agreed on just 4 members (`IN_STOCK`/`SOLD`/`RETURNED_TO_SUPPLIER`/`SCRAPPED`),
  but the backend enum actually still had `SHIPPED=5`/`DAMAGED=6`/`LOST=7`/
  `RETURNED_BY_CUSTOMER=8` sitting in it, unused — added 2026-08-28 for a "manual status entry"
  warehouse feature that was never designed, per a frontend request the frontend itself walked
  back the same week. Checked both application code (`ProductUnitService` — the only thing that
  mints/consumes/restores/reconciles units — never wrote any of the 4) and every SQL seed script
  (none set them either) before deleting; no live-database check was possible from this session
  (no `dotnet`/`sqlcmd` in this environment — see below). Now back to exactly the 4 members the
  frontend has.
- **`SalesStatusEnum.PENDING` removed, `PROCESSING` used instead — see the dated note in the
  "Purchase/Sale pre-invoice" entry above** for the full reasoning (contract doc §1's open
  question). `RETURNED` shifted from `7` to `6`.
- **`SupplierListDto.Status` — now `BalanceType.GetDescription()`, not `.ToString()`.** This was
  the one documented string-typed enum exception in the whole API (contract doc §5.3); it used to
  leak the raw English enum member name (`"Creditor"`). Switched to the project's existing
  `Common.Extensions.EnumExtensions.GetDescription()` helper (reads `[Description]`, same one
  `Product.Unit.GetDescription()` already uses on the return queries), so it now returns the same
  Persian text `BalanceTypeEnum`'s `[Description]` attributes already produce everywhere else
  (`"طلبکار"`/`"بدهکار"`/`"تسویه شده"`). Still the one string-typed enum field in the API — the
  *value* changed, the exception itself didn't — `GetSupplierListQuery` now computes it after
  `ToPagedAsync` materializes the page, same reason `ImageUrl` signing already happens there
  (`GetDescription`/`GetPresignedUrl` are local calls, not SQL-translatable). **This changes what
  the field returns on the wire** (English literal → Persian text) — flag it to whoever owns the
  frontend's supplier list if anything there reads `status` instead of the numeric `balanceType`
  field that sits right next to it.
- **`docs/api-guide.fa.md` §15 `PurchaseStatusEnum`/`SalesStatusEnum` tables were still showing
  the *pre-renumbering* integers** (`PENDING=0, SHIPPED=1, …, PROFORMA=6/7` at the end) — stale
  since the 2026-09-02 renumbering above never touched this doc. Rewritten to the current
  `PROFORMA=0`-first numbering (and to drop `PENDING` from the sale table per this change). Also
  added the undocumented `balanceType` query param to both `GetCustomerList`/`GetSupplierList` in
  §4/§5 (contract doc §5.2 — the param already worked, it just wasn't written down), and noted the
  differing param names between the two list endpoints (`fullName`/`minBalance`/`maxBalance` vs.
  `companyNameOrContactName`/`fromBalance`/`toBalance`) so it stops looking like an inconsistency
  nobody noticed.
- **`docs/returns-effects-and-org-structure-summary.fa.md` had one factual error**, corrected in
  place: it claimed `RETURNED_BY_CUSTOMER` "was actually put to use in phase B" — it wasn't; grep
  across `Application`/`Domain`/`Infrastructure` turns up zero references, and it's now deleted
  along with the other 3 unused members (see above).
- **✅ Verified (2026-09-02) with `dotnet build`/`dotnet test` against local SQL Server.** Build:
  0 errors. Tests: 335/336 pass — the one failure is the pre-existing, already-documented
  `GetCustomerList_WithStoredImageKey_AndUnconfiguredBucket_StillReturns200` gap (see the
  pre-invoice section above), unrelated to this pass.

**Images are served through the API, not by linking at the bucket (2026-09-07).** Full detail in
`docs/image-serving-guide.fa.md` / `.en.md`. Summary:

- **Liara's storage edge 404s browser User-Agents.** Any request to `*.storage.c2.liara.site` whose
  `User-Agent` contains Mozilla/Chrome/Safari/Firefox gets a plain-text `404 page not found` from
  their router, never reaching the S3 gateway — regardless of path-style vs virtual-host, public vs
  presigned, HTTP/1.1 vs HTTP/2, or whether the object exists. Proven by header bisection against a
  known-good object. **No bucket URL can ever load in a browser**, so the signing code was never the
  problem.
- **This cannot be fixed in the frontend.** `User-Agent` is a forbidden header name — `fetch` drops
  it and `XMLHttpRequest.setRequestHeader` refuses ("Refused to set unsafe header"). The one header
  Liara filters on is the one header a browser never lets JS set. Tested from a real cross-origin
  page: fetch, fetch+UA, XHR and `<img>` all fail.
- **`GET api/File/GetImage?objectKey=…`** (`[AllowAnonymous]`, returns `FileResponseDto` via
  `File(content, contentType)` with no download filename) streams the object server-side, where the
  SDK's User-Agent is not blocked. Anonymous because `<img src>` cannot send a bearer token; grants
  nothing new since the bucket is already public-read.
- **`IObjectStorageService.GetFixedUrl` now returns `{PublicBaseUrl}/api/File/GetImage?objectKey=…`**
  — our host, never the bucket. The name was kept so all 15 call sites are unchanged. New
  `DownloadAsync` → `StoredFileDto`. `GetExpirableUrl` still presigns the bucket directly and is now
  documented **server-to-server only**. `NormalizeKey` was restored and extended to strip our own
  `?objectKey=` URL (the key is in the query string, not the path) — it had been deleted, and is
  required again because `ImageUrl` on a read response is now an API URL that a frontend may echo
  back into an update.
- **New config `ObjectStorage:PublicBaseUrl`** — this API's own public base URL; must be set per
  environment. Blank ⇒ relative URLs, which only work same-origin.
- **`CorsSettings:AllowedOrigins` was `["localhost"]`** — a bare host, not an origin, so
  `WithOrigins()` matched nothing and **no** browser call from the Vite dev server ever got an
  `Access-Control-Allow-Origin` (login and lists included; there is no Vite proxy). Fixed to
  `http://localhost:5173` / `http://127.0.0.1:5173`; **add the production origin before deploying**.
- **`DisablePayloadSigning` was deliberately NOT restored** — `RequestChecksumCalculation.WHEN_REQUIRED`
  in the DI registration already handles the `aws-chunked` framing issue; verified byte-identical
  uploads without it.
- **Object keys are the uploader's file name, de-duplicated with a numeric suffix**
  (`logo.png` → `logo-1.png` → `logo-2.png`) rather than the GUID scheme `BuildObjectKey` used to
  generate — a deliberate choice so the bucket listing stays recognisable. `ResolveAvailableKeyAsync`
  probes with `ExistsAsync` up to 50 times, then falls back to a GUID suffix rather than failing the
  upload. **It is check-then-put, not atomic:** this provider *ignores* `If-None-Match: *` (verified
  against the live bucket — the second PUT returned 200 and clobbered the first), so the race window
  is one round-trip, versus the old behaviour of overwriting on every same-name upload.
  `SanitizeFileName` reduces the client-controlled name to a single path segment (both `/` and `\`
  regardless of host OS, since it comes off an HTTP request), stripping control characters,
  surrounding whitespace and leading/trailing dots, so `../../evil.png` cannot pick its own prefix.
  Keys remain guessable by design, on a bucket that is public-read.
- **`UploadImageCommandHandler` checks the extension allow-list against the TRIMMED file name** —
  `"  photo.png  "` used to yield extension `".png  "` and be rejected.
- **`ImageFolderEnum folder` is still accepted and validated but unused** — keys are flat.
- **Two round-trip bugs found by auditing all 28 consumers of the service, both fixed:**
  (a) `CreatePurchaseCommand`/`UpdatePurchaseCommand`/`CreateSaleCommand`/`UpdateSaleCommand` all
  injected `IObjectStorageService` and never called it — `DocumentAttachment.ObjectKey` was persisted
  verbatim while the detail queries read it back through `GetFixedUrl`. Worst here because Update
  replaces the attachment list wholesale, so a frontend re-sending what it read can put a URL into
  the key column. (b) `ScanBarcodeQuery` did not inject the service at all: it set
  `ImageUrl = product.ImageUrl` (the raw KEY) and left `ImageKey` null — inverted versus every other
  read path, so `<img src>` resolved against the frontend's origin and the scan screen showed a
  broken image. Now `ImageKey` + `GetFixedUrl`, matching `GetProductDetailQuery`.
- **All six image-write fields renamed to `ImageKey` (breaking wire change).** They previously
  disagreed with each other and with the read side: `CreateProductCommand.ImageUrl`,
  `UpdateProductCommand.ImageObjectKey`, and `ImageUrl` on the four Customer/Supplier create+update
  commands. `ImageKey` won over the majority `ImageUrl` because read and write are now symmetric —
  every read DTO returns `imageKey` (stable) + `imageUrl` (display only), and `imageKey` is what you
  send back; a write field called `imageUrl` that actually wants a key is the exact trap
  `NormalizeKey` exists to catch. The entity column is still `ImageUrl` (no rename migration), and
  the three AutoMapper create-maps now explicitly `Ignore()` it so no convention mapping can bypass
  `NormalizeKey`. Frontend migration instructions are in `docs/image-serving-guide.*.md` §5 and
  `docs/api-guide.fa.md` §17.
- **Gotcha: `DeleteObject` returns 204 for a key that does not exist**, so "delete works" is never
  evidence the key was right. And a plain-text `404 page not found` is the provider's router, not
  S3 — only the XML `<Code>NoSuchKey</Code>` means the object is genuinely missing.
- **Frontend follow-up (latent, not live)**: `objectKeyOf` in
  `Frontend/src/shared/services/files/objectKey.js` reads the key from a URL's pathname and discards
  the query string; fed a new-style URL it returns `api/File/GetImage`. Every current call site
  passes a key rather than a URL, so nothing is broken today.
- Verified: build clean; 20 image/attachment tests pass (7 added); suite 359/368 with the same 9 pre-existing
  failures; live browser renders plain/spaced/Persian keys; cross-origin `<img>` loads; de-duplication
  and file-name sanitisation exercised against the real bucket through the real service.

**Production bug-list pass (2026-09-07).** Eleven reported items, investigated against the running
code before changing anything. Two of the reported diagnoses did not survive investigation and the
real causes were different - both are recorded here because the wrong explanation is the more
tempting one.

- **The money-effect validator was not a null-forgiving/`When()` interaction.** The report blamed
  `RuleFor(x => x.Composition.Money!.Kind) ... .When(x => x.Composition.Money != null)` for
  dereferencing `Money` regardless of the condition, and so blocking goods-only resolutions. Ran the
  validator directly: a goods-only resolution **passes** - FluentValidation resolves the property
  accessor lazily inside the component loop, after the per-component condition, so the `!` is
  harmless. What actually failed was every resolution *carrying* a money effect:
  `MoneyEffectDto.Kind` was a `ReturnEffectKindEnum`, whose zero value is `GOODS_IN`, so any client
  that omitted `kind` was rejected with the Persian "invalid money direction" message.
  **Fix:** money direction is now structural, matching goods - `EffectCompositionDto.MoneyIn` /
  `MoneyOut` slots, and `MoneyEffectDto` carries no direction field at all. The offending rule is
  gone because the failure it guarded against is no longer representable. `ExpandComposition` on
  both calculation services grew a local `AddMoney(slot, direction)` to stamp the direction.
- **The stale team/department names were not an EF navigation-freshness problem.** `GetUserListQuery`
  is a server-side projection and AutoMapper null-propagates `src.Team.Name`, so neither could go
  stale. The actual cause: `Team` and `Department` each carry **`HeadId` and `DeputyId`**, but
  `ChangeUserTeamCommand` only ever wrote `Team.HeadId`. `Team.DeputyId` and both `Department` roles
  were never released, so `GetTeamDetailQuery`/`GetTeamListQuery` kept rendering
  `HeadName`/`DeputyName` off a FK pointing at someone who had left; and since nothing stopped a user
  from being head of several teams at once, which name appeared where looked arbitrary.
  `DeleteUserCommand` had the same hole - a soft-deleted user stayed head of their team.
  **Fix:** `IOrgRoleService.ReleaseAllRolesAsync` (`Application/Common/Contracts/OrgStructure/`,
  implemented by `Infrastructure/Services/OrgRoleService.cs`, registered `Scoped`) releases every
  headship/deputyship a user holds, called by both commands before assigning. The invariant is now
  "at most one team role and one department role per user", in one place - it was previously
  implemented in one handler and forgotten in the other two. `ChangeUserTeamCommand` also gained
  `IsDeputy`, applies the role to the **department** when `TeamId` is null (previously `IsHead` was
  silently dropped for a user with no team), and no longer drops its `CancellationToken`.

Everything else in the same pass:

- **`ReturnEffectKindEnum` -> `ReturnEffectDirectionEnum`, `Effect.Kind` -> `Effect.Direction`**
  across both return domains. Integer values unchanged. A `\bKind\b` word-boundary match
  deliberately does not hit `OffScopeKind`/`DocumentKind`/the barcode-side `Kind`, so the rename was
  mechanical and safe.
- **`SaleReturn.RequestDate` -> `ReturnDate`** - the one genuine naming divergence between the two
  return sides. Diffing both calculation services, both claim entities, both round entities and all
  five DTO pairs turned up nothing else: `ReceivedQuantity` vs `ShippedQuantity` and the two
  `RecomputeXStatus` signatures are semantically different things, correctly named differently. The
  reported "sale quantity naming diverges from purchase" was, beyond this one field, not borne out.
- **`GoodsRoundLineDto`/`GoodsRoundObservationDto` hoisted** to `Application/Common/Dtos/Returns/`.
  The sale side had redeclared them inline, **byte-identical** - copy-paste, not drift.
- **DB-only fields off the wire.** Removed `CreatedAt`/`UpdatedAt` from the return detail DTOs,
  `CreatedAt` from the list DTOs, and each nested object's redundant parent FK
  (`claims[].purchaseReturnId`, `resolutions[].purchaseReturnClaimId`,
  `effects[].purchaseReturnResolutionId`). Where the timestamp carried real meaning it was renamed
  to a domain name rather than dropped: `resolutions[].CreatedAt` -> `DecidedAt`,
  `receivingImages[].CreatedAt` -> `UploadedAt`. Effects already expose `AppliedAt` and rounds
  already expose `Date`, so those `CreatedAt`s were pure duplication.
- **`DominantProblem` -> `Problems`** (`List<ReturnProblemEnum>`, ordered by claim quantity so
  `Problems[0]` is the old value). The old projection also ended in `FirstOrDefault()`, which
  reported enum value `0` as a real problem for a return with no claims. `Distinct()` is applied in
  memory after `ToPagedAsync` - it is not reliably translatable inside a collection projection, the
  same reason signed image URLs are built there.
- **`GoodsEffectDto.ProductId`.** It was already resolved once in `AddClaimResolutionCommand`
  (`??= claim.ProductId`) and persisted, so the `?? claim.ProductId` re-defaulting in both
  `ExecuteGoodsRoundCommand`s was dead code - removed. An *overridden* product (a replacement with a
  different item) was never validated, so a bogus id surfaced as a `NotFound` at the goods round -
  at the warehouse, to the wrong person; it is now checked at decision time. Read side gained
  `effects[].productName`, which required an `Effects -> Product` `ThenInclude` in both query
  services.
- **Related returns.** `PreviousReturnId` already existed on both entities and was already on the
  detail DTOs, but was a pure client-supplied pass-through - nothing checked it pointed at a return
  on the *same* document, or that it existed at all. `Create{Purchase,Sale}ReturnCommand` now
  validate it (a cycle is unreachable on create: a brand-new row cannot yet be anyone's target).
  Detail gained `PreviousReturnNumber`; the list DTOs gained `PreviousReturnId`.
  **`GetPurchaseReturnListQuery` also gained a `PurchaseId` filter** - `GetSaleReturnListQuery` had
  had the mirror-image `SaleId` filter all along, so a purchase's returns simply could not be pulled
  together, which made the chain unusable on that side. Deliberately *not* built: an enumeration of
  sibling returns on the detail response. `?purchaseId=` plus `previousReturnId` on each row is
  enough for a client to reconstruct "these two or three returns belong to one purchase and follow
  each other", and that is the whole requirement.
- **Invoice PDF identity boxes now form a real grid.** A QuestPDF `Row` shares out width among its
  own `RelativeItem`s, so weights only align across rows if every row sums to the same total. The
  three rows in `ComposePartyBox` summed to 7, 8 and 7. All three now sum to 4 x `FieldColumnUnits`,
  with wide fields spanning whole columns (name spans 2, address spans 3).
- **`WarehouseReceiving` deleted** (see above) and, separately, the `ProductUnit` invariant break it
  exposed was fixed. The four stock-mutation paths disagreed: purchase `GOODS_IN` minted
  unconditionally, purchase `GOODS_OUT` hand-rolled a `ProductUnits` query (with a comment admitting
  no service method fit), and **both sale paths were wrapped in `if (claim.SaleItemId.HasValue)`** -
  so an `OFF_ORDER` sale-return round moved `Product.Stock` while touching no unit rows, silently
  breaking `Stock == COUNT(ProductUnit WHERE IN_STOCK)`. `IProductUnitService` gained
  `ReturnToSupplierAsync` (purchase `GOODS_OUT` now goes through the service), `ConsumeAsync`'s
  `saleItemId` became nullable, and the sale `GOODS_IN` off-order case mints instead of skipping.
- Shipped as migration `20260906233052_rename-effect-direction-and-return-date` - three
  `RenameColumn`s (`SaleReturns.RequestDate`, `SaleReturnEffects.Kind`, `PurchaseReturnEffects.Kind`),
  no data transformation. **Applied to the local `WMS` database (2026-09-07).**
- Docs: `docs/api-guide.fa.md` section 3 (`ChangeUserTeam`/`DeleteUser`), sections 10/12 (every
  changed read and request shape), section 15 (enum rename), and a new breaking-changes table at the
  top of section 16 that the frontend can migrate against row by row.
- **Verified:** build clean; suite 360/369. The 9 failures are pre-existing - confirmed by running
  the full suite in a clean worktree at `HEAD`, which fails the *identical* 9 test names (8
  `IX_Users_PersonelCode` seed collisions + the long-documented `"***"` object-storage placeholder
  gap). Two obsolete validator tests were replaced with ones asserting the new guarantees
  (`MoneyEffectWithNoDirectionField_IsValid`, `GoodsOnlyResolution_IsValid`).

**Quantity-naming unification pass (2026-09-08).** The "total requested / how much handled / how
much left" triple was spelled five different ways for the middle slot and four for the first, across
entities and DTOs. `RemainingQuantity` was already universal and unchanged. The triple is now
`Quantity` / `<stage>Quantity` / `RemainingQuantity`, where the middle name says which stage consumed
the total:

- **`PurchaseReturn.ClaimedQuantity` / `SaleReturn.ClaimedQuantity` -> `Quantity`.** Both are
  `[NotMapped]` roll-ups (`Claims.Sum(c => c.Quantity)`), so no schema change. The detail DTOs' field
  renamed with them.
- **`PurchaseReturnEffect.DoneQuantity` / `SaleReturnEffect.DoneQuantity` -> `AppliedQuantity`.** Not
  folded into `DecidedQuantity`: at claim level "decided" means `Resolutions.Sum(r => r.Quantity)` -
  decisions recorded - while at effect level the counter tracks goods that physically moved through
  `ExecuteGoodsRoundCommand`. Those are different stages of the same return, and one name for both
  would have made `RemoveClaimResolutionCommand`'s guard read as a claim about decisions when it is
  checking movement. `AppliedQuantity` also pairs with the `AppliedAt` / `ReturnEffectStatusEnum.APPLIED`
  it drives (`if (effect.AppliedQuantity >= effect.Quantity)`).
- The two detail queries project **both** levels into one response tree, so only the effect-level line
  moved in each; `purchaseReturn.DecidedQuantity` and `c.DecidedQuantity` above it are untouched.
- Shipped as migration `20260908120000_rename-effect-applied-quantity` - two `RenameColumn`s
  (`PurchaseReturnEffects.DoneQuantity`, `SaleReturnEffects.DoneQuantity`), no data transformation.
  **Not yet applied to any database**, and hand-written rather than scaffolded: there is no .NET SDK
  on the machine this ran from, so `dotnet ef migrations add` could not be used. Re-scaffolding it
  against a real SDK before applying is the safe move.
- **Breaking for the frontend:** `claimedQuantity` -> `quantity` on the return detail response, and
  `doneQuantity` -> `appliedQuantity` on `effects[]` (detail) and on both pending-effects responses.
- **Not verified:** nothing here has been compiled or tested, same SDK reason.
- **Deliberately left alone.** `PurchaseItem`/`SaleItem` carry `Quantity` + `ReceivedQuantity` /
  `ShippedQuantity` + `SettledQuantity` with no derived remainder - two independent consumption axes
  (physical movement, and return settlement) against one total, correctly named differently.
  `PurchaseReceivingItemInfoDto`'s `OrderedQuantity`/`ReceivedQuantity`/`StillOwedQuantity` is the
  same relationship as `PurchaseItem.Quantity`/`ReceivedQuantity` under different names
  (`GetPurchaseReceivingInfoQuery` literally assigns `OrderedQuantity = item.Quantity`), and the
  return list DTOs' `TotalQuantity` is computed identically to the entity's `Quantity` - both are
  real divergences, both left for a pass that can build and test.

**ProductUnit: no silent substitution, no silent shortfall (2026-09-11).** `ShipSaleCommand` is
where a unit leaves the warehouse - `ConsumeAsync` moves it `IN_STOCK -> SOLD` (there is no separate
"shipped" status; `SOLD` means physically shipped). The only other `SOLD` writer is the sale-return
`GOODS_OUT` replacement round. Three `IProductUnitService` holes let `Product.Stock` and
`COUNT(ProductUnit WHERE IN_STOCK)` drift apart, all closed the same way - throw
`ValidationCustomException` rather than make up the number, and since no service method saves, the
caller's `Product.Stock` change is discarded with it:
- **`ConsumeAsync` rejects duplicate scanned barcodes** (compared after `ToPayload` normalization).
  `[A, A]` used to pass the `Count == count` check, mark one unit `SOLD`, and drop stock by two.
- **`ReturnToSupplierAsync` gained `int? purchaseItemId`**; `PurchaseReturn.ExecuteGoodsRoundCommand`
  passes `claim.PurchaseItemId`. With a line, only units received on that line are eligible and a
  shortfall throws instead of borrowing another purchase's units. `null` (off-order claim) keeps the
  old FIFO-over-the-product behaviour - there is no purchase to match against.
- **`RestoreAsync` throws when the sale line has fewer `SOLD` units than `healthyCount + scrapCount`.**
  It used to restore what it found and carry on while the caller still added the full restocked
  quantity to stock. Realistically only reachable with pre-`ProductUnit` data or a mis-targeted claim,
  since claims are already capped by shipped quantity.
- No schema change, no migration. Docs: `docs/api-guide.fa.md` (`ShipSale`, both `ExecuteGoodsRound`s),
  `docs/product-code-barcode-invoice-design.fa.md` §1.9 (signatures + the shared rule).
- **Test fixture fix the `RestoreAsync` guard forced:** `Seed.ShippedSale` set `SaleItem.ShippedQuantity`
  but minted no `SOLD` units - exactly the inconsistent state the guard rejects - so three
  `SaleReturnLifecycleTests` goods-in tests started failing. It now mints `shippedQuantity` units as
  `SOLD` against the line (`Seed.MintUnits` gained optional `status`/`saleItemId`). Seed units' payloads
  still aren't digits-only, so tests that scan barcodes should mint through `scope.ProductUnitService`.
- **Tests**: `Tests/WMS.Tests/Integration/ProductUnitServiceTests.cs` (5). Suite 397/406 before those were
  added, 402/411 after; the 9 failures are the long-documented pre-existing ones.

**Org chart: one user, one role, written in one place (2026-09-11).** The reported bug - a user
moved to another department on the user detail page while their old team still listed them as its
head - was `UpdateUserCommand` writing only `User.DepartmentId`/`TeamId` and never touching the
`Team`/`Department` `HeadId`/`DeputyId` slots. `ChangeUserTeamCommand`/`DeleteUserCommand` had been
fixed for this on 2026-09-07; `UpdateUserCommand` (which is what the user page actually calls) had
not, and the team/department pages had the mirror-image hole - they wrote the slot without writing
the user's own placement, so a team head could be someone in a different team entirely.

- **`IOrgRoleService` now owns both halves.** New `AssignAsync(user, departmentId, teamId, role, ct)`
  and `GetRoleAsync(userId, ct)` alongside the existing `ReleaseAllRolesAsync`. Every command that
  moves a user or names a head/deputy goes through it: `UpdateUserCommand`, `ChangeUserTeamCommand`,
  `Create`/`UpdateTeamCommand`, `Create`/`UpdateDepartmentCommand`. Enforced invariants: one
  department per user; **at most one role, ever** (department head/deputy, team head/deputy, or
  plain member); a department head/deputy has `TeamId == null`; a team head/deputy is a member of
  that team in that team's department; and every assignment releases whatever the user held before.
- **`OrgRoleEnum`** (`Domain/Enums/OrgRoleEnum.cs`): `MEMBER=0, DEPARTMENT_HEAD=1,
  DEPARTMENT_DEPUTY=2, TEAM_HEAD=3, TEAM_DEPUTY=4`. **Nothing persists it** - it is derived from the
  `HeadId`/`DeputyId` slots on read, which is why the user list can't drift out of sync with the
  team/department pages. **No migration: there is no schema change in this pass.**
- **`UpdateUserCommand.Role` is nullable on purpose.** `null` means "leave the role alone": kept
  when the user stays in the same team/department, dropped when they move. A frontend that doesn't
  send it therefore can't silently demote someone by editing their name, and moving someone can't
  silently keep a slot that no longer exists. `ChangeUserTeamCommand` keeps its older
  `IsHead`/`IsDeputy` booleans (no wire break) and maps them onto the enum - there `false/false` is
  an explicit "plain member", since that command exists only to change placement.
- **Assigning a role now transfers the user, instead of rejecting them.** The 2026-09-07 rule was
  "the head must already be in this department" (400 otherwise), which made naming a head a
  three-call dance and made `CreateDepartmentCommand` with a `HeadId` *unconditionally* impossible.
  Both create handlers now save first (the row needs an `Id` for `User.DepartmentId`/`TeamId` to
  point at), then assign, then save again; users are loaded up front so a bad id can't leave an
  orphan team/department behind. Dropping someone from a slot leaves them a plain member of the
  same team - it does not eject them.
- **Ordering gotcha in the team/department update handlers:** the request's final `HeadId`/`DeputyId`
  are written *before* the `AssignAsync` calls, because `AssignAsync` releases the user's slots
  first and would otherwise clear the value just written.
- **Read side**: `Role` + `RoleTitle` (Persian, via `EnumExtensions.GetDescription`) added to
  `UserListDto`/`UserInfoDto`/`UserUpdateDto`. `GetUserListQuery` computes it inside the SQL
  projection off `x.Team.HeadId`/`x.Department.HeadId` (conditional chains translate fine); the
  title is filled in after `ToPagedAsync`, same reason signed image URLs are. The two
  repository-based queries use `GetRoleAsync`.
- **Tests**: `Tests/WMS.Tests/Integration/OrgRoleTests.cs`, 15 cases covering the reported bug, the
  keep-vs-drop rule for a null `Role`, both directions of promotion between team and department,
  the three 400s, deactivation, and the create/update handlers on both sides. All pass. Suite is
  383/392 - the 9 failures are the long-documented pre-existing ones (8 `IX_Users_PersonelCode`
  seed collisions + the `"***"` object-storage placeholder gap).
- `docs/api-guide.fa.md`: section 3 rewritten (it still documented the long-deleted `roleId`/
  `roleName`), a shared "org placement rules" preamble added, new sections 3b/3c documenting the
  Department and Team endpoints (previously undocumented), `OrgRoleEnum` added to section 15, and
  four rows added to section 16's breaking-changes table.

**Return-domain read-side cleanup (2026-09-10).** Applied from a code-review chat on
`PurchaseReturnQueryService` / `GetPurchaseReturnDetailQuery` / `PurchaseReturnCalculationService`,
then mirrored to the sale side so the two return domains stay identical in shape. No schema change,
no migration.

- **`I{Purchase,Sale}ReturnQueryService` are gone**, replaced by static query-composition classes
  `Application/Common/Queries/{Purchase,Sale}ReturnQueryExtensions.cs`. They were stateless
  `IQueryable` transformations with no dependencies, so there was nothing to inject and nothing
  worth mocking; they now live in `Application` rather than `Infrastructure`, which is where the
  handlers that use them are. Both DI registrations and the `TestDatabase` properties are removed,
  and `{Purchase,Sale}ReturnRepository` no longer take one.
- **`WhereActive` is gone; the ambiguity it carried is the reason.** It meant "not soft-deleted AND
  open", while `WhereNotDeleted` meant "not soft-deleted" - two different senses of *active* in one
  class. Now: `WhereNotDeleted()` (IsActive) and `WhereOpen()` (status in OPEN|IN_PROGRESS) are
  separate and composed explicitly, e.g. the repositories' `.WhereNotDeleted().WhereOpen().WithReturnGraph()`.
  A **global query filter was deliberately NOT added** for soft delete, despite it being the obvious
  fix - section 7 forbids one, and every read composes `WhereNotDeleted()` instead.
- **`WithReturnGraph()` now ends in `AsSplitQuery()`.** It Includes four nested collections
  (Claims → Resolutions → Effects → History → Observations / MoneyParts), which in a single query
  multiplies the row count at every level. The `includePurchaseItems`/`includeSaleItems` boolean is
  replaced by a separate `WithPurchaseItems()`/`WithSaleItems()` that composes.
- **Detail queries rewritten.** `Get{Purchase,Sale}ReturnDetailQuery` are `AsNoTracking`, project
  through `ToDto()` extension methods in `Application/Features/{Purchase,Sale}Return/Mappings/`
  instead of ~100 lines of inline nested initialisers, compute the three
  `CanDelete`/`CanCancel`/`CanReject` flags from one expression, and read `PreviousReturnNumber` off
  an `Include(x => x.PreviousReturn)` rather than a second round-trip (the navigation and FK already
  existed). `TotalAmount` is `checked`, so a bad row throws instead of wrapping into a huge number.
  Soft delete is still filtered - the rewrite that landed before this pass had dropped it on the
  assumption of a global query filter that this project does not have.
- **`RecomputePurchaseStatus` no longer reports an item-less purchase as RECEIVED** (`All()` over an
  empty sequence is true). The sale side already guarded this. The review also flagged the
  `return purchase.Status` fallback as "sticky"; that was **rejected** - the fallback is what
  preserves PROFORMA/PENDING/SHIPPED for a purchase with nothing received yet, there is no
  PurchaseStatusEnum.ORDERED to fall back to, and `ReceivedQuantity` is append-only
  (`ReceivePurchaseCommand` is the only writer, and it only adds), so the reversal the review worried
  about is unreachable.
- **`GetOpenClaimQuantity` filters off-order claims on `Scope`, not on `OffScopeKind == null`** (the
  comment already said Scope), and now drops soft-deleted and terminal returns itself instead of
  trusting the caller to have passed only active ones. `excludeReturnId` was **not** added - there is
  no edit-claim flow, `GetClaimableQuantity` is called only from `Create{Purchase,Sale}ReturnCommand`.
- **Money compositions are validated.** `Add{Purchase,Sale}ClaimResolutionCommandValidator` now
  rejects a MIXED payment whose `Parts` do not sum to `Amount`, and `Parts` sent on a non-MIXED
  payment (previously dropped silently, so the persisted effect disagreed with the request);
  `ExpandComposition` throws `ValidationCustomException` as a last line of defence. **This is a
  behaviour change for callers** - both payloads used to be accepted.
- **`CanReopen(status)` moved onto `I{Purchase,Sale}ReturnCalculationService`** so every transition
  rule sits behind one interface rather than one of them being inline in a query.
- **Not applied from the review**: renaming `ReturnStatusEnum` to `ReturnStatus` with PascalCase
  members (the SCREAMING_CASE names are the documented frontend enum contract), a global soft-delete
  query filter (section 7), and `ResponseDto<T>` (a project-wide convention change, not a
  return-domain one).
- **Not verified**: there is no .NET SDK on the machine this ran from and the local VM has no network
  to install one, so none of this has been compiled or tested. Run `dotnet build WMS.slnx` and
  `dotnet test` before trusting it; the last recorded baseline is 383/392 with 9 documented
  pre-existing failures.

**Return lifecycle + OFF_ORDER claims (2026-09-11/12).** Both return sides, identical. No schema
change, no migration. Full API contract in `docs/api-guide.fa.md` §10/§12/§15 and the 2026-09-12
breaking-changes table in §16.

- **The production symptom ("Cancel/Reject fail, then nothing works, message says untouched") was a
  contract bug, not a guard bug.** Every return write answered with `Data = null` (lifecycle,
  RemoveClaimResolution) or a partial object without `id` (Create, AddClaimResolution,
  ExecuteGoodsRound). The frontend drops a write's response into its detail cache and reads `.id`
  off it, so a *successful* Reject crashed its `onSuccess`, TanStack Query turned that into an error
  toast, the page kept showing OPEN, and the user's retry hit an already-REJECTED return, whose
  refusal said "only untouched returns can be cancelled". **Fix:** every write returns the full
  detail document via `{Purchase,Sale}ReturnDetailReader.ReadAsync` (also used by the detail query,
  so there is one document shape); Delete returns `{ Id, PurchaseId }` / `{ Id, SaleId }`.
  Cost: one extra no-tracking read per write; purchase-side write handlers gained an
  `IObjectStorageService` constructor parameter (receiving-image URLs).
- **One state machine**, `Application/Common/Returns/ReturnLifecycleRules.GetBlocker`, reached
  through `I*ReturnCalculationService.GetLifecycleBlocker`/`CanPerform`; handlers throw its message
  and the detail DTO's `Can*` flags read the same rule. `IsUntouched`/`CanReopen` are gone.
  OPEN/IN_PROGRESS allow Cancel/Reject/Delete unless goods moved (**`AppliedQuantity > 0`**, not
  `Status == APPLIED` - a partially executed goods effect used to let a return be cancelled with
  stock already changed) or a money effect is recorded; SETTLED/CANCELLED refuse everything;
  REJECTED allows only Reopen and every refusal points at it. Messages name the status via the new
  `[Description]`s on `ReturnStatusEnum`.
- **The money lock was kept on purpose**: money effects are born APPLIED because they record a
  payment that already happened, and each writes a revenue row to the cost ledger at that moment.
  The path out is RemoveClaimResolution, which writes the reversing row.
- **Reopen recomputes** (`OPEN` then `RecomputeReturnStatus`) instead of forcing OPEN; a return
  rejected with pending resolutions comes back IN_PROGRESS. Pending-effects queries compose
  `WhereOpen()`, so a rejected/cancelled return's pending goods effects stop reaching the warehouse.
- **ExecuteGoodsRound validates every line before mutating anything** (per-effect summed quantity,
  products batch-loaded, stock projected in request order); the only throws left in the apply
  phase are `ProductUnitService`'s DB-state shortfall checks. Validators reject observations summing
  above the round quantity or negative (a negative healthy quantity was added to `Product.Stock`).
  AddClaimResolution/RemoveClaimResolution/Create were audited and already validated before mutating.
- **EXCESS keeps its order line and is priced at it** (the previous pass had "fixed" the enum
  comment instead - reverted). Validators: EXCESS requires `OrderLineId`, UNLISTED rejects it.
  Handlers: any line-bearing claim must reference a line of this document with the same
  `ProductId`; OFF_ORDER `ProductId` must exist (was a 500 at SaveChanges); EXCESS `UnitPrice` is
  copied from the line, ON_ORDER/UNLISTED keep the client's.
- **`PurchaseReturnClaim.OnOrderPurchaseItemId` / `SaleReturnClaim.OnOrderSaleItemId`**
  (`[NotMapped]`, the line id only when `Scope == ON_ORDER`) are what every quota/settlement/unit
  site reads: `GetOpenClaimQuantity`, SettledQuantity in Add/RemoveClaimResolution and
  ExecuteGoodsRound, and `MintAsync`/`ReturnToSupplierAsync`/`RestoreAsync`/`ConsumeAsync` (for the
  claim's own product). **Never read `PurchaseItemId`/`SaleItemId` for those** - EXCESS has one.
- **Breaking for the frontend** (not changed from here): the create-return form sends
  `orderLineId: null` for EXCESS and will now get a 400; its `isReturnUntouched`/`can*Return`
  helpers still implement the old APPLIED-only rule and should read the server's `can*` flags.
- Tests: lifecycle regression (reject → stale cancel → reopen → cancel → delete refused), money
  lock + remove path out + ledger net-zero, partial goods, reopen recompute, pending-effects filter,
  write responses, reorder, and the EXCESS/UNLISTED/product-existence cases, on both sides; plus
  validator and `ReturnLifecycleRules` unit tests.

**In-flight unit selection (2026-09-13).** Its own pass, closing the last member of the "reads only
saved rows" family. No schema change. Detail in `docs/return-offscopekind-and-inflight-ledger-fix.fa.md` §3.

- **`ProductUnitService.SelectUnitsAsync` / `CountUnitsAsync`** are the only way units are selected or
  counted now (`ConsumeAsync`'s FIFO path, `RestoreAsync`, `ReturnToSupplierAsync`,
  `ReconcileStockAsync`'s count and scrap pick). Units the context tracks (any state but Deleted) are
  judged by their in-memory values and excluded by id from the saved query; everything else by its
  saved row; the order is applied once over both. Before, two movements of one product in one request
  picked the same unit twice - one unit changed while `Product.Stock` moved twice, directly breaking
  `Stock == COUNT(ProductUnit WHERE IN_STOCK)` - and units minted moments earlier were invisible (and
  `ReconcileStockAsync` minted them a second time). `ConsumeAsync`'s explicit-barcode path looks in
  `ProductUnits.Local` first for the same reason. Added units have no real id (EF keeps temporary keys
  off the entity), hence the `Id > 0` exclusion.
- Tests: `Integration/InFlightUnitSelectionTests.cs` - every selection method twice (or after a mint)
  for one product before `SaveChanges`, and a purchase goods round with two `GOODS_OUT` lines for one
  product through the real handler.

**Return money balance removed; `UnitPrice` is a recorded value, not a rule (2026-09-17).** The effect layer
was meant to carry no strict validation - staff settle with the supplier or customer as they agree - and
`ReturnMoneyBalance` did the opposite. API: `docs/api-guide.fa.md` §10 «مدل اثرها» and the 2026-09-17 table in §16;
frontend: `docs/return-frontend-migration.fa.md` §4.

- **Deleted:** `Application/Common/Returns/ReturnMoneyBalance.cs`, its two `EnsureSettled` call sites in
  `{Purchase,Sale}Return/Commands/AddClaimResolutionCommand`, the four `RuleFor(g => g.UnitPrice).NotNull()`
  rules in those files' validators, and `Tests/WMS.Tests/Unit/ReturnMoneyBalanceTests.cs`. The effect layer's
  complete rule list is now "at least one effect".
- **`UnitPrice` stayed, everywhere it was.** `GoodsEffectDto.UnitPrice`, `{Purchase,Sale}ReturnEffect.UnitPrice`,
  their columns and `effects[].unitPrice` are untouched and still written by `ExpandComposition` - so **no
  migration, no data loss, no wire break**, and any payload that was valid before is still valid. It is now
  optional and read by nothing: an audit/display record of the per-line transaction value agreed with the
  counterparty. It earns its keep on a resolution carrying several goods lines under one money effect, where
  the money amount alone cannot say what each line was worth. The money that actually moves is
  `MoneyIn`/`MoneyOut.Amount`; what a GOODS_IN round enters the pool at is `UnitCost`.
- **The `data.requiredDirection`/`requiredAmount` error contract is gone** - that 400 can no longer happen.
  A frontend that locks its submit button on a live balance calculation must stop doing so.
- **Care needed on the delete:** `Unit/ReturnMoneyBalanceTests.cs` also held `OnOrderOffScopeKindValidatorTests`,
  which covers a **claim-level** rule that still stands. It was moved verbatim into its own file,
  `Tests/WMS.Tests/Unit/OnOrderOffScopeKindValidatorTests.cs`.
- Tests: the two balance tests in `Integration/ReturnEffectModelTests.cs` now assert the opposite - goods out with
  no money, and an uneven swap with no refund, are accepted and their declared prices persisted; both
  `GoodsEffectWithoutUnitPrice_IsInvalid` cases in `Unit/ValidatorTests.cs` became `_IsValid`.
- **Verified 2026-09-20** (it shipped unverified - no .NET SDK on the machine it was written on): build clean,
  suite 547/558 with the 11 long-documented pre-existing failures.

**Return effect model: four effects, one rule each (2026-09-13).** Supersedes the three entries that stood
here ("Return money balance, off-invoice stock and excess costing", "Stored stock booking, reversible kept
extras, per-problem balance", "Return money matrix, invoice-error counting"); the code they described is
gone. API contract: `docs/api-guide.fa.md` §10 «مدل اثرها», §12, §16 (2026-09-13 table); frontend impact:
`docs/return-frontend-migration.fa.md` §4.

- **The model.** A resolution is a list of effects of exactly four kinds - `GOODS_IN`, `GOODS_OUT`,
  `MONEY_IN`, `MONEY_OUT` - in any combination and any quantity. The effect layer does not know *why*:
  not the claim's problem, not its scope, not whether goods were invoiced or passed through stock.
- **Enforced at the effect layer, the complete list:** (1) at least one effect. That is all - see the
  2026-09-17 entry above, which removed `ReturnMoneyBalance` and the `UnitPrice`-required rule.
  Request-shape checks stay (positive quantities and
  amounts, `ProductId` exists, MIXED parts sum); `Composition.Quantity <= claim.RemainingQuantity` is
  claim-level and stays.
- **Mechanics, unconditional, both sides.** `ExecuteGoodsRound` GOODS_IN: stock += healthy, units minted
  (or the ON_ORDER line's SOLD units restored, sale side), cost row at the effect's `UnitCost` (running average
  when omitted - see the price/cost split entry below) (`PURCHASE_RETURN_REPLACEMENT_RECEIVED` / `SALE_RETURN_RESTOCK`). GOODS_OUT: stock −= quantity, units
  consumed, cost row at the running average (`PURCHASE_RETURN_SHIPPED_TO_SUPPLIER` /
  `REPLACEMENT_SHIPPED_TO_CUSTOMER`). `AddClaimResolution` writes one revenue row per money effect -
  MONEY_IN positive, MONEY_OUT negative (`SALE_RETURN_MONEY_IN` / `SALE_RETURN_REFUND`,
  `PURCHASE_RETURN_MONEY_IN` / `PURCHASE_RETURN_MONEY_OUT`) - and `RemoveClaimResolution` writes the
  reversal, on both sides (`IInventoryCostingService.Record{Sale,Purchase}ReturnMoney[Reversal]Async`).
  The only claim fact the goods round reads is `OnOrder*ItemId`, and only for unit identity (which line
  units are minted on / returned from), and only when the effect's product is the claim's own product.
- **Removed, and why each was scenario logic:** `ReturnMoneyBalance.CountsTowardBalance` (the per-problem
  table) and `UnitPriceOf` (price fallback to the claim) with `Unit/ReturnBalanceProblemTableTests.cs`;
  OFF_ORDER zero-valuing; the money matrix; the per-direction goods-quantity cap; the sale kept-extras
  write-off (`SaleReturnEffect.IsKeptByCustomer`/`CostLedgerEntryId`, `ProductUnit.SaleReturnEffectId`,
  `IProductUnitService.RestoreKeptAsync`, the kept-by-customer lifecycle blocker, `effects[].keptByCustomer`);
  `RecordPurchaseReturnExcessAcceptedAsync` with its MoneyOut/quantity→claim-price fallback; the
  "in our books" inference (`PurchaseReturnClaim.InStockQuantity`, `SaleReturnClaim.SentOutQuantity`,
  `BookedQuantity` on both round entities - dead once every movement is unconditional); the historical
  line-cost lookup (`GetHistoricalUnitCostAsync`) and the declared-minus-claim cost adjustment; the
  purchase report counting accepted excess. Ledger events 10/11 (`PURCHASE_RETURN_EXCESS_ACCEPTED`,
  `SALE_RETURN_EXCESS_KEPT`) are retired and not reused; `SALE_RETURN_PAYMENT_RECEIVED` (12) is renamed
  `SALE_RETURN_MONEY_IN`; `PURCHASE_RETURN_MONEY_IN` = 13, `PURCHASE_RETURN_MONEY_OUT` = 14 are new.
  Enum members now carry explicit values.
- **Kept, not scenario logic:** the claim layer (scope, order line, quota, `OnOrder*ItemId` and every quota/
  settlement site, EXCESS `UnitPrice` must equal its line's, ON_ORDER `offScopeKind` is a 400), the lifecycle
  state machine and `can*` flags, write-response shapes, the in-flight ledger and serial fixes, in-flight
  unit selection, round observations (healthy vs. damaged, which predate these passes).
- **Reports.** Sale report profit counts `SALE_RETURN_MONEY_IN` alongside `SALE_RETURN_REFUND`. Purchase-return
  money rows are read by the purchase report only (see the price/cost split entry below).
- **Migration `20260913051253_return-effect-model`** drops `BookedQuantity` (both round tables),
  `SaleReturnEffects.IsKeptByCustomer`/`CostLedgerEntryId` and `ProductUnits.SaleReturnEffectId` (with their
  FKs/indexes), and backfills `UnitPrice` on existing goods effects from their claim. Forward-only on purpose:
  the two 2026-09-12 migrations it undoes are already in the remote database's history (below).
- **Correction - where migrations actually went.** From `8e9947e` until `60b3773`, `WMS/appsettings.json`'s active
  connection string was the remote `pasarg17_wms` (the local `Server=.;Database=WMS` line was commented out). The
  earlier note that `20260912204950_return-booked-quantity-and-kept-extras` and `20260912212317_return-effect-unit-price`
  were "applied to the local WMS database" was wrong: `dotnet ef database update` applied them to that remote
  database. Local WMS stops at `20260910231028_add-product-english-name`. Since `60b3773` ("Clean up connection
  strings") `appsettings.json` carries **no** `SqlServer` entry, and neither does `appsettings.Development.json`, so
  `ConnectionStrings:SqlServer` must come from the environment (e.g. `ConnectionStrings__SqlServer`) and `dotnet ef`
  targets whatever that supplies. The removed credentials remain in git history. `20260913051253_return-effect-model`
  and `20260913060230_return-effect-unit-cost` are **not applied anywhere** - the user applies migrations themselves.
- Tests: `Integration/ReturnEffectModelTests.cs` (balance floor on both sides, EXCESS line price, OFF_ORDER goods
  moving stock at their own price and out at the average, money revenue rows and their reversal on both sides),
  `Unit/ReturnMoneyBalanceTests.cs` rewritten, `UnitPrice`-required validator tests; deleted
  `ReturnBalanceProblemTableTests`, `ReturnKeptExtrasAndBookedStockTests`, `ReturnMoneyMatrixTests`,
  `ReturnBalanceAndExcessTests`. Verified: build 0 errors; suite 492/501; a clean worktree at `HEAD` (`1f2c732`) runs 402/411, and the 9 failing test names are identical line by line.

**Return goods effects: price and cost split; purchase-return money is purchase spend (2026-09-13, second pass).**
Two consequences of the effect model, fixed without adding scenario logic. API: `docs/api-guide.fa.md` §10 «مدل
اثرها», §12, §16 (2026-09-13 table), §18; frontend: `docs/return-frontend-migration.fa.md` §4.

- **`UnitPrice` did two jobs that disagree.** For the balance rule the right number is the transaction value with the
  counterparty; for the cost ledger it is what the unit is worth to us. On a sale return those are the sale price and
  the purchase cost, and entering the pool at the sale price inflated inventory by the margin on every return (bought
  700, sold 1000, returned at 1000: the resale then costed 1000).
- **`GoodsEffectDto.UnitCost` (`UInt64?`, optional)**, stored on `{Purchase,Sale}ReturnEffect.UnitCost` and exposed as
  `effects[].unitCost`. `UnitPrice` fed `ReturnMoneyBalance` only (and, since 2026-09-17, nothing); `UnitCost` is what a GOODS_IN round enters the
  pool at, and when null `InventoryCostingService.UnitCostOrAverageAsync` uses the product's running average at the
  moment the round executes (staged-or-saved, via `LatestEntryAsync`). When that average is 0 (no ledger history, or
  no stock left) it falls back to `Product.PurchasePrice` - the existing convention `RecordOpeningBalanceAsync` and
  `RecordManualAdjustmentInAsync` already use for stock with no cost history, so the codebase has one answer to "what is
  this unit worth with no history". A unit entering at 0 would book its whole next sale as profit (the first cut of this
  pass let it through; corrected). Uniform on both sides, no branching: a purchase-side caller that knows price == cost sends both equal.
  GOODS_OUT ignores it and still leaves at the average. No validation on `UnitCost`.
- **Purchase-return money is purchase spend, not revenue.** The `PURCHASE_RETURN_MONEY_IN`/`_OUT` rows keep their
  `RevenueDelta` sign convention (+amount / -amount); `GetPurchaseReportQuery` reads them into a new
  `PurchaseReportPeriodDto.ReturnMoneyAmount` with the sign flipped (a supplier refund is negative), kept apart from
  `TotalReceivedValue` (inventory value received). `GetSaleReportQuery` never reads them. Returning goods for your
  money back is roughly neutral: the goods leaving lower inventory value, the refund lowers purchase spend.
- **Migration `return-effect-unit-cost`** adds nullable `UnitCost` to `PurchaseReturnEffects` and `SaleReturnEffects`, no
  backfill (null = average, and already-executed rounds are not re-costed). **Not applied** - the user is handling the
  database (see the correction about the remote connection string in the entry above).
- Tests in `Integration/ReturnEffectModelTests.cs`: sale GOODS_IN enters at `UnitCost` 700 while the balance uses the
  1,200 price; omitted `UnitCost` enters at the running average, and at `Product.PurchasePrice` when there is no cost history; purchase-return money shows as -2,000
  `ReturnMoneyAmount` in the purchase report and nothing in the sale report. Verified: build 0 errors; suite 495/504; a clean worktree at `HEAD` (`1f2c732`) runs 402/411 with the identical 9 failing test names.

**Traceable warehouse: quarantine, unit ledger, pending money (2026-09-13/14).** Built from the approved design
artifact "انبار ردیابی‌پذیر" with four corrections (below). API: `docs/api-guide.fa.md` §7, §9, §10, §12, §15, §18 and
the four 2026-09-13/14 tables in §16. Phased; each phase is self-contained.

- **Phase 1 - pending money.** `MoneyEffectDto.PaidAt`: sent -> the effect is born APPLIED at that time; omitted -> PENDING,
  no ledger row, keeps the return IN_PROGRESS (via the existing `hasPending` in `RecomputeReturnStatus` - no change there).
  `ExecuteMoneyEffectCommand` (both sides, `POST api/{Purchase,Sale}Return/ExecuteMoneyEffect`) applies it: ledger row at
  `PaidAt`, and settles the line when it clears the resolution's last pending effect. Lifecycle lock is now
  `HasAppliedMoney` (APPLIED only). `RemoveClaimResolution` reverses APPLIED money only. Pending-effects queries list goods
  effects only. Five touch points, not two: the `AddMoney` default, the lock, the ledger-row timing, the reversal, settlement.
- **Phase 2 - `ProductUnitMovement`** (append-only, no IsActive). `ProductUnitService` is its only writer: every method takes
  a `UnitMovementContext` (reason, document, counterparty, occurredAt), and every minted/changed unit gets a row with a
  snapshot of its purchase/sale line and the signed-in user. `GET api/Product/GetProductUnitHistory` (by id or scanned
  barcode). `ProductUnitDto` gained purchase/supplier/sale/customer (correlated subqueries in `ProductUnitProjection`).
  `GoodsRoundLineDto.ProductUnitBarcodes` (+ `GoodsRoundObservationDto.ProductUnitBarcodes` to name which scanned unit is
  scrap on a sale-return GOODS_IN); barcodes are refused where units would be minted. Shared scan checks in
  `ResolveScannedAsync`; shape counts in `GoodsRoundBarcodes.CountsMatch`.
- **Phase 3 - quarantine at receiving.** `ProductUnitStatusEnum.QUARANTINED = 9` (5-8 left free on purpose),
  `UnitCustodyReasonEnum` (ON_ORDER/EXCESS/UNLISTED) and `ProductUnit.PurchaseId`. `ReceivePurchaseItemDto` is now
  `ArrivedQuantity` + `Defects[]`, plus `ReceivePurchaseCommand.UnlistedItems`; the still-owed 400 is gone.
  **Healthy-first allocation is a deliberate exception scoped to receiving** (documented on the command): `h = min(H, S)`
  IN_STOCK, `d = min(D, S - h)` QUARANTINED ON_ORDER on the line (counted in `ReceivedQuantity`, value off-pool via
  `PURCHASE_RECEIVED_QUARANTINED`), rest QUARANTINED EXCESS (no value). It is not a precedent for inference in resolutions.
  `PurchaseReceivingDiscrepancy` (append-only, same shape as `PurchaseReceivingImage`) records problems per round for form
  prefill/audit only - **claim quotas never read it**. OFF_ORDER purchase claims are capped by quarantined units of the
  matching custody minus `GetOutstandingOffOrderClaimQuantity`. `InventoryCostLedgerEntry.OffPoolValueDelta` holds value
  outside the pool; the purchase report counts it. Quick-create is `CreateProductCommand.IsIncomplete` (name, unit, category;
  Stock must be 0; same two-save code generation); `IsIncomplete` clears only when `Product.HasCompleteCatalogData`
  (brand + three prices), so UpdateProduct's brand/price checks moved to the handler and apply to complete products only.
  `Product.RequiresUnitTracking` persisted (enforcement is Phase 5).
- **Phase 4 - leaving quarantine.** `GOODS_RELEASE = 4`, `GOODS_SCRAP = 5` (enum values now explicit),
  `EffectCompositionDto.GoodsRelease/GoodsScrap` (`QuarantineEffectDto`: no UnitPrice - an internal
  movement has no counterparty), purchase side only (sale validator refuses). `GoodsRoundLineDto.Source`: purchase
  GOODS_OUT **must** state IN_STOCK or QUARANTINED, never inferred. Quarantine units are selected by
  `QuarantineFor(claim)` - the claim's custody on its line (UNLISTED for another product) - via `UnitSelection` and
  `ProductUnitService.ReturnToSupplierAsync/ReleaseFromQuarantineAsync/ScrapFromQuarantineAsync`. Cost of leaving quarantine
  is the effect's `UnitCost` (explicit 0 stays 0; omitted -> average -> PurchasePrice), **never** `CustodyReason`, which is
  read only by the quota and quarantine selection. Ledger events 16-19 (`QUARANTINE_RELEASED`, `QUARANTINE_SCRAPPED`,
  `PURCHASE_RETURN_SHIPPED_FROM_QUARANTINE`, `PURCHASE_RETURN_REPLACEMENT_QUARANTINED`); a damaged replacement's units are
  now held in quarantine instead of vanishing. Sale report `ScrapLoss`, subtracted from `NetProfit`.
  `EffectCompositionDto.WriteOff` / `*ReturnResolution.IsWriteOff`: the only decision without effects, never with one.
  `ReturnEffectDirections.IsGoods/IsMoney` replaces the scattered GOODS_IN-or-GOODS_OUT checks.
- **Phase 5 - sale mirror + unit tracking.** `ShipSaleItemDto.ExcessQuantity`/`ExcessProductUnitBarcodes` (accepted on a
  fully shipped line; `ShippedQuantity` may be 0): units go SOLD with custody EXCESS on the line, leave the pool at the average
  with no revenue (`SALE_SHIPPED_EXCESS = 20`, counted as COGS by the sale report). `ConsumeAsync` takes the custody reason
  (ON_ORDER for the ordered shipment). Sale EXCESS claims are capped by SOLD·EXCESS units on the line minus
  `GetOutstandingExcessClaimQuantity` - zero until the warehouse records the excess. A sale EXCESS GOODS_IN restores those
  same units (`RestoreAsync(..., excessUnits: true, ...)`) instead of minting; ordered restores exclude EXCESS units. Sale
  UNLISTED claims stay uncapped (nothing was shipped to count). `Product.RequiresUnitTracking` makes barcodes mandatory on
  every outbound movement: ShipSale (both quantities), sale GOODS_OUT, purchase GOODS_OUT (either source). Not on inbound
  (units are minted) or on release/scrap (internal).
- **Phase 6 - atomic shipments.** `POST api/Shipment/ReceiveShipment` (purchase receiving + purchase/sale-return GOODS_IN
  rounds) and `DispatchShipment` (ShipSale + sale/purchase-return GOODS_OUT rounds). **Implemented with a database
  transaction, not by extracting staging code** (a change from the plan): `IUnitOfWork.ExecuteInTransactionAsync` wraps the
  existing commands, sent unchanged through `IMediator` so their validators run; each still saves, and a throw rolls all of
  them back. Safe because `UseSqlServer` has no retrying execution strategy - adding `EnableRetryOnFailure` later would
  forbid this user-initiated transaction and needs `CreateExecutionStrategy().ExecuteAsync` around it. Direction is checked
  up front (`ShipmentDirections.EnsureAsync`). `IWMSDbContext.BeginTransactionAsync` exists only for the unit of work.
- **Migrations, generated, none applied** (the user applies them): `20260913185820_product-unit-movements`,
  `20260913205653_receiving-quarantine` (hand-added backfill: units with a `PurchaseItemId` get that purchase and
  `CustodyReason = ON_ORDER`), then `return-write-off` (`IsWriteOff` on both resolution tables).
- Tests: `PendingMoneyEffectTests`, `ProductUnitMovementTests`, `ReceivingQuarantineTests`, `QuarantineExitTests` (the
  25/20/10 scenario reconciled: 27 units = 17 stock + 7 returned + 3 scrapped; off-pool nets to 0; purchase spend 20 - 3 = 17).
  Existing tests now send `PaidAt` where money was paid immediately, receive excess/unlisted goods before claiming them, and
  state `Source` on purchase GOODS_OUT rounds. The 9 long-documented pre-existing failures are unchanged.
- **Gap noticed, not fixed:** the ON_ORDER claim quota (`Received - Settled - open RemainingQuantity`) does not reserve
  quantity that is decided but whose resolution still has a pending effect, so the same units can be claimed twice in that
  window. The new off-order quota counts outstanding (not-completed) quantity instead.

**Installment sales (2026-09-20).** A new payment method on the sale side only - `Purchase`/`Supplier` are
untouched. Design decisions in `docs/sale-installment-guide.fa.md`; API contract in `docs/api-guide.fa.md`
§11b/§15 and the 2026-09-20 breaking-changes table in §16.

- **`PaymentDetail` was fixed first**, since the whole feature sits on it. `Guid Id`/`Guid PurchaseId` became
  `int Id`/`int? PurchaseId` (every id in this project is an `int`), `int? SaleId`/`Sale? Sale` were added, and
  **both** relationships are now configured explicitly in `WMSDbContext` so the shadow `PurchaseId1` FK - which EF
  had been generating off `Sale.PaymentDetails` and which is listed under "Known gaps" below - is gone. New fields:
  `PaidAt` and `Purpose` (`PaymentPurposeEnum`: `NORMAL`/`INSTALLMENT_DOWN_PAYMENT`/`INSTALLMENT`). `Type`
  (`PaymentTypeEnum`) still means *how* the money moved; `Purpose` means *what this payment is* - two independent
  axes. `PaymentDetailDto.Id` changed `Guid` -> `int` (breaking on the wire), and `SaleDto.PaymentDetails` now
  returns that DTO instead of the raw entity.
- **`PaymentTypeEnum.INSTALLMENT = 5`** appended (nothing renumbered). It differs from `MIXED` in time, not method:
  `MIXED` pays the whole amount at once through several methods, `INSTALLMENT` pays it month by month.
- **Three levels, and the middle one is the only one that is both real and derived.** `SaleInstallmentPlan`
  (one-to-one with `Sale`, unique index on `SaleId`) -> `SaleInstallment` rows (unique index on
  `(SaleInstallmentPlanId, Number)`, no `IsActive` - lifecycle is `Status`, the `PurchaseReturn` pattern) plus
  `SaleInstallmentSummaryDto`, which is **never stored**. An installment is separately payable, separately
  cancellable and links to a real `PaymentDetail`, so it has identity and earns a row; the summary is a pure
  function of those rows, and storing it would mean keeping one number in sync across five write handlers - the
  bargain already struck for `Sale.PaidAmount` and not worth repeating.
- **`Sale.PaidAmount` is the one duplicated number**, always equal to `plan.PaidAmount`, updated by all five
  payment-touching handlers. Consequently `UpdateSaleCommand` on an installment sale that has a plan ignores the
  request's `PaidAmount` (reads it off the plan) and rejects a `TotalAmount` that disagrees with the plan - the
  total only changes through `UpdateSaleInstallmentPlan`. Cancelling a plan leaves `PaidAmount` alone: money taken
  is money taken.
- **The PROFORMA exit rule is now two branches.** Non-installment: unchanged (`PaidAmount >= TotalAmount`; since
  2026-09-24 `PaidAmount > 0`, see "Proforma exits on the first payment").
  Installment: the condition is "an active plan with a recorded down payment", not full payment. Because the plan is
  created *after* the sale, an installment sale deliberately stays `PROFORMA` through `CreateSale`; the
  finalization happens in `CreateSaleInstallmentPlanCommandHandler`. The invoice-number generation lives once, in
  `Application/Common/Sales/SaleInvoiceFinalizer`, used by all three handlers.
- **The rounding remainder lands on the LAST installment**, not the first (`InstallmentSchedule.Build`, a sync
  helper per the async rule - it is pure in-memory math). A customer counting their contract reads "eleven at 1,666
  and a last one at 1,669" as correct and "first one at 1,669" as a bug; it also defers the odd number until the end,
  where a mid-contract plan edit has usually not reached it yet.
- **Plan edits regenerate only the unpaid tail.** `PAID` rows and their `PaymentDetail`s are never touched or
  deleted; unpaid rows are dropped and rebuilt with numbering continuing from the highest `PAID` number, and
  `TotalAmount - PaidAmount` (not `FinancedAmount`) is spread over just those new rows. `DownPaymentAmount` is not
  editable. **The delete and the insert are two separate `SaveChanges`** - new numbers can overlap deleted ones and
  EF does not guarantee delete-before-insert within one batch, which would break the
  `(SaleInstallmentPlanId, Number)` unique index.
- **`SaleInstallmentStatusEnum.OVERDUE` is defined and deliberately never written** by any code: no background
  service, no job, no recompute endpoint. Spotting a late installment from `DueDate` is the frontend's job
  (`PENDING` + `dueDate < today`). Queries count it alongside `PENDING` as "unpaid" so nothing breaks if it is ever
  written. It is documented as *not forgotten* in the enum's own comment, `docs/sale-installment-guide.fa.md` §5.1
  and api-guide §15.
- **One installment = one full payment**; there is no partial payment and the amount comes from `installment.Amount`,
  never from the request. Paying early and paying out of order are both allowed - the row is targeted by `Id`.
  `SettleSaleInstallmentPlanCommand` charges exactly `RemainingAmount` with no early-settlement discount.
- **`GetSaleInstallmentListQuery` is the one system-wide installment endpoint**; the "overdue" and "upcoming
  payments" screens are built from its filters, not from endpoints of their own.
- **The `[NotMapped]` roll-ups are in-memory only** (same trap as the return domain): any handler or query that
  reads them must `Include(Installments)` or it silently computes zero and persists it. `GetSaleInstallmentPlanListQuery`
  therefore spells its sums and `NextDueDate` out in a server-side projection (through a `decimal` intermediate row,
  since LINQ has no `Sum` over `UInt64`), and `SaleInstallmentSummaryReader` loads a whole page's plans in one
  round-trip and computes after `ToPagedAsync` - the same place and reason signed image URLs are built.
- **Three open items, marked with short `// TODO`s rather than dead code**: late-penalty calculation
  (`LatePenaltyPercentage` is stored and read by nothing; entry point `PaySaleInstallmentCommand`; keep the penalty
  *separate* from `TotalAmount` or the `PaidAmount == TotalAmount <=> SETTLED` relation breaks), early-settlement
  discount (one amount calculation in `SettleSaleInstallmentPlanCommandHandler`), and the effect of a `SaleReturn` on
  remaining installments (no link between the two domains at all). All four (incl. `OVERDUE`) in
  `docs/sale-installment-guide.fa.md` §5.
- Shipped as migration `20260919210106_add-sale-installment-plan`. **Generated, not applied** - the user applies
  migrations themselves. Its `PaymentDetail` half was **hand-corrected to drop/recreate** the table instead of the
  `ALTER`s EF scaffolded: SQL Server converts neither `uniqueidentifier` -> `int` on an existing column nor adds
  `IDENTITY` via `ALTER`, so the scaffolded version would have failed at run time. There is no real data on that
  table, so drop/recreate is safe; the reason is written above the migration class.
- **Tests**: `Tests/WMS.Tests/Integration/SaleInstallmentTests.cs`, 17 cases - schedule and due-date generation,
  the remainder on the last row, automatic PROFORMA exit, paying through to `SETTLED` with `Sale.PaidAmount`/
  `NextDueDate`, early and out-of-order payment, early settlement under one `PaymentDetail`, the two refusals
  (already-`PAID` row, `CANCELLED` plan), plan-edit regeneration with `PAID` rows intact, cancellation touching only
  unpaid rows, both list queries' server-side roll-ups, the summary on `GetSaleDetail`, and that a **non-installment**
  sale keeps the old PROFORMA behaviour exactly. All pass. Suite is 554/565; the 11 failures are pre-existing -
  verified by running the full suite in a clean worktree at `main` (`9b9804b`), which fails the identical 11 test
  names (the documented `IX_Users_PersonelCode` and `"***"` object-storage cases, plus the LibreOffice-dependent
  `InvoicePdfTests`).

**In-person sale, and `invoiceNumber` off the sale commands (merged 2026-09-20).** Came in from
`main` (PR #38, `f3c252d`) and was merged onto the installment branch; this entry records the merge
fallout that was fixed here, not the feature's own design. API: `docs/api-guide.fa.md` §11
(`CreateInPersonSale`, the two request bodies) and the 2026-09-20 «فروش حضوری و شماره‌ی فاکتور»
table in §16.

- **`CreateInPersonSaleCommand`** (`POST api/Sale/CreateInPersonSale`) composes `CreateSale` +
  `ShipSale` + `Status = DELIVERED` inside `IUnitOfWork.ExecuteInTransactionAsync`, sending both
  through `IMediator` so their validators run - the same shape `Shipment`'s two atomic commands use.
- **`CreateSaleCommand.InvoiceNumber`/`UpdateSaleCommand.InvoiceNumber` were removed** (breaking).
  The official number is server-generated, which is what `SaleInvoiceFinalizer` already did; the
  client no longer supplies it. `CreateSale` now answers with `CreatedSaleDto { Id, InvoiceNumber,
  Status }` in `res.Data`, which is how the in-person command learns the new sale's id.
- **The merge left `UpdateSaleCommandHandler` uncompilable** - three stray `}` and two references to
  the removed `request.InvoiceNumber`. Repaired by hoisting `canLeaveProforma` out of the
  proforma block and calling `SaleInvoiceFinalizer.FinalizeAsync(_context, sale, ct)` **after** the
  request fields are copied onto the entity, so the number/date/PROCESSING land on the entity rather
  than being round-tripped through the request. Behaviour is identical to the pre-merge version; both
  installment branches of the proforma-exit rule are untouched.
- **PR #38 also left the test project uncompilable on `main`** (17 sites still set `InvoiceNumber` on
  the two sale commands). Removed here; the two `SaleCrudTests` cases that looked their sale up *by*
  invoice number now use the id from `CreatedSaleDto`.
- **An in-person sale may be an installment sale**, and the command now carries the contract:
  `CreateInPersonSaleCommand.InstallmentPlan` (a `CreateSaleInstallmentPlanCommand`, its `SaleId`
  overwritten from the sale just created, same idiom as the nested `Sale`) is sent inside the
  transaction **before** `ShipSale`. Required when `PaymentType == INSTALLMENT`, refused otherwise,
  and its `DownPaymentAmount` must be `> 0`; the full-payment rule now applies only to non-installment
  sales. **A proforma is a sale nobody has paid a rial towards** - what takes a sale out of it is money
  changing hands, which for an installment sale is the down payment, and that is exactly what issues
  the official invoice number (`CreateSaleInstallmentPlanCommandHandler` already finalizes). Refusing a
  zero down payment is the real invariant: goods must not leave the warehouse against a proforma.
- **`CreateSale`/`UpdateSale` required `PaymentDetails` for every non-`CASH` payment type**, which made
  `PaymentType = INSTALLMENT` unconstructible through the API at all - the down payment's
  `PaymentDetail` is written by `CreateSaleInstallmentPlanCommand` with
  `Purpose = INSTALLMENT_DOWN_PAYMENT`, so there is nothing for the client to send. `INSTALLMENT` is
  now exempt in both validators. Found by the in-person installment test; it was a gap on the ordinary
  installment path too, which the installment session's tests missed because they seed the proforma
  sale directly rather than through `CreateSale`.
- **`UpdateSaleCommandHandler` never persisted `request.PaymentDetails`** - it validated the list and
  dropped it, so editing a sale silently discarded any new payment and the payment state could only
  ever be whatever `CreateSale` first wrote. (`CreateSaleCommandHandler` has always persisted them,
  not through handler code but through AutoMapper's name convention on `CreateMap<CreateSaleCommand,
  Sale>()`: `Sale.PaymentDetails` is a navigation collection and a `PaymentDetailDto -> PaymentDetail`
  map exists, so the rows save with the sale graph. Grepping the handler shows nothing - hence the
  earlier wrong claim in this file's first draft that neither side saved them.) `UpdateSale` now
  replaces the sale's payment rows wholesale, the same contract `Attachments` already has, and forces
  `Purpose = NORMAL` - that endpoint only ever records an ordinary payment.
  - **An installment sale is skipped entirely**, exactly as `PaidAmount` already is: its
    `INSTALLMENT_DOWN_PAYMENT`/`INSTALLMENT` rows belong to the installment feature and a wholesale
    replace would delete the payment history. Guarded on both the loaded plan and the request's
    `PaymentType`, so a sale with no plan yet is covered too.
  - **`UpdatePurchaseCommand` had the same hole, one step worse:** it did not accept `PaymentDetails`
    at all, so a purchase's payments were frozen at whatever `CreatePurchase` first wrote (that one
    saves through the same AutoMapper convention - confirmed by a test written before the change,
    which passes against unmodified `CreatePurchaseCommandHandler`). The field, the non-`CASH`
    requirement `CreatePurchase` already had, and the same wholesale replace are now on Update; the
    handler gained an `IMapper` parameter. No installment branch here - the installment feature is
    sale-only, so every purchase payment is `Purpose = NORMAL`.
- No schema change, no migration. Tests: `Tests/WMS.Tests/Integration/InPersonSaleTests.cs` (4 -
  cash round-trip, installment with down payment, and both refusals, each asserting stock did not
  move on refusal), 3 in `SaleCrudTests` (create persists the payment rows, update replaces them,
  update leaves an installment sale's rows alone) and 2 in `PurchaseCrudTests` (the same for the
  purchase side). **Verified: build clean, suite 556/567**, the 11 failures being the
  long-documented pre-existing ones (8 `IX_Users_PersonelCode`/functional-seed collisions, the
  `"***"` object-storage placeholder, and the two LibreOffice-dependent `InvoicePdfTests`).

**Quarantine units carry their own value (2026-09-21).** Supersedes Phase 4's "cost of leaving quarantine is the effect's
`UnitCost`" in the traceable-warehouse entry above. API: `docs/api-guide.fa.md` §10 and the 2026-09-21 table in §16.

- **Why.** Staff decide *what* happens to returned goods (money in/out, goods in/out/release/scrap); the value of goods in
  our books is a recorded fact, not a negotiation. Asking the client for it (`QuarantineEffectDto.UnitCost`, and
  `GoodsEffectDto.UnitCost` on a GOODS_OUT from quarantine) let a typed number corrupt the ledger: the frontend defaulted
  to the gross line price (off-pool entered at the net price), and a return of excess with no cost sent left at the running
  average although it had entered at 0 - either way the off-pool balance of the product never returned to zero.
- **`ProductUnit.QuarantineCost`** (`decimal(18,4)`, same precision as `OffPoolValueDelta`) is stamped when a unit is
  minted QUARANTINED - `UnitOrigin.Quarantined(..., cost)`; `MintAsync` throws `InvalidOperationException` for a
  quarantined origin without one. Values: the paid-for defective share of a line = net line price (returned by
  `RecordPurchaseReceiptQuarantinedAsync`), EXCESS/UNLISTED = 0, a damaged replacement = its entry cost (returned by
  `RecordPurchaseReturnReplacementQuarantinedAsync`). Null for units never quarantined; kept after leaving as a record.
- **Leaving quarantine reads only the units.** `ReturnToSupplierAsync`/`ReleaseFromQuarantineAsync`/`ScrapFromQuarantineAsync`
  now return the units they moved; `ExecuteGoodsRound` sums their `QuarantineCost` (`HeldValueOf`) and passes that
  `heldValue` to the three ledger methods. `RecordQuarantineReleasedAsync` enters the pool with the exact total
  (`AddEntryAsync(..., inboundValue:)`), not quantity x average-of-costs, so pool and off-pool move by the same amount.
  `ExpandComposition` no longer copies `UnitCost` onto release/scrap effects; the DTO field stays only so old payloads bind.
  `GoodsEffectDto.UnitCost` still applies to GOODS_IN (entry into the pool).
- **Decision-time check.** `AddClaimResolution` (purchase) refuses release/scrap beyond the claim's quarantined units minus
  what pending release/scrap effects on open returns of the same purchase already promised. GOODS_OUT is not checked -
  its source is only stated by the warehouse at execution. The claim -> quarantine selection moved from a private method
  on `ExecuteGoodsRoundCommand` to `Application/Common/Returns/PurchaseReturnQuarantine.For`, shared by both.
- Migration `20260921170535_quarantine-unit-cost` adds the column and backfills units currently QUARANTINED (ON_ORDER with
  a line -> net line price, everything else 0; a damaged replacement under ON_ORDER custody also gets the line price - its
  entry cost was never stored, and the data is test data). **Generated, not applied.**
- Tests: 5 new in `Integration/QuarantineExitTests.cs` (net-price stamping with a line discount, release ignoring a sent
  cost, excess returned with no cost leaves off-pool at 0, scrap of shelf goods refused at decision, double promise
  refused). Verified against a local `.\SQLEXPRESS` by temporarily pointing `TestDatabase` at it (reverted): the 7
  quarantine/unit/return-effect classes 66/66; full suite 552/572 - the 20 failures are the 17 functional tests whose
  `WmsApiFactory` still targets `Server=.`, the 2 LibreOffice `InvoicePdfTests` and 1 `PersonelCode` collision.

**Scrap from sellable stock; closing a purchase line short (2026-09-21).** The two gaps a comparison with SAP, Odoo,
Business Central and NetSuite turned up (defective goods found on the shelf can be scrapped - Odoo scrap order / SAP 551;
a PO line the supplier will never finish can be closed - SAP "delivery completed"). API: `docs/api-guide.fa.md` §9, §10,
§15 and the 2026-09-21 table in §16.

- **`GOODS_SCRAP` accepts `Source = IN_STOCK`** on the purchase goods round (omitted/QUARANTINED behaves as before).
  Stock is projected and checked like a shelf GOODS_OUT, `ProductUnitService.ScrapFromStockAsync` moves IN_STOCK units
  (on the claim's line for ON_ORDER) to SCRAPPED with movement `STOCK_SCRAPPED = 12`, and
  `RecordStockScrappedAsync` writes ledger event `STOCK_SCRAPPED = 21` - an ordinary outbound row at the running average,
  no revenue. `GetSaleReportQuery` books it as `ScrapLoss` (from `InventoryValueDelta`), never as COGS.
- **The decision-time quarantine check now covers `GOODS_RELEASE` only**: scrap, like GOODS_OUT, can take shelf or
  quarantine and the warehouse states which at execution. Promised units are pending releases only.
- **`PurchaseItem.ShortClosedQuantity` / `ShortClosedAt`** and the `[NotMapped] StillOwedQuantity` (Quantity - Received -
  ShortClosed), now the single definition read by `ReceivePurchaseCommand` (anything arriving on a closed line is excess),
  `GetPurchaseReceivingInfoQuery` and `RecomputePurchaseStatus` (a closed line counts as complete; `ShortClosed > 0` alone
  makes a purchase PARTIALLY_RECEIVED). `ClosePurchaseItemCommand` / `ReopenPurchaseItemCommand`
  (`POST api/Purchase/ClosePurchaseItem|ReopenPurchaseItem`) are physical only - no stock, unit, ledger or money effect.
  Close is refused until something has been received on the purchase (any line `ReceivedQuantity > 0`, 2026-09-22):
  before that the order is still editable/cancellable, and closing every line of a PROFORMA/PENDING purchase used to make it
  RECEIVED with nothing received and no invoice number ever required.
- **Open, deliberately not built:** money back for goods that were paid for and never delivered. The ON_ORDER claim quota is
  `Received - Settled - open`, so there is no claim to hang a MONEY_IN on for never-received units; a design question for the
  user (a money-only SHORT_SHIPPED claim capped by `ShortClosedQuantity` would fit the effect model), not something to guess.
- Migration `scrap-from-stock-and-short-close` (two columns on `PurchaseItems`). **Generated, not applied.**
- Tests: `Integration/PurchaseShortCloseTests.cs` (3) and two in `QuarantineExitTests` (scrap from shelf end to end incl. the
  sale report; release from shelf refused). Full suite against `.\SQLEXPRESS` (temporary `TestDatabase` redirect, reverted):
  557/577, the same 20 environmental failures as the previous entry.

**Buying the excess instead of releasing it free (2026-09-22).** `AcceptPurchaseExcessCommand`
(`POST api/Purchase/AcceptPurchaseExcess`). API: `docs/api-guide.fa.md` §9 and the 2026-09-22 table in §16.
**No schema change, no migration.**

- **The hole it closes.** Quarantined EXCESS/UNLISTED units carry `QuarantineCost = 0` (nobody paid for them), so the only
  way out was a return resolution: `GOODS_RELEASE` (enters the pool at 0) plus a `MONEY_OUT` (purchase spend, no inventory
  value). The money we paid never reached the cost pool - the goods were then sold at a cost of 0 and the sale report
  overstated profit by exactly what we paid. Releasing at 0 now means what it says: free goods.
- **Accepting them adds them to the order** (SAP / Odoo over-delivery handling), which is also why no new "cost" field was
  invented: on a line, the price is the line's; unlisted goods get a **new `PurchaseItem`** at the supplier's invoice price,
  a document fact like any purchase line, not a number the warehouse guesses. `UnitPrice`/`Discount` sent for a line-based
  row is a 400. Excess on a line grows both `Quantity` and `ReceivedQuantity`, so `StillOwedQuantity` (and a short close) is
  unaffected.
- **Units:** `IProductUnitService.AcceptExcessAsync` = `MoveSelectedAsync(QUARANTINED -> IN_STOCK)` with a new `retag`
  callback that sets `PurchaseItemId` and `CustodyReason = ON_ORDER` **before** `RecordAsync`, so the movement row's line
  snapshot is the line the unit now belongs to. Ledger: `PURCHASE_EXCESS_ACCEPTED = 22` (pool in at the net line price,
  `OffPoolValueDelta = -heldValue`), movement reason `PURCHASE_EXCESS_ACCEPTED = 13`. `GetPurchaseReportQuery` counts it in
  `TotalReceivedValue` alongside the two `PURCHASE_RECEIVED*` events. `Purchase.TotalAmount` grows by the same amount; the
  payment itself still goes through `UpdatePurchase`'s `PaymentDetails`/`PaidAmount`.
- **Quota:** the same one an OFF_ORDER claim is capped by (held units of that custody minus
  `GetOutstandingOffOrderClaimQuantity`), so a unit is either bought or claimed back, never both.
- **Transaction, and why:** a new line needs a real `Id` before its units move (every `ProductUnitMovement` snapshots the
  unit's line as a plain int), so the handler saves the new lines mid-flight. It runs inside
  `IUnitOfWork.ExecuteInTransactionAsync`, so a refusal on a later row rolls the new lines back too - covered by
  `ARefusedRequest_MovesNothing`.
- **`goodsRelease` + `moneyOut` in one resolution is now a 400** (purchase side, `AddClaimResolutionCommandValidator`), and the
  Persian message names the **screen** («دریافت کالا»), not the endpoint - the person reading it is a warehouse user, to whom
  `AcceptPurchaseExcess` means nothing. A shape rule about one request, so it does not reach into the effect layer's
  scenario-free contract: `goodsRelease` + `moneyIn` stays legal (keep defective goods we paid for, take part of the money back)
  and so does `goodsOut` + `moneyOut`.
- **Still open** (deliberately): release at 0 today and record a `MONEY_OUT` next week and the ledger is wrong again, because
  nothing in the data ties that money to those goods - tying them would be exactly the inference the effect layer refuses. The
  validator catches the common, visible case and teaches the right path at the moment of the decision; the rest is a frontend
  guidance problem, written up in `docs/return-frontend-migration.fa.md` §5. Quarantined goods cannot be sold
  (`ConsumeAsync` selects IN_STOCK only), so nothing can be sold at 0 before one of these two paths is taken.
- **Frontend work, documented not done** (`docs/return-frontend-migration.fa.md` §5, which a later session should pick up):
  an "accept excess" action on the receiving screen next to `ReceivingQuarantineCard`, and a decision form that offers release
  only for `quarantinedOnOrderQuantity` and sends excess/unlisted quantity to that screen instead.
- **Rejected once, recorded so it is not re-proposed:** banning zero-value goods from entering stock outright. It would have
  closed every door at once, but it also outlaws genuine supplier bonus/sample goods, whose standard treatment is exactly the
  average dilution that releasing at 0 produces (the user's own call, after seeing what it would remove).
- Tests: `Tests/WMS.Tests/Integration/PurchaseExcessAcceptedTests.cs` (5) - the line case end to end incl. the running average
  and the purchase report, the net-price case with a 25% line discount, the new unlisted line, the two quota refusals, and the
  all-or-nothing rollback. Build clean; the 5 pass.

**Claim-based permissions (2026-09-22).** Authorization, which had been absent since role-based auth was
removed on 2026-08-26. Modelled on smshub2's permission system but with three deliberate departures, each
noted below. API contract: `docs/api-guide.fa.md` section 1 (Authorization), the new section 3d, section 15's
two enum tables and the 2026-09-22 breaking-changes table in section 16. Frontend migration guide:
`docs/permission-frontend-guide.fa.md` (nothing in `Frontend/` has been changed - the guide says what
the server now expects, what the frontend does today, and what to add).

- **Permissions belong to the person, not to their department or team.** A user's list is the set of their own
  `UserPermissions` rows; changing department or team changes nothing. Department-inherited permissions were
  considered and rejected by the user - see [[project-super-user-second-book-feature]] in memory for the
  feature that drove that call.
- **The enum is the catalogue; there is no Permissions table** (departure 1 from smshub2, which keeps both an
  enum and a `tblPermissions` table that have to be seeded in sync). A permission with no code guarding it is
  meaningless, so one can never be added from a UI - the table bought nothing and cost a seeding step.
  `PermissionEnum` carries `[Description]` (Persian label) and `[PermissionGroup]` (display section); helpers
  live in `Common/Extensions/PermissionExtensions.cs`. **The integers are persisted and are a frontend
  contract - section 7's never-renumber rule applies, and each group starts at a round number with room to
  grow.**
- **Permissions are NOT claims in the JWT** (departure 2; smshub2 bakes one claim per permission at login).
  `IPermissionService` (`Application/Common/Contracts/Permissions/`, implemented by
  `Infrastructure/Services/PermissionService.cs`, registered `Scoped`) reads them per request behind an
  `IMemoryCache` entry keyed `UserPermissions:{userId}`, invalidated explicitly by `UpdateUserPermissions` and
  `DeleteUser` and expiring after 5 minutes as a safety net for a row changed by hand in the database.
  Revoking therefore takes effect on the user's next request instead of whenever their token expires. The
  query filters on `x.User.IsActive`, so a deactivated user holds nothing and every check fails closed.
- **Enforced on the controller action, not in a MediatR pipeline behaviour.** This codebase composes commands
  by sending other commands through `IMediator` (`CreateInPersonSaleCommand`, `ReceiveShipmentCommand`,
  `DispatchShipmentCommand`), and a behaviour would demand the inner commands' permissions from a user who
  only asked for the outer one. `[HasPermission(PermissionEnum.X)]` (`WMS/Authorization/`) is a typed
  `AuthorizeAttribute` whose policy name is the enum member's name; `AddPermissionAuthorization()`
  (`WMS/Ioc/`) registers one policy per member at startup, generated from the enum so there is no second list.
  `PermissionAuthorizationHandler` is `Scoped` (it resolves the scoped DbContext) and takes the request's
  `CancellationToken` off `IHttpContextAccessor`, since `AuthorizationHandlerContext` carries none.
- **The cost of that choice is that nothing forces a new endpoint to carry a guard**, so
  `Tests/WMS.Tests/Unit/EndpointPermissionCoverageTests.cs` reflects over every controller action and fails
  unless it has `[HasPermission]` or is named in one of two short exception lists (anonymous / authenticated-
  only) with a reason. A third test fails when an exception entry goes stale.
- **`PermissionAuthorizationResultHandler`** turns ASP.NET's empty-bodied 401/403 into the project's
  `ResponseDto.Danger(...)` envelope. Without it a 403 is the one response with no `message` for the frontend
  to show - `UseAuthorization` neither throws nor runs inside `ExceptionHandlingMiddleware`.
- **`RestrictedPermissionAttribute` exists and nothing carries it yet.** A restricted permission is invisible
  to anyone who does not hold it and can only be granted by a holder (`PermissionExtensions.ManageableBy`,
  used by both the read and the write side so a permission can never be granted through a screen that would
  not show it). This is departure 3 and the groundwork for the planned super-user feature: plain
  `PermissionManage` is self-escalating by nature, so "cannot see it, cannot grant it" is the only rule that
  actually holds an ordinary administrator out. **Ordinary permissions are deliberately NOT subject to a
  "you may only grant what you hold" rule** - that was the first design and it deadlocks, because nobody
  holds a permission the day it ships and so nobody could ever grant it.
- **`UpdateUserPermissionsCommand` replaces wholesale, scoped to what the caller may manage.** Rows the caller
  cannot see are left on the target untouched rather than deleted for not appearing in a list the caller was
  never shown. A user cannot remove `PermissionManage` from themselves (the one mistake that is unrecoverable
  without direct SQL). Queries: `GetPermissionList` (catalogue, grouped), `GetUserPermissions` (one user, plus
  the catalogue so the edit screen needs one call), `GetMyPermissions` (no permission required - every user may
  ask what they can do).
- **Bootstrap is one manual row, ever**: until somebody holds `PermissionManage` there is no way to grant
  anything from inside the system. Insert it directly into `UserPermissions`.
- **Two endpoints changed behaviour beyond gaining a guard**: `Account/Logout` now requires `[Authorize]` (its
  handler already read the signed-in user's id and threw without one), and `Account/LogoutUserById` - forcibly
  ending someone else's session, previously open to anyone - now requires `UserUpdate`.
- Shipped as migration `20260922213512_add-user-permissions` (the `UserPermissions` table only:
  `(UserId, Permission)` composite key, `GrantedAt`, nullable `GrantedByUserId` with `Restrict` since two FKs
  into `Users` on one table would otherwise give SQL Server multiple cascade paths). **Generated, not applied**
  - the user applies migrations themselves.
- **Test-suite side effects, all improvements**: `Seed.User` no longer sets a fixed `PersonelCode = 1001`,
  letting the `UserPersonelCode` sequence assign it - that literal was the cause of the long-documented
  `IX_Users_PersonelCode` collisions, so 9 tests that had been failing for months now pass. Both functional
  `SeedAdminUser` helpers call the new `Seed.GrantAllPermissions`. One assertion in
  `ApiFunctionalTests.CreateProduct_WithMalformedBody_...` was stale (the model-state message appends the
  offending field names) and only surfaced once its seeding worked; it now asserts the prefix.
- **Verified:** build clean; suite **608/611**. The 3 failures are the environmental ones documented
  throughout this file - 2 `InvoicePdfTests` needing LibreOffice and the `"***"` object-storage placeholder
  gap. The previous recorded baseline was 11 failures.

**Department permission templates (2026-09-23).** A department can carry a *suggested* permission set
(`DepartmentPermissionTemplate`, key `(DepartmentId, Permission)`, cascade on the department). It grants
nothing - the permission check still reads only `UserPermissions` - and editing it changes nobody's access.
The frontend offers it on the user screen (the template of the department *selected in the form*, so moving a
user shows the destination's template) for the admin to apply to the checkboxes; saving is still
`UpdateUserPermissions`. Endpoints on `PermissionController`: `GetDepartmentPermissionTemplate`
(`PermissionView`, returns the template plus the grouped catalogue) and `UpdateDepartmentPermissionTemplate`
(`PermissionManage`, wholesale-within-manageable like the user command). Tests in `PermissionTests`
(`DepartmentTemplate_*`).
- **Written without `dotnet` available: not compiled, tests not run, migration not generated.** Run
  `dotnet build WMS.slnx`, then `dotnet ef migrations add add-department-permission-templates --project
  Infrastructure --startup-project WMS`, then `dotnet test Tests/WMS.Tests`.

**Proforma exits on the first payment (2026-09-24).** A non-installment sale leaves `PROFORMA` as soon as
`PaidAmount > 0`, no longer only at `PaidAmount >= TotalAmount`. API: `docs/api-guide.fa.md` §11b, §15
(`SalesStatusEnum`) and the 2026-09-24 table in §16.

- **Why:** a proforma is a sale nobody has paid a rial towards. Once any money has changed hands the sale is real
  and gets its official invoice number - the same reasoning that already made the installment down payment the
  exit condition. Goods must still never leave the warehouse against a proforma.
- `CreateSaleCommandHandler` finalizes (via `SaleInvoiceFinalizer`) when `PaidAmount > 0`; `UpdateSaleCommandHandler`'s
  non-installment branch sets `canLeaveProforma = request.PaidAmount > 0` and still throws `ValidationCustomException`
  on a manual exit with nothing paid. **Keep that throw**: without it `Status` is copied straight from the request, so
  a sale could reach `PROCESSING` with no payment and an empty `InvoiceNumber`, and then be shipped.
- **Unchanged:** installment sales (active plan + down payment) and non-installment `CreateInPersonSaleCommand`, which
  still requires full payment because the customer takes the goods on the spot.
- **One-way:** lowering `PaidAmount` back to 0 later does not return the sale to `PROFORMA`; its invoice number stays.
  A `PROCESSING` sale can therefore still owe money - debt is `TotalAmount - PaidAmount`, never the status.
- No schema change, no migration.
- **Tests rewritten to the new rule** (`SaleCrudTests`): stays proforma only with `PaidAmount = 0`
  (`CreateSale_ProformaWithNoPayment_…`, `UpdateSale_ProformaWithNoPayment_ManualStatusChange_ThrowsValidation`),
  one rial finalizes on create (`CreateSale_ProformaWithAnyPayment_…`), a partial payment finalizes on update
  (`UpdateSale_ProformaReceivingFirstPayment_AutoFinalizes`), and new
  `UpdateSale_ProformaWithPartialPayment_ManualStatusChange_StillIssuesInvoiceNumber` guards the "no invoice number"
  hole above. `CreateSale_AsProforma_WithoutInvoiceDate_PersistsNull` now sends `PaidAmount = 0`, and
  `SaleInstallmentTests.NonInstallmentSale_KeepsTheOriginalProformaExitRule` became `…_LeavesProformaOnFirstPayment`.
  **Verified:** build clean, suite 614/617; the 3 failures are the documented environmental ones (2 LibreOffice
  `InvoicePdfTests`, the `"***"` object-storage placeholder).

**Sortable list queries (2026-09-24).** All 19 paged list queries take optional `SortBy` + `SortDirection`. API:
`docs/api-guide.fa.md` §1 «مرتب‌سازی» (every enum and default) and the 2026-09-24 sorting table in §16. No schema change.

- **Fixed along the way: 10 of them had no `OrderBy` at all** (customer, supplier, product, category, purchase, sale, user,
  department, team, POS terminal), so page contents were whatever SQL Server returned - a row could appear on two pages or
  none. The rest had a sort without a unique tie-breaker. Every list now ends with `ThenSortBy(Id)` (`CustomerId`/`UserId`/
  `PlanId` on the rows that have no `Id`).
- **Helpers**: `Application/Common/Queries/SortingExtensions.cs` (`SortBy`, `ThenSortBy`, `ResolveDirection`) and
  `Application/Common/Enums/SortDirectionEnum.cs`. Direction rule: explicit `SortDirection` wins; a `SortBy` alone sorts
  ascending; nothing sent uses the query's own default (newest first for documents/people, alphabetical for catalogues,
  due date ascending for installments, biggest total first for the four statistics reports).
- **Where the sort is applied**: on the entity before `Select` when every key is a column or navigation; on the projected
  DTO/row after `Select` when a key is computed there (`QuarantinedCount`, `ProductCount`, `TeamCount`/`UserCount`,
  the installment plan's paid/remaining sums, the report aggregates). Fields filled after `ToPagedAsync` (`ImageUrl`,
  `RoleTitle`, `StatusTitle`, supplier `Status`, `Problems`, `InstallmentSummary`) are not sortable by construction.
- **Enum columns sort by integer, not by Persian label.**
- **Tests**: `Integration/ListSortingTests.cs` - one smoke test running every `SortBy` of every query in both directions
  against SQL Server (a key EF cannot translate compiles and only fails at run time), plus behaviour tests for a plain
  column, a computed count, alphabetical default, tie-breaking across pages and a navigation/concatenated key;
  `Unit/SortingExtensionsTests.cs`.

**Proforma lock, separate payments, supplement lines (2026-09-24) - phase 1 of 3.** Agreed with the user as one
design: (1) documents are editable only as PROFORMA and payments/status/attachments/due date get their own commands,
(2) the server computes line amounts and `TotalAmount` with tax, (3) an append-only party ledger (customer/supplier
receivables and payables). Only (1) is built. API: `docs/api-guide.fa.md` §9/§11 (the lock rules sit at the top of §9),
§15 `PaymentDirectionEnum`, and the 2026-09-24 «قفل پیش‌فاکتور» table in §16. Frontend: `docs/proforma-lock-frontend-guide.fa.md`.

- **Only a PROFORMA is edited.** `Application/Common/Documents/DocumentLockRules.EnsureDraft` guards `UpdatePurchase`/`UpdateSale`.
  After that, only four things stay open, each through its own command: payments (`Add/Edit/Void{Purchase,Sale}Payment`),
  status (`Change{Purchase,Sale}Status`), attachments (`Update{Purchase,Sale}Attachments`) and the due date
  (`Update{Purchase,Sale}PaymentDate`). Every such write, plus Create/Update Purchase, returns the full document through
  `{Purchase,Sale}DetailReader` (static, same pattern as the return readers; both filter `IsActive`). CreateSale keeps
  returning `CreatedSaleDto`, because `CreateInPersonSale` reads it.
- **Leaving PROFORMA is one-way.** A sale leaves on its first IN payment: `CreateSale` with rows or `AddSalePayment` calls
  `SaleInvoiceFinalizer`. `status` is gone from `CreateSaleCommand`/`UpdateSaleCommand`; the mapping forces PROFORMA. A
  purchase leaves when the supplier's invoice is recorded: `UpdatePurchase` to PENDING/SHIPPED with invoice number and date,
  or `ChangePurchaseStatus` once both are stored. A prepayment does NOT lock a purchase (the user's decision: prepayments
  happen and the final invoice must still be matchable). Voiding a sale's payment back to 0 does not return it to
  PROFORMA.
- **Correcting an issued invoice is cancel-and-reissue** (nothing moved yet) **or a return** (goods moved). There is never
  an edit. The frontend guide tells the user this.
- **Status rules.** Purchase manual statuses are PROFORMA/PENDING/SHIPPED (`IsManualPurchaseStatus`); PARTIALLY_RECEIVED/
  RECEIVED are computed and never chosen or left by hand. Cancel is allowed only with nothing received. For a sale,
  `ChangeSaleStatus` offers DELIVERED (from SHIPPED only) and CANCELLED (nothing shipped, no active installment plan).
  Every other sale status is system-set. CANCELLED is final on both sides.
- **`ReceivePurchase`/`ShipSale` refuse a PROFORMA.** Before this nothing stopped goods moving against a draft whose
  lines could still change.
- **`PaidAmount` = rows, never the client.** `PaymentDetail` gained `Direction` (`PaymentDirectionEnum`: IN=1, OUT=2,
  absolute from our side; a sale's natural direction is IN, a purchase's OUT) and `VoidedAt`. `Application/Common/Payments/
  DocumentPayments.NetPaid` is the one definition: non-voided rows in the document's direction minus the rest. It throws
  when refunds would exceed payments. A row is never edited or deleted: void stamps `VoidedAt`, edit = void + new row
  (`PaymentWriter`). Only NORMAL rows go through these commands; installment rows stay with the installment commands
  (which now set `Direction = IN`). `AddSalePayment` on an installment sale is refused until its plan is CANCELLED.
  `paidAmount` was removed from all four Create/Update commands, and `paymentDetails` from both Updates. The old rule
  "non-CASH needs `paymentDetails`" is gone (payment terms are not a payment). A row's `Type` must be
  CASH/CREDIT/CHECK/TRANSFER (`PaymentRowValidator`/`PaymentInputValidator`).
- **Delete is PROFORMA-only** on both sides and returns `{ Id }`. A purchase draft carrying a prepayment is refused until
  the payments are voided; a sale draft carrying an installment plan is refused until the plan is deleted.
- **`UpdatePurchase` edits lines** (`ProductItemList`, `UpdatePurchaseItemDto { int? Id, ... }`, wholesale). This is sync
  request item 2. None of the "received line" rules were needed, because a draft cannot be received; a legacy draft that
  does have received quantities is refused.
- **Accepted excess is a supplement line.** `PurchaseItem.IsSupplement` + `SupplementOfPurchaseItemId` (self FK, Restrict).
  `AcceptPurchaseExcessCommand` always adds a new line, even for an ordered product, at the ordered line's price and
  discount. The units move to that line; the ordered line is untouched (it used to grow). An issued invoice is only ever
  supplemented, never edited.
- **Lists hide soft-deleted documents** (`GetPurchaseList`/`GetSaleList` filter `IsActive`; the detail readers 404).
- **Permissions:** `PurchasePayment = 77`, `SalePayment = 96`. Status, attachments and due date use `PurchaseUpdate`/
  `SaleUpdate`.
- **Migration `20260924195203_payment-rows-and-supplement-lines`.** It adds the columns and backfills: every existing row
  gets its document's own direction; a document with `PaidAmount > 0` and no rows gets one NORMAL row for that amount
  (dated at `CreatedAt`); then every `PaidAmount` is recomputed from its rows. Excess accepted before this migration stays
  merged into its line. **Generated, not applied** - it ran cleanly from scratch against a throwaway local database
  (`WMS_MigCheck_0924`, since dropped).
- **Tests:** `PurchaseCrudTests`/`SaleCrudTests` rewritten around the lock (draft-only update and delete, status rules,
  payments add/edit/void/refund/cancelled, the receive/ship guards). Also updated: `CrudValidatorTests`,
  `MappingProfileTests`, `InPersonSaleTests`, `SaleInstallmentTests`, and `PurchaseExcessAcceptedTests` (supplement line).
  Suite 657/660; the 3 failures are the documented environmental ones.
- **Phases 2 and 3 are built** - see the next two entries.

**Invoice line amounts, tax and the installment charge on the server (2026-09-24) - phase 2 of 3.** API: `docs/api-guide.fa.md`
§9 (the amounts table and rounding example, right after the lock block), §11/§11b, §13, §15 `TaxCategoryEnum`, and the 2026-09-24
«مبالغ و مالیات فاکتور» table in §16. Frontend: `docs/proforma-lock-frontend-guide.fa.md` §10.

- **`Application/Common/Documents/InvoiceLineMath` is the one definition** (static, sync - pure math). Per line: Gross = Q x P
  (exact); Discount = round(Gross x d%); Net = Gross - Discount; Tax = round(Net x t%); Total = Net + Tax. Document total =
  the sum of line totals. All whole rials, `MidpointRounding.AwayFromZero` (C#'s default banker's rounding would turn 2.5 into 2),
  rounding only where a percentage is applied and per line, so printed rows always add up to the printed total.
  `Stamp(line, product)` takes the product's tax; `Recompute(line)` keeps the line's own snapshot.
- **Both line entities implement `Domain/Entities/IInvoiceLine`** and store `TaxCategory`, `TaxPercent`, `GrossAmount`,
  `DiscountAmount`, `NetAmount`, `TaxAmount`, `TotalAmount`. `Product.TaxCategory` (`TaxCategoryEnum`: TAXABLE=1, EXEMPT=2,
  starts at 1 on purpose) sits next to the existing `Product.Tax` percent; an EXEMPT line stores `TaxPercent = 0`.
  `TaxCategoryEnum` is our own label, not the Moadian classification; a new member (e.g. zero-rated) is appended.
- **`TotalAmount` is gone from `Create/UpdatePurchase` and `Create/UpdateSale`.** `DocumentProducts.LoadAsync` loads the lines'
  products (a missing id is a 404 instead of an FK failure at save), every line is stamped, and the total is summed. A draft is
  re-stamped on every save (the tax is re-read from the product); an issued invoice is never touched, so a later rate change does
  not reach it. `Discount` is validated 0-100 everywhere (above 100 would make Net negative), and product `Tax` <= 100.
- **Totals are now tax-inclusive.** Revenue and cost are still net of tax: the cost ledger keeps using unit price and discount
  (`NetUnitAmount`), untouched.
- **`AcceptPurchaseExcess`:** a supplement of an ordered line copies that line's `TaxCategory`/`TaxPercent` (same invoice, same
  terms) and `Recompute`s; an unlisted supplement is `Stamp`ed from the product. The purchase total grows by the line total,
  tax included; the pool takes the net price.
- **Installments.** `SaleInstallmentPlan.InstallmentChargeAmount` is new. `CashAmount` = `Sale.TotalAmount` (the invoice),
  charge = `InstallmentSchedule.ChargeAmount` (round half up), `TotalAmount` = cash + charge. All three are set by the server;
  `CashAmount`/`TotalAmount` were removed from both plan commands. **`Sale.TotalAmount` is never overwritten by a plan any
  more** (it used to become cash + markup). A proforma carrying a plan with no down payment refuses an `UpdateSale` whose new
  total differs from the plan's cash (delete the plan first). The in-person full-payment check moved from the validator into
  the handler, inside the transaction, because the total is only known once `CreateSale` has computed it.
- **`PayableAmount`** on `SaleDto`/`SaleListDto`: the live plan's `TotalAmount` when there is one (`InstallmentPlan.IsActive`),
  otherwise `TotalAmount`. Debt is always `PayableAmount - PaidAmount`. `SaleInstallmentSummaryDto` and `SaleInstallmentPlanDto`
  gained `CashAmount`/`InstallmentChargeAmount`.
- **The sale invoice PDF prints the stored amounts.** `IInvoiceLineCalculationService`/`InvoiceLineCalculationService` were
  deleted: they recomputed amounts for printing only, with truncating integer division that disagreed with the stored total.
  `InvoiceDocumentModel` gained `InstallmentChargeAmount`/`PayableAmount` (null unless there is a live plan). QuestPDF prints
  «سود اقساط» and «جمع قابل پرداخت» under «جمع فاکتور»; the official Excel template has no cells for them, so they go into the
  notes cell (`AE29`) like the due date. `Balance` = (payable or invoice total) - paid. **There is no purchase invoice PDF** -
  the old product-code entry below mentioned `GetPurchaseInvoicePdf`, but it does not exist.
- **Migration `20260924212237_invoice-line-amounts-and-tax`**, with a SQL backfill:
  - every product and line is set TAXABLE;
  - each line snapshots its product's current rate, and its amounts are computed with the same formula (SQL Server's `ROUND` is
    half away from zero for these positive values);
  - each plan's charge = old total - cash, and its sale's total goes back to the plan's cash;
  - drafts (PROFORMA) without a plan are re-totalled from their lines.
  Issued invoices keep their stored `TotalAmount` (a historical fact, even where it was typed by hand). It was verified against
  a throwaway local database seeded with a draft, an issued sale, an installment sale and a draft purchase: every number
  matched the C# (incl. 70,000 / 93,000 in the rounding example). **Generated, not applied.**
- **Tests:** `Unit/InvoiceLineMathTests.cs` (the worked example, half-up rounding, exempt, recompute, document total, the
  charge). `Integration/InvoiceAmountsTests.cs`: create stamps and totals on both sides; draft re-reads the rate while an issued
  invoice keeps it; unknown product is a 404; the plan charge is kept apart and `PayableAmount` appears on detail and list; plan
  edits recompute the charge on the same principal; a proforma with a plan cannot change its total. Plus
  `PurchaseExcessAcceptedTests` (supplement inherits the line's tax, tax-inclusive growth, net into the pool) and a QuestPDF smoke
  test for the installment layout. Existing tests lost their `TotalAmount`/`CashAmount` inputs; installment seeds now carry the
  invoice (cash) total. Suite 672/675 - the 3 documented environmental failures.

**Party ledger - customer and supplier accounts (2026-09-24) - phase 3 of 3.** API: `docs/api-guide.fa.md` §5b (the rules
table), §9 (`ClosePurchaseItem` and purchase `payableAmount`), §15 (the two ledger enums, permission 250), and the 2026-09-24
«دفتر حساب اشخاص» table in §16. Frontend: `docs/proforma-lock-frontend-guide.fa.md` §11. Sync request item 11 is answered in
`docs/purchase-frontend-sync-requests.fa.md`.

- **`PartyLedgerEntry`** is append-only (no IsActive; never edited or deleted). Exactly one of `CustomerId`/`SupplierId` is set,
  `Amount > 0` (both are check constraints), and `Direction` is DEBIT or CREDIT. **Balance = sum(DEBIT) - sum(CREDIT), positive =
  the party owes us**, the same reading for customers and suppliers. Other columns: `EntryType`, `OccurredAt` (business date,
  orders the statement), and links through navigations to `Sale`/`Purchase`/`PaymentDetail`, so rows written in the same request
  as a new sale or payment link before ids exist. Plain int ids (not FKs) for `SaleReturnClaimId`/`PurchaseReturnClaimId`/
  `PurchaseItemId`, because a return can be hard-deleted and the rows must outlive it. `ReversalOfEntryId` is a self-FK. All FKs are
  `Restrict`. It is separate from `InventoryCostLedgerEntry`, which values stock and books accrual revenue at shipment and is
  untouched.
- **`Application/Common/Ledger/PartyLedger` is the only writer**: static, it stages rows and never saves, so every row lands in the
  same SaveChanges as the change it records. The rules:

  | Event | Row |
  |---|---|
  | sale invoice issued (inside `SaleInvoiceFinalizer`, the one issuing path) | customer DEBIT total |
  | purchase leaves PROFORMA (`CreatePurchase` past PROFORMA, `UpdatePurchase` leaving, `ChangePurchaseStatus` from PROFORMA) | supplier CREDIT total |
  | supplement line (`AcceptPurchaseExcess`) | supplier CREDIT the line total |
  | line closed short (`ClosePurchaseItem`) | supplier DEBIT = `InvoiceLineMath.ShareOfTotal(line.TotalAmount, Quantity, ShortClosedQuantity)` |
  | installment charge on an issued sale (`InstallmentChargeChangedAsync`: create, update, and 0 on plan delete) | customer DEBIT the charge |
  | every payment row | IN -> CREDIT, OUT -> DEBIT (void -> reversal; edit -> reversal + new row) |
  | return money | only the ON_ACCOUNT part (incl. ON_ACCOUNT parts of MIXED) is written: MONEY_IN -> DEBIT, MONEY_OUT -> CREDIT |
  | cancelling an issued sale/purchase, reopening a short-closed line, removing a return resolution with money | REVERSAL rows |

- **Why cash return money writes nothing:** goods coming back and money going out cancel on the account (return credit + refund
  debit), so only an on-account settlement moves the balance. This keeps the effect layer scenario-free: the rule reads the money
  method and nothing else.
- **Why short close writes a row:** the issued invoice is never edited, so without it a paid-and-short-closed line left the supplier
  "owed" the undelivered units (invoice credit 10, payment debit 10, refund credit 2 = we owe 2 - wrong). With it: 10 - 10 + 2 - 2 = 0.
  `PurchaseDto.PayableAmount` (= TotalAmount minus the same shares) makes the document agree with the account; debt is
  `PayableAmount - PaidAmount` on both documents now.
- **Proformas are not on the account** (their invoice is not issued), except a purchase prepayment - that money did move.
- **Read side:** `GET api/PartyAccount/GetPartyStatement` (`customerId` xor `supplierId`, optional `fromDate`/`toDate`; opening
  balance before `fromDate`, running balance per row). It is deliberately not paged - a running balance needs a contiguous range.
  The feature folder is `PartyAccount`, not `PartyLedger`, because that namespace would shadow the class. `LedgerBalance` is on
  customer and supplier list/detail: lists compute it for the page in one grouped query after `ToPagedAsync`, details via
  `PartyLedger.BalanceAsync`. The detail handlers gained an `IWMSDbContext` parameter. `Balance`/`BalanceType` (hand-typed) are
  untouched and should eventually become derived or be removed. Permission `PartyStatementView = 250`, group `PartyAccounts = 13`.
- **Migration `20260924222250_party-ledger`** (table, check constraints, indexes on `(CustomerId, OccurredAt)`/`(SupplierId,
  OccurredAt)`). **Not backfilled, by agreement**: the ledger starts empty the day it is applied. Legacy purchases can therefore get
  a short-close DEBIT without their invoice CREDIT. The whole chain applies cleanly from scratch to a throwaway database.
  **Generated, not applied.**
- **Tests:** `Integration/PartyLedgerTests.cs` (12):
  - proforma not on the account until the first payment;
  - void = reversal;
  - cancel + refund settles;
  - customer list/detail balance;
  - purchase prepayment -> invoice -> final payment;
  - cancelled issued purchase reversed, cancelled draft writes nothing;
  - installment charge create/update/delete;
  - statement opening balance;
  - the 10/8/2 short-close scenario incl. reopen;
  - return money cash vs on-account (MIXED) with reversal;
  - validator;
  - the check constraint.

  Suite 684/687 - the 3 documented environmental failures.
- **Not built, noted:** an "apply a customer's credit balance to a new invoice" (allocation) flow; `PurchaseListDto` has no
  `PayableAmount` (the list projection would need the lines).

**Frontend sync requests 1, 5, 6, 8, 10, 12 (2026-09-25).** The rest of `docs/purchase-frontend-sync-requests.fa.md` (2, 3, 4, 7,
9, 11 were done in the three-phase pass above). API: `docs/api-guide.fa.md` §1 (Idempotency-Key), §9, §10, §12 and the 2026-09-25
table in §16. Frontend: `docs/frontend-sync-followup.fa.md`.

- **10 - only observable problems on arrived goods.** `Application/Common/Returns/ObservedProblems` (`WRONG_ITEM_SHIPPED`, `DEFECTIVE`,
  `DAMAGED_IN_TRANSIT`, `QUALITY_ISSUE`, `EXPIRED`, `OTHER` - the frontend's `OBSERVED_PROBLEMS`) guards `ReceivingDefectDto.Problem` and
  `GoodsRoundObservationDto.Problem` on both return sides. Every such row is part of what ARRIVED and becomes a received, quarantined unit,
  so `SHORT_SHIPPED` there minted units that never came. A shortage is a smaller `ArrivedQuantity`; paperwork problems belong on a claim.
- **12 / 8 - `GetPurchaseList`** gained `Statuses` (`List<PurchaseStatusEnum>`, `?statuses=2&statuses=3`, ANDed with the other filters)
  and `Search` (invoice number or supplier company name, trimmed, like `GetPurchaseReturnList`).
- **1 - `GetPurchaseReceivingInfo`** returns `items[].ClaimableQuantity`, `items[].FreeExcessQuantity` and `unlistedItems[].FreeQuantity`,
  computed from the same open returns (`WhereNotDeleted().WhereOpen().WithReturnGraph()`) and the same
  `IPurchaseReturnCalculationService` calls `CreatePurchaseReturn`/`AcceptPurchaseExcess` enforce. The handler gained that service.
- **6 - `StatusReason`** (`nvarchar(500)`, nullable) on `PurchaseReturn`/`SaleReturn`, surfaced on both detail DTOs. `Reason` on the four
  Reject/Cancel commands (optional, trimmed, blank = null, max 500 via `Application/Common/Returns/ReturnStatusReason`); Reopen clears it,
  so it always describes the current closed state. Migration `20260925121547_return-status-reason`. **Generated, not applied.**
- **5 - `Idempotency-Key`.** `WMS/Middlewares/IdempotencyMiddleware` + singleton `WMS/Idempotency/IdempotencyStore` (over `IMemoryCache`),
  registered after `CachingMiddleware`, so it runs inside `ExceptionHandlingMiddleware` and after the token check. Applies to
  POST/PUT/PATCH/DELETE from a signed-in user carrying the header; the key is scoped `{userId}:{key}` and fingerprinted by
  method + path + query + SHA-256 of the body. First request runs into a buffer; a 2xx response (up to 2 MB) is kept 24 h and replayed with
  `Idempotency-Replayed: true` (exposed via CORS). Anything else - a 4xx/5xx or a thrown exception - releases the key, so a retry runs
  again (failed writes save nothing). In flight: 409; same key, different request: 422; key over 255 chars: 400. An in-flight marker
  expires after 5 minutes in case its request died. **Single-process** like the permission cache: several API instances would need a shared
  store behind the same class. A request whose handler saved and then threw (e.g. the detail read after SaveChanges) would re-run on retry -
  an accepted edge.
- Tests: validator theories for 10 (`ReceivePurchaseCommandValidatorTests`, `GoodsRoundObservationValidatorTests`); `PurchaseCrudTests`
  (`Statuses`, `Search`); `ReceivingQuarantineTests.ReceivingInfo_FreeAndClaimableQuantities_SubtractOpenClaims`; both lifecycle test
  classes (reason stored/trimmed/cleared, 500-char limit); `Unit/IdempotencyStoreTests` and two functional tests through the real host
  (replay + one row, 422 on reuse, no key = no dedupe, failed write releases the key). Suite 715/718 - the 3 documented environmental
  failures.

**Store credit removed (2026-09-24).** Store credit is not a feature of this system; it was a leftover
from the old closed-`DecisionType` return model. API: `docs/api-guide.fa.md` §15 and the 2026-09-24
«حذف اعتبار فروشگاهی» table in §16.

- `ReturnPaymentMethodEnum.STORE_CREDIT = 5` deleted. **Do not reuse 5.** Both `AddClaimResolutionCommandValidator`s
  now run `IsInEnum` on `MoneyIn`/`MoneyOut.Method` and on each part's `Method` - before this nothing checked that
  `Method` was a defined member (the rules only compared against `MIXED`), so an undefined integer would have bound
  and persisted.
- `GetSaleReturnCreditNotePdfQuery` always labels a line «(استرداد وجه)».
- Migration `20260924151248_remove-store-credit`: no schema change; `UPDATE ... SET Method = 1 WHERE Method = 5` on
  `PurchaseReturnEffects`, `SaleReturnEffects` and both `...EffectMoneyParts` tables (`ON_ACCOUNT` is the closest
  remaining meaning). `Down` is a no-op on purpose. **Generated, not applied.**
- The superseded historical guides (`sale-return-guide.fa.md`, `return-scenarios-guide.fa.md`) and the stale comment in
  `scripts/seed-mock-data.sql` still mention the old `STORE_CREDIT` decision type; they describe a model that no longer
  exists and were left as history.
- Tests: `UndefinedMoneyMethod_IsInvalid` on both validator test classes; three tests that used `STORE_CREDIT` as an
  arbitrary method now use `ON_ACCOUNT`.

**Known gaps / TODOs** (mostly inherited from the initial scaffold):
- **`POST api/Sale/CreateSale` always returns 400** (confirmed against the running API, 2026-08-11): `CreateSaleCommand.ProductIds` is `List<SaleItem>` — the EF entity — and `SaleItem`'s non-nullable `Product`/`Sale` navigations are treated as required by ASP.NET model validation, so no sane payload binds. Needs a request DTO for line items. `CreatePurchaseCommand`/`UpdateSaleCommand` bind `PurchaseItem`/`SaleItem` the same way and are probably equally broken.
- ~~`PaymentDetail` uses `Guid Id`/`Guid PurchaseId` while `Purchase.Id` is `int`; EF added a shadow `PurchaseId1` int FK.~~ **Fixed 2026-09-20** - see the installment-sales entry above: both ids are `int`, both relationships are configured explicitly, and the shadow FK is gone.
- `IWMSDbContext` does not expose `DbSet<PurchaseItem>`/`DbSet<SaleItem>` (the concrete `WMSDbContext` does), and the two concrete DbSet properties use `{ get; set; }` while the rest use `=> Set<T>()`.
- List DTOs/queries do not yet surface or filter on `IsActive`; soft-deleted rows are only hidden if a query explicitly filters. Consider adding `IsActive` filters to list queries. (Note: `PurchaseReturn` has no `IsActive` — its lifecycle is `Status` alone, with per-decision `ResolvedAt`; purchase-return queries intentionally do not filter `IsActive`.)
- Validator class naming is inconsistent: `CreateCustomerCommandValidation`/`CreateSupplierCommandValidation` vs the standard `...CommandValidator` suffix.
- `Customer.longitude/latitude` and `Supplier.longitude/latitude` are lowercase in entities while commands use `Longitude/Latitude` — AutoMapper needs config for these.
- Serilog file sinks (`WMS/Logging/SerilogConfiguration.cs`) are never invoked; `Program.cs` only calls `builder.Host.UseSerilog()`, so request/error file logging is not actually wired.
- `PurchaseItem`, `SaleItem`, `PaymentDetail` have no feature folders (no CRUD yet). ~~Authorization is not yet re-implemented; it is planned to be based on `User.DepartmentId`.~~ **Done 2026-09-22, but not department-based** - see the claim-based permissions entry above: permissions belong to the person, and `Department`/`Team` are not an input to access control at all. Row-level scoping (which rows, as opposed to which action) is still not implemented and is a separate axis - do not try to express it as permissions.

**Product code / barcode / invoice PDF (implemented, 2026-08-14).** Full design in `docs/product-code-barcode-invoice-design.fa.md`, written from a Telegram planning chat between the two devs; implemented per that design's step order (section 4.4).
- **`Product.Code`** (`DateSegment-ProductId`, `IProductCodeService.BuildProductCode`) is generated after the first `SaveChanges` gives the row an `Id` — `CreateProductCommandHandler` writes a `Guid` placeholder into `Code`/`BarCode` on the first save (both are `NOT NULL`), then overwrites them with the real code and does a second `SaveChanges`. `Code`/`BarCode` are no longer request-bindable on `CreateProductCommand`/`UpdateProductCommand` (removed from both, immutable after creation).
- **`ProductUnit`** (`Domain/Entities/ProductUnit.cs`) gives every physical unit its own serial + barcode (`ProductCode-Serial`, digits-only `BarcodePayload` for the actual Code128 encoding). `IProductUnitService` (`Infrastructure/Services/ProductUnitService.cs`) is the only thing that mints/consumes/restores/reconciles units: `MintAsync` (receiving, product creation), `ConsumeAsync` (shipping, replacement shipment — FIFO by serial, or against explicit scanned barcodes), `RestoreAsync` (return inspection: healthy → `IN_STOCK`, defective → `SCRAPPED`), `ReconcileStockAsync` (manual `Stock` edits in `UpdateProductCommand`). Wired into all six stock-mutation sites named in the design (`ReceivePurchaseCommand`, `ShipSaleCommand`, `ConfirmReplacementShipmentCommand`, `ConfirmReturnInspectionCommand`, `UpdateProductCommand`, `CreateProductCommand`; the two return commands were replaced on 2026-08-28 by `ExecuteGoodsRoundCommand` on both return sides) — `Product.Stock == COUNT(ProductUnit WHERE Status=IN_STOCK)` is now a maintained invariant, not just documented intent.
- **Scan/lookup**: `GET api/Product/ScanBarcode` normalizes raw scanner input and resolves it to a product (plus the specific unit, if a unit-level barcode was scanned) via `IProductCodeService.Parse`. `GET api/Product/GetProductUnitList` lists units with status/serial-range filters. `POST api/Product/EnsureProductCodes` is the one-shot backfill (fixes any product missing a generated `Code`, reconciles `ProductUnit` counts against `Stock`) — **must be run once** between the two migrations below.
- **Barcode rendering**: `IBarcodeRenderer` (`Infrastructure/Services/ZXingBarcodeRenderer.cs`) uses ZXing.Net purely for Code128/QR module encoding, then hand-emits the modules as vector SVG (`<rect>` runs) — resolution-independent, so label DPI/printer stays a config concern. `GET api/Barcode/GetBarcodeSvg` renders any already-known code; `GET api/Barcode/GetProductLabelsPdf` renders a full label sheet for a product's units (default: `IN_STOCK` only, optional serial range for "just this receiving batch"). Default sheet layout is 3 columns × 48mm labels on A4 (`BarcodeLabelSheetModel`) — deliberately not 4 columns, which overflows A4 minus margins by a few mm; retune `Columns`/`LabelWidthMm`/`PageMarginMm` together if the target label stock differs.
- **PDF**: `IPdfDocumentService` (`Infrastructure/Services/QuestPdfDocumentService.cs`), QuestPDF Community license (set in `WMS/Program.cs`), Vazirmatn Regular/Bold embedded as assembly resources (`Infrastructure/Assets/Fonts/`, OFL-licensed) so RTL Persian text renders correctly on a server with no fonts installed. `GET api/Invoice/GetSaleInvoicePdf`, `GetPurchaseInvoicePdf`, and `GetSaleReturnCreditNotePdf` (REFUND/STORE_CREDIT decisions only — `REPLACEMENT` settles in goods, not money) share one invoice layout. ~~Line discount/tax are computed for the printed document only (`IInvoiceLineCalculationService`)~~ - superseded 2026-09-24: the amounts are stored on each line by `InvoiceLineMath` and the PDF prints them (see "Invoice line amounts, tax and the installment charge"). Company letterhead info comes from the `Company` config section in `appsettings.json` (placeholder values — fill in before real use). All PDF/SVG endpoints deliberately return `FileResponseDto`/raw bytes, not `ResponseDto` — a documented, intentional deviation from the project's usual MediatR-returns-ResponseDto convention; `BarcodeController`/`InvoiceController` return `IActionResult` via `File(...)` rather than `ActionResult<ResponseDto>`.
- **Migrations, in order**: `20260813124442_product-code-barcode-model` (the `ProductUnits` table + `Products.SupplierBarCode`, deliberately **without** a unique index on `Products.Code` — a pre-existing DB may have duplicate/empty codes), then run `EnsureProductCodes` once against that DB, then `20260813224738_product-code-unique-index` (adds the unique index). **Neither migration has been applied to any real database yet.**
- **Tests**: `Tests/WMS.Tests/Integration/ProductHandlerTests.cs` (code generation, unit minting, stock reconciliation up/down), `Tests/WMS.Tests/Unit/PdfAndBarcodeSmokeTests.cs` (renderer/PDF service smoke tests on hand-built models), `Tests/WMS.Tests/Integration/InvoicePdfTests.cs` (all three PDF endpoints through real seeded `Sale`/`Purchase`/`SaleReturn` entities). `Tests/WMS.Tests/Support/Seed.cs` gained `MintUnits` so fixtures that seed `Product.Stock` directly keep the `ProductUnit` invariant true for handlers that now depend on it.

> **SUPERSEDED — historical.** The two gap lists below describe the pre-2026-08-28 return model (see the note above the
> 2026-08-06 entry).

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
- **Don't add repository interfaces beyond the thin per-entity ones.** Tests go in the existing `Tests/WMS.Tests` project, not a second one.
- **Don't rename the intentional typos** (`Paggination.cs`, `PurchaceStatusEnum`) without asking — they are part of the codebase's existing naming.
- **Don't add a synchronous database call.** No `SaveChanges()`, no `ToList()`/`FirstOrDefault()`/`Count()`/`Any()` on an EF `IQueryable` — use the `...Async(cancellationToken)` counterpart. And never block on a `Task` (`.Result`, `.Wait()`, `.GetAwaiter().GetResult()`); it burns a request thread and can deadlock.
- **Don't drop the `CancellationToken`.** A handler's token must reach the EF call. Calling `GetByIdAsync(request.Id)` and letting the parameter default is a bug, not a shortcut.
- **Don't fake-async CPU work** — no `Task.Run` around in-memory math, and no `async` on a method with no `await`. See the async-design rule in §3.
