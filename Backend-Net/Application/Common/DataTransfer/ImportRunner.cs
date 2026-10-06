using Application.Common.Contracts.UnitOfWork;
using Common.Exceptions;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Application.Common.DataTransfer
{
    /// <summary>
    /// The generic import pipeline: header mapping, cell parsing, foreign-key resolution, the resource's own
    /// FluentValidation rules, duplicate detection, and - on commit - batched writes inside one transaction.
    /// Knows nothing about HTTP or a particular entity; everything entity-specific comes from the
    /// <see cref="ImportSpec{TCommand}"/>.
    ///
    /// Preview and commit run the same code. A commit never trusts an earlier preview: the file is re-read and
    /// re-validated, so a row that became a duplicate in between is caught.
    /// </summary>
    public class ImportRunner
    {
        /// <summary>Stands in for the id of a reference that will only be created at commit, so the row can be validated.</summary>
        public const int PendingReferenceId = int.MaxValue;

        private readonly IServiceProvider _services;
        private readonly IUnitOfWork _unitOfWork;
        private readonly DataTransferOptions _options;

        public ImportRunner(IServiceProvider services, IUnitOfWork unitOfWork, IOptions<DataTransferOptions> options)
        {
            _services = services;
            _unitOfWork = unitOfWork;
            _options = options.Value;
        }

        public async Task<ImportResultDto> RunAsync<TCommand>(ImportSpec<TCommand> spec, ImportRequest request, CancellationToken cancellationToken)
            where TCommand : class
        {
            var report = new Report(_options.MaxReportedIssues);
            var sheet = request.Sheet;

            var result = new ImportResultDto
            {
                Resource = request.Resource,
                Mode = request.Mode,
                TotalRows = sheet.Rows.Count,
            };

            var columnIndex = MapHeaders(spec.Columns, sheet, report);
            result.Columns = spec.Columns
                .Select(c => new ImportColumnDto { Key = c.Key, Header = c.Header, Required = c.Required, Present = columnIndex.ContainsKey(c.Key) })
                .ToList();

            if (sheet.Rows.Count == 0)
                report.Add(new ImportIssueDto { RowNumber = sheet.HeaderRowNumber, Message = "فایل هیچ ردیف داده‌ای ندارد.", ErrorCode = ImportErrorCodes.EmptyFile });

            // A missing required column makes every row invalid; there is nothing useful left to check.
            if (report.HasFileError)
                return Finish(result, report, sheet, new Dictionary<int, RowState>(), spec.Columns, columnIndex);

            // 1. Cells -> typed values.
            var rows = sheet.Rows.Select(row => ParseRow(row, spec.Columns, columnIndex, report)).ToList();

            // 2. Foreign keys, one lookup per column for the whole file.
            var pendingReferences = await ResolveReferencesAsync(spec.ForeignKeys, rows, columnIndex, spec.Columns, report, cancellationToken);

            // 3. Map + the command's own validators.
            var validators = _services.GetServices<IValidator<TCommand>>().ToList();
            foreach (var row in rows.Where(r => r.Status == ImportRowStatusEnum.VALID))
                await MapAndValidateAsync(spec, validators, row, columnIndex, report, cancellationToken);

            // 4. Duplicates: within the file, then against the database.
            await DetectDuplicatesAsync(spec, rows, columnIndex, report, cancellationToken);

            var states = rows.ToDictionary(r => r.RowNumber);

            if (request.Mode == ImportModeEnum.COMMIT)
            {
                var invalid = rows.Count(r => r.Status == ImportRowStatusEnum.INVALID);
                if (invalid > 0 && !request.SkipInvalidRows)
                {
                    var refused = Finish(result, report, sheet, states, spec.Columns, columnIndex);
                    throw new ValidationCustomException($"{invalid} ردیف نامعتبر است و چیزی وارد نشد. ردیف‌ها را اصلاح کنید یا وارد کردن بدون آن‌ها را تأیید کنید.", refused);
                }

                var toImport = rows.Where(r => r.Status == ImportRowStatusEnum.VALID).ToList();

                // One transaction for everything: a failure in batch 7 rolls back batches 1-6 too, so a file is never
                // left half imported. Batches only bound how much the change tracker holds per SaveChanges.
                await _unitOfWork.ExecuteInTransactionAsync(async ct =>
                {
                    if (pendingReferences.Count > 0)
                        await CreatePendingReferencesAsync(spec, pendingReferences, toImport, ct);

                    foreach (var batch in toImport.Chunk(Math.Max(1, _options.ImportBatchSize)))
                        await spec.CommitBatchAsync(batch.Select(r => (TCommand)r.Command!).ToList(), ct);

                    return true;
                }, cancellationToken);

                result.Committed = true;
                result.ImportedRows = toImport.Count;
            }

            return Finish(result, report, sheet, states, spec.Columns, columnIndex);
        }

        private static Dictionary<string, int> MapHeaders(IReadOnlyList<ImportColumn> columns, Contracts.DataTransfer.TabularSheet sheet, Report report)
        {
            var byName = new Dictionary<string, ImportColumn>();
            foreach (var column in columns)
                foreach (var name in new[] { column.Header, column.Key }.Concat(column.Aliases))
                    if (DataValues.NormalizeKey(name) is { } key) byName.TryAdd(key, column);

            var index = new Dictionary<string, int>();
            for (var i = 0; i < sheet.Headers.Count; i++)
            {
                var header = sheet.Headers[i];
                var key = DataValues.NormalizeKey(header);
                if (key == null) continue;

                if (!byName.TryGetValue(key, out var column))
                {
                    report.Add(new ImportIssueDto
                    {
                        RowNumber = sheet.HeaderRowNumber,
                        Column = header,
                        Message = $"ستون «{header}» شناخته نشد و نادیده گرفته می‌شود.",
                        ErrorCode = ImportErrorCodes.UnknownColumn,
                        Severity = ImportIssueSeverityEnum.WARNING,
                    });
                    continue;
                }

                if (!index.TryAdd(column.Key, i))
                {
                    report.AddFileError(new ImportIssueDto
                    {
                        RowNumber = sheet.HeaderRowNumber,
                        Column = header,
                        Message = $"ستون «{column.Header}» بیش از یک بار آمده است.",
                        ErrorCode = ImportErrorCodes.DuplicateColumn,
                    });
                }
            }

            foreach (var column in columns.Where(c => c.Required && !index.ContainsKey(c.Key)))
            {
                report.AddFileError(new ImportIssueDto
                {
                    RowNumber = sheet.HeaderRowNumber,
                    Column = column.Header,
                    Message = $"ستون اجباری «{column.Header}» در فایل نیست.",
                    ErrorCode = ImportErrorCodes.MissingColumn,
                });
            }

            return index;
        }

        private static RowState ParseRow(Contracts.DataTransfer.TabularRow row, IReadOnlyList<ImportColumn> columns, Dictionary<string, int> columnIndex, Report report)
        {
            var state = new RowState(row);

            foreach (var column in columns)
            {
                var raw = columnIndex.TryGetValue(column.Key, out var i) && i < row.Cells.Count ? row.Cells[i] : null;
                if (column.AsciiDigits && raw != null) raw = DataValues.ToAsciiDigits(raw);
                state.Raw[column.Key] = raw;

                if (!DataValues.TryParse(raw, column, out var value, out var error))
                {
                    state.Fail(report, column, raw, error!, ImportErrorCodes.InvalidValue);
                    continue;
                }

                if (value == null && column.Required)
                {
                    state.Fail(report, column, raw, $"«{column.Header}» اجباری است.", ImportErrorCodes.Required);
                    continue;
                }

                state.Values[column.Key] = value;
            }

            return state;
        }

        private static async Task<Dictionary<ForeignKeyLookup, Dictionary<string, string>>> ResolveReferencesAsync(
            IReadOnlyList<ForeignKeyLookup> lookups, List<RowState> rows, Dictionary<string, int> columnIndex,
            IReadOnlyList<ImportColumn> columns, Report report, CancellationToken cancellationToken)
        {
            // lookup -> (normalized value -> spelling as first typed), for references that will be created at commit.
            var pending = new Dictionary<ForeignKeyLookup, Dictionary<string, string>>();

            foreach (var lookup in lookups)
            {
                if (!columnIndex.ContainsKey(lookup.ColumnKey)) continue;
                var column = columns.First(c => c.Key == lookup.ColumnKey);

                var candidates = rows
                    .Where(r => r.Values.GetValueOrDefault(lookup.ColumnKey) is string)
                    .ToList();

                var keys = candidates
                    .Select(r => DataValues.NormalizeKey((string)r.Values[lookup.ColumnKey]!)!)
                    .Distinct()
                    .ToList();

                if (keys.Count == 0) continue;

                var found = await lookup.ResolveAsync(keys, cancellationToken);

                foreach (var row in candidates)
                {
                    var text = (string)row.Values[lookup.ColumnKey]!;
                    var key = DataValues.NormalizeKey(text)!;

                    if (found.TryGetValue(key, out var id))
                    {
                        row.ReferenceIds[lookup.ColumnKey] = id;
                    }
                    else if (lookup.CreateMissingAsync != null)
                    {
                        if (!pending.TryGetValue(lookup, out var names)) pending[lookup] = names = new Dictionary<string, string>();
                        names.TryAdd(key, text);
                        row.ReferenceIds[lookup.ColumnKey] = PendingReferenceId;
                        row.Warn(report, column, text, $"{lookup.EntityTitle} «{text}» وجود ندارد و هنگام ثبت ساخته می‌شود.", ImportErrorCodes.ReferenceWillBeCreated);
                    }
                    else
                    {
                        row.Fail(report, column, text, $"{lookup.EntityTitle} «{text}» پیدا نشد.", ImportErrorCodes.ReferenceNotFound);
                    }
                }
            }

            return pending;
        }

        private static async Task MapAndValidateAsync<TCommand>(ImportSpec<TCommand> spec, List<IValidator<TCommand>> validators,
            RowState row, Dictionary<string, int> columnIndex, Report report, CancellationToken cancellationToken) where TCommand : class
        {
            TCommand command;
            try
            {
                command = spec.Map(row.ToValues());
            }
            catch (Exception ex) when (ex is OverflowException or InvalidCastException or ArgumentException)
            {
                row.Fail(report, null, null, "ردیف قابل خواندن نیست.", ImportErrorCodes.InvalidRow);
                return;
            }

            row.Command = command;

            foreach (var validator in validators)
            {
                var validation = await validator.ValidateAsync(command, cancellationToken);
                foreach (var failure in validation.Errors)
                {
                    var column = spec.Columns.FirstOrDefault(c => c.Property != null
                        && (failure.PropertyName == c.Property || failure.PropertyName.StartsWith(c.Property + ".", StringComparison.Ordinal)));

                    row.Fail(report, column, column != null ? row.Raw.GetValueOrDefault(column.Key) : failure.AttemptedValue?.ToString(),
                        failure.ErrorMessage, ImportErrorCodes.Validation);
                }
            }
        }

        private static async Task DetectDuplicatesAsync<TCommand>(ImportSpec<TCommand> spec, List<RowState> rows,
            Dictionary<string, int> columnIndex, Report report, CancellationToken cancellationToken) where TCommand : class
        {
            foreach (var duplicateKey in spec.DuplicateKeys)
            {
                var column = spec.Columns.FirstOrDefault(c => c.Key == duplicateKey.ColumnKey);
                var firstSeen = new Dictionary<string, int>();
                var keyed = new List<(RowState Row, string Key)>();

                foreach (var row in rows.Where(r => r.Status == ImportRowStatusEnum.VALID))
                {
                    var key = DataValues.NormalizeKey(duplicateKey.Select((TCommand)row.Command!));
                    if (key == null) continue;

                    if (firstSeen.TryGetValue(key, out var firstRow))
                    {
                        row.Duplicate(report, spec.DuplicatePolicy, column, row.Raw.GetValueOrDefault(duplicateKey.ColumnKey),
                            $"{duplicateKey.Title} تکراری است؛ همان مقدار در ردیف {firstRow} آمده است.", ImportErrorCodes.DuplicateInFile);
                        continue;
                    }

                    firstSeen[key] = row.RowNumber;
                    keyed.Add((row, key));
                }

                if (keyed.Count == 0) continue;

                var existing = await duplicateKey.FindExistingAsync(keyed.Select(k => k.Key).ToList(), cancellationToken);

                foreach (var (row, key) in keyed.Where(k => existing.Contains(k.Key)))
                {
                    row.Duplicate(report, spec.DuplicatePolicy, column, row.Raw.GetValueOrDefault(duplicateKey.ColumnKey),
                        $"رکوردی با همین {duplicateKey.Title} از قبل وجود دارد.", ImportErrorCodes.DuplicateExists);
                }
            }
        }

        private static async Task CreatePendingReferencesAsync<TCommand>(ImportSpec<TCommand> spec,
            Dictionary<ForeignKeyLookup, Dictionary<string, string>> pending, List<RowState> rows, CancellationToken cancellationToken) where TCommand : class
        {
            foreach (var (lookup, names) in pending)
            {
                var created = await lookup.CreateMissingAsync!(names.Values.ToList(), cancellationToken);

                foreach (var row in rows.Where(r => r.ReferenceIds.GetValueOrDefault(lookup.ColumnKey) == PendingReferenceId))
                {
                    var key = DataValues.NormalizeKey((string)row.Values[lookup.ColumnKey]!)!;
                    if (!created.TryGetValue(key, out var id))
                        throw new InvalidOperationException($"Creating the missing {lookup.EntityTitle} '{key}' returned no id.");
                    row.ReferenceIds[lookup.ColumnKey] = id;
                }
            }

            // The commands were mapped with the placeholder id; map again with the real ones.
            foreach (var row in rows.Where(r => r.Command != null))
                row.Command = spec.Map(row.ToValues());
        }

        private ImportResultDto Finish(ImportResultDto result, Report report, Contracts.DataTransfer.TabularSheet sheet,
            Dictionary<int, RowState> states, IReadOnlyList<ImportColumn> columns, Dictionary<string, int> columnIndex)
        {
            if (report.HasFileError)
            {
                result.InvalidRows = result.TotalRows;
            }
            else
            {
                result.ValidRows = states.Values.Count(r => r.Status == ImportRowStatusEnum.VALID);
                result.InvalidRows = states.Values.Count(r => r.Status == ImportRowStatusEnum.INVALID);
                result.DuplicateRows = states.Values.Count(r => r.Status == ImportRowStatusEnum.DUPLICATE);
            }

            result.SkippedRows = result.InvalidRows + result.DuplicateRows;
            result.ErrorCount = report.ErrorCount;
            result.WarningCount = report.WarningCount;
            result.Issues = report.Issues.OrderBy(i => i.RowNumber).ToList();
            result.IssuesTruncated = report.Truncated;

            result.PreviewRows = sheet.Rows.Take(_options.PreviewRowCount).Select(row => new ImportPreviewRowDto
            {
                RowNumber = row.RowNumber,
                Status = report.HasFileError ? ImportRowStatusEnum.INVALID : states.GetValueOrDefault(row.RowNumber)?.Status ?? ImportRowStatusEnum.INVALID,
                Values = columns.Where(c => columnIndex.ContainsKey(c.Key))
                    .ToDictionary(c => c.Key, c => columnIndex[c.Key] < row.Cells.Count ? row.Cells[columnIndex[c.Key]] : null),
            }).ToList();

            return result;
        }

        /// <summary>Collects issues with exact counts but a capped list.</summary>
        private sealed class Report
        {
            private readonly int _limit;

            public Report(int limit) => _limit = limit;

            public List<ImportIssueDto> Issues { get; } = new();

            public int ErrorCount { get; private set; }

            public int WarningCount { get; private set; }

            public bool Truncated { get; private set; }

            public bool HasFileError { get; private set; }

            public void Add(ImportIssueDto issue)
            {
                if (issue.Severity == ImportIssueSeverityEnum.ERROR) ErrorCount++; else WarningCount++;
                if (Issues.Count < _limit) Issues.Add(issue); else Truncated = true;
            }

            public void AddFileError(ImportIssueDto issue)
            {
                HasFileError = true;
                Add(issue);
            }
        }

        private sealed class RowState
        {
            public RowState(Contracts.DataTransfer.TabularRow row) => RowNumber = row.RowNumber;

            public int RowNumber { get; }

            public ImportRowStatusEnum Status { get; private set; } = ImportRowStatusEnum.VALID;

            public Dictionary<string, string?> Raw { get; } = new();

            public Dictionary<string, object?> Values { get; } = new();

            public Dictionary<string, int> ReferenceIds { get; } = new();

            public object? Command { get; set; }

            public ImportRowValues ToValues() => new(RowNumber, Values, ReferenceIds);

            public void Fail(Report report, ImportColumn? column, string? value, string message, string code)
            {
                Status = ImportRowStatusEnum.INVALID;
                report.Add(new ImportIssueDto { RowNumber = RowNumber, Column = column?.Header, Value = value, Message = message, ErrorCode = code });
            }

            public void Warn(Report report, ImportColumn? column, string? value, string message, string code)
            {
                report.Add(new ImportIssueDto { RowNumber = RowNumber, Column = column?.Header, Value = value, Message = message, ErrorCode = code, Severity = ImportIssueSeverityEnum.WARNING });
            }

            public void Duplicate(Report report, DuplicatePolicyEnum policy, ImportColumn? column, string? value, string message, string code)
            {
                if (policy == DuplicatePolicyEnum.REJECT)
                {
                    Fail(report, column, value, message, code);
                    return;
                }

                Status = ImportRowStatusEnum.DUPLICATE;
                Warn(report, column, value, message + " این ردیف وارد نمی‌شود.", code);
            }
        }
    }
}
