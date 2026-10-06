import { useState } from "react";
import { Download, FileSpreadsheet, RotateCcw } from "lucide-react";

import Notice from "@/shared/components/feedback/Notice";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Label } from "@/shared/components/ui/label";
import { getErrorMessage } from "@/shared/lib/errorMessage";
import { formatNumber } from "@/shared/lib/numberFormat";
import { FORMAT_EXTENSIONS } from "@/shared/services/dataTransfer/api-v1";
import {
  useCommitImportMutation,
  useImportTemplateMutation,
  usePreviewImportMutation,
} from "@/shared/services/dataTransfer/mutations";

import ImportResultView from "./ImportResultView";

const FORMAT_LABELS = Object.freeze({ 1: "CSV", 2: "Excel" });

/**
 * دیالوگِ ورودِ اطلاعات از فایل — یکی برای همه‌ی جدول‌ها.
 *
 * جریان: انتخابِ فایل ← بررسیِ سمتِ سرور (پیش‌نمایش) ← دیدنِ خطاها/تکراری‌ها ←
 * تأیید ← ثبت ← نتیجه. هیچ قاعده‌ای این‌جا نیست؛ فایل همان‌طور که هست به سرور
 * می‌رود و همان فایل برای ثبت دوباره فرستاده می‌شود (سرور پیش‌نمایش را
 * به‌خاطر نمی‌سپارد و از نو بررسی می‌کند).
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {(open: boolean) => void} props.onOpenChange
 * @param {object} props.resource یک قلم از `GetResources` (`resource`, `title`, `importColumns`)
 * @param {1|2} props.format قالبِ فایل (`DATA_TRANSFER_FORMATS`)
 * @param {readonly unknown[]} [props.invalidateKey] کلیدِ کشِ لیستِ همان جدول
 */
export default function ImportDialog({ open, onOpenChange, resource, format, invalidateKey }) {
  const [file, setFile] = useState(null);
  const [skipInvalidRows, setSkipInvalidRows] = useState(false);
  const preview = usePreviewImportMutation();
  const commit = useCommitImportMutation({ invalidateKey });
  const template = useImportTemplateMutation();

  const busy = preview.isPending || commit.isPending;
  const result = commit.data ?? preview.data;
  const extension = FORMAT_EXTENSIONS[format];
  const columns = resource?.importColumns ?? [];

  const reset = () => {
    setFile(null);
    setSkipInvalidRows(false);
    preview.reset();
    commit.reset();
  };

  const close = (next) => {
    if (!next && busy) return;
    if (!next) reset();
    onOpenChange(next);
  };

  const choose = (event) => {
    const chosen = event.target.files?.[0] ?? null;
    event.target.value = "";
    preview.reset();
    commit.reset();
    setSkipInvalidRows(false);
    setFile(chosen);
    if (chosen) preview.mutate({ resource: resource.resource, file: chosen });
  };

  const recheck = () => {
    commit.reset();
    setSkipInvalidRows(false);
    preview.mutate({ resource: resource.resource, file });
  };

  const previewed = preview.data && !commit.data;
  const canCommit =
    previewed &&
    preview.data.validRows > 0 &&
    (preview.data.invalidRows === 0 || skipInvalidRows);

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            ورود {resource?.title} از فایل {FORMAT_LABELS[format]}
          </DialogTitle>
          <DialogDescription>
            فایل اول بررسی می‌شود و تا تأیید نکنید چیزی ثبت نمی‌شود.
          </DialogDescription>
        </DialogHeader>

        {!result && (
          <div className="space-y-3">
            <label
              className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center hover:bg-muted/50"
              aria-disabled={busy}
            >
              <FileSpreadsheet className="size-8 text-muted-foreground" />
              <span className="text-sm font-medium">
                {file ? file.name : `انتخاب فایل ${extension}`}
              </span>
              <span className="text-xs text-muted-foreground">
                {preview.isPending ? "در حال بررسی فایل..." : "ردیف اول باید سرستون‌ها باشد."}
              </span>
              <input
                type="file"
                accept={extension}
                className="sr-only"
                disabled={busy}
                onChange={choose}
              />
            </label>

            {preview.isError && (
              <Notice tone="danger">{getErrorMessage(preview.error, "بررسیِ فایل انجام نشد")}</Notice>
            )}

            {columns.length > 0 && (
              <div className="space-y-2 rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-medium">ستون‌های فایل</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={template.isPending}
                    onClick={() => template.mutate({ resource: resource.resource, format, title: resource.title })}
                  >
                    <Download className="size-3.5" />
                    فایل نمونه
                  </Button>
                </div>
                <ul className="grid gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2">
                  {columns.map((column) => (
                    <li key={column.key}>
                      <span className="text-card-foreground">{column.header}</span>
                      {column.required && <span className="text-destructive"> *</span>}
                      {column.allowedValues && <span> — {column.allowedValues.join("، ")}</span>}
                      {column.hint && <span> — {column.hint}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {result && (
          <div className="space-y-3">
            {commit.data ? (
              <Notice tone="success">
                {formatNumber(commit.data.importedRows)} ردیف وارد شد
                {commit.data.skippedRows > 0 && ` و ${formatNumber(commit.data.skippedRows)} ردیف کنار گذاشته شد`}.
              </Notice>
            ) : (
              <Notice tone={preview.data.invalidRows > 0 ? "warning" : "info"}>
                فایل «{file?.name}» بررسی شد.{" "}
                {preview.data.validRows > 0
                  ? `${formatNumber(preview.data.validRows)} ردیف آماده‌ی ورود است.`
                  : "هیچ ردیفِ معتبری برای ورود نیست."}
                {preview.data.duplicateRows > 0 &&
                  ` ${formatNumber(preview.data.duplicateRows)} ردیفِ تکراری وارد نمی‌شود.`}
              </Notice>
            )}

            <ImportResultView result={result} />

            {previewed && preview.data.invalidRows > 0 && preview.data.validRows > 0 && (
              <div className="flex items-start gap-2">
                <Checkbox
                  id="skip-invalid-rows"
                  checked={skipInvalidRows}
                  onCheckedChange={(value) => setSkipInvalidRows(value === true)}
                  disabled={busy}
                />
                <Label htmlFor="skip-invalid-rows" className="text-xs leading-5 font-normal">
                  {formatNumber(preview.data.invalidRows)} ردیفِ نامعتبر کنار گذاشته شود و فقط ردیف‌های معتبر وارد شوند.
                </Label>
              </div>
            )}

            {commit.isError && (
              <Notice tone="danger">
                {getErrorMessage(commit.error, "ثبتِ فایل انجام نشد")} چیزی از این فایل ثبت نشد.
              </Notice>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {commit.data ? (
            <Button type="button" onClick={() => close(false)}>
              بستن
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" disabled={busy} onClick={() => close(false)}>
                انصراف
              </Button>
              {preview.data && (
                <Button type="button" variant="outline" className="gap-1.5" disabled={busy} onClick={reset}>
                  فایل دیگر
                </Button>
              )}
              {commit.isError && (
                <Button type="button" variant="outline" className="gap-1.5" disabled={busy} onClick={recheck}>
                  <RotateCcw className="size-3.5" />
                  بررسیِ دوباره
                </Button>
              )}
              {previewed && (
                <Button
                  type="button"
                  disabled={!canCommit || busy}
                  onClick={() => commit.mutate({ resource: resource.resource, file, skipInvalidRows })}
                >
                  {commit.isPending
                    ? "در حال ثبت..."
                    : `ثبتِ ${formatNumber(preview.data.validRows)} ردیف`}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
