import { useState } from "react";
import { Barcode, RotateCcw, Ruler, Type } from "lucide-react";

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
import PrintStudio from "@/shared/components/print/studio/PrintStudio";
import PrintSettingsSection from "@/shared/components/print/studio/PrintSettingsSection";
import SegmentedControl from "@/shared/components/print/studio/SegmentedControl";
import { optionsFromLabels } from "@/shared/components/print/studio/options";

import {
  CUSTOM_SIZE_KEY,
  FONT_SIZE_LIMITS,
  isValidFontSizePt,
  LABEL_CODE_TYPE_LABELS,
  LABEL_FIELDS,
  LABEL_LAYOUTS,
  LABEL_LAYOUT_LABELS,
  LABEL_SCALE_LABELS,
  LABEL_GAP_LIMITS,
  LABEL_SIZE_LIMITS,
  LABEL_SIZE_PRESETS,
  MAX_LABELS_PER_ROW,
  MEDIA_WIDTH_LIMITS,
  formatLabelSize,
  sheetGeometryOf,
} from "../domain/labelTemplate";

import { useLabelTemplateStore } from "../store/unitFilterStore";
import { useMarkUnitsPrintedMutation } from "../services/mutations";
import UnitLabel from "./UnitLabel";
import { formatNumber } from "@/shared/lib/numberFormat";

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
    <>
      <PrintSettingsSection title="اندازه‌ی برچسب" icon={Ruler}>
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
            <SegmentedControl
              ariaLabel="چیدمان"
              value={template.custom.layout}
              options={optionsFromLabels(LABEL_LAYOUT_LABELS)}
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
          {geometry.layout === LABEL_LAYOUTS.ROLL && geometry.perPage > 1
            ? `${formatNumber(geometry.perPage)} برچسب کنار هم در هر ردیفِ رول`
            : geometry.perPage > 1
            ? `${formatNumber(geometry.perPage)} برچسب در هر ورق (${formatNumber(geometry.columns)} ستون، ${formatNumber(geometry.rows)} ردیف)`
            : "هر برچسب یک صفحه (رول)"}
        </p>

        {geometry.layout === LABEL_LAYOUTS.ROLL && (
          <div className="space-y-2 rounded-lg border border-border p-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">برچسب در هر ردیف</Label>
                <Select
                  value={String(geometry.labelsPerRow)}
                  onValueChange={(value) => updateTemplate({ labelsPerRow: Number(value) })}
                >
                  <SelectTrigger dir="rtl" className="h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {Array.from({ length: MAX_LABELS_PER_ROW }, (_, index) => index + 1).map((count) => (
                      <SelectItem
                        key={count}
                        value={String(count)}
                        disabled={count > geometry.maxLabelsPerRow && count !== geometry.labelsPerRow}
                      >
                        {formatNumber(count)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="label-gap" className="text-xs text-muted-foreground">
                  فاصله (mm)
                </Label>
                <Input
                  id="label-gap"
                  type="number"
                  min={LABEL_GAP_LIMITS.minMm}
                  max={LABEL_GAP_LIMITS.maxMm}
                  disabled={geometry.labelsPerRow === 1}
                  value={geometry.labelsPerRow === 1 ? 0 : (template.horizontalGapMm ?? "")}
                  onChange={(event) => updateTemplate({ horizontalGapMm: event.target.value })}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="label-media" className="text-xs text-muted-foreground">
                  عرض رسانه (mm)
                </Label>
                <Input
                  id="label-media"
                  type="number"
                  min={MEDIA_WIDTH_LIMITS.minMm}
                  max={MEDIA_WIDTH_LIMITS.maxMm}
                  disabled={geometry.labelsPerRow === 1}
                  placeholder="خودکار"
                  value={template.mediaWidthMm ?? ""}
                  onChange={(event) => updateTemplate({ mediaWidthMm: event.target.value })}
                  className="h-9"
                />
              </div>
            </div>
            {geometry.labelsPerRow > 1 && (
              <p
                role={geometry.error ? "alert" : undefined}
                className={`text-xs ${geometry.error ? "font-medium text-destructive" : "text-muted-foreground"}`}
              >
                عرض لازم {formatNumber(geometry.requiredWidthMm)} — عرض رسانه {formatNumber(geometry.mediaWidthMm)}
                {geometry.error
                  ? " — جا نمی‌شود؛ تعداد یا فاصله را کم کنید یا عرض رسانه را زیاد کنید."
                  : ` — باقی‌مانده ${formatNumber(geometry.remainingWidthMm)} میلی‌متر`}
              </p>
            )}
          </div>
        )}

      </PrintSettingsSection>

      <PrintSettingsSection title="نوع کد" icon={Barcode}>
        <SegmentedControl
          ariaLabel="نوع کد"
          value={template.codeType}
          options={optionsFromLabels(LABEL_CODE_TYPE_LABELS)}
          onChange={(codeType) => updateTemplate({ codeType })}
        />
        <Label className="block pt-1 text-xs text-muted-foreground">اندازه‌ی کد</Label>
        <SegmentedControl
          ariaLabel="اندازه‌ی کد"
          value={template.codeScale}
          options={optionsFromLabels(LABEL_SCALE_LABELS)}
          onChange={(codeScale) => updateTemplate({ codeScale })}
        />
      </PrintSettingsSection>

      <PrintSettingsSection title="روی برچسب چاپ شود" icon={Type}>
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
                    {available === 0 ? "هیچ‌کدام ندارند" : `${formatNumber(available)} از ${formatNumber(units.length)}`}
                  </span>
                )}
              </label>
            );
          })}
        </div>
        <Label className="block pt-1 text-xs text-muted-foreground">اندازه‌ی متن</Label>
        <SegmentedControl
          ariaLabel="اندازه‌ی متن"
          value={isValidFontSizePt(template.fontSizePt) ? null : template.fontScale}
          options={optionsFromLabels(LABEL_SCALE_LABELS)}
          onChange={(fontScale) => updateTemplate({ fontScale, fontSizePt: null })}
        />
        <div className="flex items-center gap-2 pt-1">
          <Label htmlFor="label-font-pt" className="text-xs text-muted-foreground">
            اندازه‌ی دقیق (pt)
          </Label>
          <Input
            id="label-font-pt"
            type="number"
            step="0.5"
            min={FONT_SIZE_LIMITS.minPt}
            max={FONT_SIZE_LIMITS.maxPt}
            placeholder="خودکار"
            value={template.fontSizePt ?? ""}
            onChange={(event) =>
              updateTemplate({ fontSizePt: event.target.value === "" ? null : event.target.value })
            }
            aria-invalid={template.fontSizePt != null && !isValidFontSizePt(template.fontSizePt)}
            className="h-8 w-24"
          />
        </div>
        {isValidFontSizePt(template.fontSizePt) && (
          <p className="text-xs text-muted-foreground">
            اندازه‌ی کد ثابت می‌ماند؛ اگر متن جا نشود، ادامه‌ی آن بریده می‌شود.
          </p>
        )}
        {template.fontSizePt != null && !isValidFontSizePt(template.fontSizePt) && (
          <p role="alert" className="text-xs text-destructive">
            عدد باید بین {formatNumber(FONT_SIZE_LIMITS.minPt)} و {formatNumber(FONT_SIZE_LIMITS.maxPt)} باشد؛
            تا اصلاح، اندازه‌ی پیش‌تنظیم استفاده می‌شود.
          </p>
        )}
      </PrintSettingsSection>

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
    </>
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
 * پوسته (تنظیمات/پیش‌نمایش، موبایل و دسکتاپ) همان `PrintStudio`ِ مشترک است؛
 * قالبِ برچسب store و هندسه‌ی خودش را دارد (`labelTemplate.js`)، چون رول و ورقِ
 * برچسب با کاغذِ برگه‌های دیگر فرق دارد.
 */
