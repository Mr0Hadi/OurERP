// src/shared/components/print/PrintPreviewDialog.jsx
import { useState } from "react";
import { Printer } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import FilterSelect from "@/shared/components/filters/FilterSelect";

import LabelSheet from "./LabelSheet";
import { usePrint } from "./usePrint";
import {
  SHEET_PRESETS,
  SHEET_PRESET_OPTIONS,
  DEFAULT_SHEET_PRESET,
} from "./sheetPresets";
import "./print.css";

/**
 * پیش‌نمایش و چاپ یک دسته برچسب.
 *
 * سراسری و بی‌خبر از دامنه است — هرچه renderItem بدهد چاپ می‌کند — تا
 * بعداً برای چاپ فاکتور فروش هم همین دیالوگ استفاده شود.
 */
export default function PrintPreviewDialog({
  open,
  onOpenChange,
  title = "پیش‌نمایش چاپ",
  items = [],
  renderItem,
  getItemKey,
  onPrinted,
}) {
  const [presetKey, setPresetKey] = useState(DEFAULT_SHEET_PRESET);
  const print = usePrint();

  const preset = SHEET_PRESETS[presetKey] ?? SHEET_PRESETS[DEFAULT_SHEET_PRESET];
  const sheetCount = Math.ceil(items.length / preset.perPage) || 0;

  const handlePrint = () => {
    print({ pageSize: preset.pageSize, pageMarginMm: preset.pageMarginMm });
    onPrinted?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <FilterSelect
            label="اندازه برچسب"
            value={presetKey}
            onChange={(v) => setPresetKey(v || DEFAULT_SHEET_PRESET)}
            options={SHEET_PRESET_OPTIONS}
          />
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {items.length} برچسب — {sheetCount} صفحه
          </span>
        </div>

        <div
          data-print-scroll
          className="max-h-[55vh] overflow-auto rounded-lg border border-border bg-neutral-100 p-3 dark:bg-neutral-900"
        >
          <LabelSheet
            items={items}
            renderItem={renderItem}
            presetKey={presetKey}
            getItemKey={getItemKey}
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            بستن
          </Button>
          <Button
            type="button"
            onClick={handlePrint}
            disabled={items.length === 0}
            className="gap-2"
          >
            <Printer className="w-4 h-4" />
            چاپ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
