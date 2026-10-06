import { AlertTriangle, CheckCircle2, Copy, FileWarning, Rows3, XCircle } from "lucide-react";

import StatusBadge from "@/shared/components/status/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { formatNumber } from "@/shared/lib/numberFormat";
import { toneSoft } from "@/shared/lib/tone";
import { cn } from "@/shared/lib/utils";

/** `ImportRowStatusEnum`ِ سرور. */
const ROW_STATUS = Object.freeze({
  1: { tone: "success", label: "معتبر" },
  2: { tone: "danger", label: "نامعتبر" },
  3: { tone: "caution", label: "تکراری" },
});

/** `ImportIssueSeverityEnum`ِ سرور: ۱ خطا، ۲ هشدار. */
const SEVERITY = Object.freeze({
  1: { tone: "danger", label: "خطا" },
  2: { tone: "warning", label: "هشدار" },
});

function Stat({ label, value, tone, icon: Icon }) {
  return (
    <div className={cn("flex items-center gap-2 rounded-lg border px-3 py-2", toneSoft(tone))}>
      <Icon className="size-4 shrink-0" />
      <div className="min-w-0">
        <div className="text-[11px] leading-4">{label}</div>
        <div className="text-base font-semibold tabular-nums">{formatNumber(value)}</div>
      </div>
    </div>
  );
}

/**
 * نتیجه‌ی یک پیش‌نمایش یا ثبت (`ImportResultDto`ِ سرور): شمارش‌ها، فهرستِ
 * خطاها/هشدارها با شماره‌ی ردیف و ستون، و چند ردیفِ نمونه.
 *
 * @param {object} props
 * @param {object} props.result
 */
export default function ImportResultView({ result }) {
  const presentColumns = (result.columns ?? []).filter((column) => column.present);
  const committed = result.committed;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Stat label="کل ردیف‌ها" value={result.totalRows} tone="neutral" icon={Rows3} />
        <Stat
          label={committed ? "وارد شد" : "معتبر"}
          value={committed ? result.importedRows : result.validRows}
          tone="success"
          icon={CheckCircle2}
        />
        <Stat label="نامعتبر" value={result.invalidRows} tone="danger" icon={XCircle} />
        <Stat label="تکراری" value={result.duplicateRows} tone="caution" icon={Copy} />
        <Stat label="هشدار" value={result.warningCount} tone="warning" icon={AlertTriangle} />
      </div>

      {result.issues?.length > 0 && (
        <section className="space-y-2">
          <h3 className="flex items-center gap-1.5 text-sm font-medium">
            <FileWarning className="size-4 text-muted-foreground" />
            خطاها و هشدارها
          </h3>
          <div className="max-h-64 overflow-auto rounded-lg border">
            <Table>
              <TableHeader className="sticky top-0 bg-popover">
                <TableRow>
                  <TableHead className="w-16">ردیف</TableHead>
                  <TableHead className="w-32">ستون</TableHead>
                  <TableHead className="w-32">مقدار</TableHead>
                  <TableHead>توضیح</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.issues.map((issue, index) => {
                  const severity = SEVERITY[issue.severity] ?? SEVERITY[1];
                  return (
                    <TableRow key={`${issue.rowNumber}-${issue.errorCode}-${index}`}>
                      <TableCell className="tabular-nums">{formatNumber(issue.rowNumber)}</TableCell>
                      <TableCell>{issue.column ?? "—"}</TableCell>
                      <TableCell className="max-w-32 truncate" dir="auto" title={issue.value ?? ""}>
                        {issue.value ?? "—"}
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        <StatusBadge tone={severity.tone} size="sm" className="me-1.5">
                          {severity.label}
                        </StatusBadge>
                        {issue.message}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {result.issuesTruncated && (
            <p className="text-xs text-muted-foreground">
              فقط {formatNumber(result.issues.length)} مورد از{" "}
              {formatNumber(result.errorCount + result.warningCount)} مورد نشان داده شده است.
            </p>
          )}
        </section>
      )}

      {!committed && result.previewRows?.length > 0 && presentColumns.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-medium">نمونه‌ی ردیف‌ها</h3>
          <div className="max-h-56 overflow-auto rounded-lg border">
            <Table>
              <TableHeader className="sticky top-0 bg-popover">
                <TableRow>
                  <TableHead className="w-16">ردیف</TableHead>
                  <TableHead className="w-20">وضعیت</TableHead>
                  {presentColumns.map((column) => (
                    <TableHead key={column.key}>{column.header}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.previewRows.map((row) => {
                  const status = ROW_STATUS[row.status] ?? ROW_STATUS[2];
                  return (
                    <TableRow key={row.rowNumber}>
                      <TableCell className="tabular-nums">{formatNumber(row.rowNumber)}</TableCell>
                      <TableCell>
                        <StatusBadge tone={status.tone} size="sm">
                          {status.label}
                        </StatusBadge>
                      </TableCell>
                      {presentColumns.map((column) => (
                        <TableCell key={column.key} dir="auto">
                          {row.values?.[column.key] ?? ""}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </section>
      )}
    </div>
  );
}
