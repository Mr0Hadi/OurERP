# Import / Export guide

How tables are exported to and imported from CSV and Excel (.xlsx), and how to add a table.
API contract (Persian): `api-guide.fa.md` section 19. Frontend: `Frontend/ARCHITECTURE.fa.md` section 19.5.

## 1. Architecture

```
                 Application/Common/DataTransfer          (no HTTP, no React)
   ┌───────────────────────────────────────────────────────────────────────┐
   │ IDataTransferDefinition  ── Export: ExportSpec<TFilter, TRow>          │
   │   (one per resource)     └─ Import: ImportSpec<TCommand>              │
   │ ImportRunner   parse → FK lookup → command validator → duplicates     │
   │                → preview, or commit in batches inside one transaction  │
   │ DataValues     text ⇄ typed values (Persian digits, Jalali dates, …)  │
   └───────────────┬───────────────────────────────────────┬───────────────┘
                   │ ITabularFileFormat                    │ the feature's own code
   Infrastructure/Services/DataTransfer          Create*CommandHandler.BuildEntity,
   CsvTabularFormat, XlsxTabularFormat (ClosedXML)  Get*ListQueryHandler.ApplyFilters
                   │
   Application/Features/DataTransfer   ExportDataQuery, ImportDataCommand, GetImportTemplateQuery,
                                       GetDataTransferResourcesQuery, DataTransferAccess (permission gate)
                   │
   WMS/Controllers/DataTransferController   one controller for every resource
```

Why this shape:

- **Definitions are data, not code paths.** The core never knows what a product is. A definition says which
  columns exist, how a row becomes the resource's existing create command, which foreign keys are looked up by
  name, which keys make a duplicate, and which permissions guard each direction.
- **No business rule is duplicated.** An imported row becomes `CreateXCommand` and is checked by that command's
  own FluentValidation validator. The entity is built by the create handler's own code (`BuildEntity`, and for
  products `CompleteAfterInsertAsync`). Export filters with the list query's own filter code (`ApplyFilters`).
- **No MediatR call per row.** The runner validates in memory and the definition writes a batch per SaveChanges.
- **Formats are pluggable.** CSV and XLSX implement `ITabularFileFormat`; nothing else knows which one is used.

## 2. Enable export for a table

In the feature folder, `Application/Features/<Feature>/DataTransfer/<Feature>DataTransferDefinition.cs`:

```csharp
public IExportSpec Export => new ExportSpec<GetCustomerListQuery, CustomerExportRow>
{
    Permission = PermissionEnum.CustomerExport,
    Query = (filter, ct) => Task.FromResult(
        GetCustomerListQueryHandler.ApplyFilters(_context.Customers.Where(x => x.IsActive).AsNoTracking(), filter)
            .OrderBy(x => x.Id)                          // deterministic order
            .Select(x => new CustomerExportRow { ... })), // explicit projection
    Fields = new List<ExportColumn<CustomerExportRow>>
    {
        new() { Key = "firstName", Header = "نام", Value = r => r.FirstName },
        new() { Key = "creditLimit", Header = "سقف اعتبار", Type = DataFieldTypeEnum.Integer, Value = r => r.CreditLimit },
    },
};
```

- `TFilter` is the list endpoint's request class. The frontend sends the table's current filters as query
  parameters and the controller binds them onto it with ordinary MVC model binding.
- If the list handler filters inline, move the filter block into a `public static ApplyFilters` on the handler
  and call it from both places (see `GetCustomerListQueryHandler`). Do not copy the filters.
- `TRow` is a class you write. **Only what is in it can reach a file** (whitelist). Never project the entity.

## 3. Enable import

```csharp
public IImportSpec Import => new ImportSpec<CreateCustomerCommand>
{
    Permission = PermissionEnum.CustomerImport,
    Columns = new List<ImportColumn> { ... },
    DuplicateKeys = new List<DuplicateKey<CreateCustomerCommand>> { ... },
    Map = row => new CreateCustomerCommand { FirstName = row.Text("firstName")!, ... },
    CommitBatchAsync = async (commands, ct) =>
    {
        var entities = commands.Select(c => CreateCustomerCommandHandler.BuildEntity(c, _mapper, _storage)).ToList();
        await _context.Customers.AddRangeAsync(entities, ct);
        await _unitOfWork.SaveChangesAsync(ct);
    },
};
```

