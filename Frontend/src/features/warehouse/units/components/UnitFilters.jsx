import { X } from "lucide-react";

import FilterPanel from "@/shared/components/filters/FilterPanel";
import FilterSelect from "@/shared/components/filters/FilterSelect";
import EntitySelect from "@/shared/components/filters/EntitySelect";
import FilterSearchInput from "@/shared/components/filters/FilterSearchInput";
import FilterDateInput from "@/shared/components/filters/FilterDateInput";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Button } from "@/shared/components/ui/button";
import {
  UNIT_STATUS_LABELS,
  UNIT_CUSTODY_REASON_LABELS,
} from "@/shared/domain/enums/unitStatus";

import {
  UNIT_VIEWS,
  LABELABLE_STATUSES,
  UNIT_LABEL_STATE_LABELS,
} from "../domain/unitVocabulary";

const options = (labels, values = Object.keys(labels)) =>
  values.map((value) => ({ value: Number(value), label: labels[value] }));

const ALL_STATUS_OPTIONS = options(UNIT_STATUS_LABELS);
const LABELABLE_STATUS_OPTIONS = options(UNIT_STATUS_LABELS, LABELABLE_STATUSES);
const CUSTODY_OPTIONS = options(UNIT_CUSTODY_REASON_LABELS);
const LABEL_STATE_OPTIONS = options(UNIT_LABEL_STATE_LABELS);

const getProductLabel = (product) => product.name ?? "";
const renderProductMeta = (product) => (
  <span className="font-mono text-[11px] text-muted-foreground">{product.code}</span>
);

/** فقط عددِ صحیحِ مثبت؛ هر چیز دیگری یعنی «بدون محدودیت». */
const toSerial = (raw) => {
  const value = Math.trunc(Number(raw));
  return Number.isFinite(value) && value > 0 ? value : "";
};

function SerialInput({ label, value, onChange, disabled }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <Label className="whitespace-nowrap font-medium text-foreground text-sm">{label}</Label>
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
 * فیلترِ سندی که از صفحه‌ی دیگری آمده (مثلاً «برچسب‌های این خرید»). کشویی
 * ندارد — عددِ شناسه برای انتخاب نیست — ولی باید دیده و برداشته شود.
 */
function DocumentChip({ label, onClear }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 py-0.5 ps-3 pe-1 text-xs">
      {label}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-5 w-5 rounded-full"
        onClick={onClear}
        aria-label={`حذف فیلتر ${label}`}
      >
        <X className="h-3 w-3" />
      </Button>
    </span>
  );
}

/**
 * فیلترهای فهرستِ دانه‌ها. هر تب فقط فیلترهایی را نشان می‌دهد که در آن
 * معنا دارند: علتِ قرنطینه فقط در قرنطینه، مشتری فقط در «همه» (دانه‌ی نزدِ
 * مشتری در دو تبِ دیگر نیست)، و در صفِ چاپ وضعیت فقط بینِ قفسه و قرنطینه.
 *
 * بازه‌ی سریال فقط با یک کالای انتخاب‌شده فعال است: سریال per-product است
 * و کاربردِ اصلی‌اش جدا کردنِ دانه‌های یک دریافت است.
 */
export default function UnitFilters({
  filters,
  actions,
  products,
  isProductsLoading,
  suppliers,
  isSuppliersLoading,
  customers,
  isCustomersLoading,
}) {
  const { view } = filters;
  const serialDisabled = !filters.productId;
  const showCustomer = view === UNIT_VIEWS.ALL;

  return (
    <div className="space-y-2">
      <FilterPanel
        onReset={actions.resetFilters}
        firstRowClassName="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
        dateRowClassName="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 pt-3 border-t border-border"
        resetWrapperClassName="flex items-end sm:col-span-2 xl:col-span-4 xl:justify-end"
        resetButtonClassName="w-full xl:w-auto px-4"
        dateRow={
          <>
            <EntitySelect
              label="تامین‌کننده"
              placeholder="همه"
              items={suppliers}
              value={filters.supplierId}
              onSelect={actions.setSupplierId}
              isLoading={isSuppliersLoading}
            />
            {showCustomer ? (
              <EntitySelect
                label="مشتری"
                placeholder="همه"
                items={customers}
                value={filters.customerId}
                onSelect={actions.setCustomerId}
                isLoading={isCustomersLoading}
              />
            ) : (
              <span className="hidden xl:block" />
            )}
            <FilterDateInput label="ورود از" value={filters.fromDate} onChange={actions.setFromDate} />
            <FilterDateInput label="ورود تا" value={filters.toDate} onChange={actions.setToDate} />
            <SerialInput
              label="از سریال"
              value={filters.fromSerial}
              onChange={actions.setFromSerial}
              disabled={serialDisabled}
            />
            <SerialInput
              label="تا سریال"
              value={filters.toSerial}
              onChange={actions.setToSerial}
              disabled={serialDisabled}
            />
          </>
        }
      >
        <FilterSearchInput
          label="جست‌وجو"
          placeholder="بارکد، سریال یا نام کالا..."
          value={filters.search}
          onChange={(e) => actions.setSearch(e.target.value)}
        />
        <EntitySelect
          label="کالا"
          placeholder="همه کالاها"
          emptyText="کالایی یافت نشد"
          items={products}
          value={filters.productId}
          onSelect={actions.setProductId}
          isLoading={isProductsLoading}
          getLabel={getProductLabel}
          renderMeta={renderProductMeta}
        />
        {view === UNIT_VIEWS.QUARANTINE ? (
          <FilterSelect
            label="علت"
            value={filters.custodyReason}
            onChange={actions.setCustodyReason}
            options={CUSTODY_OPTIONS}
            numeric
          />
        ) : (
          <FilterSelect
            label="وضعیت"
            value={filters.status}
            onChange={actions.setStatus}
            options={view === UNIT_VIEWS.UNLABELED ? LABELABLE_STATUS_OPTIONS : ALL_STATUS_OPTIONS}
            allLabel={view === UNIT_VIEWS.UNLABELED ? "قفسه و قرنطینه" : "همه"}
            numeric
          />
        )}
        {view === UNIT_VIEWS.UNLABELED ? (
          <span className="hidden xl:block" />
        ) : (
          <FilterSelect
            label="برچسب"
            value={filters.labelState}
            onChange={actions.setLabelState}
            options={LABEL_STATE_OPTIONS}
            numeric
          />
        )}
      </FilterPanel>

      {(filters.purchaseId || filters.saleId) && (
        <div className="flex flex-wrap items-center gap-2">
          {filters.purchaseId && (
            <DocumentChip
              label={`فقط دانه‌های خرید #${filters.purchaseId}`}
              onClear={() => actions.setPurchaseId("")}
            />
          )}
          {filters.saleId && (
            <DocumentChip
              label={`فقط دانه‌های فروش #${filters.saleId}`}
              onClear={() => actions.setSaleId("")}
            />
          )}
        </div>
      )}
    </div>
  );
}
