import { useState } from "react";
import { LayoutList, RotateCcw, Type } from "lucide-react";

import FlowSheet from "@/shared/components/print/FlowSheet";
import {
  DEFAULT_PAPER_SETTINGS,
  PAPER_KEYS,
  flowPageCount,
  flowPrintOptions,
  pageGeometryOf,
} from "@/shared/components/print/paper";
import PaperSettings from "@/shared/components/print/studio/PaperSettings";
import PrintSettingsSection, { PrintSettingLabel } from "@/shared/components/print/studio/PrintSettingsSection";
import PrintStudio from "@/shared/components/print/studio/PrintStudio";
import SegmentedControl from "@/shared/components/print/studio/SegmentedControl";
import { TEXT_SCALES, TEXT_SCALE_LABELS } from "@/shared/components/print/typography";
import { usePrint } from "@/shared/components/print/usePrint";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Switch } from "@/shared/components/ui/switch";
import { Textarea } from "@/shared/components/ui/textarea";
import { optionsFromLabels } from "@/shared/lib/options";
import { formatNumber } from "@/shared/lib/numberFormat";
import { usePrintSettings } from "@/shared/store/printSettingsStore";
import { COUNT_SHEET_SORT, COUNT_SHEET_SORT_LABELS, countSheetLines } from "../domain/stocktake";
import StocktakeCountSheetDocument from "./StocktakeCountSheetDocument";

const PRINT_KIND = "stocktake-count-sheet";

// جدول با خانه‌ی خالیِ دست‌نویس روی رولِ حرارتی جا نمی‌شود.
const PAPER_KEYS_ALLOWED = [PAPER_KEYS.A4, PAPER_KEYS.A5, PAPER_KEYS.LETTER];

const COUNT_SHEET_DEFAULTS = Object.freeze({
  ...DEFAULT_PAPER_SETTINGS,
  title: "برگه‌ی شمارش",
  businessName: "",
  textScale: TEXT_SCALES.MEDIUM,
  sort: COUNT_SHEET_SORT.LINE,
  showSystemQuantity: false,
  showRecordedCount: false,
  showSignatures: true,
  footerNote: "",
});

const TEXT_SCALE_OPTIONS = optionsFromLabels(TEXT_SCALE_LABELS);
const SORT_OPTIONS = optionsFromLabels(COUNT_SHEET_SORT_LABELS);

function SwitchRow({ id, label, hint, checked, disabled = false, onChange }) {
  return (
    <label
      htmlFor={id}
      className="flex min-h-9 cursor-pointer items-center justify-between gap-2 text-sm aria-disabled:cursor-not-allowed aria-disabled:opacity-60"
      aria-disabled={disabled || undefined}
    >
      <span>
        {label}
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
      <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </label>
  );
}

