import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Printer, RotateCcw, X } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import LabelSheet from "@/shared/components/print/LabelSheet";
import { usePrint } from "@/shared/components/print/usePrint";
import { paginateItems } from "@/shared/components/print/sheetPresets";
import "@/shared/components/print/print.css";

import {
  CUSTOM_SIZE_KEY,
  LABEL_CODE_TYPE_LABELS,
  LABEL_FIELDS,
  LABEL_LAYOUT_LABELS,
  LABEL_SCALE_LABELS,
  LABEL_SIZE_LIMITS,
  LABEL_SIZE_PRESETS,
  formatLabelSize,
  sheetGeometryOf,
} from "../domain/labelTemplate";
import { fa } from "../domain/unitVocabulary";
import { useLabelTemplateStore } from "../store/unitFilterStore";
import { useMarkUnitsPrintedMutation } from "../services/mutations";
import UnitLabel from "./UnitLabel";

/** دکمه‌های کنارِ هم برای انتخابِ یکی از چند گزینه‌ی کوتاه. */
function Segmented({ value, options, onChange, ariaLabel }) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="grid auto-cols-fr grid-flow-col gap-1 rounded-lg bg-muted p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={`rounded-md px-2 py-1.5 text-xs transition-colors ${
            value === option.value
              ? "bg-background font-medium text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

const toOptions = (labels) =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));

/** چند دانه از این دسته این متن را واقعاً دارند — برای راهنماییِ کنارِ گزینه. */
function fieldAvailability(units, key) {
  if (key === "supplier") return units.filter((unit) => unit.supplierName).length;
  if (key === "customer") return units.filter((unit) => unit.customerName).length;
  if (key === "document")
    return units.filter((unit) => unit.saleInvoiceNumber || unit.purchaseInvoiceNumber).length;
  return units.length;
}