`CommitBatchAsync` must not open or commit its own transaction: the runner wraps all batches in one
(`IUnitOfWork.ExecuteInTransactionAsync`). If the create handler does more than "map and add", extract that work
into a static method on the handler and call it from both places, as `CreateProductCommandHandler` does.

## 4. Define importable fields

```csharp
new ImportColumn
{
    Key = "phoneNumber",                 // stable key, also accepted as a header
    Header = "شماره تماس",               // template/export header
    Required = true,
    Type = DataFieldTypeEnum.Text,       // Text, Integer, Decimal, Boolean, Date, Enum
    Property = nameof(CreateCustomerCommand.PhoneNumber), // validator errors land on this column
    AsciiDigits = true,                  // Persian digits → ASCII before validation
    MaxLength = 20,
    Aliases = new[] { "Phone", "موبایل" },
    Hint = "موبایل، مثل 09121234567",
}
```

Unknown headers are reported as warnings and ignored. Only listed columns are ever read.
Numbers accept Persian digits and thousands separators; dates accept `1403/05/12` (Jalali, any year below 1700)
and `2024-08-02`; booleans accept بله/خیر/true/false/1/0; enums accept the Persian `[Description]`, the member
name or the number. Use `MinValue`/`MaxValue` on an integer column that maps to an `int` property.

## 5. Define validation

You normally write none: the command's FluentValidation validator (the one the API uses) runs on every row, and
each failure is reported against the column whose `Property` matches. Parsing and `Required` are checked before
that. A rule that only makes sense for imports belongs in the definition (e.g. a stricter `MaxLength`).

## 6. Foreign keys

```csharp
ForeignKeys = new List<ForeignKeyLookup>
{
    new()
    {
        ColumnKey = "category",
        EntityTitle = "دسته‌بندی",
        ResolveAsync = async (normalizedNames, ct) => /* name → id for those that exist */,
        // CreateMissingAsync = ...   only if missing records may be created; null = error (default)
    },
},
```

The runner collects the distinct values of the column across the file and calls `ResolveAsync` once. Values
arrive normalized (`DataValues.NormalizeKey`: trimmed, single-spaced, case-insensitive, Arabic ي/ك → Persian
ی/ک); normalize the database side the same way. `row.ReferenceId("category")` gives the id in `Map`.
A missing reference is an error (`REFERENCE_NOT_FOUND`) and nothing is created, unless the definition sets
`CreateMissingAsync`. Then the preview shows a warning and the records are created inside the commit
transaction, before any row.

## 7. Duplicate detection

```csharp
new DuplicateKey<CreateCustomerCommand>
{
    Title = "شماره تماس",
    ColumnKey = "phoneNumber",
    Select = c => c.PhoneNumber,                       // null/blank = no key
    FindExistingAsync = async (normalizedKeys, ct) => /* the ones already in the database */,
}
```

For each key, a later row with the same value as an earlier row is `DUPLICATE_IN_FILE`, and a row matching the
database is `DUPLICATE_EXISTS`. `DuplicatePolicy` decides what that means: `SKIP` (default) marks the row
DUPLICATE, reports a warning and leaves the existing record alone; `REJECT` makes it an error. Updating existing
records (upsert) is deliberately not part of this feature.

## 8. Permissions

Each direction names its own `PermissionEnum` member (`ProductExport = 54`, `ProductImport = 55`,
`CustomerExport = 56`, `CustomerImport = 57`, `SupplierExport = 58`, `SupplierImport = 59`). Add new ones in the
resource's group without renumbering anything.

