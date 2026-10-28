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
import { optionsFromLabels } from "@/shared/lib/options";
import { TEXT_SCALES, TEXT_SCALE_LABELS } from "@/shared/components/print/typography";
import { usePrint } from "@/shared/components/print/usePrint";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Input } from "@/shared/components/ui/input";
import { Switch } from "@/shared/components/ui/switch";
import { Textarea } from "@/shared/components/ui/textarea";
import { formatNumber } from "@/shared/lib/numberFormat";
import { usePrintSettings } from "@/shared/store/printSettingsStore";
import PriceListDocument from "./PriceListDocument";

const PRINT_KIND = "price-list";

const PAPER_KEYS_ALLOWED = [PAPER_KEYS.A4, PAPER_KEYS.A5, PAPER_KEYS.LETTER, PAPER_KEYS.ROLL_80, PAPER_KEYS.ROLL_58];

const PRICE_LIST_DEFAULTS = Object.freeze({
  ...DEFAULT_PAPER_SETTINGS,
  title: "لیست قیمت‌ها",
  businessName: "",
  textScale: TEXT_SCALES.MEDIUM,
  columns: { code: true, quantity: true, unitPrice: true, discount: true, lineTotal: true },
  showTotals: true,
  showDisclaimer: true,
  footerNote: "",
});

const COLUMN_OPTIONS = [
  { key: "code", label: "کدِ کالا" },
  { key: "quantity", label: "تعداد" },
  { key: "unitPrice", label: "قیمتِ واحد" },
  { key: "discount", label: "تخفیف" },
  { key: "lineTotal", label: "مبلغِ هر قلم" },
];

const TEXT_SCALE_OPTIONS = optionsFromLabels(TEXT_SCALE_LABELS);

function SwitchRow({ id, label, checked, onChange }) {
  return (
    <label htmlFor={id} className="flex min-h-9 cursor-pointer items-center justify-between gap-2 text-sm">
      {label}
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

function Settings({ settings, geometry, update, reset, customerName, onCustomerNameChange }) {
  const setColumn = (key, value) => update({ columns: { ...settings.columns, [key]: value } });

  return (
    <>
      <PrintSettingsSection title="محتوا" icon={LayoutList}>
        <div className="space-y-1">
          <PrintSettingLabel htmlFor="price-list-customer">نامِ مشتری (فقط روی همین برگه)</PrintSettingLabel>
          <Input
            id="price-list-customer"
            value={customerName}
            onChange={(event) => onCustomerNameChange(event.target.value)}
            placeholder="اختیاری"
            className="h-10 sm:h-9"
          />
        </div>
        <div className="space-y-1">
          <PrintSettingLabel htmlFor="price-list-title">عنوانِ برگه</PrintSettingLabel>
          <Input
            id="price-list-title"
            value={settings.title}
            onChange={(event) => update({ title: event.target.value })}
            className="h-10 sm:h-9"
          />
        </div>
        <div className="space-y-1">
          <PrintSettingLabel htmlFor="price-list-business">سربرگ (نامِ فروشگاه)</PrintSettingLabel>
          <Input
            id="price-list-business"
            value={settings.businessName}
            onChange={(event) => update({ businessName: event.target.value })}
            placeholder="خالی = بدونِ سربرگ"
            className="h-10 sm:h-9"
          />
        </div>

        <fieldset className="space-y-1">
          <legend className="mb-1 text-xs text-muted-foreground">ستون‌ها</legend>
          <div className="grid grid-cols-2 gap-1">
            {COLUMN_OPTIONS.map((column) => (
              <label
                key={column.key}
                className="flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-1 text-sm hover:bg-accent/40"
              >
                <Checkbox
                  checked={Boolean(settings.columns[column.key])}
                  onCheckedChange={(checked) => setColumn(column.key, checked === true)}
                />
                {column.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <SwitchRow
            id="price-list-totals"
            label="جمع و مبلغِ قابلِ پرداخت"
            checked={settings.showTotals}
            onChange={(showTotals) => update({ showTotals })}
          />
          <SwitchRow
            id="price-list-disclaimer"
            label="یادداشتِ «قیمت‌ها قطعی نیست»"
            checked={settings.showDisclaimer}
            onChange={(showDisclaimer) => update({ showDisclaimer })}
          />
        </div>

        <div className="space-y-1">
          <PrintSettingLabel htmlFor="price-list-note">متنِ پایینِ برگه</PrintSettingLabel>
          <Textarea
            id="price-list-note"
            rows={2}
            value={settings.footerNote}
            onChange={(event) => update({ footerNote: event.target.value })}
            placeholder="مثلاً شرایطِ پرداخت یا اعتبارِ قیمت‌ها"
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
 * چاپِ «لیست قیمت‌ها» برای مشتری از اقلامِ فرم، **بدونِ ذخیره** — همان لحظه که اقلام وارد شده‌اند. نامِ
 * مشتری اختیاری است و فقط روی برگه می‌آید (سرور فروشِ بی‌مشتری را ثبت نمی‌کند؛ اگر مشتری تأیید کرد،
 * فرم کامل و ثبت می‌شود). پوسته `PrintStudio`ِ مشترک است؛ کاغذ، ستون‌ها، سربرگ و اندازه‌ی متن برای
 * چاپِ بعدی روی همین دستگاه می‌مانند (`usePrintSettings("price-list")`).
 *
 * @param items     اقلامِ فرم (`productName`، `productCode`، `quantity`، `unitPrice`، `discount`، نرخِ مالیات)
 * @param customerName پیش‌فرضِ نامِ مشتری (اگر در فرم انتخاب شده)
 */
export default function PriceListPrint({ items, customerName = "", onClose }) {
  const print = usePrint();
  const { settings, update, reset } = usePrintSettings(PRINT_KIND, PRICE_LIST_DEFAULTS);
  const [name, setName] = useState(customerName);
  const [contentHeightMm, setContentHeightMm] = useState(0);

  const geometry = pageGeometryOf(settings);
  const pageCount = flowPageCount(geometry, contentHeightMm);

  return (
    <PrintStudio
      title="چاپِ لیست قیمت‌ها"
      summary={`${formatNumber(items.length)} قلم، ${
        geometry.isRoll ? "رولِ پیوسته" : `${formatNumber(pageCount)} صفحه`
      }`}
      settings={
        <Settings
          settings={settings}
          geometry={geometry}
          update={update}
          reset={reset}
          customerName={name}
          onCustomerNameChange={setName}
        />
      }
      previewWidthMm={geometry.widthMm}
      maxFitScale={geometry.isRoll ? 1.5 : 1}
      preview={
        <FlowSheet geometry={geometry} pageCount={pageCount} onMeasure={setContentHeightMm}>
          <PriceListDocument
            items={items}
            settings={settings}
            customerName={name}
            contentWidthMm={geometry.contentWidthMm}
          />
        </FlowSheet>
      }
      onPrint={() => print(flowPrintOptions(geometry, contentHeightMm))}
      onClose={onClose}
    />
  );
}
