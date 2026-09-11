import FilterPanel from "@/shared/components/filters/FilterPanel";
import FilterSelect from "@/shared/components/filters/FilterSelect";
import EntitySelect from "@/shared/components/filters/EntitySelect";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

import {
  ProductUnitStatusEnum as UNIT_STATUSES,
  UNIT_STATUS_LABELS,
} from "@/shared/domain/enums/unitStatus";

const STATUS_OPTIONS = Object.values(UNIT_STATUSES).map((value) => ({
  value,
  label: UNIT_STATUS_LABELS[value],
}));

const getProductLabel = (product) => product.name ?? "";

const renderProductMeta = (product) => (
  <span className="font-mono text-[11px] text-muted-foreground">
    {product.code}
  </span>
);

/** فقط عددِ صحیحِ مثبت؛ هر چیز دیگری یعنی «بدون محدودیت». */
const toSerial = (raw) => {
  const value = Math.trunc(Number(raw));
  return Number.isFinite(value) && value > 0 ? value : "";
};

function SerialInput({ label, value, onChange, disabled }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <Label className="whitespace-nowrap font-medium text-foreground text-sm">
        {label}
      </Label>
      <Input
        type="number"
        min={1}
        dir="ltr"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(toSerial(e.target.value))}
        disabled={disabled}
        placeholder={disabled ? "ابتدا کالا را انتخاب کنید" : ""}
        className="flex-1 tabular-nums"
      />
    </div>
  );
}

/**
 * فیلترها دقیقاً همان‌هایی‌اند که `GetProductUnitList` اعمال می‌کند.
 *
 * بازه‌ی سریال فقط با یک کالای انتخاب‌شده فعال است: سریال per-product
 * است، پس «سریال ۱ تا ۲۰» بدونِ کالا یعنی بیستِ اولِ *هر* کالا — که
 * تقریباً هیچ‌وقت منظورِ کاربر نیست. کاربردِ اصلی‌اش جدا کردنِ دانه‌های
 * یک بار دریافت است (سریال‌های یک بار پشتِ سرِ هم ساخته می‌شوند).
 */
export default function UnitFilters({
  products,
  isProductsLoading,
  productId,
  status,
  fromSerial,
  toSerial,
  onProductChange,
  onStatusChange,
  onFromSerialChange,
  onToSerialChange,
  onReset,
}) {
  const serialDisabled = !productId;

  return (
    <FilterPanel
      onReset={onReset}
      firstRowClassName="grid grid-cols-1 sm:grid-cols-2 gap-4"
      dateRowClassName="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-border"
      resetWrapperClassName="flex items-end sm:justify-end"
      resetButtonClassName="w-full sm:w-auto px-4"
      dateRow={
        <>
          <SerialInput
            label="از سریال"
            value={fromSerial}
            onChange={onFromSerialChange}
            disabled={serialDisabled}
          />
          <SerialInput
            label="تا سریال"
            value={toSerial}
            onChange={onToSerialChange}
            disabled={serialDisabled}
          />
        </>
      }
    >
      <EntitySelect
        label="کالا"
        placeholder="همه کالاها"
        emptyText="کالایی یافت نشد"
        items={products}
        value={productId}
        onSelect={onProductChange}
        isLoading={isProductsLoading}
        getLabel={getProductLabel}
        renderMeta={renderProductMeta}
      />
      <FilterSelect
        label="وضعیت"
        value={status}
        onChange={onStatusChange}
        options={STATUS_OPTIONS}
        allLabel="همه"
        numeric
      />
    </FilterPanel>
  );
}