The controller is generic, so a static `[HasPermission]` cannot name the permission. Instead every handler calls
`DataTransferAccess.RequireExportAsync` / `RequireImportAsync`, which asks `IPermissionService` - the same check
`[HasPermission]` makes - and throws `ForbiddenCustomException` (403). This happens before the file is read.
The frontend hides buttons from `GetResources` (`canExport`/`canImport`), but that is only UX.
`EndpointPermissionCoverageTests` lists the five actions under `AuthenticatedOnly` with this reason.

## 9. Import and export independently

`Export` and `Import` are separate properties. Return `null` from either to turn that direction off:

```csharp
public IExportSpec? Export => new ExportSpec<GetSaleListQuery, SaleExportRow> { ... };
public IImportSpec? Import => null;   // sales invoices: export only
```

The endpoints answer 404 for a disabled direction and `GetResources` reports `exportEnabled`/`importEnabled`.

## 10. Toward backup / restore

Nothing in `Application/Common/DataTransfer` depends on HTTP or the UI:

- `ImportRunner.RunAsync(spec, new ImportRequest { Sheet, Mode, SkipInvalidRows })` takes a parsed
  `TabularSheet`; a job, a CLI or a restore service can call it with a sheet from anywhere.
- `IExportSpec.ReadRowsAsync(filter)` streams typed rows; a backup service can write them into any
  `ITabularWriter` - for example one sheet per resource in one workbook, or one CSV per resource in a zip.
- `IDataTransferRegistry.All` enumerates every resource, which is what a "full export" in Settings would iterate.

What a real backup/restore still needs (not built): an ordered list of resources (categories before products),
stable natural keys for foreign keys across databases, an upsert mode (`DuplicatePolicy.UPDATE`), a package
format with a manifest/version, and transactional data (invoices, ledgers), which today is not
importable on purpose.

## Example: how Products were added

1. `Application/Features/Product/Queries/GetProductListQuery.cs`: moved the filter block into
   `GetProductListQueryHandler.ApplyFiltersAsync` (the handler now calls it).
2. `Application/Features/Product/Commands/CreateProductCommand.cs`: moved the entity building into
   `CreateProductCommandHandler.BuildEntity` and the post-insert code generation into `CompleteAfterInsertAsync`.
3. `Domain/Enums/PermissionEnum.cs`: `ProductExport = 54`, `ProductImport = 55`.
4. `Application/Features/Product/DataTransfer/ProductDataTransferDefinition.cs`: export row + columns, import
   columns, the category lookup by name, duplicates by name + brand, `Map` to `CreateProductCommand`, and a
   `CommitBatchAsync` that inserts the batch, saves, generates codes and saves again.
5. Frontend, `ProductsPage.jsx`:
   `actions={<DataTransferActions resource="products" filters={filters} invalidateKey={productKeys.all} />}`.

No controller, parser, dialog or migration was needed.

## Safety limits and file checks

`appsettings.json` → `DataTransfer` (`DataTransferOptions`): `MaxUploadBytes` (5 MB), `MaxImportRows` (5000),
`MaxExportRows` (50000), `ImportBatchSize` (200), plus `MaxXlsxUncompressedBytes`, `MaxReportedIssues`,
`PreviewRowCount`.

- The extension must match the format, and the content must really be that format: CSV is refused if it starts
  with a zip/exe/ELF/PDF/OLE signature, contains NUL bytes or is not valid UTF-8; XLSX must be a zip with
  `[Content_Types].xml` and `xl/workbook.xml`, no VBA project, and a bounded uncompressed size (zip bomb).
- XLSX cells containing formulas are refused (their value depends on whoever last calculated the file).
- Formula injection on export: CSV text starting with `= + - @ \t \r` is prefixed with `'`; XLSX writes text as
  text cells (never formulas). The import strips that `'` again, so exports re-import unchanged.
- Uploads are buffered in memory up to the size limit and never stored. Preview and commit each receive the file.
- Audit: `IDataTransferAuditLog` writes a structured `DataTransferAudit` log event (user, operation, resource,
  format, counts, status, file name, duration). There is no audit table yet; a future one implements the same
  interface.