export default function LabelPrintDesigner({ units, onClose }) {
  const open = Boolean(units?.length);
  const template = useLabelTemplateStore((state) => state.template);
  const geometry = sheetGeometryOf(template);
  const markPrinted = useMarkUnitsPrintedMutation();
  const print = usePrint();

  const [askConfirm, setAskConfirm] = useState(false);

  if (!open) return null;

  const count = units.length;
  const pageCount = paginateItems(units, geometry).length;

  const handlePrint = () => {
    if (geometry.error) return;
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

  return (
    <PrintStudio
      title="چاپ برچسب"
      summary={`${formatNumber(count)} برچسب، ${formatNumber(pageCount)} صفحه`}
      settings={<Settings units={units} template={template} geometry={geometry} />}
      previewWidthMm={geometry.pageWidthMm}
      // برچسبِ ریز در پیش‌نمایش تا دو برابر بزرگ می‌شود تا متنش خوانا باشد.
      maxFitScale={geometry.pageWidthMm < 120 ? 2 : 1}
      preview={
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
      }
      onPrint={handlePrint}
      printLabel={`چاپ ${formatNumber(count)} برچسب`}
      printDisabled={Boolean(geometry.error)}
      printDisabledReason="برچسب‌ها در عرضِ رسانه جا نمی‌شوند؛ تنظیمِ اندازه را اصلاح کنید."
      onClose={() => onClose(false)}
      closeLocked={askConfirm}
    >
      <AlertDialog open={askConfirm}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>برچسب‌ها چاپ شدند؟</AlertDialogTitle>
            <AlertDialogDescription>
              اگر {formatNumber(count)} برچسب درست از پرینتر بیرون آمد، ثبتش کنید تا این دانه‌ها
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
    </PrintStudio>
  );
}
