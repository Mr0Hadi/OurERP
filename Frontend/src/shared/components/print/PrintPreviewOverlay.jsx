// src/shared/components/print/PrintPreviewOverlay.jsx
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Printer, X } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

import LabelSheet from "./LabelSheet";
import { usePrint } from "./usePrint";
import {
  SHEET_PRESET_OPTIONS,
  DEFAULT_SHEET_PRESET,
  getSheetPreset,
  paginateItems,
} from "./sheetPresets";
import "./print.css";

/**
 * پیش‌نمایش تمام‌صفحه و چاپِ یک دسته برچسب.
 *
 * عمداً Dialex/Dialog نیست: محتوای چاپ باید مستقیماً زیر body و در
 * جریان عادی باشد وگرنه مرورگر آن را بین صفحه‌ها تکه نمی‌کند و فقط
 * صفحه‌ی اول چاپ می‌شود (توضیح کامل در print.css).
 *
 * سراسری و بی‌خبر از دامنه است تا بعداً برای چاپ فاکتور هم استفاده شود.
 */
export default function PrintPreviewOverlay({
  open,
  onOpenChange,
  title = "پیش‌نمایش چاپ",
  items = [],
  renderItem,
  getItemKey,
  onPrinted,
  presetKey,
  onPresetKeyChange,
}) {
  const [internalPreset, setInternalPreset] = useState(DEFAULT_SHEET_PRESET);
  const activePreset = presetKey ?? internalPreset;
  const setActivePreset = onPresetKeyChange ?? setInternalPreset;

  const scrollRef = useRef(null);
  const [scale, setScale] = useState(1);
  const print = usePrint();

  const preset = getSheetPreset(activePreset);
  const pageCount = paginateItems(items, preset).length;

  // روی تبلت، ورق A4 از عرض صفحه بزرگ‌تر است؛ پیش‌نمایش کوچک می‌شود تا
  // انباردار مجبور به اسکرول افقی نباشد. در چاپ این مقیاس بی‌اثر است.
  useLayoutEffect(() => {
    if (!open) return undefined;

    const node = scrollRef.current;
    if (!node) return undefined;

    const fit = () => {
      const sheetWidthPx = (preset.pageWidthMm / 25.4) * 96;
      const available = node.clientWidth - 32;
      setScale(Math.min(1, available / sheetWidthPx));
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(node);
    return () => observer.disconnect();
  }, [open, preset.pageWidthMm]);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") onOpenChange(false);
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  const handlePrint = () => {
    // حاشیه‌ی @page صفر است چون خودِ بلوکِ صفحه دقیقاً اندازه‌ی کاغذ
    // است و حاشیه را به‌صورت padding داخلی دارد. اگر اینجا حاشیه بدهیم،
    // بلوکِ ۲۱۰×۲۹۷ داخل ناحیه‌ی کوچک‌ترِ چاپ جا نمی‌شود و هر صفحه یک
    // صفحه‌ی خالی پشت خودش می‌آورد.
    print({ pageSize: preset.pageSize, pageMarginMm: 0 });
    onPrinted?.();
  };

  return createPortal(
    <div
      dir="rtl"
      className="print-portal fixed inset-0 z-50 flex flex-col bg-neutral-900/80 backdrop-blur-sm"
    >
      <div className="print-portal__chrome flex flex-wrap items-center gap-3 border-b border-border bg-card px-4 py-3">
        <h2 className="text-base font-medium">{title}</h2>

        <Select value={activePreset} onValueChange={setActivePreset}>
          <SelectTrigger dir="rtl" className="h-9 w-auto min-w-[15rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent dir="rtl">
            {SHEET_PRESET_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-sm text-muted-foreground">
          {items.length} برچسب — {pageCount} صفحه
        </span>

        <div className="ms-auto flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => onOpenChange(false)}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            بستن
          </Button>
          <Button
            type="button"
            size="lg"
            onClick={handlePrint}
            disabled={items.length === 0}
            className="gap-2"
          >
            <Printer className="h-4 w-4" />
            چاپ
          </Button>
        </div>
      </div>

      <div ref={scrollRef} className="print-portal__sheet flex-1 p-4">
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top center",
          }}
        >
          <LabelSheet
            items={items}
            renderItem={renderItem}
            presetKey={activePreset}
            getItemKey={getItemKey}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
