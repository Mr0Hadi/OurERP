using Application.Common.Contracts.DataTransfer;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.DataTransfer;
using Common.Exceptions;
using Common.Extensions;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace WMS.Tests.Unit
{
    /// <summary>
    /// The generic import pipeline against a small fake resource: header mapping, parsing, foreign keys, the command's
    /// validator, duplicates, preview vs commit, and the all-or-nothing transaction. No database: the fake unit of work
    /// only marks a transaction committed when its work finished without throwing, which is the contract
    /// IUnitOfWork.ExecuteInTransactionAsync gives.
    /// </summary>
    public class ImportRunnerTests
    {
        public class ItemCommand
        {
            public string Name { get; set; } = string.Empty;
            public string Phone { get; set; } = string.Empty;
            public int CategoryId { get; set; }
            public long Price { get; set; }
        }

        public class ItemCommandValidator : AbstractValidator<ItemCommand>
        {
            public ItemCommandValidator()
            {
                RuleFor(x => x.Name).Must(Validation.IsPersianText).WithMessage("نام باید فارسی باشد.");
                RuleFor(x => x.Phone).Must(Validation.IsMobileNumber).WithMessage("شماره تماس صحیح نیست.");
                RuleFor(x => x.CategoryId).GreaterThan(0);
            }
        }

        private sealed class FakeUnitOfWork : IUnitOfWork
        {
            public int Transactions { get; private set; }
            public int Committed { get; private set; }

            public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default) => Task.FromResult(0);

            public async Task<T> ExecuteInTransactionAsync<T>(Func<CancellationToken, Task<T>> work, CancellationToken cancellationToken)
            {
                Transactions++;
                var result = await work(cancellationToken);
                Committed++;
                return result;
            }

            public void Dispose() { }
        }

        /// <summary>The fake "database": categories, existing phones, and what got written.</summary>
        private sealed class Store
        {
            public Dictionary<string, int> Categories { get; } = new() { ["لوازم یدکی"] = 7 };
            public HashSet<string> ExistingPhones { get; } = new() { "09120000000" };
            public List<ItemCommand> Written { get; } = new();
            public List<int> BatchSizes { get; } = new();
            public Func<IReadOnlyList<ItemCommand>, Task>? OnBatch { get; set; }
            public bool AllowCreatingCategories { get; set; }
            public List<string> CreatedCategories { get; } = new();
        }

        private static ImportSpec<ItemCommand> Spec(Store store, DuplicatePolicyEnum policy = DuplicatePolicyEnum.SKIP) => new()
        {
            Permission = Domain.Enums.PermissionEnum.ProductImport,
            Columns = new List<ImportColumn>
            {
                new() { Key = "name", Header = "نام", Required = true, Property = nameof(ItemCommand.Name) },
                new() { Key = "phone", Header = "تلفن", Required = true, AsciiDigits = true, Property = nameof(ItemCommand.Phone), Aliases = new[] { "Phone" } },
                new() { Key = "category", Header = "دسته", Required = true, Property = nameof(ItemCommand.CategoryId) },
                new() { Key = "price", Header = "قیمت", Type = DataFieldTypeEnum.Integer, MinValue = 0, Property = nameof(ItemCommand.Price) },
            },
            ForeignKeys = new List<ForeignKeyLookup>
            {
                new()
                {
                    ColumnKey = "category",
                    EntityTitle = "دسته‌بندی",
                    ResolveAsync = (keys, _) => Task.FromResult<IReadOnlyDictionary<string, int>>(store.Categories
                        .Where(c => keys.Contains(DataValues.NormalizeKey(c.Key)!))
                        .ToDictionary(c => DataValues.NormalizeKey(c.Key)!, c => c.Value)),
                    CreateMissingAsync = store.AllowCreatingCategories
                        ? (names, _) =>
                        {
                            var created = new Dictionary<string, int>();
                            foreach (var name in names)
                            {
                                store.CreatedCategories.Add(name);
                                created[DataValues.NormalizeKey(name)!] = 100 + created.Count;
                            }
                            return Task.FromResult<IReadOnlyDictionary<string, int>>(created);
                        }
                        : null,
                },
            },
            DuplicateKeys = new List<DuplicateKey<ItemCommand>>
            {
                new()
                {
                    Title = "تلفن",
                    ColumnKey = "phone",
                    Select = c => c.Phone,
                    FindExistingAsync = (keys, _) => Task.FromResult<IReadOnlySet<string>>(keys.Where(store.ExistingPhones.Contains).ToHashSet()),
                },
            },
            DuplicatePolicy = policy,
            Map = row => new ItemCommand
            {
                Name = row.Text("name")!,
                Phone = row.Text("phone")!,
                CategoryId = row.ReferenceId("category") ?? 0,
                Price = row.Integer("price") ?? 0,
            },
            CommitBatchAsync = async (batch, _) =>
            {
                store.BatchSizes.Add(batch.Count);
                if (store.OnBatch != null) await store.OnBatch(batch);
                store.Written.AddRange(batch);
            },
        };

        private static (ImportRunner Runner, FakeUnitOfWork UnitOfWork) Runner(int batchSize = 200)
        {
            var services = new ServiceCollection();
            services.AddTransient<IValidator<ItemCommand>, ItemCommandValidator>();
            var unitOfWork = new FakeUnitOfWork();
            var runner = new ImportRunner(services.BuildServiceProvider(), unitOfWork,
                Options.Create(new DataTransferOptions { ImportBatchSize = batchSize, PreviewRowCount = 50, MaxReportedIssues = 1000 }));
            return (runner, unitOfWork);
        }

        private static TabularSheet Sheet(string[] headers, params string?[][] rows) => new()
        {
            Headers = headers,
            HeaderRowNumber = 1,
            Rows = rows.Select((cells, i) => new TabularRow(i + 2, cells)).ToList(),
        };

        private static readonly string[] Headers = { "نام", "تلفن", "دسته", "قیمت" };

        private static ImportRequest Request(TabularSheet sheet, ImportModeEnum mode = ImportModeEnum.PREVIEW, bool skipInvalid = false)
            => new() { Resource = "items", Sheet = sheet, Mode = mode, SkipInvalidRows = skipInvalid };

        [Fact]
        public async Task Preview_ValidFile_ReportsEverythingValid_AndWritesNothing()
        {
            var store = new Store();
            var (runner, unitOfWork) = Runner();
            var sheet = Sheet(Headers,
                new[] { "علی", "09121111111", "لوازم یدکی", "1500" },
                new[] { "رضا", "۰۹۱۲۲۲۲۲۲۲۲", "لوازم يدكي", "۲۵۰۰" });

            var result = await Spec(store).RunAsync(runner, Request(sheet), CancellationToken.None);

            Assert.Equal(2, result.TotalRows);
            Assert.Equal(2, result.ValidRows);
            Assert.Equal(0, result.InvalidRows);
            Assert.False(result.Committed);
            Assert.Empty(store.Written);
            Assert.Equal(0, unitOfWork.Transactions);
            Assert.Equal(2, result.PreviewRows.Count);
        }

        [Fact]
        public async Task MissingRequiredColumn_FailsTheWholeFile()
        {
            var result = await Spec(new Store()).RunAsync(Runner().Runner,
                Request(Sheet(new[] { "نام", "دسته" }, new[] { "علی", "لوازم یدکی" })), CancellationToken.None);

            Assert.Equal(1, result.InvalidRows);
            var issue = Assert.Single(result.Issues, i => i.ErrorCode == ImportErrorCodes.MissingColumn);
            Assert.Equal("تلفن", issue.Column);
        }

        [Fact]
        public async Task Headers_MatchByAliasOrKey_AndUnknownHeadersAreWarnings()
        {
            var sheet = Sheet(new[] { "name", "Phone", "دسته", "یادداشت" }, new[] { "علی", "09121111111", "لوازم یدکی", "x" });

            var result = await Spec(new Store()).RunAsync(Runner().Runner, Request(sheet), CancellationToken.None);

            Assert.Equal(1, result.ValidRows);
            var warning = Assert.Single(result.Issues);
            Assert.Equal(ImportErrorCodes.UnknownColumn, warning.ErrorCode);
            Assert.Equal(ImportIssueSeverityEnum.WARNING, warning.Severity);
        }

        [Fact]
        public async Task RowErrors_NameTheRowColumnValueAndCode()
        {
            var sheet = Sheet(Headers,
                new[] { "علی", "09121111111", "لوازم یدکی", "1500" },
                new[] { "", "09121111112", "لوازم یدکی", "1" },              // required missing
                new[] { "سارا", "09121111113", "لوازم یدکی", "abc" },        // bad type
                new[] { "مینا", "09121111114", "ناموجود", "1" },             // unknown category
                new[] { "John", "12345", "لوازم یدکی", "1" });               // two validator failures

            var result = await Spec(new Store()).RunAsync(Runner().Runner, Request(sheet), CancellationToken.None);

            Assert.Equal(1, result.ValidRows);
            Assert.Equal(4, result.InvalidRows);
            Assert.Contains(result.Issues, i => i.RowNumber == 3 && i.Column == "نام" && i.ErrorCode == ImportErrorCodes.Required);
            Assert.Contains(result.Issues, i => i.RowNumber == 4 && i.Column == "قیمت" && i.Value == "abc" && i.ErrorCode == ImportErrorCodes.InvalidValue);
            Assert.Contains(result.Issues, i => i.RowNumber == 5 && i.Column == "دسته" && i.Value == "ناموجود" && i.ErrorCode == ImportErrorCodes.ReferenceNotFound);
            Assert.Contains(result.Issues, i => i.RowNumber == 6 && i.Column == "نام" && i.ErrorCode == ImportErrorCodes.Validation);
            Assert.Contains(result.Issues, i => i.RowNumber == 6 && i.Column == "تلفن" && i.Value == "12345" && i.ErrorCode == ImportErrorCodes.Validation);
        }

        [Fact]
        public async Task MissingReference_IsNeverCreated_ByDefault()
        {
            var store = new Store();
            var sheet = Sheet(Headers, new[] { "علی", "09121111111", "دسته تازه", "1" });

            var preview = await Spec(store).RunAsync(Runner().Runner, Request(sheet), CancellationToken.None);
            await Assert.ThrowsAsync<ValidationCustomException>(() => Spec(store).RunAsync(Runner().Runner, Request(sheet, ImportModeEnum.COMMIT), CancellationToken.None));

            Assert.Equal(1, preview.InvalidRows);
            Assert.Empty(store.CreatedCategories);
            Assert.Empty(store.Written);
        }

        [Fact]
        public async Task MissingReference_IsCreatedOnCommit_OnlyWhenTheDefinitionAllowsIt()
        {
            var store = new Store { AllowCreatingCategories = true };
            var sheet = Sheet(Headers,
                new[] { "علی", "09121111111", "دسته تازه", "1" },
                new[] { "رضا", "09121111112", "دسته  تازه", "1" });

            var preview = await Spec(store).RunAsync(Runner().Runner, Request(sheet), CancellationToken.None);
            Assert.Equal(2, preview.ValidRows);
            Assert.Equal(2, preview.WarningCount);
            Assert.Empty(store.CreatedCategories);

            var commit = await Spec(store).RunAsync(Runner().Runner, Request(sheet, ImportModeEnum.COMMIT), CancellationToken.None);

            Assert.True(commit.Committed);
            Assert.Equal(new[] { "دسته تازه" }, store.CreatedCategories);
            Assert.All(store.Written, c => Assert.Equal(100, c.CategoryId));
        }

        [Fact]
        public async Task Duplicates_InFileAndInDatabase_AreSkippedUnderSkip()
        {
            var store = new Store();
            var sheet = Sheet(Headers,
                new[] { "علی", "09121111111", "لوازم یدکی", "1" },
                new[] { "رضا", "09121111111", "لوازم یدکی", "1" },   // same as row 2
                new[] { "سارا", "09120000000", "لوازم یدکی", "1" }); // already in the database

            var result = await Spec(store).RunAsync(Runner().Runner, Request(sheet, ImportModeEnum.COMMIT), CancellationToken.None);

            Assert.Equal(1, result.ValidRows);
            Assert.Equal(2, result.DuplicateRows);
            Assert.Equal(0, result.InvalidRows);
            Assert.Equal(1, result.ImportedRows);
            Assert.Equal(2, result.SkippedRows);
            Assert.Contains(result.Issues, i => i.RowNumber == 3 && i.ErrorCode == ImportErrorCodes.DuplicateInFile && i.Message.Contains("ردیف 2"));
            Assert.Contains(result.Issues, i => i.RowNumber == 4 && i.ErrorCode == ImportErrorCodes.DuplicateExists);
            Assert.Equal("علی", Assert.Single(store.Written).Name);
        }

        [Fact]
        public async Task Duplicates_AreErrorsUnderReject()
        {
            var sheet = Sheet(Headers, new[] { "سارا", "09120000000", "لوازم یدکی", "1" });

            var result = await Spec(new Store(), DuplicatePolicyEnum.REJECT).RunAsync(Runner().Runner, Request(sheet), CancellationToken.None);

            Assert.Equal(1, result.InvalidRows);
            Assert.Equal(0, result.DuplicateRows);
        }

        [Fact]
        public async Task Commit_WithInvalidRows_WritesNothing_UnlessTheUserConfirmedSkipping()
        {
            var store = new Store();
            var sheet = Sheet(Headers,
                new[] { "علی", "09121111111", "لوازم یدکی", "1" },
                new[] { "رضا", "bad", "لوازم یدکی", "1" });

            var refused = await Assert.ThrowsAsync<ValidationCustomException>(() =>
                Spec(store).RunAsync(Runner().Runner, Request(sheet, ImportModeEnum.COMMIT), CancellationToken.None));
            Assert.IsType<ImportResultDto>(refused.Data);
            Assert.Empty(store.Written);

            var result = await Spec(store).RunAsync(Runner().Runner, Request(sheet, ImportModeEnum.COMMIT, skipInvalid: true), CancellationToken.None);

            Assert.True(result.Committed);
            Assert.Equal(1, result.ImportedRows);
            Assert.Equal(1, result.SkippedRows);
            Assert.Single(store.Written);
        }

        [Fact]
        public async Task Commit_WritesInBatches_InsideOneTransaction()
        {
            var store = new Store();
            var (runner, unitOfWork) = Runner(batchSize: 2);
            var rows = Enumerable.Range(0, 5).Select(i => new[] { "علی", $"0912111111{i}", "لوازم یدکی", "1" }).ToArray();

            var result = await Spec(store).RunAsync(runner, Request(Sheet(Headers, rows), ImportModeEnum.COMMIT), CancellationToken.None);

            Assert.Equal(5, result.ImportedRows);
            Assert.Equal(new[] { 2, 2, 1 }, store.BatchSizes);
            Assert.Equal(1, unitOfWork.Transactions);
            Assert.Equal(1, unitOfWork.Committed);
        }

        [Fact]
        public async Task Commit_AFailingBatch_LeavesTheTransactionUncommitted()
        {
            var store = new Store();
            var calls = 0;
            store.OnBatch = _ => ++calls == 2 ? throw new InvalidOperationException("db down") : Task.CompletedTask;
            var (runner, unitOfWork) = Runner(batchSize: 1);
            var rows = Enumerable.Range(0, 3).Select(i => new[] { "علی", $"0912111111{i}", "لوازم یدکی", "1" }).ToArray();

            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                Spec(store).RunAsync(runner, Request(Sheet(Headers, rows), ImportModeEnum.COMMIT), CancellationToken.None));

            Assert.Equal(1, unitOfWork.Transactions);
            Assert.Equal(0, unitOfWork.Committed);
        }

        [Fact]
        public async Task EmptyFile_IsReported()
        {
            var result = await Spec(new Store()).RunAsync(Runner().Runner, Request(Sheet(Headers)), CancellationToken.None);

            Assert.Equal(0, result.TotalRows);
            Assert.Contains(result.Issues, i => i.ErrorCode == ImportErrorCodes.EmptyFile);
        }

        [Fact]
        public async Task PersianText_SurvivesIntoTheCommand()
        {
            var store = new Store();
            var sheet = Sheet(Headers, new[] { "  محمدحسین ", "09121111111", "لوازم یدکی", "1" });

            await Spec(store).RunAsync(Runner().Runner, Request(sheet, ImportModeEnum.COMMIT), CancellationToken.None);

            Assert.Equal("محمدحسین", Assert.Single(store.Written).Name);
        }

        [Fact]
        public async Task IssueList_IsCapped_ButCountsStayExact()
        {
            var services = new ServiceCollection().AddTransient<IValidator<ItemCommand>, ItemCommandValidator>().BuildServiceProvider();
            var runner = new ImportRunner(services, new FakeUnitOfWork(), Options.Create(new DataTransferOptions { MaxReportedIssues = 3, PreviewRowCount = 2 }));
            var rows = Enumerable.Range(0, 10).Select(_ => new[] { "", "09121111111", "لوازم یدکی", "1" }).ToArray();

            var result = await Spec(new Store()).RunAsync(runner, Request(Sheet(Headers, rows)), CancellationToken.None);

            Assert.Equal(10, result.InvalidRows);
            Assert.Equal(10, result.ErrorCount);
            Assert.Equal(3, result.Issues.Count);
            Assert.True(result.IssuesTruncated);
            Assert.Equal(2, result.PreviewRows.Count);
        }
    }
}
