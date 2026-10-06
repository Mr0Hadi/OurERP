import { useState } from "react";
import { ChevronDown, Download, FileDown, FileUp, Upload } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { DATA_TRANSFER_FORMATS } from "@/shared/services/dataTransfer/api-v1";
import { useExportMutation, useImportTemplateMutation } from "@/shared/services/dataTransfer/mutations";
import { useDataTransferResource } from "@/shared/services/dataTransfer/queries";

import ImportDialog from "./ImportDialog";

/**
 * دکمه‌های «ورود از فایل» و «خروجی» برای سرتیترِ یک صفحه‌ی لیست — یک خط در هر صفحه:
 *
 * ```jsx
 * <ListPageLayout actions={<DataTransferActions resource="customers" filters={filters} invalidateKey={customerKeys.all} />}>
 * ```
 *
 * اینکه جدول اصلاً ورود/خروج دارد و کاربر مجاز است از `GetResources` می‌آید (سرور)؛ دکمه‌ای که مجاز
 * نیست دیده نمی‌شود. این فقط تجربه‌ی کاربری است — خودِ سرور هم بدون دسترسی ۴۰۳ می‌دهد.
 *
 * @param {object} props
 * @param {string} props.resource کلیدِ جدول در سرور (`"products"`, `"customers"`, …)
 * @param {object} [props.filters] فیلترهای فعلیِ جدول با نام‌های سرور؛ خروجی همان ردیف‌ها را می‌دهد
 * @param {readonly unknown[]} [props.invalidateKey] کلیدِ کشِ لیست تا بعد از ورود تازه شود
 */
export default function DataTransferActions({ resource, filters, invalidateKey }) {
  const info = useDataTransferResource(resource);
  const exportFile = useExportMutation();
  const template = useImportTemplateMutation();
  const [importFormat, setImportFormat] = useState(null);

  if (!info || (!info.canExport && !info.canImport)) return null;

  const runExport = (format) => exportFile.mutate({ resource, format, filters, title: info.title });
  const downloadTemplate = (format) => template.mutate({ resource, format, title: info.title });

  return (
    <>
      {info.canImport && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-1.5">
              <FileUp className="size-4" />
              ورود از فایل
              <ChevronDown className="size-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-auto min-w-44">
            <DropdownMenuItem onSelect={() => setImportFormat(DATA_TRANSFER_FORMATS.XLSX)}>
              <Upload className="size-4" />
              از فایل Excel
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setImportFormat(DATA_TRANSFER_FORMATS.CSV)}>
              <Upload className="size-4" />
              از فایل CSV
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">فایل نمونه</DropdownMenuLabel>
            <DropdownMenuItem disabled={template.isPending} onSelect={() => downloadTemplate(DATA_TRANSFER_FORMATS.XLSX)}>
              <Download className="size-4" />
              نمونه‌ی Excel
            </DropdownMenuItem>
            <DropdownMenuItem disabled={template.isPending} onSelect={() => downloadTemplate(DATA_TRANSFER_FORMATS.CSV)}>
              <Download className="size-4" />
              نمونه‌ی CSV
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {info.canExport && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-1.5" disabled={exportFile.isPending}>
              <FileDown className="size-4" />
              {exportFile.isPending ? "در حال آماده‌سازی..." : "خروجی"}
              <ChevronDown className="size-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-auto min-w-44">
            <DropdownMenuLabel className="text-xs text-muted-foreground">ردیف‌های فیلترشده‌ی فعلی</DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => runExport(DATA_TRANSFER_FORMATS.XLSX)}>
              <Download className="size-4" />
              خروجی Excel
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => runExport(DATA_TRANSFER_FORMATS.CSV)}>
              <Download className="size-4" />
              خروجی CSV
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {info.canImport && importFormat && (
        <ImportDialog
          open
          onOpenChange={(open) => !open && setImportFormat(null)}
          resource={info}
          format={importFormat}
          invalidateKey={invalidateKey}
        />
      )}
    </>
  );
}