function Settings({ stocktake, settings, geometry, update, reset, onlyUncounted, onOnlyUncountedChange }) {
  return (
    <>
      <PrintSettingsSection title="محتوا" icon={LayoutList}>
        <div className="space-y-1">
          <PrintSettingLabel htmlFor="count-sheet-title">عنوانِ برگه</PrintSettingLabel>
          <Input
            id="count-sheet-title"
            value={settings.title}
            onChange={(event) => update({ title: event.target.value })}
            className="h-10 sm:h-9"
          />
        </div>
        <div className="space-y-1">
          <PrintSettingLabel htmlFor="count-sheet-business">سربرگ (نامِ شرکت)</PrintSettingLabel>
          <Input
            id="count-sheet-business"
            value={settings.businessName}
            onChange={(event) => update({ businessName: event.target.value })}
            placeholder="خالی = بدونِ سربرگ"
            className="h-10 sm:h-9"
          />
        </div>

        <div className="space-y-1">
          <PrintSettingLabel>ترتیبِ کالاها</PrintSettingLabel>
          <SegmentedControl
            ariaLabel="ترتیبِ کالاها"
            value={settings.sort}
            options={SORT_OPTIONS}
            onChange={(sort) => update({ sort })}
          />
        </div>

        <div>
          <SwitchRow
            id="count-sheet-uncounted"
            label="فقط کالاهای شمرده‌نشده"
            hint="برای دورِ دوم؛ فقط همین چاپ"
            checked={onlyUncounted}
            onChange={onOnlyUncountedChange}
          />
          <SwitchRow
            id="count-sheet-system"
            label="ستونِ موجودیِ سیستم"
            hint={stocktake.isBlind ? "شمارشِ کور است؛ موجودی نشان داده نمی‌شود" : "شمارنده عددِ سیستم را می‌بیند"}
            checked={!stocktake.isBlind && settings.showSystemQuantity}
            disabled={stocktake.isBlind}
            onChange={(showSystemQuantity) => update({ showSystemQuantity })}
          />
          <SwitchRow
            id="count-sheet-recorded"
            label="ستونِ شمارشِ ثبت‌شده"
            hint="عددی که تا الان در سیستم ثبت شده، برای بازبینی"
            checked={settings.showRecordedCount}
            onChange={(showRecordedCount) => update({ showRecordedCount })}
          />
          <SwitchRow
            id="count-sheet-signatures"
            label="جای امضا"
            checked={settings.showSignatures}
            onChange={(showSignatures) => update({ showSignatures })}
          />
        </div>

        <div className="space-y-1">
          <PrintSettingLabel htmlFor="count-sheet-note">متنِ پایینِ برگه</PrintSettingLabel>
          <Textarea
            id="count-sheet-note"
            rows={2}
            value={settings.footerNote}
            onChange={(event) => update({ footerNote: event.target.value })}
            placeholder="مثلاً «کالای آسیب‌دیده را جدا بنویسید»"
          />
        </div>
      </PrintSettingsSection>

      <PaperSettings settings={settings} geometry={geometry} onChange={update} paperKeys={PAPER_KEYS_ALLOWED} />

      <PrintSettingsSection title="اندازه‌ی متن" icon={Type}>
        <SegmentedControl
          ariaLabel="اندازه‌ی متن"
          value={settings.textScale}
          options={TEXT_SCALE_OPTIONS}
          onChange={(textScale) => update({ textScale })}
        />
      </PrintSettingsSection>

      <Button type="button" variant="ghost" size="sm" className="w-full gap-1.5 text-muted-foreground" onClick={reset}>
        <RotateCcw className="size-3.5" />
        بازگشت به تنظیماتِ پیش‌فرض
      </Button>
    </>
  );
}

/**
 * چاپِ برگه‌ی شمارشِ یک انبارگردانی برای شمارشِ روی کاغذ: هر کالا با خانه‌ی خالیِ «شمرده‌شده» و «توضیح». داده همان
 * سندِ صفحه است (`GetStocktakeDetail`)، پس درخواستِ تازه‌ای نمی‌رود. کاغذ، ترتیب، ستون‌ها و سربرگ برای چاپِ بعدی روی همین
 * دستگاه می‌مانند (`usePrintSettings("stocktake-count-sheet")`)؛ «فقط شمرده‌نشده‌ها» مالِ همین چاپ است.
 */
export default function StocktakeCountSheetPrint({ stocktake, onClose }) {
  const print = usePrint();
  const { settings, update, reset } = usePrintSettings(PRINT_KIND, COUNT_SHEET_DEFAULTS);
  const [onlyUncounted, setOnlyUncounted] = useState(false);
  const [contentHeightMm, setContentHeightMm] = useState(0);

  const geometry = pageGeometryOf(settings);
  const pageCount = flowPageCount(geometry, contentHeightMm);
  const lines = countSheetLines(stocktake.lines ?? [], { onlyUncounted, sort: settings.sort });

  return (
    <PrintStudio
      title="چاپِ برگه‌ی شمارش"
      summary={`${stocktake.number} — ${formatNumber(lines.length)} کالا، ${formatNumber(pageCount)} صفحه`}
      settings={
        <Settings
          stocktake={stocktake}
          settings={settings}
          geometry={geometry}
          update={update}
          reset={reset}
          onlyUncounted={onlyUncounted}
          onOnlyUncountedChange={setOnlyUncounted}
        />
      }
      previewWidthMm={geometry.widthMm}
      preview={
        <FlowSheet geometry={geometry} pageCount={pageCount} onMeasure={setContentHeightMm}>
          <StocktakeCountSheetDocument stocktake={stocktake} lines={lines} settings={settings} />
        </FlowSheet>
      }
      onPrint={() => print(flowPrintOptions(geometry, contentHeightMm))}
      onClose={onClose}
    />
  );
}