function Settings({ units, template, geometry }) {
  const { updateTemplate, setField, resetTemplate } = useLabelTemplateStore();
  const isCustom = template.sizeKey === CUSTOM_SIZE_KEY;

  const setCustom = (patch) =>
    updateTemplate({ custom: { ...template.custom, ...patch } });

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <Label className="text-sm font-medium">اندازه‌ی برچسب</Label>
        <Select
          value={template.sizeKey}
          onValueChange={(sizeKey) => updateTemplate({ sizeKey })}
        >
          <SelectTrigger dir="rtl" className="h-9 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent dir="rtl">
            {LABEL_SIZE_PRESETS.map((preset) => (
              <SelectItem key={preset.key} value={preset.key}>
                {preset.label}
              </SelectItem>
            ))}
            <SelectItem value={CUSTOM_SIZE_KEY}>اندازه‌ی دلخواه…</SelectItem>
          </SelectContent>
        </Select>

        {isCustom && (
          <div className="space-y-2 rounded-lg border border-border p-3">
            <Segmented
              ariaLabel="چیدمان"
              value={template.custom.layout}
              options={toOptions(LABEL_LAYOUT_LABELS)}
              onChange={(layout) => setCustom({ layout })}
            />
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="label-width" className="text-xs text-muted-foreground">
                  عرض (میلی‌متر)
                </Label>
                <Input
                  id="label-width"
                  type="number"
                  min={LABEL_SIZE_LIMITS.minWidthMm}
                  max={LABEL_SIZE_LIMITS.maxWidthMm}
                  value={template.custom.widthMm}
                  onChange={(event) => setCustom({ widthMm: event.target.value })}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="label-height" className="text-xs text-muted-foreground">
                  ارتفاع (میلی‌متر)
                </Label>
                <Input
                  id="label-height"
                  type="number"
                  min={LABEL_SIZE_LIMITS.minHeightMm}
                  max={LABEL_SIZE_LIMITS.maxHeightMm}
                  value={template.custom.heightMm}
                  onChange={(event) => setCustom({ heightMm: event.target.value })}
                  className="h-9"
                />
              </div>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          {formatLabelSize(geometry.labelWidthMm, geometry.labelHeightMm)} میلی‌متر،{" "}
          {geometry.perPage > 1
            ? `${fa(geometry.perPage)} برچسب در هر ورق (${fa(geometry.columns)} ستون، ${fa(geometry.rows)} ردیف)`
            : "هر برچسب یک صفحه (رول)"}
        </p>
      </section>

      <section className="space-y-2">
        <Label className="text-sm font-medium">نوع کد</Label>
        <Segmented
          ariaLabel="نوع کد"
          value={template.codeType}
          options={toOptions(LABEL_CODE_TYPE_LABELS)}
          onChange={(codeType) => updateTemplate({ codeType })}
        />
        <Label className="block pt-1 text-xs text-muted-foreground">اندازه‌ی کد</Label>
        <Segmented
          ariaLabel="اندازه‌ی کد"
          value={template.codeScale}
          options={toOptions(LABEL_SCALE_LABELS)}
          onChange={(codeScale) => updateTemplate({ codeScale })}
        />
      </section>

      <section className="space-y-2">
        <Label className="text-sm font-medium">روی برچسب چاپ شود</Label>
        <div className="space-y-1.5">
          {LABEL_FIELDS.map((field) => {
            const available = fieldAvailability(units, field.key);
            const partial = available < units.length;
            return (
              <label
                key={field.key}
                className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-1 py-1 hover:bg-accent/40"
              >
                <span className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={Boolean(template.fields[field.key])}
                    onCheckedChange={(checked) => setField(field.key, checked === true)}
                  />
                  {field.label}
                </span>
                {partial && (
                  <span className="text-[11px] text-muted-foreground">
                    {available === 0 ? "هیچ‌کدام ندارند" : `${fa(available)} از ${fa(units.length)}`}
                  </span>
                )}
              </label>
            );
          })}
        </div>
        <Label className="block pt-1 text-xs text-muted-foreground">اندازه‌ی متن</Label>
        <Segmented
          ariaLabel="اندازه‌ی متن"
          value={template.fontScale}
          options={toOptions(LABEL_SCALE_LABELS)}
          onChange={(fontScale) => updateTemplate({ fontScale })}
        />
      </section>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-full gap-1.5 text-muted-foreground"
        onClick={resetTemplate}
      >
        <RotateCcw className="h-3.5 w-3.5" />
        بازگشت به تنظیمات پیش‌فرض
      </Button>
    </div>
  );
}

/**
 * طراحی و چاپِ برچسبِ دانه‌ها — تنظیمات یک طرف، پیش‌نمایشِ دقیقِ ورق طرفِ
 * دیگر. اندازه، نوعِ کد (بارکد/QR)، اندازه‌ی کد و متن، و متن‌های روی برچسب
 * (نام کالا، تامین‌کننده، مشتری، فاکتور…) قابل انتخاب‌اند و برای دفعه‌ی بعد
 * می‌مانند.
 *
 * مرورگر نمی‌گوید پرینتر واقعاً چاپ کرد؛ پس بعد از بستنِ پنجره‌ی چاپ صریحاً
 * می‌پرسیم و فقط با «بله» ثبت می‌کنیم (`MarkProductUnitsPrinted`). ثبتِ
 * اشتباه بدتر از ثبت‌نکردن است: دانه از صفِ چاپ بیرون می‌رود و برچسبش هرگز
 * زده نمی‌شود.
 *
 * پورتالِ مستقیمِ زیرِ body است، نه Dialog: چاپِ چندصفحه‌ای فقط در جریانِ
 * عادیِ صفحه درست تکه می‌شود (`print.css`).
 */
export default function LabelPrintDesigner({ units, onClose }) {
  const open = Boolean(units?.length);
  const template = useLabelTemplateStore((state) => state.template);
  const geometry = sheetGeometryOf(template);
  const markPrinted = useMarkUnitsPrintedMutation();
  const print = usePrint();

  const [askConfirm, setAskConfirm] = useState(false);
  const [scale, setScale] = useState(1);
  const scrollRef = useRef(null);

  const count = units?.length ?? 0;
  const pageCount = open ? paginateItems(units, geometry).length : 0;

  // پیش‌نمایش در عرضِ موجود جا می‌شود؛ در چاپ این مقیاس بی‌اثر است.
  useLayoutEffect(() => {
    const node = scrollRef.current;
    if (!open || !node) return undefined;
    const fit = () => {
      const sheetWidthPx = (geometry.pageWidthMm / 25.4) * 96;
      setScale(Math.min(geometry.pageWidthMm < 120 ? 2 : 1, (node.clientWidth - 32) / sheetWidthPx));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(node);
    return () => observer.disconnect();
  }, [open, geometry.pageWidthMm]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape" && !askConfirm) onClose(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, askConfirm, onClose]);

  if (!open) return null;

  const handlePrint = () => {
    print({ pageSize: geometry.pageSize, pageMarginMm: 0 });
    setAskConfirm(true);
  };

  const confirmPrinted = () =>
    markPrinted.mutate(units, {
      onSuccess: () => {
        setAskConfirm(false);
        onClose(true);
      },
      // چاپ انجام شده؛ اگر ثبتش ممکن نشد (پیام را mutation می‌دهد) پنجره
      // باز نمی‌ماند.
      onError: () => {
        setAskConfirm(false);
        onClose(false);
      },
    });

  return createPortal(
    <div dir="rtl" className="print-portal fixed inset-0 z-50 flex flex-col bg-background lg:flex-row">
      <aside className="print-portal__chrome flex max-h-[55vh] shrink-0 flex-col border-b border-border bg-card lg:max-h-none lg:w-80 lg:border-b-0 lg:border-l">
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div>
            <h2 className="text-base font-semibold">چاپ برچسب</h2>
            <p className="text-xs text-muted-foreground">
              {fa(count)} برچسب، {fa(pageCount)} صفحه
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="بستن"
            onClick={() => onClose(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <Settings units={units} template={template} geometry={geometry} />
        </div>

        <div className="border-t border-border p-3">
          <Button type="button" size="lg" className="w-full gap-2" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            چاپ {fa(count)} برچسب
          </Button>
        </div>
      </aside>

      <div ref={scrollRef} className="print-portal__sheet flex-1 bg-muted/60 p-4">
        <div style={{ transform: `scale(${scale})`, transformOrigin: "top center" }}>
          <LabelSheet
            items={units}
            preset={geometry}
            getItemKey={(unit) => unit.id}
            renderItem={(unit) => (
              <UnitLabel
                unit={unit}
                template={template}
                widthMm={geometry.labelWidthMm}
                heightMm={geometry.labelHeightMm}
              />
            )}
          />
        </div>
      </div>

      <AlertDialog open={askConfirm}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>برچسب‌ها چاپ شدند؟</AlertDialogTitle>
            <AlertDialogDescription>
              اگر {fa(count)} برچسب درست از پرینتر بیرون آمد، ثبتش کنید تا این دانه‌ها
              «برچسب‌خورده» شوند و تاریخ و دفعاتِ چاپ روی هر دانه بماند. اگر چاپ لغو
              شد یا خراب درآمد، «چاپ نشد» را بزنید و دوباره چاپ کنید.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={markPrinted.isPending} onClick={() => setAskConfirm(false)}>
              چاپ نشد
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={markPrinted.isPending}
              onClick={(event) => {
                event.preventDefault();
                confirmPrinted();
              }}
            >
              {markPrinted.isPending ? "در حال ثبت..." : "بله، ثبت کن"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>,
    document.body,
  );
}
