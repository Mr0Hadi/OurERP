# CLAUDE.md

Guidance for coding agents working in the WMS (Warehouse Management System) .NET backend.
This project was scaffolded from the smshub2 reference project (`/home/alisinai/RiderProjects/smshub2`) and follows its conventions closely, with the entity naming made project-specific.

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
│   │                    # Sale, SaleItem, Supplier, User, Role, Department, Team, PaymentDetail
│   └── Enums/           # BalanceTypeEnum, PaymentTypeEnum, ProductUnitEnum,
│                        # PurchaceStatusEnum (typo kept), SalesStatusEnum, UserRolesEnum
├── Application/
│   ├── Common/
│   │   ├── Behaviors/   # ValidationBehavior
│   │   ├── Contracts/   # Repositories/, Context/ (IWMSDbContext), UnitOfWork/, Token/,
│   │   │                # UserContextService/, Environment/, (Captcha/ present, unused)
│   │   ├── Dtos/        # ResponseDto (+ Success/Warning/Danger factories), ResponsePageDto, ...
│   │   ├── Enums/       # ResponseMessageTypeEnum
│   │   └── Mapping/     # MappingProfile
│   ├── Features/
│   │   ├── Account/     # Command/ (login, logout, refresh, otp, forget-password)
│   │   ├── Customer/    # Commands/, Queries/, Dtos/
│   │   ├── Product/
│   │   ├── ProductCategory/
│   │   ├── Purchase/
│   │   ├── Sale/
│   │   ├── Supplier/
│   │   └── User/        # Command/, Query/, Dto/ (singular — legacy)
│   └── Ioc/             # ApplicationServiceRegistration (AddApplicationServices)
├── Infrastructure/
│   ├── Persistence/     # WMSDbContext
│   ├── Repositories/    # GenericRepository<T> + per-entity repositories
│   ├── UnitOfWork/      # UnitOfWork
│   ├── Ioc/             # InfrastructureServiceRegistration (AddInfrastructureServices)
│   ├── Services/        # TokenService, CaptchaService
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

**Implemented**: JWT auth + account flows (login, logout, refresh token, OTP, forget password); full CRUD for Customer, Product, ProductCategory, Supplier; create/update + list/detail + receive-list for Purchase and Sale; user create/update/info. OpenAPI via Scalar (`/scalar`). **IsActive** exists on every entity and each entity feature folder has a soft-delete command (`DeleteCustomerCommand`, `DeleteProductCommand`, `DeleteProductCategoryCommand`, `DeletePurchaseCommand`, `DeleteSaleCommand`, `DeleteSupplierCommand`, `DeleteUserCommand`), all setting `IsActive = false` and throwing `NotFoundCustomException` when the row is missing. Each controller exposes a matching `[HttpDelete("DeleteX")]` action that `Send`s the command (`DeleteCustomer`, `DeleteProduct`, `DeleteProductCategory`, `DeletePurchase`, `DeleteSale`, `DeleteSupplier`, `DeleteUser`), taking the command via `[FromQuery]`. Create mappings default `IsActive = true` (existing rows default to active via the migration's column default). Schema change shipped as EF migration `20260802123347_add-isactive` (see `Infrastructure/Migrations`).

**Known gaps / TODOs** (mostly inherited from the initial scaffold):
- `CreatePurchaseCommandHandler` declares `_unitOfWork` but its constructor never assigns it → `NullReferenceException` at runtime (`Application/Features/Purchase/Commands/CreatePurchaseCommand.cs:46-62`).
- `ReceivePurchaseCommand` and `GetReceivePurchaaseDetailQuery` (filename typo kept) are empty stubs.
- `PaymentDetail` uses `Guid Id`/`Guid PurchaseId` while `Purchase.Id` is `int`; EF added a shadow `PurchaseId1` int FK (see `WMSDbContextModelSnapshot.cs:119-124`). Needs reconciliation.
- `IWMSDbContext` does not expose `DbSet<PurchaseItem>`/`DbSet<SaleItem>` (the concrete `WMSDbContext` does), and the two concrete DbSet properties use `{ get; set; }` while the rest use `=> Set<T>()`.
- List DTOs/queries do not yet surface or filter on `IsActive`; soft-deleted rows are only hidden if a query explicitly filters. Consider adding `IsActive` filters to list queries.
- Validator class naming is inconsistent: `CreateCustomerCommandValidation`/`CreateSupplierCommandValidation` vs the standard `...CommandValidator` suffix.
- `Customer.longitude/latitude` and `Supplier.longitude/latitude` are lowercase in entities while commands use `Longitude/Latitude` — AutoMapper needs config for these.
- `GetReceivePurchaseListQuery` projects `SupplierName` as first+last name, `GetPurchaseListQuery` uses `CompanyName` — inconsistent.
- Serilog file sinks (`WMS/Logging/SerilogConfiguration.cs`) are never invoked; `Program.cs` only calls `builder.Host.UseSerilog()`, so request/error file logging is not actually wired.
- `Role`, `Department`, `Team`, `PurchaseItem`, `SaleItem`, `PaymentDetail` have no feature folders (no CRUD yet).

## 7. Conventions to avoid

- **Don't add `tbl`-prefixed entities** — that is the smshub2 reference style; this project uses plain `Customer`, `Product`, etc.
- **Don't split handlers/validators into separate files** — request + validator + handler live in one file.
- **Don't route reads through repositories for list/detail queries** — inject `IWMSDbContext` and build LINQ directly.
- **Don't return error messages via `ResponseDto` in handlers** — throw `Common.Exceptions` custom exceptions and let `ExceptionHandlingMiddleware` serialize them.
- **Don't add a global `IsActive` query filter** — soft delete is an explicit `IsActive = false` write; filtering is done per-query.
- **Don't add a test project or repository interfaces beyond the thin per-entity ones** — none exist today.
- **Don't rename the intentional typos** (`Paggination.cs`, `PurchaceStatusEnum`, `GetReceivePurchaaseDetailQuery`) without asking — they are part of the codebase's existing naming.
